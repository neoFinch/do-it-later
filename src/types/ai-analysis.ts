export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type ContentType =
  | 'tutorial'
  | 'deep-dive'
  | 'reference'
  | 'news'
  | 'opinion'
  | 'other';

export interface AIAnalysis {
  captureId: string;
  topics: string[];
  difficulty: Difficulty;
  targetAudience: string[];
  contentType: ContentType;
  containsCode: boolean;
  containsHandsOn: boolean;
  estimatedReadingTime: number | null;
  estimatedWatchTime: number | null;
  prerequisites: string[];
  learningOutcomes: string[];
  summary: string;
  keyTakeaways: string[];
  reasoning: string;
  confidence: number;
  analyzedAt: number;
}
