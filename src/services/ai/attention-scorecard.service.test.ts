import { describe, expect, it } from 'vitest';
import { CURRENT_ANALYSIS_SCHEMA_VERSION } from '../../types/ai-analysis';
import {
  buildAttentionScorecard,
  deriveExpectedValueStars,
  deriveWorthYourTimeStars,
  resolveRecommendationText
} from './attention-scorecard.service';
import { AIAnalysis } from '../../types/ai-analysis';

const analysis: AIAnalysis = {
  schemaVersion: CURRENT_ANALYSIS_SCHEMA_VERSION,
  captureId: 'c1',
  lens: 'technology',
  summary: 'Allocator overview',
  topics: ['memory'],
  contentType: 'deep-dive',
  targetAudience: ['engineers'],
  estimatedReadingTime: 20,
  estimatedWatchTime: null,
  viewerExpectation: {
    youWillGet: ['Why malloc exists', 'Memory allocation concepts', 'Common allocator challenges'],
    youWillNotGet: ['A production allocator']
  },
  expectedValue: 'high',
  potentialDisappointment: 'low',
  lensFields: {
    implementationLevel: 'low',
    learningStyle: 'conceptual',
    codeWalkthrough: false
  },
  recommendation: 'Read now',
  reasoning: 'Strong conceptual value',
  confidence: 0.8,
  analyzedAt: Date.now()
};

describe('attention-scorecard.service', () => {
  it('derives expected value stars from structured level', () => {
    expect(deriveExpectedValueStars(analysis)).toBe(5);
    expect(deriveExpectedValueStars({ ...analysis, expectedValue: 'low' })).toBe(2);
  });

  it('builds lens-aware scorecard metrics', () => {
    const scorecard = buildAttentionScorecard({
      ...analysis,
      expectedValue: 'medium',
      potentialDisappointment: 'low',
      confidence: 0.9
    });

    expect(scorecard.lensLabel).toBe('Technology');
    expect(scorecard.highlightMetrics.some((metric) => metric.label === 'Implementation')).toBe(true);
    expect(scorecard.youWillGet).toHaveLength(3);
    expect(scorecard.expectedValueStars).toBeGreaterThanOrEqual(3);
  });

  it('uses movie metrics for movie lens', () => {
    const scorecard = buildAttentionScorecard({
      ...analysis,
      lens: 'movie',
      lensFields: { genre: 'comedy', spoilerRisk: 'low' }
    });
    expect(scorecard.lensLabel).toBe('Movie');
    expect(scorecard.highlightMetrics.find((metric) => metric.label === 'Genre')?.value).toBe('comedy');
  });

  it('derives worth-your-time stars with disappointment penalty', () => {
    expect(deriveWorthYourTimeStars(analysis)).toBeGreaterThanOrEqual(4);
    expect(
      deriveWorthYourTimeStars({
        ...analysis,
        expectedValue: 'high',
        potentialDisappointment: 'high',
        confidence: 0.5
      })
    ).toBeLessThanOrEqual(4);
  });

  it('hides recommendation text that only repeats the Skip verdict', () => {
    expect(
      resolveRecommendationText(
        {
          ...analysis,
          recommendation: 'Skip',
          summary: 'skip',
          reasoning: ''
        },
        'Skip'
      )
    ).toBe('');

    expect(
      resolveRecommendationText(
        {
          ...analysis,
          recommendation: 'Skip',
          summary: 'Mostly fluff with little practical payoff.'
        },
        'Skip'
      )
    ).toBe('Mostly fluff with little practical payoff.');
  });
});
