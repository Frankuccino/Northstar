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

export const getAiActions = async (projectId: number): Promise<any[]> => {
  const res = await api.get(`/workspace/projects/${projectId}/ai/actions`);
  return res.data;
};

export const listAiTools = async (projectId: number): Promise<any[]> => {
  const res = await api.get(`/workspace/projects/${projectId}/ai/actions/tools`);
  return res.data;
};
