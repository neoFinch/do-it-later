import { Recommendation } from './attention-scorecard';

export interface AiInsightMetric {
  label: string;
  value: string;
}

export interface AiInsightsView {
  understand: {
    summary: string;
    topics: string[];
    targetAudience: string[];
    estimatedTimeLabel: string | null;
  };
  classify: {
    lensLabel: string;
    contentTypeLabel: string;
  };
  enrich: {
    youWillGet: string[];
    youWillNotGet: string[];
    lensMetrics: AiInsightMetric[];
  };
  evaluate: {
    recommendation: Recommendation;
    recommendationLabel: string;
    recommendationText: string;
    expectedValueLabel: string;
    disappointmentLabel: string;
    confidencePercent: number;
    reasoning: string;
  };
}
