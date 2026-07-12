import { ContentDocument } from '../../types/content-document';
import { estimateReadingMinutes } from '../extractors/article-text';
import { getDocumentAnalysisBody } from '../extractors/document-body';
import { estimateWatchMinutes } from '../extractors/youtube.extractor';
import { AnalysisPrompt } from './ai-provider.types';
import { getLensPack, listLensLabels, LENS_PACKS } from './lenses';

const SHARED_SYSTEM = `You help someone decide whether saved content deserves their limited time and attention.

Your job is NOT only to summarize. Predict what they will actually get if they invest time.

Guidelines:
- Be conservative. When uncertain, lower confidence and explain why.
- Choose the best analysis lens for the content. Do NOT force a software/learning lens onto art, movies, health, science, finance, or general interest.
- Expectation bullets should be domain-appropriate (learning, entertainment, practice, inspiration, etc.).
- Before returning JSON, self-evaluate: "Could this recommendation disappoint the user?" If yes, reduce confidence and raise potentialDisappointment.
- Do NOT output star ratings or numeric scores. Output structured levels only.
- Return only valid JSON matching the requested schema.`;

const deriveReadingMinutes = (document: ContentDocument): number | null => {
  const text = document.articleText?.trim();
  if (!text) {
    return null;
  }
  return estimateReadingMinutes(text);
};

const deriveWatchMinutes = (document: ContentDocument): number | null => {
  return estimateWatchMinutes(document.duration);
};

const lensGuidelinesBlock = (): string =>
  Object.values(LENS_PACKS)
    .map((pack) => pack.guidelines)
    .join('\n\n');

export interface BuildAnalysisPromptOptions {
  /** Shorter schema for on-device models with tight output limits. */
  compact?: boolean;
}

export const buildAnalysisPrompt = (
  document: ContentDocument,
  options?: BuildAnalysisPromptOptions
): AnalysisPrompt => {
  const body = getDocumentAnalysisBody(document);
  const estimatedReadingTime = deriveReadingMinutes(document);
  const estimatedWatchTime = deriveWatchMinutes(document);
  const compact = options?.compact === true;

  const lensFieldSchemas = compact
    ? `"lensFields": object`
    : Object.values(LENS_PACKS)
        .map((pack) => `When lens="${pack.id}":\n  ${pack.fieldsSchema}`)
        .join('\n');

  const user = [
    'Help the user decide whether this content deserves their time. Return JSON with these fields:',
    '{',
    `  "lens": ${listLensLabels()},`,
    '  "summary": string,',
    '  "topics": string[],',
    '  "contentType": "tutorial" | "deep-dive" | "reference" | "news" | "opinion" | "entertainment" | "other",',
    '  "targetAudience": string[],',
    '  "viewerExpectation": {',
    '    "youWillGet": string[],',
    '    "youWillNotGet": string[]',
    '  },',
    '  "expectedValue": "low" | "medium" | "high",',
    '  "potentialDisappointment": "low" | "medium" | "high",',
    `  ${lensFieldSchemas},`,
    '  "recommendation": string,',
    '  "reasoning": string,',
    '  "estimatedReadingTime": number | null,',
    '  "estimatedWatchTime": number | null,',
    '  "confidence": number',
    '}',
    '',
    'Field guidance:',
    '- lens: pick the single best domain pack for judging this content.',
    '- expectedValue: how worthwhile the time investment is likely to be for the intended audience.',
    '- potentialDisappointment: risk that someone investing time will feel misled.',
    '- viewerExpectation.youWillGet / youWillNotGet: concrete bullets (not always "learning").',
    '- recommendation: short guidance — consume now, save for later, or skip — based on time investment.',
    '',
    compact ? 'Keep lensFields small (2-4 keys). Keep arrays short.' : 'Include lensFields matching the chosen lens.',
    '',
    `Source: ${document.source}`,
    document.title ? `Title: ${document.title}` : '',
    document.author ? `Author/Site: ${document.author}` : '',
    estimatedReadingTime != null ? `Estimated reading minutes (heuristic): ${estimatedReadingTime}` : '',
    estimatedWatchTime != null ? `Estimated watch minutes (heuristic): ${estimatedWatchTime}` : '',
    '',
    'Content:',
    body.slice(0, compact ? 4_000 : 12_000)
  ]
    .filter(Boolean)
    .join('\n');

  return {
    system: `${SHARED_SYSTEM}\n\n${lensGuidelinesBlock()}`,
    user
  };
};

export { deriveReadingMinutes, deriveWatchMinutes, getLensPack };
