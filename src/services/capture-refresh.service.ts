import { Capture } from '../types/capture';
import { ContentDocument } from '../types/content-document';
import { getCaptureProcessing } from '../database/processing.repository';
import { enrichUrlCapture, getCapture } from './capture.service';
import { extractCapture } from './extraction.service';
import { hasUsableExtractedContent } from './extractors/document-body';

export interface CaptureRefreshResult {
  capture: Capture | null;
  document: ContentDocument | null;
  thumbnailPresent: boolean;
  extractionOk: boolean;
  userMessage: string;
  extractionError: string | null;
}

const buildUserMessage = (params: {
  extractionOk: boolean;
  thumbnailPresent: boolean;
  extractionError: string | null;
  metadataError: string | null;
  platformHint?: string;
}): string => {
  const { extractionOk, thumbnailPresent, extractionError, metadataError } = params;

  if (extractionOk && thumbnailPresent) {
    return 'Preview and extracted content updated.';
  }

  if (extractionOk && !thumbnailPresent) {
    return (
      metadataError ??
      'Content extracted, but no preview image was available. Instagram often blocks images — try again later.'
    );
  }

  if (!extractionOk && thumbnailPresent) {
    return (
      extractionError ??
      'Preview image updated, but content still could not be extracted. Check your connection and try again.'
    );
  }

  const parts = [extractionError, metadataError].filter(Boolean);
  if (parts.length > 0) {
    return parts[0] as string;
  }

  return 'Could not refresh this capture. Check your connection and try again.';
};

/**
 * Re-fetch URL metadata (thumbnail/title) and force re-extract content.
 * Used from capture detail when Instagram/share enrichment failed or was empty.
 */
export const refreshCaptureMedia = async (captureId: string): Promise<CaptureRefreshResult> => {
  const before = await getCapture(captureId);
  if (!before) {
    return {
      capture: null,
      document: null,
      thumbnailPresent: false,
      extractionOk: false,
      userMessage: 'Capture not found.',
      extractionError: 'Capture not found.'
    };
  }

  let metadataError: string | null = null;

  if (before.type === 'url' && before.url) {
    const enrich = await enrichUrlCapture(before.id, before.url, before.title, { force: true });
    if (enrich.error && !enrich.thumbnail) {
      metadataError = enrich.error;
    }
  }

  const document = await extractCapture(captureId, { force: true });
  const processing = await getCaptureProcessing(captureId);
  const capture = await getCapture(captureId);
  const extractionOk = !!document && hasUsableExtractedContent(document);
  const extractionError =
    processing?.extractionStatus === 'failed'
      ? processing.extractionError ?? 'Extraction failed.'
      : extractionOk
        ? null
        : processing?.extractionError ?? 'Could not extract usable content from this link.';

  const thumbnailPresent = !!capture?.thumbnail;

  return {
    capture,
    document,
    thumbnailPresent,
    extractionOk,
    extractionError,
    userMessage: buildUserMessage({
      extractionOk,
      thumbnailPresent,
      extractionError,
      metadataError
    })
  };
};
