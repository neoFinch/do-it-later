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
        implementationLevel: 'low',
        learningStyle: 'mixed',
        codeWalkthrough: true,
        expectedLearning: 'high',
        potentialDisappointment: 'medium',
        viewerExpectation: {
          youWillLearn: ['Why eviction policies matter'],
          youWillNotLearn: ['Live coding', 'Build-along exercises']
        },
        recommendation: 'Worth reading for conceptual understanding.',
        estimatedReadingTime: 18,
        estimatedWatchTime: null,
        confidence: 1.4
      }),
      document
    );

    expect(analysis.captureId).toBe('capture-1');
    expect(analysis.implementationLevel).toBe('low');
    expect(analysis.expectedLearning).toBe('high');
    expect(analysis.potentialDisappointment).toBe('medium');
    expect(analysis.recommendation).toBe('Worth reading for conceptual understanding.');
    expect(analysis.viewerExpectation.youWillLearn).toEqual(['Why eviction policies matter']);
    expect(analysis.estimatedReadingTime).toBe(18);
    expect(analysis.confidence).toBe(1);
  });

  it('falls back to heuristic time estimates and defaults', () => {
    const analysis = parseAnalysisResponse(
      'capture-2',
      JSON.stringify({
        implementationLevel: 'invalid',
        learningStyle: 'invalid',
        summary: 'Short summary',
        confidence: 'bad'
      }),
      document
    );

    expect(analysis.implementationLevel).toBe('none');
    expect(analysis.learningStyle).toBe('conceptual');
    expect(analysis.expectedLearning).toBe('medium');
    expect(analysis.potentialDisappointment).toBe('medium');
    expect(analysis.viewerExpectation).toEqual({ youWillLearn: [], youWillNotLearn: [] });
    expect(analysis.estimatedReadingTime).toBe(2);
    expect(analysis.confidence).toBe(0.5);
  });
});
