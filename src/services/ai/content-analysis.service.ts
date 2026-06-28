import { AIAnalysis } from '../../types/ai-analysis';
import { ContentDocument } from '../../types/content-document';
import { buildAnalysisPrompt } from './prompt-builder';
import { getActiveProvider } from './provider-registry';
import { parseAnalysisResponse } from './response-parser';

export const analyzeContent = async (document: ContentDocument): Promise<AIAnalysis> => {
  const provider = getActiveProvider();
  if (!provider.isAvailable()) {
    throw new Error('No AI provider is configured.');
  }

  const prompt = buildAnalysisPrompt(document);
  const raw = await provider.complete(prompt);
  return parseAnalysisResponse(document.captureId, raw, document);
};
