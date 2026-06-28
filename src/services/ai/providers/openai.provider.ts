import { getAiConfig } from '../ai-config.service';
import { AIProvider, AnalysisPrompt } from '../ai-provider.types';
import { postRemote } from '../../http.service';

export const openAiProvider: AIProvider = {
  id: 'openai',
  displayName: 'OpenAI',
  isAvailable: () => getAiConfig().providerId === 'openai' && getAiConfig().apiKey.trim().length > 0,
  complete: async (prompt: AnalysisPrompt) => {
    const config = getAiConfig();
    const apiKey = config.apiKey.trim();
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured.');
    }

    const { status, data } = await postRemote('https://api.openai.com/v1/chat/completions', {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      data: {
        model: config.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ]
      }
    });

    if (status >= 400) {
      const message =
        typeof data === 'object' && data && 'error' in data
          ? String((data as { error?: { message?: string } }).error?.message ?? status)
          : `HTTP ${status}`;
      throw new Error(message);
    }

    const content = (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message
      ?.content;
    if (!content) {
      throw new Error('AI response was empty.');
    }
    return content;
  }
};
