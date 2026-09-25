# AI Pattern Implementation: Tool Calling (Function Calling)

> Pattern 1 from [[AI Engineering - Production Patterns/01_Patterns_Reference]]
> Status: Planned (Phase 1 ready to implement)
> Date: 2026-09-24

---

## Why This Pattern Matters

Right now, Northstar's AI flow works like this:

1. Backend sends a system prompt that says "respond in JSON with `intent` + `payload`"
2. Groq returns text (sometimes JSON, sometimes not)
3. `parseResponse()` in `ai-provider.service.ts` extracts JSON from the text using regex
4. Backend uses the parsed intent/payload to execute the action

This works but is fragile:
- The AI can return malformed JSON
- The AI can return extra text around the JSON
- The AI can return the wrong shape
- You're manually parsing text that should be structured

**Tool calling replaces this:** instead of asking the AI to format JSON in its response, you register **function definitions** (tools) with the LLM API. When the AI wants to call a tool, the SDK returns a structured tool call with validated parameters. No regex, no manual parsing, no "the AI returned text instead of JSON" failures.

## What Tool Calling Is

From the LLM's perspective, a "tool" is just a function it can choose to call. You define:

```typescript
{
  name: "search_tasks",
  description: "Search for tasks by title or description",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" }
    },
    required: ["query"]
  }
}
```

When the LLM decides to call this tool, the API returns:

```json
{
  "tool_calls": [
    {
      "function": {
        "name": "search_tasks",
        "arguments": "{\"query\": \"Fix bug\"}"
      }
    }
  ]
}
```

Your code extracts the tool name and arguments, executes the tool, then feeds the result back to the LLM. The LLM then decides: call another tool, or respond to the user.

This is the **tool call cycle** — the same loop that powers agents:

```
User message → LLM decides → tool call → execute tool → feed result back → LLM decides → ... → final response
```

## How It Differs From What Northstar Does Now

| Aspect | Current (JSON in prompt) | Target (Tool calling) |
|--------|--------------------------|----------------------|
| How actions are defined | System prompt text | SDK tool definitions (code) |
| How AI signals intent | Returns JSON in text | Returns structured tool call |
| How parameters are validated | `parseResponse()` regex extracts JSON | SDK validates against schema |
| Adding an action | Update prompt + switch statement | Add to tool registry (both prompt + SDK) |
| Reliability | Fragile — AI can return bad JSON | Robust — SDK enforces structure |
| Search loop | Special-cased in controller | Natural tool call → result → next tool call |

## Implementation Plan

### Phase 1: Tool Infrastructure

**Goal:** Replace the JSON-response approach with SDK-level tool calling for the controller flow.

**What changes:**

1. **`ai-provider.service.ts` — `chat()` method:**
   - Accept a new parameter: `tools?: Array<{ name: string; description: string; parameters: any }>`
   - When tools are provided, pass them to `client.chat.completions.create({ tools, ... })`
   - Handle the response: if `response.message.tool_calls` exists, parse it and return a structured result
   - If no tool calls, return the text response as before

2. **`workspace.controller.ts` — `aiChatHandler`:**
   - Define the 6 tools locally (or import from a shared tool registry later)
   - Pass tools to `provider.chat()`
   - Detect tool call vs text response:
     - Tool call → execute the tool, feed result back to AI in a second call
     - Text response → use directly (help, unknown, etc.)
   - Replace the "detect search_tasks intent" logic with tool-call handling

3. **Tool definitions (6 tools):**

   | Tool | Parameters | Description |
   |------|-----------|-------------|
   | `search_tasks` | `{ query: string }` | Search tasks by title/description |
   | `create_task` | `{ title: string, status?: string }` | Create a new task |
   | `move_task` | `{ taskId: number, status: string }` | Move task to column |
   | `assign_task` | `{ taskId: number, assigneeName: string }` | Assign task to person |
   | `list_tasks` | `{}` | List all tasks |
   | `help` | `{}` | Show help info |

   Note: `update_task` and `delete_task` are NOT included yet — they get added in Phase 3 when we're ready to expose them (and trigger risk-gating for delete).

### Phase 2: Refactor Search Loop

**Goal:** Make the search-before-mutation flow natural through tool calls.

**What changes:**

- Remove the special `if (turn1Result.intent === "search_tasks")` logic
- Replace with tool-call handling: if AI calls `search_tasks` tool → execute → feed result → AI calls `move_task` tool
- The loop becomes: while AI calls tools → execute → feed back → repeat. When AI returns text → done.

### Phase 3: Add Missing Actions

**Goal:** Expose `update_task` (priority + due date) and `delete_task` to the AI.

**What changes:**

- Add `update_task` tool: `{ taskId: number, priority?: string, dueDate?: string }`
- Add `delete_task` tool: `{ taskId: number }` — this triggers Pattern 4 (risk-gating)
- Update backend to handle these intents in `executeAiIntent`
- Update system prompt to mention these actions

## Files That Will Change

- `northstar-api/src/services/ai-provider.service.ts` — `chat()` gains `tools` parameter + tool call handling
- `northstar-api/src/controllers/workspace.controller.ts` — `aiChatHandler` uses tools, tool-call loop
- Possibly `northstar-api/src/services/ai.service.ts` — if tool execution moves here
- `northstar-api/docs/ai-pattern-tool-calling.md` — this file (reasoning doc)

## What I'm NOT Building in Phase 1

- **Action registry** (Pattern 3) — tools are defined inline for now, registry comes later
- **Risk-gating** (Pattern 4) — not adding delete until we're ready for confirmation
- **Actor abstraction** (Pattern 5) — not refactoring the actor model yet
- **Full agent framework** — this is a simple tool-call loop, not LangChain or a framework
- **Streaming** — not adding streaming to tool calls yet

## Study Hints: What to Research

### 1. OpenAI/Groq Function Calling — The Core Concept
**Search:** "OpenAI function calling guide" or "Groq tool use"
**Focus on:**
- How tools are defined (name, description, parameters as JSON schema)
- How the API responds when the LLM calls a tool (tool_calls array)
- How to feed tool results back (role: "tool", content: result, tool_call_id)
- The difference between a "function call" and a "tool call" (terminology changed but concept is the same)

**Video suggestion:** Search YouTube for "OpenAI function calling tutorial" — look for one that shows the full cycle (define tools → call → handle tool call → feed result → final response).

### 2. The Tool Call Cycle (Agent Loop)
**Search:** "LLM tool use cycle" or "agent loop tool calling"
**Focus on:**
- The loop: user message → LLM → tool call → execute → tool result → LLM → ... → final response
- How context accumulates across turns (the conversation history grows with each tool call + result)
- When the loop ends (LLM returns a text response instead of a tool call)
- How this differs from single-turn prompting

**Why this matters for Northstar:** The search-before-mutation flow you just built is a manual version of this loop. Tool calling makes it SDK-supported and more reliable.

### 3. JSON Schema for Tool Parameters
**Search:** "JSON schema tool parameters OpenAI"
**Focus on:**
- `type`, `properties`, `required`, `enum` — these are what constrain the AI's output
- How to describe parameters so the AI understands what to pass
- How `enum` restricts values (e.g., status must be one of the valid column names)

**Why this matters for Northstar:** Each tool's parameters are a JSON schema. Writing good descriptions and constraints is what makes the AI call tools correctly.

### 4. Why Tool Calling > JSON in Prompt
**Search:** "function calling vs JSON mode vs prompt engineering"
**Focus on:**
- Reliability: SDK validates vs regex parses
- Self-documenting: tools describe themselves in the API call, not in a prompt you maintain separately
- Extensibility: add a tool = add to the tools array, not update a prompt string
- What JSON mode is (OpenAI's alternative where the AI returns pure JSON) and why tool calling is usually preferred for action agents

**Why this matters for Northstar:** This is the rationale for the refactor. Understanding why tool calling is better helps you make good decisions when implementing it.

## How to Verify Phase 1

1. Start backend + frontend
2. Open AI chat in a project with tasks
3. Send: `move 'Fix bug' to done`
4. Watch the logs: should see tool call for `search_tasks`, then tool call for `move_task`
5. Task should move on the board
6. Send: `create a task called 'hello'`
7. Should see tool call for `create_task`, task created
8. Send: `help`
9. Should see text response (no tool call)

## What to Watch For

- Does the LLM correctly choose between tools? (e.g., calls `search_tasks` before `move_task`, not the other way around)
- Does the tool call cycle terminate correctly? (LLM returns text instead of another tool call)
- Does the conversation history grow correctly across turns? (tool calls + results are added to context)
- Does the frontend need changes to handle tool calls vs text responses? (probably not — the controller still returns the same shape)

---

## Related

- [[AI Engineering - Production Patterns/01_Patterns_Reference]] — pattern overview
- `northstar-api/docs/ai-pattern-search-before-mutation.md` — Pattern 2 (already implemented)
- `northstar-api/src/services/ai-provider.service.ts` — current Groq provider
- `northstar-api/src/controllers/workspace.controller.ts` — current aiChatHandler
