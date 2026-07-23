import { CaptureProcessing, PipelineStatus } from '../types/capture-processing';
import { ContentDocument } from '../types/content-document';
import { hasUsableExtractedContent } from '../services/extractors/document-body';

export type ExtractionStepState = PipelineStatus;
export type AiStepState = 'locked' | PipelineStatus;

export const getExtractionStepState = (
  processing: CaptureProcessing | null,
  document: ContentDocument | null,
  extractionBusy: boolean
): ExtractionStepState => {
  if (extractionBusy || processing?.extractionStatus === 'processing') {
    return 'processing';
  }

  if (document) {
    return 'completed';
  }

  return processing?.extractionStatus ?? 'pending';
};

export const isExtractionStepComplete = (
  processing: CaptureProcessing | null,
  document: ContentDocument | null
): boolean => {
  return !!document || processing?.extractionStatus === 'completed';
};

export const getAiStepState = (
  processing: CaptureProcessing | null,
  document: ContentDocument | null,
  analysis: unknown,
  analysisBusy: boolean
): AiStepState => {
  if (!document || !hasUsableExtractedContent(document)) {
    return 'locked';
  }

  if (
    processing?.extractionStatus === 'failed' ||
    processing?.extractionStatus === 'skipped'
  ) {
    return 'locked';
  }

  if (analysis) {
    return 'completed';
  }

  if (analysisBusy || processing?.analysisStatus === 'processing') {
    return 'processing';
  }

  return processing?.analysisStatus ?? 'pending';
};
