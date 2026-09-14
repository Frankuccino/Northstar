import { eq, and, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../db/index.js";
import { aiClients, type AiClientScope } from "../db/schema.js";

export function hashAiApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function registerAiClient(params: {
  name: string;
  scope?: AiClientScope;
}): Promise<{ id: number; apiKey: string; name: string; scope: AiClientScope }> {
  const rawKey = randomBytes(32).toString("hex");
  const hash = hashAiApiKey(rawKey);

  const [client] = await db
    .insert(aiClients)
    .values({
      name: params.name,
      apiKeyHash: hash,
      scope: params.scope ?? "write",
    })
    .returning();

  return {
    id: client.id,
    apiKey: rawKey,
    name: client.name,
    scope: client.scope as AiClientScope,
  };
}

export async function verifyAiClient(apiKey: string) {
  const hash = hashAiApiKey(apiKey);
  const [client] = await db
    .select()
    .from(aiClients)
    .where(and(eq(aiClients.apiKeyHash, hash), isNull(aiClients.revokedAt)))
    .limit(1);

  if (!client) {
    throw new Error("Invalid AI client credentials");
  }

  return client;
}
