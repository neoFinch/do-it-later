import { describe, expect, it, vi, beforeEach } from 'vitest';
import { analyze } from './content-analysis.service';
import { ContentDocument } from '../../types/content-document';

vi.mock('./provider-registry', () => ({
  getActiveProvider: vi.fn()
}));

vi.mock('../../database/ai-analysis.repository', () => ({
  getAiAnalysis: vi.fn().mockResolvedValue(null)
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
    implementationLevel: 'none',
    learningStyle: 'conceptual',
    codeWalkthrough: false,
    viewerExpectation: { youWillLearn: [], youWillNotLearn: [] },
    expectedLearning: 'medium',
    potentialDisappointment: 'medium',
    recommendation: '',
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
import { getAiAnalysis } from '../../database/ai-analysis.repository';

describe('content-analysis.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAiAnalysis).mockResolvedValue(null);
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

  it('returns cached analysis when force is false', async () => {
    const cached = {
      captureId: 'capture-1',
      summary: 'Cached',
      topics: [],
      difficulty: 'intermediate' as const,
      targetAudience: [],
      contentType: 'other' as const,
      implementationLevel: 'none' as const,
      learningStyle: 'conceptual' as const,
      codeWalkthrough: false,
      viewerExpectation: { youWillLearn: [], youWillNotLearn: [] },
      expectedLearning: 'medium' as const,
      potentialDisappointment: 'medium' as const,
      recommendation: 'Cached recommendation',
      estimatedReadingTime: null,
      estimatedWatchTime: null,
      prerequisites: [],
      learningOutcomes: [],
      keyTakeaways: [],
      reasoning: '',
      confidence: 0.9,
      analyzedAt: Date.now()
    };
    vi.mocked(getAiAnalysis).mockResolvedValue(cached);

    const document: ContentDocument = {
      captureId: 'capture-1',
      source: 'note',
      articleText: 'Some note content',
      extractedAt: Date.now()
    };

    const result = await analyze(document);
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
