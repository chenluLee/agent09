export class KnowledgeAssistantError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly causeDetail?: string
  ) {
    super(message);
    this.name = "KnowledgeAssistantError";
  }
}

export function kaError(code: string, message: string, causeDetail?: string): KnowledgeAssistantError {
  return new KnowledgeAssistantError(code, message, causeDetail);
}
