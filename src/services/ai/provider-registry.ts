import { getAiConfig } from './ai-config.service';
import { AIProvider, ProviderId } from './ai-provider.types';
import { nullProvider } from './providers/null.provider';
import { openAiProvider } from './providers/openai.provider';
import { ollamaProvider } from './providers/ollama.provider';
import { claudeProvider, geminiProvider, proxyProvider } from './providers/stub.provider';

const providers: AIProvider[] = [
  nullProvider,
  openAiProvider,
  ollamaProvider,
  geminiProvider,
  claudeProvider,
  proxyProvider
];

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

export const isActiveProviderAvailable = (): boolean => {
  return getActiveProvider().isAvailable();
};

export const shouldAutoAnalyze = (): boolean => {
  const config = getAiConfig();
  return config.autoAnalyze && isActiveProviderAvailable();
};
