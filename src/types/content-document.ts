export type ContentSource = 'youtube' | 'instagram' | 'article' | 'note';

export interface ContentDocument {
  captureId: string;
  title?: string | null;
  description?: string | null;
  articleText?: string | null;
  transcript?: string | null;
  author?: string | null;
  publishedAt?: number | null;
  duration?: number | null;
  thumbnail?: string | null;
  source: ContentSource;
  extractedAt: number;
}
