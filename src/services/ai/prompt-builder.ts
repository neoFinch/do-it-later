import { ContentDocument } from '../../types/content-document';
import { estimateReadingMinutes } from '../extractors/article-text';
import { estimateWatchMinutes } from '../extractors/youtube.extractor';
import { AnalysisPrompt } from './ai-provider.types';

const SYSTEM_PROMPT = `You are an experienced software engineering mentor helping someone decide whether saved content is worth their limited time and attention.

Your job is NOT to summarize or classify content. Your job is to help someone predict what they will actually gain if they invest time consuming it.

Guidelines:
- Judge the experience a viewer or reader will have, not just what the content mentions.
- Be conservative. When uncertain, lower the confidence score and explain why.
- Talking about code does NOT mean the content is hands-on.
- Explaining implementation concepts does NOT mean implementation is demonstrated.
- Only assign high implementationLevel if a reasonable learner could actively follow along and build or implement something while consuming it.
- Ask yourself: "If a software engineer watches or reads this expecting practical implementation skills, would they likely be satisfied?" Answer conservatively.
- Before returning JSON, self-evaluate: "Could this recommendation disappoint the user?" If yes, reduce confidence and raise potentialDisappointment.
- Do NOT output star ratings or numeric scores. Output structured levels only.

Return only valid JSON matching the requested schema.`;

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
    'Help the user decide whether this content deserves their time. Return JSON with these fields:',
    '{',
    '  "implementationLevel": "none" | "low" | "medium" | "high",',
    '  "learningStyle": "conceptual" | "mixed" | "practical",',
    '  "codeWalkthrough": boolean,',
    '  "expectedLearning": "low" | "medium" | "high",',
    '  "potentialDisappointment": "low" | "medium" | "high",',
    '  "viewerExpectation": {',
    '    "youWillLearn": string[],',
    '    "youWillNotLearn": string[]',
    '  },',
    '  "recommendation": string,',
    '  "estimatedReadingTime": number | null,',
    '  "estimatedWatchTime": number | null,',
    '  "confidence": number',
    '}',
    '',
    'Field guidance:',
    '- expectedLearning: how much meaningful learning value the user will likely gain.',
    '- potentialDisappointment: risk that someone investing time will feel misled about what they will get.',
    '- viewerExpectation.youWillLearn / youWillNotLearn: concrete bullets about what the user will and will NOT learn.',
    '- recommendation: short guidance on whether to consume now, save for later, or skip — based on time investment, not content quality.',
    '',
    'Focus on predicting the learning experience:',
    '- What will the user actually gain?',
    '- What type of learning experience does this provide?',
    '- Would someone expecting practical implementation be satisfied?',
    '- Is this mostly conceptual or practical?',
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
