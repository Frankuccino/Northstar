# Pattern 3: Action Registry — Implementation Reasoning

> Companion to the Pattern 1 implementation doc
> Status: Phase 3 — Design (pending implementation)
> Date: 2026-09-30
> Prerequisite: Pattern 1 (Tool Calling) must be working — create_task verified, move_task needs backend restart to confirm tool_choice fix

---

## What We're Refactoring

### Current State
Tools are defined as a local `const tools: AiTool[]` array inside `aiChatHandler()` (lines 498-582 of `workspace.controller.ts`). Each tool has:
- `name`, `description`, `parameters` (JSON schema)
- Used twice: in the `tools` array for Turn 1 SDK call, and (historically) in Turn 2/3 follow-up calls

### Problems
- Tool definitions are duplicated — the same 6 objects appear in the controller AND must be described in the system prompt
- Adding a new action means editing 3 places: tool definition, system prompt text, and the `executeToolCall` switch case
- No single source of truth — if the schema changes, you might update one place and miss another
- The tools array is recreated on every chat request — wasteful, though minor

---

## What Pattern 3 Gives Us

A single **Action Registry** — a module that owns:
1. Tool definitions (name, description, JSON schema)
2. System prompt entries (derived from definitions, not handwritten)
3. Execution handlers (the function that runs when the LLM calls that tool)
4. Registration/discovery API (list all actions, get by name)

After this pattern, adding an action = add one registry entry. Everything else flows from it.

---

## Design Decisions

### Decision 1: Registry as a module, not a class

**Chosen:** Plain TypeScript module with a `Record<string, ActionEntry>` and helper functions

**Why not a class:** No state to manage. The registry is static configuration + dispatch logic. A class would add `new`, `this`, lifecycle management — none of which we need. A module with pure functions is simpler and easier to test.

**Structure:**
```typescript
// ai-action-registry.ts
export interface ActionEntry {
  name: string;
  description: string;
  parameters: Record<string, any>;
  /** Human-readable label for the system prompt */
  promptLabel: string;
}

export const actions: Record<string, ActionEntry> = {
  search_tasks: { ... },
  create_task: { ... },
  // ...
};

export function getToolDefinitions(): AiTool[] {
  return Object.values(actions).map(a => ({
    name: a.name,
    description: a.description,
    parameters: a.parameters,
  }));
}

export function getSystemPromptEntries(): string[] {
  return Object.values(actions).map(a => `- ${a.name}({...}): ${a.promptLabel}`);
}

export type ActionHandler = (args: any, ctx: ActionContext) => Promise<string>;
```

### Decision 2: Execution handlers live in the registry, not the controller

**Chosen:** Each action has a handler function registered alongside its definition

**Why:** Currently, `executeToolCall` is a big switch statement in the controller — 6 cases, each with its own logic. This couples tool definition to execution. With a registry, each action is self-contained: definition + handler + prompt entry. The controller just does:
```typescript
const action = actions[tc.name];
if (!action) return jsonError(`Unknown tool: ${tc.name}`);
return action.handler(tc.arguments, { projectId, userId, userRole });
```

**Trade-off:** The registry module grows as we add actions, but it stays focused — one file for all AI actions, not scattered across controller + service + prompt.

### Decision 3: Keep the discriminated union for execution results

**Chosen:** Actions return `Promise<string>` (JSON result string), same as current `executeToolCall`

**Why:** The conversation flow (tool result → LLM → text response) doesn't change. Each handler produces a JSON string result that gets fed back to the LLM. This keeps the registry focused on dispatch, not on changing the Turn 1 → execute → Turn 2 flow.

### Decision 4: Don't change the Turn 2/Turn 3 conversation flow

**Chosen:** The registry only changes how tools are DEFINED and EXECUTED. The multi-turn conversation logic (assistant tool_call + tool result → LLM → text) stays the same.

**Why:** Pattern 3 is about organization, not about changing the conversation protocol. The Harmony fix (assistant tool_call before tool result) and the `tool_choice: "auto"` fix are separate concerns that remain in the provider/controller. The registry just replaces the inline tools array and the switch statement.

### Decision 5: System prompt entries are generated, not handwritten

**Chosen:** `getSystemPromptEntries()` generates prompt lines from the registry entries

**Why:** Currently, `buildAiSystemPrompt()` has a hardcoded list of tool descriptions that could drift from the actual tool definitions. With the registry, the prompt is always in sync — if you add an action, its prompt entry appears automatically. No more "description in tool definition says X but prompt says Y."

---

## Files to Create/Modify

**New:**
- `northstar-api/src/services/ai-action-registry.ts` — the registry module (ActionEntry, actions record, getToolDefinitions, getSystemPromptEntries, handler type)

**Modified:**
- `northstar-api/src/controllers/workspace.controller.ts` — replace inline `tools` array with `getToolDefinitions()`, replace `executeToolCall` switch with registry dispatch, update `buildAiSystemPrompt()` to use `getSystemPromptEntries()`
- `northstar-api/src/services/ai-provider.service.ts` — no changes (provider stays generic)
- `northstar-api/docs/ai-pattern-1-tool-calling-implementation.md` — add a "Phase 3: Action Registry" section pointing to this doc

**Not changed:**
- `ai.service.ts`, `ai-client.service.ts` — no changes
- Provider (Groq) layer — no changes
- Conversation flow (Turn 1 → execute → Turn 2) — no changes

---

## Migration Steps

1. Create `ai-action-registry.ts` with all 6 current actions (copy definitions from controller)
2. Add handler functions for each action (copy logic from `executeToolCall` switch cases)
3. In `aiChatHandler`: replace `const tools: AiTool[] = [...]` with `const tools = getToolDefinitions()`
4. In `aiChatHandler`: replace `executeToolCall(tc, projectId)` with `actions[tc.name].handler(tc.arguments, ctx)`
5. In `buildAiSystemPrompt`: replace hardcoded tool descriptions with `getSystemPromptEntries().join("\n")`
6. Delete the old `executeToolCall` function (no longer needed)
7. Test: `create`, `move`, `assign`, `search`, `list`, `help` — all should work exactly as before

---

## What We're NOT Doing in Pattern 3

- **Not adding new actions** — just reorganizing existing ones
- **Not changing the conversation protocol** — Turn 1 → execute → Turn 2 stays
- **Not touching the provider** — Groq/OpenAI SDK layer stays generic
- **Not adding delete task or other missing actions** — that's Pattern 4 (Risk-Gated Confirmation)
- **Not changing how tool results are formatted** — still JSON strings fed back to LLM

---

## Testing Approach

Before and after migration, verify each action works:
1. `create task called X` → task created ✓
2. `move X to done` → task moved ✓ (needs backend restart first)
3. `assign X to Y` → task assigned ✓
4. `search for X` → search results returned ✓
5. `list all tasks` → task list returned ✓
6. `help` → help text returned ✓

After registry migration, all 6 should produce identical responses to before — the registry is a refactoring, not a feature change.

---

## Relationship to Other Patterns

- **Pattern 1 (Tool Calling):** Pattern 3 builds on this — the registry is the natural evolution of inline tools
- **Pattern 2 (Search Before Mutation):** Still valid — search_tasks is still a tool. The registry doesn't change the search-before-move logic, just where it lives
- **Pattern 4 (Risk-Gated Confirmation):** Will add `delete_task` to the registry with a confirmation step — the registry makes this easy (add one entry, one handler)
- **Pattern 5 (Actor Abstraction):** May change the `ActionContext` type passed to handlers (replace `clientId: 0` with proper Actor) — but that's Pattern 5's concern, not Pattern 3's
