import { describe, expect, it, vi, beforeEach } from 'vitest';
import { analyze } from './content-analysis.service';
import { ContentDocument } from '../../types/content-document';
import { CURRENT_ANALYSIS_SCHEMA_VERSION } from '../../types/ai-analysis';

vi.mock('./provider-registry', () => ({
  getActiveProvider: vi.fn(),
  getFallbackProvider: vi.fn()
}));

vi.mock('../../database/ai-analysis.repository', () => ({
  getAiAnalysis: vi.fn().mockResolvedValue(null)
}));

vi.mock('./prompt-builder', () => ({
  buildAnalysisPrompt: vi.fn(() => ({ system: 'system', user: 'user' }))
}));

vi.mock('./response-parser', () => ({
  parseAnalysisResponse: vi.fn((_captureId, raw) => ({
    schemaVersion: CURRENT_ANALYSIS_SCHEMA_VERSION,
    captureId: 'capture-1',
    lens: 'general',
    summary: raw,
    topics: [],
    contentType: 'other',
    targetAudience: [],
    viewerExpectation: { youWillGet: [], youWillNotGet: [] },
    expectedValue: 'medium',
    potentialDisappointment: 'medium',
    lensFields: {},
    recommendation: '',
    estimatedReadingTime: null,
    estimatedWatchTime: null,
    reasoning: '',
    confidence: 0.5,
    analyzedAt: Date.now()
  }))
}));

import { getActiveProvider, getFallbackProvider } from './provider-registry';
import { getAiAnalysis } from '../../database/ai-analysis.repository';
import { buildAnalysisPrompt } from './prompt-builder';

describe('content-analysis.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAiAnalysis).mockResolvedValue(null);
    vi.mocked(getFallbackProvider).mockReturnValue(null);
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

    const result = await analyze(document);
    expect(complete).toHaveBeenCalledWith({ system: 'system', user: 'user' });
    expect(result.summary).toBe('{"summary":"Done"}');
  });

  it('uses compact prompts for local-llm and falls back on failure', async () => {
    const localComplete = vi.fn().mockRejectedValue(new Error('BUSY'));
    const openaiComplete = vi.fn().mockResolvedValue('{"summary":"Fallback"}');

    vi.mocked(getActiveProvider).mockReturnValue({
      id: 'local-llm',
      displayName: 'On-device',
      isAvailable: () => true,
      complete: localComplete
    });
    vi.mocked(getFallbackProvider).mockReturnValue({
      id: 'openai',
      displayName: 'OpenAI',
      isAvailable: () => true,
      complete: openaiComplete
    });

    const result = await analyze({
      captureId: 'capture-1',
      source: 'note',
      articleText: 'text',
      extractedAt: Date.now()
    });

    expect(buildAnalysisPrompt).toHaveBeenCalledWith(expect.anything(), { compact: true });
    expect(openaiComplete).toHaveBeenCalled();
    expect(result.summary).toBe('{"summary":"Fallback"}');
  });

  it('returns cached analysis when force is false', async () => {
    const cached = {
      schemaVersion: CURRENT_ANALYSIS_SCHEMA_VERSION,
      captureId: 'capture-1',
      lens: 'technology' as const,
      summary: 'Cached',
      topics: [],
      contentType: 'other' as const,
      targetAudience: [],
      viewerExpectation: { youWillGet: [], youWillNotGet: [] },
      expectedValue: 'medium' as const,
      potentialDisappointment: 'medium' as const,
      lensFields: {},
      recommendation: 'Cached recommendation',
      estimatedReadingTime: null,
      estimatedWatchTime: null,
      reasoning: '',
      confidence: 0.9,
      analyzedAt: Date.now()
    };
    vi.mocked(getAiAnalysis).mockResolvedValue(cached);

    const result = await analyze({
      captureId: 'capture-1',
      source: 'note',
      articleText: 'Some note content',
      extractedAt: Date.now()
    });
    expect(result).toBe(cached);
    expect(getActiveProvider).not.toHaveBeenCalled();
  });

  it('throws when provider is unavailable', async () => {
    vi.mocked(getActiveProvider).mockReturnValue({
      id: 'null',
      displayName: 'None',
      isAvailable: () => false,
      complete: vi.fn()
    });
    vi.mocked(getFallbackProvider).mockReturnValue(null);

    await expect(
      analyze({
        captureId: 'capture-1',
        source: 'note',
        articleText: 'text',
        extractedAt: Date.now()
      })
    ).rejects.toThrow('No AI provider is configured.');
  });
});
