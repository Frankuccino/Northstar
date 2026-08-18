// LLM boundary. The product never trusts AI output as fact — every suggestion is
// validated by a human (see docs/WORKSPACE_AI_KANBAN.md). The provider is an
// interface so we can stub it in tests and drop a real key in via env later.
// No provider is hardcoded and no key is read at module load.

export type SuggestionType =
  | "context"
  | "approach"
  | "checklist"
  | "draft"
  | "commit_guidance";

export interface AiProvider {
  readonly name: string;
  generate(type: SuggestionType, context: string): Promise<string>;
}

// Deterministic stub — no network, no key. Produces plausible placeholder content
// so the async pipeline and validation flow are fully exercisable in dev/tests.
export class StubAiProvider implements AiProvider {
  readonly name = "stub";

  async generate(type: SuggestionType, context: string): Promise<string> {
    const prefix: Record<SuggestionType, string> = {
      context: "Context:",
      approach: "Suggested approach:",
      checklist: "Success checklist:",
      draft: "Draft:",
      commit_guidance: "Commit guidance:",
    };
    return `${prefix[type]} (stub) ${context.slice(0, 120)}`;
  }
}

// Single switch point for the active provider. Swap for a real implementation
// (e.g. OpenAIProvider) here without touching call sites.
export const aiProvider: AiProvider = new StubAiProvider();
