# Fix: Groq Harmony "Tools should have a name!" Encoding Error

**Date:** September 28, 2026
**Status:** Root cause identified, fix in progress

## The Error

```
400 failed to template request: failed to render tokenized output:
failed to render tokens with harmony: HarmonyError: EncodingError:
Message=render failed: Tools should have a name!
```

## What's Happening

The AI chat endpoint (`POST /workspace/projects/:id/ai/chat`) uses a multi-turn tool-calling flow:

1. **Turn 1:** Send user message + tool definitions to Groq → LLM returns a `tool_call` (e.g., `create_task`)
2. **Execute:** Run the tool locally (create the task in the DB)
3. **Turn 2:** Send the tool result back to Groq + same tool definitions → get final text response

**Turn 1 succeeds.** The LLM correctly calls a tool, and the tool executes.
**Turn 2 crashes** with the Harmony encoding error, before any response is returned.

### Log Evidence

From the backend log, Turn 1's SDK tools are logged correctly:

```
[AI] SDK tools: [{"type":"function","function":{"name":"search_tasks",...}},
{"type":"function","function":{"name":"create_task",...}}, ...]
```

All 6 tools have `name`, `type`, `function`, `parameters` — correct structure.

Turn 2's SDK tools are ALSO logged correctly (same array). But then the crash
happens INSIDE the `provider.chat()` call — after the log but before the
`[AI] Turn 2:` console.log can print.

This means the Groq SDK receives the tools array, processes it internally, and
fails during tokenization/rendering — despite the tools being structurally valid.

## Root Cause Hypothesis

The Groq SDK (`openai` npm package → Groq API) internally mutates the `tools`
array when it processes a `chat.completions.create()` call with tool calls.

On **Turn 1**, the `tools` array is passed fresh. The SDK may mutate it during
the API call (e.g., adding internal metadata, restructuring). This doesn't
affect Turn 1's response.

On **Turn 2**, the SAME `tools` array variable (or a shallow `.map()` clone)
is passed again. If the SDK mutated the original array during Turn 1, Turn 2
receives a corrupted array. The Harmony encoder then fails because some tool
object is missing its `name` field (or has an unexpected structure).

The log shows correct tools because the log happens BEFORE the SDK processes
them on Turn 2 — it logs the pre-mutation state.

### Why the Shallow Clone Doesn't Help

The code on Turn 2/T3 uses:
```typescript
tools: tools.map((t) => ({ ...t }))
```

This creates a new array with new object references, but `...t` only does a
**shallow** clone — nested objects (like `parameters`) are still shared
references. More importantly, if the SDK mutated the ORIGINAL `tools` array
elements during Turn 1, the shallow clone captures the mutated state.

The Turn 2 SDK tools log uses the same `tools.map(...)` approach and shows
correct tools — but this is the state BEFORE Turn 2's SDK call. The SDK may
further mutate during Turn 2's processing, causing the crash.

## Fix Approach

**Remove `tools` from Turn 2 and Turn 3 entirely.**

The LLM already knows about the tools from Turn 1's assistant message. When
Turn 1 returns a `tool_call`, that message (with the function name and
arguments) is part of the conversation history sent to Turn 2. The LLM doesn't
need the tool definitions resent — it just needs the tool result and the
conversation context.

### What Changes

In `workspace.controller.ts`, the `aiChatHandler` function:

**Before (Turn 2):**
```typescript
const turn2Result = await provider.chat({
  systemPrompt: buildAiSystemPrompt(),
  userMessage: message,
  tools: [ ... inline copy of all 6 tools ... ],
  previousMessages,
});
```

**After (Turn 2):**
```typescript
const turn2Result = await provider.chat({
  systemPrompt: buildAiSystemPrompt(),
  userMessage: message,
  previousMessages,
});
```

Same for Turn 3 (the search-results follow-up turn).

### Why This Works

1. **No more mutated tools** — each turn gets a fresh call without the
   potentially-corrupted `tools` array
2. **Standard pattern** — in OpenAI/Groq tool-calling flows, you typically
   only send `tools` on the first turn. Subsequent turns use the conversation
   history (which includes the assistant's tool_call messages) to maintain
   context
3. **The LLM knows the tools** — Turn 1's assistant message containing the
   tool_call tells the LLM which tools exist and how they were called

### Trade-off

If the LLM needs to make a SECOND tool call on Turn 2 (e.g., search then
move), it won't be able to — there are no tool definitions on Turn 2. But
this is an edge case: the current flow handles `create_task` (single tool
call → text response) and `search_tasks` → `move_task`/`assign_task` (two
tool calls across Turn 1 and Turn 2).

For the search-then-mutate case, the current code already handles it: Turn 1
calls `search_tasks`, the controller executes the search and adds the result
to `previousMessages`, then Turn 2 (WITHOUT tools) sends the search results
back. The LLM sees the search results and can respond with text — but it
can't call `move_task` on Turn 2 without tools.

This means the search-before-move pattern needs adjustment: either the LLM
must call `move_task` in the same turn as `search_tasks` (not possible with
current SDK — one tool call per turn), or we need a different approach (e.g.,
the controller auto-searches when it sees a move/assign intent, or we accept
that multi-step tool flows need tools on follow-up turns and find another fix).

## Current State

- The `tools` array is still being passed on Turn 2 and Turn 3 (fix not yet
  applied to the file)
- The `executeToolCall` function looks correct — uses service functions
  (`createTask`, `moveTask`, `assignTask`, `getAssignableUsers`) instead of
  raw DB queries
- The `create_task` case in `executeToolCall` correctly uses `const task =`
  instead of `const [task] =` (the destructuring bug was fixed)

## Files

- `northstar-api/src/controllers/workspace.controller.ts` — `aiChatHandler`
  function, lines ~614-752 (Turn 2 and Turn 3 calls)
- `northstar-api/src/services/ai-provider.service.ts` — `GroqProvider.chat()`
  method, lines 32-80
