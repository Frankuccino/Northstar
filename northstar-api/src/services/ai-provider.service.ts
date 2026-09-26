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
}

export type ChatResult =
  | { kind: "text"; content: string; message: string; intent: string; payload: Record<string, unknown> }
  | { kind: "tool_call"; toolCall: { name: string; arguments: Record<string, unknown> } };

export class GroqProvider implements AiProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
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
    };

    if (params.tools?.length) {
      createParams.tools = params.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }

    const response = await this.client.chat.completions.create(createParams);
    const message = response.choices[0]?.message;

    // Tool call response?
    if (message?.tool_calls?.length) {
      const tc = message.tool_calls[0];
      if (tc.type === "function") {
        return {
          kind: "tool_call",
          toolCall: { name: tc.function.name, arguments: JSON.parse(tc.function.arguments) },
        };
      }
    }

    // Text response — fallback to parseResponse for help/unknown/fallback
    const content = message?.content ?? "";
    const parsed = this.parseResponse(content);
    return { kind: "text", ...parsed };
  }

  private parseResponse(content: string): {
    content: string;
    message: string;
    intent: string;
    payload: Record<string, unknown>;
  } {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          content: parsed.message ?? content,
          message: parsed.message ?? content,
          intent: parsed.intent ?? "unknown",
          payload: parsed.payload ?? {},
        };
      } catch {
        // Fall through to text parsing
      }
    }

    const lower = content.toLowerCase();
    if (lower.includes("create") || lower.includes("add")) {
      return { content, message: content, intent: "create_task", payload: { title: this.extractTitle(content) } };
    }
    if (lower.includes("move") || lower.includes("set")) {
      return { content, message: content, intent: "move_task", payload: { status: this.extractStatus(content) } };
    }
    if (lower.includes("assign")) {
      return { content, message: content, intent: "assign_task", payload: { assigneeId: this.extractAssignee(content) } };
    }

    return { content, message: content, intent: "unknown", payload: {} };
  }

  private extractTitle(text: string): string {
    const match = text.match(/(?:called|named|titled)\s+["']?([^"']+?)["']?(?:\s|$)/i);
    return match?.[1]?.trim() ?? "New Task";
  }

  private extractStatus(text: string): string {
    const statuses = ["backlog", "ai_drafting", "ready", "in_progress", "needs_revision", "validated", "done"];
    for (const status of statuses) {
      if (text.toLowerCase().includes(status)) return status;
    }
    return "backlog";
  }

  private extractAssignee(text: string): string {
    const match = text.match(/to\s+(\w+)/i);
    return match?.[1] ?? "";
  }
}

export const getAiProvider = (): AiProvider | null => {
  if (process.env.GROQ_API_KEY) {
    return new GroqProvider();
  }
  return null;
};
