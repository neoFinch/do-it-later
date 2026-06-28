import { ContentDocument } from '../../types/content-document';
import { estimateReadingMinutes } from '../extractors/article-text';
import { estimateWatchMinutes } from '../extractors/youtube.extractor';
import { AnalysisPrompt } from './ai-provider.types';

const SYSTEM_PROMPT = `You analyze saved content for a personal learning inbox.
Return only valid JSON matching the requested schema.
Be concise, practical, and honest about uncertainty.
If content is thin or promotional, say so in reasoning and lower confidence.`;

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

export const buildAnalysisPrompt = (document: ContentDocument): AnalysisPrompt => {
  const body =
    document.transcript?.trim() ||
    document.articleText?.trim() ||
    document.description?.trim() ||
    document.title?.trim() ||
    '';

  const estimatedReadingTime = deriveReadingMinutes(document);
  const estimatedWatchTime = deriveWatchMinutes(document);

  const user = [
    'Analyze this captured content and return JSON with these fields:',
    '{',
    '  "topics": string[],',
    '  "difficulty": "beginner" | "intermediate" | "advanced",',
    '  "targetAudience": string[],',
    '  "contentType": "tutorial" | "deep-dive" | "reference" | "news" | "opinion" | "other",',
    '  "containsCode": boolean,',
    '  "containsHandsOn": boolean,',
    '  "estimatedReadingTime": number | null,',
    '  "estimatedWatchTime": number | null,',
    '  "prerequisites": string[],',
    '  "learningOutcomes": string[],',
    '  "summary": string,',
    '  "keyTakeaways": string[],',
    '  "reasoning": string,',
    '  "confidence": number',
    '}',
    '',
    `Source: ${document.source}`,
    document.title ? `Title: ${document.title}` : '',
    document.author ? `Author/Site: ${document.author}` : '',
    estimatedReadingTime != null ? `Estimated reading minutes (heuristic): ${estimatedReadingTime}` : '',
    estimatedWatchTime != null ? `Estimated watch minutes (heuristic): ${estimatedWatchTime}` : '',
    '',
    'Content:',
    body.slice(0, 12_000)
  ]
    .filter(Boolean)
    .join('\n');

  return { system: SYSTEM_PROMPT, user };
};

export { deriveReadingMinutes, deriveWatchMinutes };
