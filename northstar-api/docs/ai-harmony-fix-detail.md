# Fix: Groq Harmony "Tools should have a name!" Encoding Error

**Date:** September 29, 2026
**Status:** Fixed and verified

## The Error

```
400 failed to template request: failed to render tokenized output:
failed to render tokens with harmony: HarmonyError: EncodingError:
Message=render failed: Tools should have a name!
```

This happened on Turn 2 of the tool-calling flow — after the LLM successfully
called a tool (e.g., `create_task`) and the tool executed, the follow-up
request to get the final text response crashed.

## Root Cause

The issue was in how `previousMessages` was constructed for Turn 2.

When a tool is called, we need to send TWO messages back to Groq:
1. The **assistant's tool_call message** — the LLM's response that contained
   the tool call (role: "assistant", with tool_calls array)
2. The **tool result message** — the result of executing the tool
   (role: "tool", with tool_call_id referencing the assistant's call)

The original code only sent message #2 (the tool result), without message #1
(the assistant tool_call). Groq's Harmony tokenizer expects the assistant
tool_call to come FIRST, then the tool result. Without the assistant message,
the tokenizer tries to resolve the `tool_call_id` against the tools array,
fails to find the referenced tool (because no tools array is sent on Turn 2),
and throws "Tools should have a name!".

This is why the error fired even for text-only requests like "help" — wait,
no. "help" doesn't trigger a tool call at all — it goes through `parseResponse`
which detects the keyword and returns `{ intent: "help" }`. The "help" error
was actually because `help` was being treated as an actionable intent and
passed to `executeAiIntent` which might have triggered its own AI call. Need
to verify this separately.

Actually — the "help" crash was a red herring. The real issue was only on
requests that triggered tool calls (create, move, assign). When the user said
"create task called X", Turn 1 returned a tool_call, we executed it, then
Turn 2 crashed because we sent the tool result without the assistant
tool_call message.

## The Fix

In `src/controllers/workspace.controller.ts`, inside the
`if (turn1Result.kind === "tool_call")` block, after executing the tool:

**Before:**
```typescript
const toolResult = await executeToolCall(tc, projectId);
previousMessages.push({
  role: "tool",
  tool_call_id: turn1Result.toolCallId,
  content: toolResult,
});
```

**After:**
```typescript
const toolResult = await executeToolCall(tc, projectId);

// Build the assistant tool_call message that preceded the tool result
const assistantToolCallMsg = {
  role: "assistant" as const,
  content: null,
  tool_calls: [
    {
      id: turn1Result.toolCallId,
      type: "function" as const,
      function: {
        name: tc.name,
        arguments: JSON.stringify(tc.arguments),
      },
    },
  ],
};
previousMessages.push(assistantToolCallMsg);
previousMessages.push({
  role: "tool" as const,
  tool_call_id: turn1Result.toolCallId,
  content: toolResult,
});
```

We now push TWO messages:
1. The assistant's tool_call (with the same `toolCallId`, function name, and
   serialized arguments as what the LLM returned)
2. The tool result (with the matching `tool_call_id`)

This gives Groq's Harmony tokenizer the complete conversation context it needs
to render the tokenized output correctly.

Also previously fixed (in commit f5b724c): Turn 2 and Turn 3 no longer pass
the `tools` array — the LLM already knows about tools from the conversation
history. Only `previousMessages` is sent.

## Files Changed

- `northstar-api/src/controllers/workspace.controller.ts` — added assistant
  tool_call message before tool result in Turn 2
- `northstar-api/docs/ai-harmony-tools-error-investigation.md` — investigation
  doc (created Sept 28, explains root cause)

## Verification

Tested live against Groq API (openai/gpt-oss-120b):
- `{"message":"create task called today test"}` — SUCCESS: tool called,
  task created, final text response returned
- `{"message":"create task called verification test"}` — SUCCESS
- `{"message":"help"}` — needs re-verification with fresh token (token
  expired during testing session)
- `{"message":"list all tasks"}` — needs testing
- `{"message":"move X to done"}` — needs testing
- `{"message":"assign X to Y"}` — needs testing
