import { AIAnalysis } from '../../types/ai-analysis';
import { ContentDocument } from '../../types/content-document';
import { getAiAnalysis } from '../../database/ai-analysis.repository';
import { buildAnalysisPrompt } from './prompt-builder';
import { getActiveProvider, getFallbackProvider } from './provider-registry';
import { parseAnalysisResponse } from './response-parser';
import { AIProvider } from './ai-provider.types';

const completeWithProvider = async (
  provider: AIProvider,
  document: ContentDocument
): Promise<string> => {
  const prompt = buildAnalysisPrompt(document, { compact: provider.id === 'local-llm' });
  return provider.complete(prompt);
};

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

/** @deprecated Use `analyze` instead. */
export const analyzeContent = analyze;
