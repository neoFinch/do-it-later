import { getAiConfig } from '../ai-config.service';
import { AIProvider, AnalysisPrompt } from '../ai-provider.types';
import { postRemote } from '../../http.service';

export const OLLAMA_DEFAULT_BASE_URL = 'http://192.168.1.10:11434';
export const OLLAMA_DEFAULT_MODEL = 'gemma2:2b';
export const OLLAMA_REQUEST_TIMEOUT_MS = 300_000;

export const resolveOllamaBaseUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.trim() || OLLAMA_DEFAULT_BASE_URL;
  return trimmed.replace(/\/+$/, '');
};

export const resolveOllamaModel = (model: string): string => {
  const trimmed = model.trim();
  return trimmed || OLLAMA_DEFAULT_MODEL;
};

export const ollamaProvider: AIProvider = {
  id: 'ollama',
  displayName: 'Ollama',
  isAvailable: () => getAiConfig().providerId === 'ollama',
  complete: async (prompt: AnalysisPrompt) => {
    const config = getAiConfig();
    const baseUrl = resolveOllamaBaseUrl(config.baseUrl);
    const model = resolveOllamaModel(config.model);
    const headers: Record<string, string> = {};
    const apiKey = config.apiKey.trim();

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const { status, data } = await postRemote(`${baseUrl}/api/chat`, {
      timeoutMs: OLLAMA_REQUEST_TIMEOUT_MS,
      headers,
      data: {
        model,
        stream: false,
        think: false,
        format: 'json',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ]
      }
    });

    if (status >= 400) {
      const message =
        typeof data === 'object' && data && 'error' in data
          ? String((data as { error?: string }).error ?? status)
          : `HTTP ${status}`;
      throw new Error(message);
    }

    const content = (data as { message?: { content?: string; thinking?: string } })?.message?.content;
    if (!content?.trim() || content.trim() === '{}') {
      const thinking = (data as { message?: { thinking?: string } })?.message?.thinking?.trim();
      if (thinking) {
        const jsonStart = thinking.indexOf('{');
        const jsonEnd = thinking.lastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          return thinking.slice(jsonStart, jsonEnd + 1);
        }
      }
      throw new Error('AI response was empty.');
    }

    return content;
  }
};
