import { deleteAiAnalysis, getAiAnalysis, saveAiAnalysis } from '../database/ai-analysis.repository';
import { deleteContentDocument, getContentDocument } from '../database/content-document.repository';
import {
  deleteCaptureProcessing,
  getCaptureProcessing,
  listPendingProcessing,
  saveCaptureProcessing
} from '../database/processing.repository';
import { CaptureProcessing, PipelineStatus } from '../types/capture-processing';
import { analyzeContent } from './ai/content-analysis.service';
import { isActiveProviderAvailable, shouldAutoAnalyze } from './ai/provider-registry';
import { listCaptures } from './capture.service';
import { extractCapture, getCaptureExtraction, processStaleExtractions } from './extraction.service';

const activeAnalysisJobs = new Set<string>();

const now = (): number => Date.now();

const createProcessingState = (captureId: string): CaptureProcessing => ({
  captureId,
  extractionStatus: 'pending',
  analysisStatus: 'pending',
  extractionError: null,
  analysisError: null,
  updatedAt: now()
});

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

const setAnalysisStatus = async (
  captureId: string,
  status: PipelineStatus,
  error?: string | null
): Promise<void> => {
  await updateProcessing(captureId, {
    analysisStatus: status,
    analysisError: error ?? null
  });
};

export const queueCaptureProcessing = (captureId: string): void => {
  void processCapture(captureId);
};

export const analyzeCapture = async (captureId: string, options?: { force?: boolean }): Promise<void> => {
  if (activeAnalysisJobs.has(captureId)) {
    return;
  }

  activeAnalysisJobs.add(captureId);
  try {
    let document = await getContentDocument(captureId);
    const force = options?.force === true;

    if (!document && force) {
      document = await extractCapture(captureId, { force: true });
    }

    if (!document) {
      if (force) {
        await setAnalysisStatus(captureId, 'failed', 'Extract content before analyzing.');
      }
      return;
    }

    const existingAnalysis = await getAiAnalysis(captureId);

    if (existingAnalysis && !force) {
      await setAnalysisStatus(captureId, 'completed', null);
      return;
    }

    if (!shouldAutoAnalyze() && !force) {
      await setAnalysisStatus(
        captureId,
        isActiveProviderAvailable() ? 'pending' : 'skipped',
        isActiveProviderAvailable() ? null : 'Configure an AI provider in Settings to analyze content.'
      );
      return;
    }

    await setAnalysisStatus(captureId, 'processing', null);
    try {
      const analysis = await analyzeContent(document);
      await saveAiAnalysis(analysis);
      await setAnalysisStatus(captureId, 'completed', null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await setAnalysisStatus(captureId, 'failed', message);
    }
  } finally {
    activeAnalysisJobs.delete(captureId);
  }
};

export const processCapture = async (captureId: string, options?: { force?: boolean }): Promise<void> => {
  const force = options?.force === true;
  const document = await extractCapture(captureId, { force });

  if (!document) {
    const processing = await getCaptureProcessing(captureId);
    if (processing?.extractionStatus === 'failed') {
      await setAnalysisStatus(captureId, 'skipped', 'Extraction failed.');
    }
    return;
  }

  await analyzeCapture(captureId, { force });
};

export const processPendingCaptures = async (limit = 5): Promise<void> => {
  const pending = await listPendingProcessing(limit);
  for (const item of pending) {
    await processCapture(item.captureId);
  }
};

export const processStaleCaptures = async (limit = 5): Promise<void> => {
  await processStaleExtractions(limit);

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
    const analysis = await getAiAnalysis(capture.id);
    const processing = await getCaptureProcessing(capture.id);

    const needsAnalysis =
      !!document &&
      !analysis &&
      processing?.analysisStatus !== 'failed' &&
      (shouldAutoAnalyze() || processing?.analysisStatus === 'pending');

    if (needsAnalysis) {
      queueCaptureProcessing(capture.id);
      queued += 1;
    }
  }
};

export const deleteCaptureArtifacts = async (captureId: string): Promise<void> => {
  await deleteContentDocument(captureId);
  await deleteAiAnalysis(captureId);
  await deleteCaptureProcessing(captureId);
};

export const getCaptureUnderstanding = async (captureId: string) => {
  const [{ processing, document }, analysis] = await Promise.all([
    getCaptureExtraction(captureId),
    getAiAnalysis(captureId)
  ]);

  return { processing, document, analysis };
};
