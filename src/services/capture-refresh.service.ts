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

export interface CaptureThumbnailRefreshResult {
  capture: Capture | null;
  thumbnailPresent: boolean;
  userMessage: string;
}

/**
 * Re-fetch only the preview image (metadata thumbnail) without re-extracting content.
 */
export const refreshCaptureThumbnail = async (captureId: string): Promise<CaptureThumbnailRefreshResult> => {
  const before = await getCapture(captureId);
  if (!before) {
    return {
      capture: null,
      thumbnailPresent: false,
      userMessage: 'Capture not found.'
    };
  }

  if (before.type !== 'url' || !before.url) {
    return {
      capture: before,
      thumbnailPresent: !!before.thumbnail,
      userMessage: 'Preview retry is only available for URL captures.'
    };
  }

  const enrich = await enrichUrlCapture(before.id, before.url, before.title, {
    force: true,
    thumbnailOnly: true
  });

  let capture = await getCapture(captureId);

  if (!capture?.thumbnail) {
    const { getContentDocument } = await import('../database/content-document.repository');
    const { materializeCaptureThumbnail, updateCapture, patchInboxCaptureIfInitialized } = await import(
      './capture.service'
    );
    const document = await getContentDocument(captureId);

    if (document?.thumbnail) {
      const thumbnail = await materializeCaptureThumbnail(captureId, before.url, document.thumbnail);
      if (thumbnail) {
        await updateCapture(captureId, { thumbnail });
        patchInboxCaptureIfInitialized(captureId, { thumbnail });
        capture = await getCapture(captureId);
      }
    }
  }

  const thumbnailPresent = !!capture?.thumbnail;

  if (thumbnailPresent) {
    return {
      capture,
      thumbnailPresent: true,
      userMessage: 'Preview image updated.'
    };
  }

  return {
    capture,
    thumbnailPresent: false,
    userMessage:
      enrich.error ??
      'Could not fetch a preview image. Check your connection and try again.'
  };
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
