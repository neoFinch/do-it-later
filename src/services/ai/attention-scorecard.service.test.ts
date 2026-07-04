import { describe, expect, it } from 'vitest';
import { AIAnalysis } from '../../types/ai-analysis';
import {
  buildAttentionScorecard,
  deriveExpectedLearningStars,
  deriveRecommendation,
  deriveWorthYourTimeStars,
  renderStars
} from './attention-scorecard.service';

const baseAnalysis = (): AIAnalysis => ({
  captureId: 'capture-1',
  topics: ['Memory'],
  difficulty: 'intermediate',
  targetAudience: ['Systems engineers'],
  contentType: 'deep-dive',
  implementationLevel: 'low',
  learningStyle: 'conceptual',
  codeWalkthrough: false,
  viewerExpectation: {
    youWillLearn: ['Why malloc exists', 'Memory allocation concepts', 'Common allocator challenges'],
    youWillNotLearn: ['Build your own allocator', 'Live coding', 'Step-by-step implementation']
  },
  expectedLearning: 'high',
  potentialDisappointment: 'medium',
  recommendation:
    'Worth watching if you want conceptual understanding. Skip if you are specifically looking for implementation.',
  estimatedReadingTime: null,
  estimatedWatchTime: 16,
  prerequisites: [],
  learningOutcomes: [],
  summary: '',
  keyTakeaways: [],
  reasoning: '',
  confidence: 0.91,
  analyzedAt: Date.now()
});

describe('attention-scorecard.service', () => {
  it('derives expected learning stars from structured level', () => {
    const analysis = baseAnalysis();
    expect(deriveExpectedLearningStars(analysis)).toBe(5);
    expect(deriveExpectedLearningStars({ ...analysis, expectedLearning: 'low' })).toBe(2);
  });

  it('derives worth-your-time stars with disappointment penalty', () => {
    const analysis = baseAnalysis();
    expect(deriveWorthYourTimeStars(analysis)).toBe(4);
    expect(
      deriveWorthYourTimeStars({
        ...analysis,
        expectedLearning: 'medium',
        potentialDisappointment: 'high',
        confidence: 0.5
      })
    ).toBeLessThanOrEqual(2);
  });

  it('derives recommendation tiers', () => {
    const analysis = baseAnalysis();
    expect(deriveRecommendation(analysis, 4)).toBe('read_now');
    expect(deriveRecommendation({ ...analysis, potentialDisappointment: 'high' }, 4)).toBe('skip');
    expect(deriveRecommendation({ ...analysis, confidence: 0.5 }, 3)).toBe('read_later');
  });

  it('builds a scorecard for the UI', () => {
    const scorecard = buildAttentionScorecard(baseAnalysis());

    expect(scorecard.recommendationLabel).toBe('Read Now');
    expect(scorecard.worthYourTimeStars).toBe(4);
    expect(scorecard.expectedLearningStars).toBe(5);
    expect(scorecard.potentialDisappointmentLabel).toBe('Medium');
    expect(scorecard.learningStyleLabel).toBe('Conceptual');
    expect(scorecard.implementationLevelLabel).toBe('Low');
    expect(scorecard.confidencePercent).toBe(91);
    expect(scorecard.estimatedTimeMinutes).toBe(16);
    expect(scorecard.youWillLearn).toHaveLength(3);
    expect(scorecard.recommendationText).toContain('conceptual understanding');
  });

  it('renders star strings', () => {
    expect(renderStars(4)).toBe('★★★★☆');
    expect(renderStars(5)).toBe('★★★★★');
  });
});
