export type PipelineStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface CaptureProcessing {
  captureId: string;
  extractionStatus: PipelineStatus;
  analysisStatus: PipelineStatus;
  extractionError?: string | null;
  analysisError?: string | null;
  updatedAt: number;
}
