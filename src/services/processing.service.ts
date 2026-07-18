import { deleteAiAnalysis, getAiAnalysis } from '../database/ai-analysis.repository';
import { deleteContentDocument, getContentDocument } from '../database/content-document.repository';
import {
  deleteCaptureProcessing,
  getCaptureProcessing,
  listPendingProcessing,
  saveCaptureProcessing
} from '../database/processing.repository';
import {
  ANALYSIS_STAGES,
  AnalysisStage,
  CaptureProcessing,
  createDefaultProcessingState,
  deriveAnalysisStatus,
  PipelineStatus
} from '../types/capture-processing';
import { runAnalysisPipeline } from './ai/content-analysis.service';
import { isActiveProviderAvailable, shouldAutoAnalyze } from './ai/provider-registry';
import { listCaptures } from './capture.service';
import { extractCapture, getCaptureExtraction, processStaleExtractions } from './extraction.service';

const activeAnalysisJobs = new Set<string>();

const now = (): number => Date.now();

const createProcessingState = (captureId: string): CaptureProcessing =>
  createDefaultProcessingState(captureId, now());

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
  next.analysisStatus = deriveAnalysisStatus(next);
  await saveCaptureProcessing(next);
  return next;
};

const setStageStatus = async (
  captureId: string,
  stage: AnalysisStage,
  status: PipelineStatus,
  error?: string | null
): Promise<void> => {
  const statusKey = `${stage}Status` as const;
  const errorKey = `${stage}Error` as const;
  await updateProcessing(captureId, {
    [statusKey]: status,
    [errorKey]: error ?? null
  });
};

const setAllStageStatuses = async (
  captureId: string,
  status: PipelineStatus,
  error?: string | null
): Promise<void> => {
  const updates: Partial<CaptureProcessing> = {};
  for (const stage of ANALYSIS_STAGES) {
    updates[`${stage}Status`] = status;
    updates[`${stage}Error`] = error ?? null;
  }
  updates.analysisError = error ?? null;
  await updateProcessing(captureId, updates);
};

const setAnalysisStatus = async (
  captureId: string,
  status: PipelineStatus,
  error?: string | null
): Promise<void> => {
  await setAllStageStatuses(captureId, status, error);
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
      const skippedStatus: PipelineStatus = isActiveProviderAvailable() ? 'pending' : 'skipped';
      const skippedMessage = isActiveProviderAvailable()
        ? null
        : 'Configure an AI provider in Settings to analyze content.';
      await setAnalysisStatus(captureId, skippedStatus, skippedMessage);
      return;
    }

    await setAnalysisStatus(captureId, 'processing', null);
    try {
      for (const stage of ANALYSIS_STAGES) {
        await setStageStatus(captureId, stage, 'processing', null);
      }

      await runAnalysisPipeline(document, { force });

      for (const stage of ANALYSIS_STAGES) {
        await setStageStatus(captureId, stage, 'completed', null);
      }
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
