import { Capacitor } from '@capacitor/core';
import { AIProvider, AnalysisPrompt, LocalLlmAvailability } from '../ai-provider.types';

let cachedStatus: LocalLlmAvailability = 'unknown';
let refreshPromise: Promise<LocalLlmAvailability> | null = null;

const mapStatus = (status: string | undefined): LocalLlmAvailability => {
  if (status === 'available' || status === 'unavailable' || status === 'notready' || status === 'downloadable') {
    return status;
  }
  return 'unavailable';
};

export const getCachedLocalLlmAvailability = (): LocalLlmAvailability => cachedStatus;

export const refreshLocalLlmAvailability = async (): Promise<LocalLlmAvailability> => {
  if (!Capacitor.isNativePlatform()) {
    cachedStatus = 'unavailable';
    return cachedStatus;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const { LocalLLM } = await import('@capacitor/local-llm');
      const { status } = await LocalLLM.systemAvailability();
      cachedStatus = mapStatus(status);
    } catch {
      cachedStatus = 'unavailable';
    } finally {
      refreshPromise = null;
    }
    return cachedStatus;
  })();

  return refreshPromise;
};

export const downloadLocalLlmModel = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('On-device Local LLM is only available on native devices.');
  }

  const { LocalLLM } = await import('@capacitor/local-llm');
  await LocalLLM.download();
  await refreshLocalLlmAvailability();
};

export const localLlmProvider: AIProvider = {
  id: 'local-llm',
  displayName: 'On-device (Local LLM)',
  isAvailable: () => Capacitor.isNativePlatform() && cachedStatus === 'available',
  complete: async (prompt: AnalysisPrompt) => {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('On-device Local LLM is not supported on web.');
    }

    const status = cachedStatus === 'available' ? cachedStatus : await refreshLocalLlmAvailability();
    if (status !== 'available') {
      throw new Error(
        status === 'downloadable'
          ? 'On-device model is downloadable. Download it from Settings first.'
          : 'On-device Local LLM is not available on this device.'
      );
    }

    const { LocalLLM } = await import('@capacitor/local-llm');
    const { text } = await LocalLLM.prompt({
      instructions: prompt.system,
      prompt: prompt.user,
      options: {
        temperature: 0.2,
        maximumOutputTokens: 256
      }
    });

    if (!text?.trim()) {
      throw new Error('On-device Local LLM returned an empty response.');
    }

    return text;
  }
};
