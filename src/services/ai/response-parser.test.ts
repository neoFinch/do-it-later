import { describe, expect, it } from 'vitest';
import { parseAnalysisResponse } from './response-parser';
import { ContentDocument } from '../../types/content-document';

describe('response-parser', () => {
  const document: ContentDocument = {
    captureId: 'capture-1',
    source: 'article',
    articleText: 'word '.repeat(440),
    extractedAt: Date.now()
  };

  it('normalizes structured AI output', () => {
    const analysis = parseAnalysisResponse(
      'capture-1',
      JSON.stringify({
        topics: ['Redis', 'Caching'],
        difficulty: 'intermediate',
        targetAudience: ['Backend engineers'],
        contentType: 'deep-dive',
        containsCode: true,
        containsHandsOn: false,
        estimatedReadingTime: 18,
        estimatedWatchTime: null,
        prerequisites: ['Basic Redis usage'],
        learningOutcomes: ['Understand eviction policies'],
        summary: 'Explains Redis memory internals.',
        keyTakeaways: ['Memory is bounded', 'Eviction is configurable'],
        reasoning: 'Useful for backend engineers optimizing cache usage.',
        confidence: 1.4
      }),
      document
    );

    expect(analysis.captureId).toBe('capture-1');
    expect(analysis.topics).toEqual(['Redis', 'Caching']);
    expect(analysis.difficulty).toBe('intermediate');
    expect(analysis.estimatedReadingTime).toBe(18);
    expect(analysis.confidence).toBe(1);
  });

  it('falls back to heuristic time estimates', () => {
    const analysis = parseAnalysisResponse(
      'capture-2',
      JSON.stringify({
        topics: [],
        difficulty: 'unknown',
        targetAudience: 'not-an-array',
        contentType: 'unknown-type',
        containsCode: false,
        containsHandsOn: false,
        summary: 'Short summary',
        keyTakeaways: [],
        reasoning: 'Limited content',
        confidence: 'bad'
      }),
      document
    );

    expect(analysis.difficulty).toBe('intermediate');
    expect(analysis.contentType).toBe('other');
    expect(analysis.estimatedReadingTime).toBe(2);
    expect(analysis.confidence).toBe(0.5);
  });
});
