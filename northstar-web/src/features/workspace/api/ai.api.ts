import { api } from "@/lib/axios";

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: {
    type: string;
    result: string;
  };
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

export const aiChat = async (
  projectId: number,
  message: string,
): Promise<{ content: string; message: string; intent: string; payload: Record<string, unknown>; executed: boolean }> => {
  const res = await api.post(`/workspace/projects/${projectId}/ai/chat`, { message });
  return res.data;
};
