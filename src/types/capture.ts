export type CaptureType = 'url' | 'note';

export interface Capture {
  id: string;
  type: CaptureType;
  title?: string | null;
  url?: string | null;
  content?: string | null;
  source?: string | null;
  thumbnail?: string | null;
  createdAt: number;
}
