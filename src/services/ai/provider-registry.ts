import { getAiConfig } from './ai-config.service';
import { AIProvider, ProviderId } from './ai-provider.types';
import { nullProvider } from './providers/null.provider';
import { openAiProvider } from './providers/openai.provider';
import { ollamaProvider } from './providers/ollama.provider';
import { localLlmProvider } from './providers/local-llm.provider';

const providers: AIProvider[] = [nullProvider, openAiProvider, ollamaProvider, localLlmProvider];

const providerMap = new Map<ProviderId, AIProvider>(providers.map((provider) => [provider.id, provider]));

export const listProviders = (): AIProvider[] => providers.filter((provider) => provider.id !== 'null');

export const getProvider = (id: ProviderId): AIProvider => {
  return providerMap.get(id) ?? nullProvider;
};

export const getActiveProvider = (): AIProvider => {
  const config = getAiConfig();
  const provider = getProvider(config.providerId);
  return provider.isAvailable() ? provider : nullProvider;
};

/** Prefer cloud/network providers when on-device fails or is unavailable. */
export const getFallbackProvider = (failedId?: ProviderId): AIProvider | null => {
  const order: ProviderId[] = ['openai', 'ollama'];
  for (const id of order) {
    if (id === failedId) {
      continue;
    }
    const provider = getProvider(id);
    if (provider.isAvailable()) {
      return provider;
    }
  }
  return null;
};

export const isActiveProviderAvailable = (): boolean => {
  return getActiveProvider().isAvailable() || getFallbackProvider() != null;
};

export const shouldAutoAnalyze = (): boolean => {
  const config = getAiConfig();
  return config.autoAnalyze && isActiveProviderAvailable();
};
