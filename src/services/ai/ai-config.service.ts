import { ProviderId } from './ai-provider.types';

const STORAGE_KEY = 'capture_inbox:ai_config';

export interface AiConfig {
  providerId: ProviderId;
  apiKey: string;
  model: string;
  baseUrl: string;
  autoAnalyze: boolean;
}

const DEFAULT_MODEL = 'gpt-4o-mini';

export const DEFAULT_AI_CONFIG: AiConfig = {
  providerId: 'openai',
  apiKey: '',
  model: DEFAULT_MODEL,
  baseUrl: '',
  autoAnalyze: true
};

const VALID_PROVIDER_IDS: ProviderId[] = ['null', 'openai', 'ollama', 'gemini', 'claude', 'proxy'];

const normalizeProviderId = (value: unknown): ProviderId => {
  if (typeof value === 'string' && VALID_PROVIDER_IDS.includes(value as ProviderId)) {
    return value as ProviderId;
  }
  return 'openai';
};

export const getAiConfig = (): AiConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_AI_CONFIG };
    }

    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    return {
      providerId: normalizeProviderId(parsed.providerId),
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : DEFAULT_MODEL,
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
      autoAnalyze: parsed.autoAnalyze !== false
    };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
};

export const saveAiConfig = (config: AiConfig): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};
