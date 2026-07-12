import { describe, expect, it } from 'vitest';
import { CURRENT_ANALYSIS_SCHEMA_VERSION } from '../../types/ai-analysis';
import { ContentDocument } from '../../types/content-document';
import { parseAnalysisResponse } from './response-parser';

const document: ContentDocument = {
  captureId: 'c1',
  source: 'article',
  articleText: 'Sample article text for analysis.',
  extractedAt: Date.now()
};

describe('response-parser', () => {
  it('parses multi-lens analysis JSON', () => {
    const analysis = parseAnalysisResponse(
      'c1',
      JSON.stringify({
        lens: 'technology',
        summary: 'Redis memory overview',
        topics: ['redis', 'memory'],
        contentType: 'deep-dive',
        expectedValue: 'high',
        potentialDisappointment: 'low',
        viewerExpectation: {
          youWillGet: ['Why eviction policies matter'],
          youWillNotGet: ['Production tuning playbook']
        },
        lensFields: {
          implementationLevel: 'low',
          learningStyle: 'mixed',
          codeWalkthrough: true
        },
        recommendation: 'Read later',
        reasoning: 'Useful concepts, limited hands-on',
        confidence: 0.8
      }),
      document
    );

    expect(analysis.schemaVersion).toBe(CURRENT_ANALYSIS_SCHEMA_VERSION);
    expect(analysis.lens).toBe('technology');
    expect(analysis.expectedValue).toBe('high');
    expect(analysis.viewerExpectation.youWillGet).toEqual(['Why eviction policies matter']);
    expect(analysis.lensFields.implementationLevel).toBe('low');
    expect(analysis.lensFields.codeWalkthrough).toBe(true);
  });

  it('accepts legacy field names and defaults invalid values', () => {
    const analysis = parseAnalysisResponse(
      'c1',
      JSON.stringify({
        lens: 'invalid',
        expectedLearning: 'high',
        viewerExpectation: {
          youWillLearn: ['A'],
          youWillNotLearn: ['B']
        },
        implementationLevel: 'medium',
        confidence: 2
      }),
      document
    );

    expect(analysis.lens).toBe('general');
    expect(analysis.expectedValue).toBe('high');
    expect(analysis.viewerExpectation).toEqual({ youWillGet: ['A'], youWillNotGet: ['B'] });
    expect(analysis.confidence).toBe(1);
  });

  it('parses movie lens fields', () => {
    const analysis = parseAnalysisResponse(
      'c1',
      JSON.stringify({
        lens: 'movie',
        expectedValue: 'medium',
        viewerExpectation: { youWillGet: ['A tense thriller'], youWillNotGet: ['Spoilers'] },
        lensFields: { genre: 'thriller', spoilerRisk: 'high' },
        confidence: 0.7
      }),
      document
    );

    expect(analysis.lens).toBe('movie');
    expect(analysis.lensFields.genre).toBe('thriller');
  });
});
