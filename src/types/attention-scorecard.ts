export type Recommendation = 'read_now' | 'read_later' | 'skip';

export interface AttentionScorecard {
  recommendation: Recommendation;
  recommendationLabel: string;
  worthYourTimeStars: number;
  confidencePercent: number;
  estimatedTimeMinutes: number | null;
  learningStyleLabel: string;
  implementationLevelLabel: string;
  expectedLearningStars: number;
  potentialDisappointmentLabel: string;
  youWillLearn: string[];
  youWillNotLearn: string[];
  recommendationText: string;
}
