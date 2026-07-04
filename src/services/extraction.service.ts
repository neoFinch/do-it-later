import { deleteContentDocument, getContentDocument, saveContentDocument } from '../database/content-document.repository';
import {
  deleteCaptureProcessing,
  getCaptureProcessing,
  saveCaptureProcessing
} from '../database/processing.repository';
import { CaptureProcessing, PipelineStatus } from '../types/capture-processing';
import { ContentDocument } from '../types/content-document';
import { getCapture } from './capture.service';
import { extractCaptureContent } from './extractors/content-extractor.service';

const activeJobs = new Set<string>();

const now = (): number => Date.now();

const createProcessingState = (captureId: string): CaptureProcessing => ({
  captureId,
  extractionStatus: 'pending',
  analysisStatus: 'pending',
  extractionError: null,
  analysisError: null,
  updatedAt: now()
});

export const ensureProcessingState = async (captureId: string): Promise<CaptureProcessing> => {
  const existing = await getCaptureProcessing(captureId);
  if (existing) {
    return existing;
  }

  const state = createProcessingState(captureId);
  await saveCaptureProcessing(state);
  return state;
};

const updateProcessing = async (
  captureId: string,
  updates: Partial<Omit<CaptureProcessing, 'captureId'>>
): Promise<CaptureProcessing> => {
  const current = (await getCaptureProcessing(captureId)) ?? createProcessingState(captureId);
  const next: CaptureProcessing = {
    ...current,
    ...updates,
    updatedAt: now()
  };
  await saveCaptureProcessing(next);
  return next;
};

const setExtractionStatus = async (
  captureId: string,
  status: PipelineStatus,
  error?: string | null
): Promise<void> => {
  await updateProcessing(captureId, {
    extractionStatus: status,
    extractionError: error ?? null
  });
};

export const queueExtraction = (captureId: string): void => {
  void extractCapture(captureId);
};

export const extractCapture = async (captureId: string, options?: { force?: boolean }): Promise<ContentDocument | null> => {
  if (activeJobs.has(captureId)) {
    return getContentDocument(captureId);
  }

  activeJobs.add(captureId);
  try {
    const capture = await getCapture(captureId);
    if (!capture) {
      return null;
    }

    await ensureProcessingState(captureId);
    const existingDocument = await getContentDocument(captureId);
    const force = options?.force === true;

    if (existingDocument && !force) {
      await setExtractionStatus(captureId, 'completed', null);
      return existingDocument;
    }

    await setExtractionStatus(captureId, 'processing', null);

    if (capture.type === 'file') {
      await setExtractionStatus(captureId, 'skipped', 'File extraction is not supported yet.');
      return null;
    }

    try {
      const extraction = await extractCaptureContent(capture);
      await saveContentDocument(extraction.document);
      await setExtractionStatus(captureId, 'completed', null);

      if (extraction.document.thumbnail && !capture.thumbnail && capture.type === 'url') {
        const { updateCapture, refreshInboxIfInitialized } = await import('./capture.service');
        await updateCapture(captureId, { thumbnail: extraction.document.thumbnail });
        refreshInboxIfInitialized();
      }

      return extraction.document;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await setExtractionStatus(captureId, 'failed', message);
      return null;
    }
  } finally {
    activeJobs.delete(captureId);
  }
};

export const processStaleExtractions = async (limit = 5): Promise<void> => {
  const { listCaptures } = await import('./capture.service');
  const captures = await listCaptures();
  let queued = 0;

  for (const capture of captures) {
    if (queued >= limit) {
      break;
    }

    if (capture.type === 'file') {
      continue;
    }

    const document = await getContentDocument(capture.id);
    const processing = await getCaptureProcessing(capture.id);

    if (!document && processing?.extractionStatus !== 'failed') {
      queueExtraction(capture.id);
      queued += 1;
    }
  }
};

export const getCaptureExtraction = async (captureId: string) => {
  const [processing, document] = await Promise.all([
    getCaptureProcessing(captureId),
    getContentDocument(captureId)
  ]);

  return { processing, document };
};

export const deleteExtractionArtifacts = async (captureId: string): Promise<void> => {
  await deleteContentDocument(captureId);
  await deleteCaptureProcessing(captureId);
};
