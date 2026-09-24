import OpenAI from "openai";

export interface AiProvider {
  chat(params: {
    systemPrompt: string;
    userMessage: string;
  }): Promise<{ content: string; message: string; intent: string; payload: Record<string, unknown> }>;
}

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
  }): Promise<{ content: string; message: string; intent: string; payload: Record<string, unknown> }> {
    const response = await this.client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userMessage },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content ?? "";
    return this.parseResponse(content);
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
