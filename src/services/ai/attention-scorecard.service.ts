import { AIAnalysis, ExpectationLevel, ImplementationLevel, LearningStyle } from '../../types/ai-analysis';
import { AttentionScorecard, Recommendation } from '../../types/attention-scorecard';

const LEVEL_TO_STARS: Record<ExpectationLevel, number> = {
  low: 2,
  medium: 3,
  high: 5
};

const DISAPPOINTMENT_PENALTY: Record<ExpectationLevel, number> = {
  low: 0,
  medium: 0.75,
  high: 1.5
};

const LEARNING_STYLE_LABELS: Record<LearningStyle, string> = {
  conceptual: 'Conceptual',
  mixed: 'Mixed',
  practical: 'Practical'
};

const IMPLEMENTATION_LABELS: Record<ImplementationLevel, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

const DISAPPOINTMENT_LABELS: Record<ExpectationLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  read_now: 'Read Now',
  read_later: 'Read Later',
  skip: 'Skip'
};

const clampStars = (value: number): number => Math.min(5, Math.max(1, Math.round(value)));

export const deriveExpectedLearningStars = (analysis: AIAnalysis): number => {
  const base = LEVEL_TO_STARS[analysis.expectedLearning];
  const learnableCount = analysis.viewerExpectation.youWillLearn.length;

  if (learnableCount >= 4) {
    return clampStars(base + 0.5);
  }

  if (learnableCount <= 1 && analysis.expectedLearning !== 'high') {
    return clampStars(base - 0.5);
  }

  return clampStars(base);
};

export const deriveWorthYourTimeStars = (analysis: AIAnalysis): number => {
  const learningValue = LEVEL_TO_STARS[analysis.expectedLearning];
  const penalty = DISAPPOINTMENT_PENALTY[analysis.potentialDisappointment];
  const confidenceBoost = (analysis.confidence - 0.5) * 0.5;

  return clampStars(learningValue - penalty + confidenceBoost);
};

export const deriveRecommendation = (
  analysis: AIAnalysis,
  worthYourTimeStars: number
): Recommendation => {
  if (
    worthYourTimeStars >= 4 &&
    analysis.confidence >= 0.65 &&
    analysis.potentialDisappointment !== 'high'
  ) {
    return 'read_now';
  }

  if (worthYourTimeStars <= 2 || analysis.potentialDisappointment === 'high') {
    return 'skip';
  }

  return 'read_later';
};

export const buildAttentionScorecard = (analysis: AIAnalysis): AttentionScorecard => {
  const worthYourTimeStars = deriveWorthYourTimeStars(analysis);
  const recommendation = deriveRecommendation(analysis, worthYourTimeStars);
  const estimatedTimeMinutes = analysis.estimatedWatchTime ?? analysis.estimatedReadingTime;

  return {
    recommendation,
    recommendationLabel: RECOMMENDATION_LABELS[recommendation],
    worthYourTimeStars,
    confidencePercent: Math.round(analysis.confidence * 100),
    estimatedTimeMinutes,
    learningStyleLabel: LEARNING_STYLE_LABELS[analysis.learningStyle],
    implementationLevelLabel: IMPLEMENTATION_LABELS[analysis.implementationLevel],
    expectedLearningStars: deriveExpectedLearningStars(analysis),
    potentialDisappointmentLabel: DISAPPOINTMENT_LABELS[analysis.potentialDisappointment],
    youWillLearn: analysis.viewerExpectation.youWillLearn,
    youWillNotLearn: analysis.viewerExpectation.youWillNotLearn,
    recommendationText: analysis.recommendation.trim() || analysis.summary.trim() || analysis.reasoning.trim()
  };
};

export const renderStars = (count: number): string => {
  const filled = Math.min(5, Math.max(0, Math.round(count)));
  return `${'★'.repeat(filled)}${'☆'.repeat(5 - filled)}`;
};
