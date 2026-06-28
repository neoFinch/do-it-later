import { describe, expect, it, beforeEach } from 'vitest';
import { getAiConfig, saveAiConfig } from './ai-config.service';
import { getActiveProvider, shouldAutoAnalyze } from './provider-registry';

describe('ai-config.service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing is saved', () => {
    expect(getAiConfig().providerId).toBe('openai');
    expect(getAiConfig().model).toBe('gpt-4o-mini');
    expect(getAiConfig().autoAnalyze).toBe(true);
  });

  it('persists provider and api key', () => {
    saveAiConfig({
      providerId: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
      baseUrl: '',
      autoAnalyze: true
    });

    expect(getAiConfig().apiKey).toBe('sk-test');
    expect(getActiveProvider().id).toBe('openai');
    expect(shouldAutoAnalyze()).toBe(true);
  });
});
