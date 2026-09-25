# Pattern 2: Search Before Mutation — End-to-End Reference

> Companion to [[AI Engineering - Production Patterns/01_Patterns_Reference]]
> Status: Implemented in Northstar
> Date: 2026-09-24

---

## 1. The Pattern at a Glance

**Problem:** An LLM-powered action agent needs to reference real data (tasks, projects, users) that it doesn't inherently know about. When a user says "move 'Fix bug' to done", the LLM has no way to know which task "Fix bug" refers to unless you give it a way to look it up.

**Solution:** Give the LLM an explicit **information-gathering tool** (search) that it can call before taking a mutating action. The LLM first calls search, receives results, then calls the final action with the correct identifiers.

**Pattern name:** Search Before Mutation / Lookup Before Action / Read-Before-Write
**Broader category:** ReAct (Reason + Act + Observe) / Tool-Use Agent Loop
**Industry standard?** Yes — this is a widely used pattern in production AI agents.

---

## 2. Why This Pattern Exists

### The Core Constraint

LLMs are **stateless text generators**. They know nothing about your application's database unless you put that information in their context. Even if you put all your tasks in the context (via `list_tasks`), that's:
- Expensive (large context)
- Unreliable (LLM has to scan the list itself)
- Slow (sending all tasks every time)

### What Happens Without Search

Before Pattern 2, Northstar's `move_task` action accepted `status` without a `taskId`. This meant:

```
User: "move 'Fix bug' to done"
LLM: I'll move it. { intent: "move_task", payload: { status: "done" } }
Backend: Which task? ... error or guess
```

The LLM was forced to guess which task to move because it had no way to say "I need to find the task first."

### What Happens With Search

```
User: "move 'Fix bug' to done"
LLM Turn 1: I need to find this task first.
  → { intent: "search_tasks", payload: { query: "Fix bug" } }
Backend: Executes search → [{ id: 42, title: "Fix bug", status: "in_progress" }]
LLM Turn 2: Found it. Moving task 42.
  → { intent: "move_task", payload: { taskId: 42, status: "done" } }
Backend: Executes move → Done
```

The LLM now **knows what it's acting on** because it looked it up first.

---

## 3. The Broader Pattern: ReAct / Tool-Use Agent Loop

Search-before-mutation is a specific case of the **ReAct pattern** (Yao et al., 2022 — "ReAct: Synergizing Reasoning and Acting in Language Models").

### ReAct Flow

```
Thought: I need to find the task first.
Action: search_tasks(query="Fix bug")
Observation: Found [{ id: 42, title: "Fix bug", status: "in_progress" }]
Thought: Now I can move task 42 to done.
Action: move_task(taskId=42, status="done")
Observation: Task moved successfully.
Final Answer: Moved "Fix bug" to Done.
```

The LLM alternates between:
- **Reasoning** (thinking about what to do next)
- **Acting** (calling a tool)
- **Observing** (receiving the tool result)

This loop continues until the LLM produces a final answer (no more tool calls).

### Where Search Fits in the ReAct Spectrum

| ReAct Step | Northstar Implementation |
|------------|--------------------------|
| Thought | Implicit — the LLM decides internally |
| Action (search) | `search_tasks` tool/intent |
| Observation | Search results fed back to LLM |
| Action (mutate) | `move_task` / `assign_task` / etc. |
| Observation | Action result |
| Final Answer | LLM's `message` field (human-readable response) |

Northstar doesn't use explicit "Thought" / "Observation" labels in the prompt — the LLM figures this out from the tool descriptions and the fed-back results. This is a pragmatic simplification that works for straightforward cases.

---

## 4. Northstar's Implementation — Every Detail

### Files Changed

- `northstar-api/src/controllers/workspace.controller.ts` — `aiChatHandler` + two helper functions

### The Two-Turn Flow

#### Turn 1: Initial Response

```typescript
const turn1Result = await provider.chat({
  systemPrompt: buildAiSystemPrompt(),
  userMessage: message,
});
```

**System prompt (`buildAiSystemPrompt`):**
- Lists 6 actions: `create_task`, `move_task`, `assign_task`, `search_tasks`, `list_tasks`, `help`
- `search_tasks` is described as: "Search for tasks by title or description (requires query). Use this to find a task by name BEFORE using move_task or assign_task."
- `move_task` and `assign_task` now require `taskId` in their payloads
- Instructions: "When a user asks you to move or assign a task by name, first use search_tasks to find it, then use the taskId from the search results in your final action."

#### Turn 1 Decision Point

```typescript
if (turn1Result.intent === "search_tasks") {
  // Execute search, then do Turn 2
} else {
  // No search needed — finalResult = turn1Result (proceed directly)
}
```

The LLM decides whether to search. For simple actions (create, list, help), it doesn't search. For actions that reference a task by name (move, assign), it searches first.

#### Turn 2: Search Results Fed Back

```typescript
const results = await searchTasks(projectId, query);
const turn2Prompt = buildSearchContextPrompt(message, results);
finalResult = await provider.chat({
  systemPrompt: turn2Prompt,
  userMessage: message,
});
```

**Search context prompt (`buildSearchContextPrompt`):**

```
You are an AI assistant for a Kanban project management tool.

Available actions (search already done — do NOT use search_tasks again):
- create_task: Create a new task (requires title)
- move_task: Move a task to a different column (requires taskId and status)
- assign_task: Assign a task to someone (requires taskId and assigneeName)
- list_tasks: Show tasks
- help: Show help info
- unknown: If you can't determine the right action

SEARCH RESULTS:
  - Task 42: "Fix bug" (status: in_progress, priority: high)
  - Task 87: "Fix login bug" (status: backlog)

Based on these results, produce your final action. Copy the task ID from the matching result into your move_task or assign_task payload. Do NOT use search_tasks again.

User's request: "move 'Fix bug' to done"

Respond in JSON format:
{"intent": "action_name", "payload": {"key": "value"}, "message": "Human readable response"}
```

Key design choices in this prompt:
- **"search already done — do NOT use search_tasks again"** — prevents infinite search loops
- Results formatted as human-readable list with IDs — LLM can read and extract IDs
- "Copy the task ID from the matching result" — explicit instruction to use the correct ID
- `unknown` added as an action — if the LLM truly can't determine the right action, it can say so

#### Final Execution

```typescript
const finalIntent = finalResult.intent;
if (finalIntent !== "help" && finalIntent !== "unknown" && finalIntent !== "list_tasks") {
  executionResult = await executeAiIntent({
    clientId: 0,
    actorUserId: userId,
    actorRole: userRole,
    projectId,
    intent: finalIntent,
    payload: finalResult.payload,
  });
}
```

Same execution path as before — the only difference is that now `finalResult` is guaranteed to have a `taskId` for move/assign actions (because the LLM got it from search results).

#### Response Shape

```typescript
res.json({
  content: finalResult.content ?? finalResult.message,
  message: finalResult.message ?? finalResult.content ?? "OK",
  intent: finalIntent,
  payload: finalResult.payload,
  executed: executionResult?.ok ?? false,
  hadSearchStep,  // New: tells frontend whether a search happened
});
```

`hadSearchStep` lets the frontend show "Searched 2 tasks then moved" or similar — useful for transparency.

### Safety Nets

| Situation | How It's Handled |
|-----------|-----------------|
| LLM returns `search_tasks` in Turn 2 too | Treated as `unknown` — "I searched but couldn't determine the right action" |
| Empty search query | Treated as `unknown` — "Please provide a search term" |
| No search results | LLM informed in Turn 2 prompt — it can tell the user or offer to create a new task |
| `taskId` missing from payload after search | `executeAiIntent` handles this — task not found error |

---

## 5. Industry Standard Validation

### Is This the Right Pattern?

**Yes.** Search-before-mutation (or more broadly, lookup-before-action) is a standard pattern in production AI agents. Here's how it compares:

| Aspect | Northstar | Industry Standard | Verdict |
|--------|-----------|------------------|---------|
| **Search before mutate** | ✅ Yes — `search_tasks` before `move_task`/`assign_task` | ✅ Standard practice | ✅ Correct |
| **Multi-turn flow** | ✅ Two-turn loop with search → result → final action | ✅ ReAct / tool-use loop | ✅ Correct (simplified — no explicit "Thought" labels, but functionally equivalent) |
| **LLM decides when to search** | ✅ LLM chooses based on system prompt instructions | ✅ Standard — LLM decides based on tool descriptions | ✅ Correct |
| **Search results fed back to LLM** | ✅ Formatted as readable list with IDs | ✅ Standard — tool result is part of conversation history | ✅ Correct |
| **Loop termination** | ✅ One search turn max; second search = unknown | ⚠️ Simpler than full ReAct (which allows N turns) | ⚠️ Acceptable for current scope; full ReAct loop would allow N tool calls |
| **Disambiguation** | ❌ Not handled — two tasks with same name = LLM picks one | ⚠️ Varies — some systems ask user to clarify | ⚠️ Known gap — acceptable for now |
| **Structured tool calls (SDK-level)** | ❌ Still using JSON-response + parseResponse() | ✅ Tool calling / function calling is the standard | ⚠️ This is Pattern 1 territory — Pattern 2 works fine with current approach as a stepping stone |
| **Context management** | ⚠️ Turn 2 prompt includes search results + original request — context grows but is bounded | ✅ Production systems manage context carefully (truncate history, summarize, etc.) | ⚠️ Simpler approach works for 2 turns; would need attention with N-turn loops |

### What We Got Right

1. **Explicit search tool** — not just telling the LLM to "remember" tasks from earlier in the conversation. The LLM has an explicit action it can take to get the information it needs.

2. **Mutating actions require IDs now** — `move_task` and `assign_task` require `taskId`. This is the correct design: the LLM should never be able to mutate something without identifying it first. The only question is *how* it gets the ID (search, or the user provides it).

3. **Search results are fed back as context** — the LLM sees the results and uses them to produce the final action. This is the core of the ReAct loop.

4. **Loop has a safety net** — second search in Turn 2 = unknown. Prevents infinite loops.

5. **One-turn search limit** — simple, predictable, sufficient for the current use case.

### What We Simplified vs Full Industry Standard

| Simplification | Impact | Future Fix |
|---------------|--------|------------|
| No explicit "Thought" / "Observation" labels in prompt | LLM handles reasoning internally — works for simple cases | Full ReAct would have explicit Thought/Action/Observation structure |
| One-turn search limit | Can't do search → search → action | Full agent loop allows N tool calls |
| No disambiguation | Same-name tasks = LLM picks one | Could add "multiple results found — please clarify" step |
| JSON-response approach (not SDK tool calls) | Fragile parsing | Pattern 1 fixes this |
| No context truncation | OK for 2 turns, problematic for N turns | Would need context management in full agent loop |

### Bottom Line

**Our implementation is correct for the scope.** It implements the core pattern correctly: the LLM has a search tool, uses it before mutating, receives results, and acts with correct identifiers. The simplifications (one-turn limit, no explicit ReAct labels, JSON-response approach) are pragmatic choices that work for the current use case and leave room for future improvement (Pattern 1 for tool calls, full agent loop for N-turn).

---

## 6. GitHub Repos to Inspect

These repos implement similar patterns — search/read before mutate, ReAct-style loops, tool-use agents. Read them at the conceptual level (how they structure the loop, how they feed results back) even if the code is in a different language or framework.

### 1. LangChain — `langchain-ai/langchain`

**What to look at:** The agent executors and tool-use abstractions
**Path:** `libs/langchain/langchain/agents/` — look for agent executor implementations
**Key concepts:**
- How tools are defined and registered
- How the agent loop works (LLM → tool call → execute → feed result → LLM)
- How tool results are formatted and fed back to the LLM
- How the loop terminates

**Why read it:** LangChain is the most widely used framework for this pattern. Even if you don't use it, understanding how they structure the tool-use loop will deepen your understanding.

**Link:** https://github.com/langchain-ai/langchain

---

### 2. OpenAI SDK Examples — `openai/openai-node`

**What to look at:** Function calling / tool use examples
**Path:** Look for examples in the repo that show `tools` parameter and handling `tool_calls` in the response
**Key concepts:**
- How to define tools with the SDK
- How to detect a tool call in the response
- How to feed tool results back (role: "tool", tool_call_id, content)
- The full cycle: define tools → call → handle tool call → feed result → final response

**Why read it:** This is the SDK-level implementation of the pattern. Northstar's Pattern 1 will move toward this. Understanding the SDK's approach now will make Pattern 1 easier.

**Link:** https://github.com/openai/openai-node

---

### 3. Vercel AI SDK — `vercel/ai`

**What to look at:** The `useChat` / `useAssistant` hooks and how they handle tool calls in React
**Path:** `packages/ai/src/` — look for tool call handling in the hooks
**Key concepts:**
- How tool calls are streamed to the frontend
- How the frontend handles tool call deltas vs text deltas
- How tool results are sent back to the server
- How the conversation state is managed across tool calls

**Why read it:** Northstar's frontend will eventually need to handle tool calls (show "searching..." while the tool executes, show results, etc.). Vercel AI SDK shows one approach.

**Link:** https://github.com/vercel/ai

---

### 4. CrewAI — `crewAI-ai/crewAI`

**What to look at:** How multi-agent systems handle tool use and task delegation
**Path:** Look for agent and tool abstractions
**Key concepts:**
- How tools are defined per-agent
- How agents interact with each other's tools
- How the overall flow is orchestrated

**Why read it:** If you want to see how the pattern scales to multi-agent systems (one agent searches, another acts, etc.), CrewAI shows one approach. Overkill for Northstar now, but good for understanding the pattern at scale.

**Link:** https://github.com/crewAI-ai/crewAI

---

### 5. AutoGPT — `AutoGPT/AutoGPT`

**What to look at:** The agent loop and how it handles tool calls, observations, and reasoning
**Path:** Look for the agent execution loop
**Key concepts:**
- Full ReAct-style loop with explicit thought/action/observation
- How the agent decides when to stop
- How context is managed across many turns
- How failures are handled (tool fails, LLM retries, etc.)

**Why read it:** AutoGPT is one of the earliest and most complete implementations of the ReAct pattern. It shows the full vision of what an agent loop can look like — useful as a reference even if Northstar doesn't need that much complexity.

**Link:** https://github.com/AutoGPT/AutoGPT

---

### 6. OpenAI Assistants API (Conceptual Reference)

**What to look at:** The Assistants API documentation and how it handles tools, threads, and runs
**Key concepts:**
- How tools are attached to an assistant
- How the API manages the conversation (thread → run → tool calls → poll → result)
- How the loop is managed server-side vs client-side

**Why read it:** Even if you don't use the Assistants API, understanding how OpenAI structures tool use at the API level helps you understand the pattern better. The Assistants API abstracts the loop — understanding what it abstracts helps you understand what you're building manually.

**Link:** https://platform.openai.com/docs/assistants

---

## 7. What to Look for When Reading These Repos

Don't try to read them cover-to-cover. Focus on these questions:

1. **How do they define tools?** (What information does a tool definition include? Name, description, parameters, schema?)
2. **How does the LLM know what tools are available?** (Are tools passed in the API call? In the system prompt? Both?)
3. **How is the tool-use loop structured?** (LLM calls tool → backend executes → result fed back → LLM decides next step — how is this coded?)
4. **How are tool results formatted?** (JSON? Text? How does the LLM parse them?)
5. **How does the loop terminate?** (When does the LLM stop calling tools and respond to the user?)
6. **How is context managed?** (What goes in the conversation history? How much history is kept? Is old history truncated or summarized?)
7. **How are errors handled?** (Tool fails — what happens? LLM retries? Returns error to user?)

For Northstar's scope, questions 1-4 and 7 are the most relevant. Questions 5-6 matter more when you move to Pattern 1 (full tool calling) and beyond.

---

## 8. Summary

| Question | Answer |
|----------|--------|
| **What is Pattern 2?** | Search-before-mutation: the LLM calls a search tool to find real data before acting on it |
| **What pattern family does it belong to?** | ReAct / tool-use agent loop — the LLM reasons, acts (searches), observes (results), reasons again, acts (mutates) |
| **Is our implementation correct?** | Yes — for the scope. Core pattern is right. Simplifications (one-turn, JSON-response, no explicit ReAct labels) are pragmatic and leave room for future improvement |
| **What's the gap to industry standard?** | Pattern 1 (SDK-level tool calls) replaces the JSON-response approach. Full ReAct loop allows N tool calls. Disambiguation for same-name tasks. Context management for many turns |
| **Where to learn more?** | LangChain (agent loop), OpenAI SDK (tool call API), Vercel AI SDK (frontend handling), AutoGPT (full ReAct vision) |

---

## Related

- [[AI Engineering - Production Patterns/01_Patterns_Reference]] — pattern overview with all 6 patterns
- `northstar-api/docs/ai-pattern-tool-calling.md` — Pattern 1 planning doc
- `northstar-api/src/controllers/workspace.controller.ts` — implementation
- `northstar-api/src/services/workspace.service.ts` — `searchTasks` function
