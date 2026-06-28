import { describe, expect, it, vi, beforeEach } from 'vitest';
import { saveAiConfig } from '../ai-config.service';
import {
  OLLAMA_DEFAULT_BASE_URL,
  OLLAMA_DEFAULT_MODEL,
  ollamaProvider,
  resolveOllamaBaseUrl,
  resolveOllamaModel
} from './ollama.provider';

vi.mock('../../http.service', () => ({
  postRemote: vi.fn()
}));

import { postRemote } from '../../http.service';

describe('ollama.provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('normalizes base URL and model defaults', () => {
    expect(resolveOllamaBaseUrl('')).toBe(OLLAMA_DEFAULT_BASE_URL);
    expect(resolveOllamaBaseUrl('http://192.168.1.10:11434/')).toBe('http://192.168.1.10:11434');
    expect(resolveOllamaModel('')).toBe(OLLAMA_DEFAULT_MODEL);
    expect(resolveOllamaModel('mistral')).toBe('mistral');
  });

  it('is available when ollama is selected', () => {
    saveAiConfig({
      providerId: 'ollama',
      apiKey: '',
      model: 'llama3.2',
      baseUrl: '',
      autoAnalyze: true
    });

    expect(ollamaProvider.isAvailable()).toBe(true);
  });

  it('posts chat request to Ollama and returns message content', async () => {
    saveAiConfig({
      providerId: 'ollama',
      apiKey: '',
      model: 'llama3.2',
      baseUrl: 'http://localhost:11434',
      autoAnalyze: true
    });

    vi.mocked(postRemote).mockResolvedValue({
      status: 200,
      data: {
        message: {
          content: '{"summary":"Local analysis"}'
        }
      }
    });

    const result = await ollamaProvider.complete({ system: 'system', user: 'user' });

    expect(postRemote).toHaveBeenCalledWith('http://localhost:11434/api/chat', {
      timeoutMs: 300_000,
      headers: {},
      data: {
        model: 'llama3.2',
        stream: false,
        think: false,
        format: 'json',
        messages: [
          { role: 'system', content: 'system' },
          { role: 'user', content: 'user' }
        ]
      }
    });
    expect(result).toBe('{"summary":"Local analysis"}');
  });

  it('throws when Ollama returns an error', async () => {
    saveAiConfig({
      providerId: 'ollama',
      apiKey: '',
      model: 'missing-model',
      baseUrl: '',
      autoAnalyze: true
    });

    vi.mocked(postRemote).mockResolvedValue({
      status: 404,
      data: { error: 'model not found' }
    });

    await expect(ollamaProvider.complete({ system: 's', user: 'u' })).rejects.toThrow('model not found');
  });
});
