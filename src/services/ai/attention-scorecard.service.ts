import { AIAnalysis, ExpectationLevel } from '../../types/ai-analysis';
import { AttentionScorecard, Recommendation } from '../../types/attention-scorecard';
import { getLensPack } from './lenses';

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

export const deriveExpectedValueStars = (analysis: AIAnalysis): number => {
  const base = LEVEL_TO_STARS[analysis.expectedValue];
  const promiseCount = analysis.viewerExpectation.youWillGet.length;

  if (promiseCount >= 4) {
    return clampStars(base + 0.5);
  }

  if (promiseCount <= 1 && analysis.expectedValue !== 'high') {
    return clampStars(base - 0.5);
  }

  return clampStars(base);
};

/** @deprecated Use deriveExpectedValueStars */
export const deriveExpectedLearningStars = deriveExpectedValueStars;

export const deriveWorthYourTimeStars = (analysis: AIAnalysis): number => {
  const value = LEVEL_TO_STARS[analysis.expectedValue];
  const penalty = DISAPPOINTMENT_PENALTY[analysis.potentialDisappointment];
  const confidenceBoost = (analysis.confidence - 0.5) * 0.5;

  return clampStars(value - penalty + confidenceBoost);
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

const normalizeVerdictText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

/** Drop LLM recommendation text when it only repeats the derived verdict (e.g. "Skip" under "Skip"). */
export const resolveRecommendationText = (
  analysis: AIAnalysis,
  recommendationLabel: string
): string => {
  const candidates = [analysis.recommendation, analysis.summary, analysis.reasoning]
    .map((value) => value.trim())
    .filter(Boolean);

  const verdict = normalizeVerdictText(recommendationLabel);
  const verdictAliases = new Set([
    verdict,
    normalizeVerdictText(recommendationLabel.replace(/\s+/g, '_')),
    'skip',
    'read now',
    'read later',
    'read_now',
    'read_later'
  ]);

  for (const candidate of candidates) {
    if (!verdictAliases.has(normalizeVerdictText(candidate))) {
      return candidate;
    }
  }

  return '';
};

export const buildAttentionScorecard = (analysis: AIAnalysis): AttentionScorecard => {
  const worthYourTimeStars = deriveWorthYourTimeStars(analysis);
  const recommendation = deriveRecommendation(analysis, worthYourTimeStars);
  const recommendationLabel = RECOMMENDATION_LABELS[recommendation];
  const estimatedTimeMinutes = analysis.estimatedWatchTime ?? analysis.estimatedReadingTime;
  const pack = getLensPack(analysis.lens);

  return {
    recommendation,
    recommendationLabel,
    worthYourTimeStars,
    confidencePercent: Math.round(analysis.confidence * 100),
    estimatedTimeMinutes,
    lensLabel: pack.label,
    highlightMetrics: pack.metrics(analysis.lensFields ?? {}),
    expectedValueStars: deriveExpectedValueStars(analysis),
    potentialDisappointmentLabel: DISAPPOINTMENT_LABELS[analysis.potentialDisappointment],
    youWillGet: analysis.viewerExpectation.youWillGet,
    youWillNotGet: analysis.viewerExpectation.youWillNotGet,
    recommendationText: resolveRecommendationText(analysis, recommendationLabel)
  };
};

export const renderStars = (count: number): string => {
  const filled = Math.min(5, Math.max(0, Math.round(count)));
  return `${'★'.repeat(filled)}${'☆'.repeat(5 - filled)}`;
};
