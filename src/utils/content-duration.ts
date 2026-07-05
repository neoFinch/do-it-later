import { ContentDocument } from '../types/content-document';
import { estimateReadingMinutes } from '../services/extractors/article-text';
import { estimateWatchMinutes } from '../services/extractors/youtube.extractor';

export const getContentConsumeLabel = (document: ContentDocument): string | null => {
  if (document.transcript) {
    const minutes = estimateWatchMinutes(document.duration);
    return minutes ? `${minutes} min watch` : null;
  }

  const text = document.articleText?.trim();
  if (text) {
    return `${estimateReadingMinutes(text)} min read`;
  }

  return null;
};
