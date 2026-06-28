import { Capture } from '../../types/capture';
import { ContentDocument, ContentSource } from '../../types/content-document';
import { detectLinkPlatform } from '../link.service';
import { getYouTubeThumbnailUrl } from '../thumbnail.service';
import { fetchPageHtml, parseOpenGraphMetadata } from '../metadata.service';
import { extractArticleText, estimateReadingMinutes } from './article-text';
import { estimateWatchMinutes, extractYouTubeTranscript } from './youtube.extractor';

export interface ExtractionResult {
  document: ContentDocument;
  estimatedReadingTime: number | null;
  estimatedWatchTime: number | null;
}

const buildDocument = (
  captureId: string,
  source: ContentSource,
  fields: Partial<Omit<ContentDocument, 'captureId' | 'source' | 'extractedAt'>>
): ContentDocument => ({
  captureId,
  source,
  extractedAt: Date.now(),
  title: fields.title ?? null,
  description: fields.description ?? null,
  articleText: fields.articleText ?? null,
  transcript: fields.transcript ?? null,
  author: fields.author ?? null,
  publishedAt: fields.publishedAt ?? null,
  duration: fields.duration ?? null,
  thumbnail: fields.thumbnail ?? null
});

export const extractNoteContent = (capture: Capture): ExtractionResult => {
  const text = capture.content?.trim() ?? '';
  if (!text) {
    throw new Error('Note has no content to analyze.');
  }

  const document = buildDocument(capture.id, 'note', {
    title: capture.title,
    articleText: text
  });

  return {
    document,
    estimatedReadingTime: estimateReadingMinutes(text),
    estimatedWatchTime: null
  };
};

export const extractUrlContent = async (capture: Capture): Promise<ExtractionResult> => {
  const url = capture.url?.trim();
  if (!url) {
    throw new Error('URL capture is missing a URL.');
  }

  const platform = detectLinkPlatform(url);

  if (platform === 'youtube') {
    const { transcript, duration } = await extractYouTubeTranscript(url);
    const document = buildDocument(capture.id, 'youtube', {
      title: capture.title,
      transcript,
      duration,
      thumbnail: capture.thumbnail ?? getYouTubeThumbnailUrl(url)
    });

    return {
      document,
      estimatedReadingTime: null,
      estimatedWatchTime: estimateWatchMinutes(duration)
    };
  }

  const html = await fetchPageHtml(url);
  const metadata = parseOpenGraphMetadata(html);
  let articleText = extractArticleText(html);

  if (!articleText && (platform === 'instagram' || platform === 'twitter' || platform === 'tiktok')) {
    articleText = [metadata.title, capture.title, capture.content].filter(Boolean).join('\n\n').trim();
  }

  if (!articleText) {
    throw new Error('Could not extract article text from page.');
  }

  const source: ContentSource = platform === 'instagram' ? 'instagram' : 'article';
  const document = buildDocument(capture.id, source, {
    title: metadata.title ?? capture.title,
    description: metadata.title ?? null,
    articleText,
    thumbnail: metadata.thumbnail ?? capture.thumbnail,
    author: metadata.source ?? null
  });

  return {
    document,
    estimatedReadingTime: estimateReadingMinutes(articleText),
    estimatedWatchTime: null
  };
};

export const extractCaptureContent = async (capture: Capture): Promise<ExtractionResult> => {
  if (capture.type === 'note') {
    return extractNoteContent(capture);
  }

  if (capture.type === 'url') {
    return extractUrlContent(capture);
  }

  throw new Error('File captures are not supported for content extraction yet.');
};
