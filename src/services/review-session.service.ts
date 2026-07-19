import { getContentDocument } from '../database/content-document.repository';
import { Capture } from '../types/capture';
import {
  formatReviewDuration,
  getContentConsumeMinutes,
  getContentConsumeLabel
} from '../utils/content-duration';

export interface ReviewSessionEstimate {
  captureCount: number;
  estimatedMinutes: number;
  durationLabel: string;
}

export interface CaptureReviewMeta {
  consumeMinutes: number;
  consumeLabel: string | null;
}

export const estimateReviewSession = async (captures: Capture[]): Promise<ReviewSessionEstimate> => {
  if (captures.length === 0) {
    return {
      captureCount: 0,
      estimatedMinutes: 0,
      durationLabel: formatReviewDuration(0)
    };
  }

  const minutes = await Promise.all(
    captures.map(async (capture) => {
      const document = await getContentDocument(capture.id);
      return getContentConsumeMinutes(document);
    })
  );

  const estimatedMinutes = Math.max(1, minutes.reduce((total, value) => total + value, 0));

  return {
    captureCount: captures.length,
    estimatedMinutes,
    durationLabel: formatReviewDuration(estimatedMinutes)
  };
};

export const getCaptureReviewMeta = async (captureId: string): Promise<CaptureReviewMeta> => {
  const document = await getContentDocument(captureId);
  const consumeMinutes = getContentConsumeMinutes(document);
  const consumeLabel = document ? getContentConsumeLabel(document) : null;

  return { consumeMinutes, consumeLabel };
};
