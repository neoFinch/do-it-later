import { AIAnalysis } from '../../types/ai-analysis';
import {
  composeAnalysisFromStages,
  isPipelineComplete,
  PipelineStageResults,
  splitAnalysisIntoStages
} from '../../types/ai-pipeline-stages';
import { ContentDocument } from '../../types/content-document';
import {
  getComposedAnalysis,
  getPipelineStages,
  savePipelineStages
} from '../../database/ai-pipeline.repository';
import { buildAnalysisPrompt } from './prompt-builder';
import { getActiveProvider, getFallbackProvider } from './provider-registry';
import { parseAnalysisResponse } from './response-parser';
import { AIProvider } from './ai-provider.types';

export interface AnalysisPipelineResult {
  stages: PipelineStageResults;
  analysis: AIAnalysis;
}

const completeWithProvider = async (
  provider: AIProvider,
  document: ContentDocument
): Promise<string> => {
  const prompt = buildAnalysisPrompt(document, { compact: provider.id === 'local-llm' });
  return provider.complete(prompt);
};

const runSinglePassAnalysis = async (document: ContentDocument): Promise<AIAnalysis> => {
  const primary = getActiveProvider();
  const fallback = getFallbackProvider(primary.id === 'null' ? undefined : primary.id);

  if (!primary.isAvailable() && !fallback) {
    throw new Error('No AI provider is configured.');
  }

  const provider = primary.isAvailable() ? primary : fallback!;

  try {
    const raw = await completeWithProvider(provider, document);
    return parseAnalysisResponse(document.captureId, raw, document);
  } catch (error) {
    if (provider.id === 'local-llm' || provider.id === primary.id) {
      const next = getFallbackProvider(provider.id);
      if (next) {
        const raw = await completeWithProvider(next, document);
        return parseAnalysisResponse(document.captureId, raw, document);
      }
    }
    throw error;
  }
};

/**
 * Runs Understand → Classify → Enrich → Evaluate.
 * Today all four stages share one LLM call; each stage is persisted separately.
 */
export const runAnalysisPipeline = async (
  document: ContentDocument,
  options?: { force?: boolean }
): Promise<AnalysisPipelineResult> => {
  if (!options?.force) {
    const cachedStages = await getPipelineStages(document.captureId);
    if (isPipelineComplete(cachedStages)) {
      return {
        stages: cachedStages,
        analysis: composeAnalysisFromStages(cachedStages)!
      };
    }

    const cachedAnalysis = await getComposedAnalysis(document.captureId);
    if (cachedAnalysis) {
      return {
        stages: splitAnalysisIntoStages(cachedAnalysis),
        analysis: cachedAnalysis
      };
    }
  }

  const analysis = await runSinglePassAnalysis(document);
  const stages = splitAnalysisIntoStages(analysis);
  await savePipelineStages(stages);

  return { stages, analysis };
};

/** @deprecated Use `runAnalysisPipeline` instead. */
export const analyze = async (
  document: ContentDocument,
  options?: { force?: boolean }
): Promise<AIAnalysis> => {
  const result = await runAnalysisPipeline(document, options);
  return result.analysis;
};

/** @deprecated Use `runAnalysisPipeline` instead. */
export const analyzeContent = analyze;
