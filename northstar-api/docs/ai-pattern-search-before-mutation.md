# AI Pattern Implementation: Search Before Mutation

> Pattern 2 from [[AI Engineering - Production Patterns/01_Patterns_Reference]]
> Status: Implemented
> Date: 2026-09-24

---

## Problem Statement

When a user says "move 'Fix bug' to done" or "assign 'Fix bug' to Alice", the AI has no way to know which task "Fix bug" refers to. It doesn't have a search tool — it only has `list_tasks` (returns everything) and actions that require a `taskId`.

**Failure modes observed:**
- AI creates a duplicate task because it couldn't find the original
- AI says "I can't do that" because it doesn't know the task ID
- AI guesses the wrong task ID

## What I'm Building

A **search-before-mutation** flow using a multi-turn AI loop:

1. User sends: "move 'Fix bug' to done"
2. AI recognizes it needs to find the task first → responds with `intent: "search_tasks"`, `payload: { query: "Fix bug" }`
3. Backend executes the search, gets results
4. Backend feeds results back to the AI: "Found: [{id: 42, title: 'Fix bug', status: 'in_progress'}]. Now decide your final action."
5. AI responds with final action: `intent: "move_task"`, `payload: { taskId: 42, status: "done" }`
6. Backend executes the move

This is the **ReAct pattern** (Reason + Act) — the AI can take an information-gathering step before the final action.

## Why This Approach

### Single-turn vs Multi-turn

The current AI flow is single-turn: one prompt, one JSON response. This works for simple cases (create a task, list all tasks, show help) but fails when the AI needs information it doesn't have.

Multi-turn solves this: the AI can say "I need to search first," the backend provides the data, and the AI then makes its final decision with full information.

### Why not just add search to the system prompt as a hint?

You could tell the AI "if you need to find a task, call search_tasks first" — but without a multi-turn loop, the AI has no way to actually get the search results. It would need to return both a search query and the final action in one response, which is unreliable. The multi-turn loop is the correct pattern.

### Why not full tool calling yet?

Full OpenAI SDK tool calling (Pattern 1) is a bigger refactor. Search-before-mutation can be built on top of the existing JSON-response approach as a stepping stone. It teaches the multi-turn concept without the full tool-calling infrastructure.

## Implementation Decisions

### Decision 1: Where to put the multi-turn logic

**Option A:** Put it in `aiChatHandler` (controller) — the controller manages the loop, calls the provider multiple times, feeds results back.

**Option B:** Put it in `ai-provider.service.ts` — the provider manages the loop internally.

**Chosen:** Option A (controller).

**Reasoning:** The controller already owns the flow (call provider → execute intent → respond). Adding the loop here keeps the provider simple (it just calls Groq) and makes the controller the place where the "AI conversation" logic lives. If we later switch to full tool calling, the provider would change but the controller's loop concept remains valid.

### Decision 2: How many search turns?

**Option A:** Unlimited loop — AI can search, then search again, then search again...

**Option B:** One search turn max — AI searches once, then must produce a final action.

**Chosen:** Option B (one search turn).

**Reasoning:** Unlimited loops are more complex and harder to reason about. One search turn handles the common case (find a task by name, then act on it). If the AI needs multiple searches, that's a sign the system prompt needs to be more specific or the user's request is ambiguous. We can revisit if needed.

### Decision 3: What if search returns no results?

**Option A:** Return empty results, let the AI decide what to do (create a new task? tell the user?).

**Option B:** Hard-error if no results.

**Chosen:** Option A (return empty results, let AI decide).

**Reasoning:** The AI is capable of handling "no results found" — it can tell the user the task doesn't exist, or offer to create it. Hard-erroring would limit the AI's flexibility. The empty results are fed back to the AI as part of the search result message.

### Decision 4: What search fields?

**Chosen:** Title and description (same as existing `searchTasks` service).

**Reasoning:** The existing `searchTasks` already searches title and description with case-insensitive LIKE. This is sufficient for finding tasks by name. Adding assignee, status, or other fields is future work — not needed for the first implementation.

### Decision 5: How to format search results for the AI?

**Chosen:** JSON array of task objects: `[{ id, title, status, priority, assigneeId, dueDate }, ...]`

**Reasoning:** JSON is structured and the AI already knows how to parse JSON (it responds in JSON). A human-readable string would work too but JSON is more reliable for the AI to extract IDs from. Including key fields (id, title, status) gives the AI enough context to act.

## What I'm NOT Building Yet

- **Full tool calling** (Pattern 1) — this uses the existing JSON-response approach as a stepping stone
- **Multiple search turns** — one search, then final action
- **Search by assignee/status** — title + description only for now
- **AI-client search** — this is the Groq path (clientId===0), not the registered API client path
- **Confirmation for destructive actions** (Pattern 4) — not needed for search/move

## Files Changed

- `northstar-api/src/controllers/workspace.controller.ts` — `aiChatHandler` multi-turn loop
- `northstar-api/src/services/ai.service.ts` — (no changes, search is handled in controller)

## Study Hints: What to Research

### 1. ReAct Pattern (Reason + Act)
The general framework for "AI thinks, takes an action, observes the result, thinks again."

**What to search:** "ReAct pattern LLM agents"
**What to watch for:** How the loop works (thought → action → observation → thought → ...), how it differs from single-prompt approaches, why it's more reliable for multi-step tasks.

**Video suggestion:** Search YouTube for "ReAct pattern explained" — look for videos that show a concrete example with a search step.

### 2. Multi-Turn vs Single-Turn LLM Interaction
Why one prompt/response isn't enough for tasks that require information gathering.

**What to search:** "single-turn vs multi-turn LLM"
**What to watch for:** The tradeoff (multi-turn is more reliable but more API calls), when each is appropriate, how context accumulates across turns.

### 3. LLM Information-Seeking Behavior
How LLMs decide when they need more information vs when they can answer from what they know.

**What to search:** "LLM asks clarifying questions" or "LLM information seeking behavior"
**What to watch for:** Why LLMs sometimes guess instead of asking, how system prompts can encourage information-seeking, the role of "I don't know" as a valid response.

### 4. Tool Use in LLMs (Precursor to Full Tool Calling)
How LLMs call external functions — this is the broader pattern that tool calling (Pattern 1) formalizes.

**What to search:** "LLM function calling" or "LLM tool use"
**What to watch for:** How the LLM decides to call a tool vs respond with text, how tool results are fed back, how this differs from the JSON-response approach we're using now.

## How to Verify

1. Start the backend (`npm run dev` in `northstar-api`)
2. Start the frontend (`npm run dev` in `northstar-web`)
3. Log in, open a project with some tasks
4. Open AI chat panel
5. Send: "move 'Fix bug' to done" (or any task name that exists)
6. Watch the flow: AI should search first, then move
7. Send: "move 'nonexistent task' to done" — AI should report it can't find it
8. Check backend logs for `[AI]` messages to see the multi-turn flow

## What to Watch For

- Does the AI correctly recognize when it needs to search vs when it can act directly?
- Does the AI correctly extract the task ID from search results?
- Does the AI handle "no results" gracefully?
- Does the system prompt need tuning to encourage search behavior?

These are all tunable — the system prompt, the search result format, and the flow logic can be adjusted based on what you observe.
