import { getContentDocument } from '../database/content-document.repository';
import { Capture } from '../types/capture';
import { ContentDocument } from '../types/content-document';
import {
  formatReviewDuration,
  getContentConsumeMinutes,
  getContentConsumeLabel
} from '../utils/content-duration';

/** Time to decide save vs skip on one card (minutes). */
export const REVIEW_DECISION_MINUTES = 0.5;

/** Fraction of full read/watch time assumed during a quick review pass. */
export const REVIEW_SKIM_FACTOR = 0.12;

export const getReviewTriageMinutes = (document: ContentDocument | null): number => {
  const consumeMinutes = getContentConsumeMinutes(document);
  return REVIEW_DECISION_MINUTES + consumeMinutes * REVIEW_SKIM_FACTOR;
};

export interface ReviewSessionEstimate {
  captureCount: number;
  estimatedMinutes: number;
  durationLabel: string;
}

export interface CaptureReviewMeta {
  consumeMinutes: number;
  consumeLabel: string | null;
}

const buildSessionEstimate = (captureCount: number, estimatedMinutes: number): ReviewSessionEstimate => ({
  captureCount,
  estimatedMinutes,
  durationLabel: formatReviewDuration(estimatedMinutes)
});

export const estimateReviewSession = async (captures: Capture[]): Promise<ReviewSessionEstimate> => {
  if (captures.length === 0) {
    return buildSessionEstimate(0, 0);
  }

  const minutes = await Promise.all(
    captures.map(async (capture) => {
      const document = await getContentDocument(capture.id);
      return getReviewTriageMinutes(document);
    })
  );

  const estimatedMinutes = Math.max(1, minutes.reduce((total, value) => total + value, 0));

  return buildSessionEstimate(captures.length, estimatedMinutes);
};

export const getCaptureReviewMeta = async (captureId: string): Promise<CaptureReviewMeta> => {
  const document = await getContentDocument(captureId);
  const consumeMinutes = getContentConsumeMinutes(document);
  const consumeLabel = document ? getContentConsumeLabel(document) : null;

  return { consumeMinutes, consumeLabel };
};
