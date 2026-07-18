import { AIAnalysis, ContentType, ExpectationLevel } from '../../types/ai-analysis';
import { AiInsightsView } from '../../types/ai-insights';
import { Recommendation } from '../../types/attention-scorecard';
import {
  deriveRecommendation,
  deriveWorthYourTimeStars,
  resolveRecommendationText
} from './attention-scorecard.service';
import { getLensPack } from './lenses';

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  tutorial: 'Tutorial',
  'deep-dive': 'Deep dive',
  reference: 'Reference',
  news: 'News',
  opinion: 'Opinion',
  entertainment: 'Entertainment',
  other: 'Other'
};

const EXPECTATION_LABELS: Record<ExpectationLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  read_now: 'Read now',
  read_later: 'Read later',
  skip: 'Skip'
};

const formatEstimatedTime = (analysis: AIAnalysis): string | null => {
  const minutes = analysis.estimatedWatchTime ?? analysis.estimatedReadingTime;
  if (!minutes) {
    return null;
  }

  const unit = analysis.estimatedWatchTime != null ? 'watch' : 'read';
  return `~${minutes} min ${unit}`;
};

export const buildAiInsightsView = (analysis: AIAnalysis): AiInsightsView => {
  const worthYourTimeStars = deriveWorthYourTimeStars(analysis);
  const recommendation = deriveRecommendation(analysis, worthYourTimeStars);
  const recommendationLabel = RECOMMENDATION_LABELS[recommendation];
  const pack = getLensPack(analysis.lens);

  return {
    understand: {
      summary: analysis.summary,
      topics: analysis.topics,
      targetAudience: analysis.targetAudience,
      estimatedTimeLabel: formatEstimatedTime(analysis)
    },
    classify: {
      lensLabel: pack.label,
      contentTypeLabel: CONTENT_TYPE_LABELS[analysis.contentType]
    },
    enrich: {
      youWillGet: analysis.viewerExpectation.youWillGet,
      youWillNotGet: analysis.viewerExpectation.youWillNotGet,
      lensMetrics: pack.metrics(analysis.lensFields ?? {}).filter((metric) => metric.value !== '—')
    },
    evaluate: {
      recommendation,
      recommendationLabel,
      recommendationText: resolveRecommendationText(analysis, recommendationLabel),
      expectedValueLabel: EXPECTATION_LABELS[analysis.expectedValue],
      disappointmentLabel: EXPECTATION_LABELS[analysis.potentialDisappointment],
      confidencePercent: Math.round(analysis.confidence * 100),
      reasoning: analysis.reasoning
    }
  };
};
