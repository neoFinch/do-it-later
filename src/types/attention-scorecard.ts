export type Recommendation = 'read_now' | 'read_later' | 'skip';

export interface ScorecardMetricView {
  label: string;
  value: string;
}

export interface AttentionScorecard {
  recommendation: Recommendation;
  recommendationLabel: string;
  worthYourTimeStars: number;
  confidencePercent: number;
  estimatedTimeMinutes: number | null;
  lensLabel: string;
  highlightMetrics: ScorecardMetricView[];
  expectedValueStars: number;
  potentialDisappointmentLabel: string;
  youWillGet: string[];
  youWillNotGet: string[];
  recommendationText: string;
}
