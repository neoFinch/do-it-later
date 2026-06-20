export type CaptureType = 'url' | 'note' | 'file';

export type CaptureStatus = 'INBOX' | 'REVIEWED' | 'ARCHIVED';

export interface Capture {
  id: string;
  type: CaptureType;
  title?: string | null;
  url?: string | null;
  content?: string | null;
  source?: string | null;
  thumbnail?: string | null;
  status: CaptureStatus;
  createdAt: number;
}
