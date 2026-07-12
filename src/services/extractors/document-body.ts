import { ContentDocument } from '../../types/content-document';

/** Prefer transcript, then article text, then description/title for AI prompts. */
export const getDocumentAnalysisBody = (document: ContentDocument): string => {
  return (
    document.transcript?.trim() ||
    document.articleText?.trim() ||
    document.description?.trim() ||
    document.title?.trim() ||
    ''
  );
};

export const hasUsableExtractedContent = (document: ContentDocument): boolean => {
  return getDocumentAnalysisBody(document).length >= 20;
};
