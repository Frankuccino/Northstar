import { api } from "@/lib/axios";
import { env } from "@/lib/env";
import { getToken } from "@/features/auth/utils/token";

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: {
    type: string;
    result: string;
  };
  /** Live agent activity — tool calls the assistant made for this turn. */
  steps?: AgentStep[];
}

export interface AiIntentRequest {
  intent: string;
  payload: Record<string, unknown>;
}

export interface AiIntentResponse {
  ok: boolean;
  taskId?: number;
}

export const executeAiIntent = async (
  projectId: number,
  request: AiIntentRequest,
): Promise<AiIntentResponse> => {
  const res = await api.post(`/workspace/projects/${projectId}/ai/intent`, request);
  return res.data;
};

export interface AgentStep {
  tool: string;
  args: Record<string, unknown>;
  status: "running" | "done" | "error";
  summary?: string;
  ok?: boolean;
  durationMs?: number;
  at?: string;
}

export interface AiChatResponse {
  content: string;
  message: string;
  intent: string;
  payload: Record<string, unknown>;
  /** True only when a mutation tool ran (create/move/assign) — drives board refetch. */
  changed: boolean;
  executed: boolean;
  hadSearchStep: boolean;
  steps: AgentStep[];
}

export const aiChat = async (
  projectId: number,
  message: string,
): Promise<AiChatResponse> => {
  const res = await api.post(`/workspace/projects/${projectId}/ai/chat`, {
    message,
  });
  return res.data;
};

const API_BASE = env.apiUrl;

/**
 * Stream a chat turn over SSE.
 *
 * EventSource can't send a POST body or an Authorization header, so this uses
 * fetch + a ReadableStream and parses the SSE frames by hand. onStep fires as
 * each tool call starts and finishes; the returned promise resolves with the
 * terminal `done` payload (same shape as the non-streaming response).
 */
export async function aiChatStream(
  projectId: number,
  message: string,
  handlers: {
    onStep?: (step: AgentStep) => void;
    signal?: AbortSignal;
  } = {},
): Promise<AiChatResponse> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/workspace/projects/${projectId}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, stream: true }),
    signal: handlers.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Stream failed with status ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done: AiChatResponse | null = null;

  while (true) {
    const { value, done: finished } = await reader.read();
    if (finished) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    let split: number;
    while ((split = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const parsed = parseFrame(frame);
      if (!parsed) continue;

      if (parsed.event === "step") {
        handlers.onStep?.(parsed.data as AgentStep);
      } else if (parsed.event === "done") {
        done = parsed.data as AiChatResponse;
      } else if (parsed.event === "error") {
        throw new Error((parsed.data as any)?.message ?? "Stream error");
      }
    }
  }

  if (!done) throw new Error("Stream ended without a done frame");
  return done;
}

function parseFrame(frame: string): { event: string; data: unknown } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}
