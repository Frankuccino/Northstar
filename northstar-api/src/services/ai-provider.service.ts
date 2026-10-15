import OpenAI from "openai";

export interface AiTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AiProvider {
  chat(params: {
    systemPrompt: string;
    userMessage: string;
    tools?: AiTool[];
    previousMessages?: Array<{ role: string; content: any; toolCallId?: string }>;
  }): Promise<ChatResult>;
  chatStream(params: {
    systemPrompt: string;
    userMessage: string;
    tools?: AiTool[];
    previousMessages?: Array<{ role: string; content: any; toolCallId?: string }>;
  }): AsyncGenerator<string>;
}

export type ChatResult =
  | { kind: "text"; content: string; message: string; intent: string; payload: Record<string, unknown> }
  | {
      kind: "tool_call";
      toolCallId: string;
      toolCall: { name: string; arguments: Record<string, unknown> };
      argumentsParseError?: string;
    };

export class GroqProvider implements AiProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  async *chatStream(params: {
    systemPrompt: string;
    userMessage: string;
    tools?: AiTool[];
    previousMessages?: Array<{ role: string; content: any; toolCallId?: string }>;
  }): AsyncGenerator<string> {
    const messages: Array<{ role: string; content: any; toolCallId?: string }> = [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userMessage },
    ];
    if (params.previousMessages) {
      messages.push(...params.previousMessages);
    }

    const createParams: any = {
      model: "openai/gpt-oss-120b",
      messages,
      temperature: 0.1,
      max_tokens: 500,
      stream: true,
      tool_choice: params.tools?.length ? "auto" : undefined,
    };

    if (params.tools?.length) {
      createParams.tools = params.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }

    const stream = (await this.client.chat.completions.create(
      createParams,
    )) as unknown as AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }>;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async chat(params: {
    systemPrompt: string;
    userMessage: string;
    tools?: AiTool[];
    previousMessages?: Array<{ role: string; content: any; toolCallId?: string }>;
  }): Promise<ChatResult> {
    const messages: Array<{ role: string; content: any; toolCallId?: string }> = [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userMessage },
    ];
    if (params.previousMessages) {
      messages.push(...params.previousMessages);
    }

    const createParams: any = {
      model: "openai/gpt-oss-120b",
      messages,
      temperature: 0.1,
      max_tokens: 500,
      tool_choice: params.tools?.length ? "auto" : undefined,
    };

    if (params.tools?.length) {
      createParams.tools = params.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      console.log("[AI] SDK tools:", JSON.stringify(createParams.tools));
    }

    const response = await this.client.chat.completions.create(createParams);
    const message = response.choices[0]?.message;

    // Tool call response?
    if (message?.tool_calls?.length) {
      const tc = message.tool_calls[0];
      if (tc.type === "function") {
        // Groq occasionally returns malformed or empty argument JSON. Parse
        // defensively so a bad payload surfaces as a tool error the LLM can
        // recover from, instead of a 400 that kills the whole request.
        let args: Record<string, unknown> = {};
        let parseError: string | null = null;
        const raw = tc.function.arguments ?? "";
        try {
          args = raw.trim() ? JSON.parse(raw) : {};
        } catch {
          parseError = raw;
          console.warn("[AI] Unparseable tool arguments:", raw);
        }
        return {
          kind: "tool_call",
          toolCallId: tc.id,
          toolCall: { name: tc.function.name, arguments: args },
          ...(parseError ? { argumentsParseError: parseError } : {}),
        } as ChatResult;
      }
    }

    // Text response. No intent guessing — the tool path decides what ran, and
    // a text response is just prose. See parseResponse for why.
    const content = message?.content ?? "";
    const parsed = this.parseResponse(content);
    return { kind: "text", ...parsed };
  }

  // Normalize a text response.
  //
  // This used to GUESS intent by keyword-matching the prose ("create", "move",
  // "assign") and regex out a payload. That guessing caused two real bugs:
  // the LLM's confirmation text ("Your task has been created") re-triggered a
  // mutation, and an explanation containing the phrase "you could also create
  // a new task" was reported as intent: create_task with a garbage payload.
  //
  // Intent is now decided by which tool actually ran. This method only strips
  // a stray JSON envelope if the model emits one and otherwise returns the
  // text unchanged.
  private parseResponse(content: string): {
    content: string;
    message: string;
    intent: string;
    payload: Record<string, unknown>;
  } {
    // A model may wrap prose in a JSON envelope. Unwrap it for display, but
    // never derive an intent from it — the tool path owns that.
    const jsonMatch = content.match(/\{[^{}]*"message"[^{}]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.message === "string") {
          return {
            content: parsed.message,
            message: parsed.message,
            intent: "unknown",
            payload: {},
          };
        }
      } catch {
        // Not a usable envelope — fall through and return the raw text.
      }
    }

    return { content, message: content, intent: "unknown", payload: {} };
  }
}

// Test seam. Tests install a stub here so the chat flow never reaches Groq;
// production leaves it null and falls through to the real provider.
let testProvider: AiProvider | null = null;

export const __setTestProvider = (p: AiProvider | null) => {
  testProvider = p;
};

export const getAiProvider = (): AiProvider | null => {
  if (testProvider) return testProvider;
  if (process.env.GROQ_API_KEY) {
    return new GroqProvider();
  }
  return null;
};
