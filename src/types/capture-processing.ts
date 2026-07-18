export type PipelineStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export type AnalysisStage = 'understand' | 'classify' | 'enrich' | 'evaluate';

export const ANALYSIS_STAGES: AnalysisStage[] = ['understand', 'classify', 'enrich', 'evaluate'];

export interface CaptureProcessing {
  captureId: string;
  extractionStatus: PipelineStatus;
  analysisStatus: PipelineStatus;
  understandStatus: PipelineStatus;
  classifyStatus: PipelineStatus;
  enrichStatus: PipelineStatus;
  evaluateStatus: PipelineStatus;
  extractionError?: string | null;
  analysisError?: string | null;
  understandError?: string | null;
  classifyError?: string | null;
  enrichError?: string | null;
  evaluateError?: string | null;
  updatedAt: number;
}

export const createDefaultProcessingState = (captureId: string, updatedAt: number): CaptureProcessing => ({
  captureId,
  extractionStatus: 'pending',
  analysisStatus: 'pending',
  understandStatus: 'pending',
  classifyStatus: 'pending',
  enrichStatus: 'pending',
  evaluateStatus: 'pending',
  extractionError: null,
  analysisError: null,
  understandError: null,
  classifyError: null,
  enrichError: null,
  evaluateError: null,
  updatedAt
});

export const deriveAnalysisStatus = (processing: CaptureProcessing): PipelineStatus => {
  const stageStatuses = [
    processing.understandStatus,
    processing.classifyStatus,
    processing.enrichStatus,
    processing.evaluateStatus
  ];

  if (stageStatuses.some((status) => status === 'failed')) {
    return 'failed';
  }

  if (stageStatuses.some((status) => status === 'processing')) {
    return 'processing';
  }

  if (stageStatuses.every((status) => status === 'completed')) {
    return 'completed';
  }

  if (stageStatuses.some((status) => status === 'skipped')) {
    return 'skipped';
  }

  if (stageStatuses.some((status) => status === 'pending')) {
    return 'pending';
  }

  return processing.analysisStatus;
};
