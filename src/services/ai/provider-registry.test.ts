import { describe, expect, it, beforeEach } from 'vitest';
import { getActiveProvider, getProvider, listProviders } from './provider-registry';
import { saveAiConfig } from './ai-config.service';

describe('provider-registry', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lists available providers', () => {
    const ids = listProviders().map((provider) => provider.id);
    expect(ids).toContain('openai');
    expect(ids).toContain('ollama');
    expect(ids).toContain('local-llm');
    expect(ids).not.toContain('gemini');
  });

  it('keeps local-llm unavailable on web until native availability refresh', () => {
    saveAiConfig({
      providerId: 'local-llm',
      apiKey: '',
      model: 'on-device',
      baseUrl: '',
      autoAnalyze: true
    });

    expect(getProvider('local-llm').isAvailable()).toBe(false);
    expect(getActiveProvider().id).toBe('null');
  });

  it('returns null provider when openai is not configured', () => {
    saveAiConfig({
      providerId: 'openai',
      apiKey: '',
      model: 'gpt-4o-mini',
      baseUrl: '',
      autoAnalyze: true
    });

    expect(getActiveProvider().id).toBe('null');
    expect(getProvider('openai').isAvailable()).toBe(false);
  });

  it('activates openai when api key is present', () => {
    saveAiConfig({
      providerId: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
      baseUrl: '',
      autoAnalyze: true
    });

    expect(getActiveProvider().id).toBe('openai');
  });

  it('activates ollama when selected', () => {
    saveAiConfig({
      providerId: 'ollama',
      apiKey: '',
      model: 'llama3.2',
      baseUrl: 'http://localhost:11434',
      autoAnalyze: true
    });

    expect(getActiveProvider().id).toBe('ollama');
    expect(getProvider('ollama').isAvailable()).toBe(true);
  });
});
