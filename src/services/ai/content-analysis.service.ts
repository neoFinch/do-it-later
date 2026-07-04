import { AIAnalysis } from '../../types/ai-analysis';
import { ContentDocument } from '../../types/content-document';
import { getAiAnalysis } from '../../database/ai-analysis.repository';
import { buildAnalysisPrompt } from './prompt-builder';
import { getActiveProvider } from './provider-registry';
import { parseAnalysisResponse } from './response-parser';

export const analyze = async (
  document: ContentDocument,
  options?: { force?: boolean }
): Promise<AIAnalysis> => {
  if (!options?.force) {
    const cached = await getAiAnalysis(document.captureId);
    if (cached) {
      return cached;
    }
  }

  const provider = getActiveProvider();
  if (!provider.isAvailable()) {
    throw new Error('No AI provider is configured.');
  }

  const prompt = buildAnalysisPrompt(document);
  const raw = await provider.complete(prompt);
  return parseAnalysisResponse(document.captureId, raw, document);
};

/** @deprecated Use `analyze` instead. */
export const analyzeContent = analyze;
