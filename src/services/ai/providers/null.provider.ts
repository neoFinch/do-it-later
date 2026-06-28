import { AIProvider } from '../ai-provider.types';

export const nullProvider: AIProvider = {
  id: 'null',
  displayName: 'None',
  isAvailable: () => false,
  complete: async () => {
    throw new Error('No AI provider is configured.');
  }
};
