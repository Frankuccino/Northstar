import { api } from "@/lib/axios";

const AI_KEY_STORAGE = "northstar-ai-key";

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

const getStoredKey = (): string | null => {
  return localStorage.getItem(AI_KEY_STORAGE);
};

const registerClient = async (projectId: number): Promise<string> => {
  const res = await api.post(`/workspace/projects/${projectId}/ai/clients`, {
    name: "Northstar Web",
    scope: "write",
  });
  return res.data.apiKey;
};

const ensureAiKey = async (projectId: number): Promise<string> => {
  const existingKey = getStoredKey();
  if (existingKey) return existingKey;

  const newKey = await registerClient(projectId);
  localStorage.setItem(AI_KEY_STORAGE, newKey);
  return newKey;
};

export const executeAiIntent = async (
  projectId: number,
  request: AiIntentRequest,
): Promise<AiIntentResponse> => {
  const apiKey = await ensureAiKey(projectId);
  const res = await api.post(`/workspace/projects/${projectId}/ai/intent`, request, {
    headers: { "x-ai-api-key": apiKey },
  });
  return res.data;
};
