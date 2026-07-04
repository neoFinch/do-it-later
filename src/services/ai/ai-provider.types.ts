export interface AnalysisPrompt {
  system: string;
  user: string;
}

export type ProviderId = 'null' | 'openai' | 'ollama';

export interface AIProvider {
  readonly id: ProviderId;
  readonly displayName: string;
  isAvailable(): boolean;
  complete(prompt: AnalysisPrompt): Promise<string>;
}
