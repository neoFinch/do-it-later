import { ContentDocument } from '../types/content-document';
import { estimateReadingMinutes } from '../services/extractors/article-text';
import { estimateWatchMinutes } from '../services/extractors/youtube.extractor';

export const DEFAULT_CONSUME_MINUTES = 2;

export const getContentConsumeMinutes = (document: ContentDocument | null): number => {
  if (!document) {
    return DEFAULT_CONSUME_MINUTES;
  }

  if (document.transcript) {
    return estimateWatchMinutes(document.duration) ?? DEFAULT_CONSUME_MINUTES;
  }

  const text = document.articleText?.trim();
  if (text) {
    return estimateReadingMinutes(text);
  }

  return DEFAULT_CONSUME_MINUTES;
};

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

export const formatReviewDuration = (totalMinutes: number): string => {
  const minutes = Math.max(1, Math.round(totalMinutes));

  if (minutes < 60) {
    return minutes === 1 ? 'about 1 minute' : `about ${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (remainder === 0) {
    return hours === 1 ? 'about 1 hour' : `about ${hours} hours`;
  }

  if (remainder >= 30) {
    const roundedHours = hours + 1;
    return roundedHours === 1 ? 'about 1 hour' : `about ${roundedHours} hours`;
  }

  const hourLabel = hours === 1 ? '1 hour' : `${hours} hours`;
  const minuteLabel = remainder === 1 ? '1 minute' : `${remainder} minutes`;
  return `about ${hourLabel} ${minuteLabel}`;
};
