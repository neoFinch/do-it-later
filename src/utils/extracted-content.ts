import { ContentDocument } from '../types/content-document';

export const getExtractedText = (document: ContentDocument): string => {
  return document.transcript?.trim() || document.articleText?.trim() || '';
};
