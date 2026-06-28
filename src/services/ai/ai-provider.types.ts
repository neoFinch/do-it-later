export interface AnalysisPrompt {
  system: string;
  user: string;
}

export type ProviderId = 'null' | 'openai' | 'ollama' | 'gemini' | 'claude' | 'proxy';

export interface AIProvider {
  readonly id: ProviderId;
  readonly displayName: string;
  isAvailable(): boolean;
  complete(prompt: AnalysisPrompt): Promise<string>;
}
