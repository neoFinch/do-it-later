import { AIProvider, ProviderId } from '../ai-provider.types';

const createStubProvider = (id: Exclude<ProviderId, 'null' | 'openai'>, displayName: string): AIProvider => ({
  id,
  displayName,
  isAvailable: () => false,
  complete: async () => {
    throw new Error(`${displayName} provider is not implemented yet.`);
  }
});

export const geminiProvider = createStubProvider('gemini', 'Gemini');
export const claudeProvider = createStubProvider('claude', 'Claude');
export const proxyProvider = createStubProvider('proxy', 'Backend proxy');
