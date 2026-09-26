# Pattern 1: Tool Calling — Implementation Reasoning

> Companion to [[AI Engineering - Production Patterns/01_Patterns_Reference]]
> Status: Phase 1 — Implementation (Done)
> Date: 2026-09-24

---

## What We're Replacing

### Before (JSON in Prompt + Regex Parse)

```
System prompt: "Respond in JSON with {\"intent\": \"...\", \"payload\": {...}}"
LLM returns: text (sometimes JSON, sometimes not)
parseResponse(): regex extracts JSON, falls back to text keyword matching
Controller: detects intent from parsed result, executes
```

Problems:
- Fragile — LLM can return malformed JSON, extra text, wrong shape
- `parseResponse()` fallback (keyword matching on "create"/"move"/"assign") is a hack
- Adding an action = update system prompt text + update parseResponse fallback + update switch in executeAiIntent
- No SDK-level validation — anything the LLM returns is accepted

### After (SDK Tool Calling)

```
Tools defined as code (name, description, JSON schema parameters)
SDK passes tools to LLM API
LLM returns tool call (structured, validated by SDK) OR text response
Controller handles tool call → executes → feeds result back → next LLM turn
```

Benefits:
- SDK validates tool call parameters against JSON schema — no malformed data
- Tool definitions are self-documenting — the LLM sees structured descriptions, not just prompt text
- Adding an action = add to tools array (both prompt and SDK) — single point of change
- Clear separation: tools for actions, text for help/unknown

---

## Implementation Decisions

### Decision 1: Discriminated Union for ChatResult

**Chosen:** `{ kind: "text" } | { kind: "tool_call" }`

**Why:** The controller needs to know whether the LLM responded with text or called a tool. A discriminated union makes this explicit at the type level — no ambiguity, no checking for the presence of `tool_calls` vs `content`. The TypeScript compiler enforces handling both cases.

### Decision 2: Tools Defined in Controller, Not Provider

**Chosen:** The controller defines the 6 tool schemas. The provider just passes them through to the SDK.

**Why:** The provider is a generic LLM client — it shouldn't know about Kanban-specific tools. The controller owns the application-specific tool definitions. This keeps the provider reusable for other contexts.

### Decision 3: Tool Results as JSON Strings in Conversation History

**Chosen:** Tool results are formatted as JSON strings and added to `previousMessages` with `role: "tool"`.

**Why:** The OpenAI/Groq SDK expects tool results in a specific format: `{ role: "tool", tool_call_id: "...", content: "..." }`. We're following the SDK's convention directly. The content is JSON so the LLM can parse it reliably (it's already good at parsing JSON).

### Decision 4: Mutations Go Through executeAiIntent, Not executeToolCall

**Chosen:** `executeToolCall` only handles information-gathering tools (search, list, help). Mutations (create, move, assign) are handled by the LLM responding with a text intent that goes through `executeAiIntent`.

**Why:** `executeAiIntent` already has the auth, permission, and validation logic. Duplicating it in `executeToolCall` would be wrong. The flow is:
1. LLM calls `search_tasks` tool → controller executes search → result fed back
2. LLM observes results → responds with text `{ intent: "move_task", payload: { taskId, status } }`
3. Controller detects text intent → calls `executeAiIntent` with full auth context

This keeps mutations in the proper auth/permission layer. Tool calls are for observation only.

### Decision 5: Two-Turn Loop (Not N-Turn)

**Chosen:** Maximum 2 LLM turns + 1 retry search turn.

**Why:** Simpler, predictable, sufficient for current use case. The typical flow is:
- Turn 1: LLM calls `search_tasks` (or other info-gathering tool)
- Turn 2: LLM observes result → returns text intent → controller executes via `executeAiIntent`

If Turn 2 is another tool call, we only allow `search_tasks` as a retry (in case the LLM needs to refine its search). Any other tool call on Turn 2 → unknown. This prevents runaway loops.

### Decision 6: System Prompt Complements, Doesn't Duplicate, Tool Definitions

**Chosen:** The system prompt describes the AI's role and behavior. The tool definitions provide the structured schemas.

**Why:** Before, the system prompt had to describe every action in detail (because the LLM was responding in JSON with no other guidance). Now, the tool definitions provide the schemas — the LLM sees them as structured function definitions. The system prompt just needs to explain the AI's role and when to use which tool.

### Decision 7: Keep parseResponse() as Fallback

**Chosen:** Keep the existing `parseResponse()` method for text responses.

**Why:** `parseResponse()` handles the "help" action (which is text, not a tool call) and provides a safety net if the LLM returns text when we expected a tool call. It also handles the transition period — if tool calling has issues, the system degrades to the JSON-response approach.

### Decision 8: Tool Definitions Include Enum for Status

**Chosen:** `move_task` parameters include `enum: ["backlog", "ai_drafting", "ready", "in_progress", "needs_revision", "validated", "done"]` for the status field.

**Why:** This constrains the LLM to only use valid column names. Without the enum, the LLM might return a status that doesn't match any column (e.g., "todo" instead of "backlog"). The SDK validates against the schema before returning the tool call — no invalid values reach the controller.

---

## What This Enables for Future Patterns

### Pattern 3 (Action Registry)

Now that tools are defined as structured objects (name, description, parameters), creating a shared registry is straightforward — just extract the tools array to a shared module. The registry becomes the single source of truth for:
- Tool definitions (for the SDK)
- Tool descriptions (for the system prompt)
- Tool handlers (for execution)

### Pattern 4 (Risk-Gated Confirmation)

With tool calling, the LLM calls tools directly. For high-risk actions like `delete_task`, the flow can be:
1. LLM calls `delete_task` tool
2. Controller intercepts → shows confirmation to user
3. User confirms → controller executes → result fed back to LLM

This is cleaner than the JSON-response approach, where the LLM would need to understand "I need to ask for confirmation first" without a tool to call.

### Pattern 5 (Actor Abstraction)

The tool calling approach already separates concerns cleanly:
- Provider: LLM communication (agnostic of who's acting)
- Controller: tool definitions, loop, auth context
- executeAiIntent: permission checking, mutation execution

The actor abstraction would fit naturally in `executeAiIntent` — it already receives `actorUserId` and `actorRole`.

---

## Verification

### Build
```
cd northstar-api && npm run build  # should pass
```

### Manual Test
1. Start backend + frontend
2. Open AI chat in a project with tasks
3. Send: `move 'Fix bug' to done`
4. Watch logs: should see Turn 1 tool call (`search_tasks`), Turn 2 text response with intent
5. Task should move on the board
6. Send: `create a task called 'hello'`
7. Should see Turn 1 tool call (`create_task`? or text intent?) — verify which behavior the LLM chooses
8. Send: `help`
9. Should see text response (no tool call)

### What to Watch For
- Does the LLM correctly use `search_tasks` before `move_task`?
- Does the LLM correctly observe search results and use the right task ID?
- Does the LLM correctly fall back to text for help/unknown?
- Does the loop terminate after 2 turns?
- Does `executeAiIntent` still handle mutations with full auth?

---

## Related

- [[AI Engineering - Production Patterns/01_Patterns_Reference]] — pattern overview with all 6 patterns
- `northstar-api/docs/ai-pattern-2-search-before-mutation-detail.md` — Pattern 2 (already done)
- `northstar-api/src/services/ai-provider.service.ts` — provider with tool calling support
- `northstar-api/src/controllers/workspace.controller.ts` — controller with tool call loop
