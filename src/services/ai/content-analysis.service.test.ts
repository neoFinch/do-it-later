import { describe, expect, it, vi, beforeEach } from 'vitest';
import { analyzeContent } from './content-analysis.service';
import { ContentDocument } from '../../types/content-document';

vi.mock('./provider-registry', () => ({
  getActiveProvider: vi.fn()
}));

vi.mock('./prompt-builder', () => ({
  buildAnalysisPrompt: vi.fn(() => ({ system: 'system', user: 'user' }))
}));

vi.mock('./response-parser', () => ({
  parseAnalysisResponse: vi.fn((_captureId, raw) => ({
    captureId: 'capture-1',
    summary: raw,
    topics: [],
    difficulty: 'intermediate',
    targetAudience: [],
    contentType: 'other',
    containsCode: false,
    containsHandsOn: false,
    estimatedReadingTime: null,
    estimatedWatchTime: null,
    prerequisites: [],
    learningOutcomes: [],
    keyTakeaways: [],
    reasoning: '',
    confidence: 0.5,
    analyzedAt: Date.now()
  }))
}));

import { getActiveProvider } from './provider-registry';

describe('content-analysis.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls provider.complete and parses response', async () => {
    const complete = vi.fn().mockResolvedValue('{"summary":"Done"}');
    vi.mocked(getActiveProvider).mockReturnValue({
      id: 'openai',
      displayName: 'OpenAI',
      isAvailable: () => true,
      complete
    });

    const document: ContentDocument = {
      captureId: 'capture-1',
      source: 'note',
      articleText: 'Some note content',
      extractedAt: Date.now()
    };

    const result = await analyzeContent(document);
    expect(complete).toHaveBeenCalledWith({ system: 'system', user: 'user' });
    expect(result.summary).toBe('{"summary":"Done"}');
  });

  it('throws when provider is unavailable', async () => {
    vi.mocked(getActiveProvider).mockReturnValue({
      id: 'null',
      displayName: 'None',
      isAvailable: () => false,
      complete: vi.fn()
    });

    await expect(
      analyzeContent({
        captureId: 'capture-1',
        source: 'note',
        articleText: 'text',
        extractedAt: Date.now()
      })
    ).rejects.toThrow('No AI provider is configured.');
  });
});
