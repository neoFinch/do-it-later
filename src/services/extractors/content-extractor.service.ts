import { Capture } from '../../types/capture';
import { ContentDocument, ContentSource } from '../../types/content-document';
import { detectLinkPlatform } from '../link.service';
import { getYouTubeThumbnailUrl } from '../thumbnail.service';
import { fetchPageHtml, parseOpenGraphMetadata } from '../metadata.service';
import { extractArticleText, estimateReadingMinutes } from './article-text';
import { hasUsableExtractedContent } from './document-body';
import {
  cleanInstagramExtractedText,
  INSTAGRAM_EMPTY_EXTRACT_MESSAGE,
  INSTAGRAM_LOGIN_WALL_MESSAGE,
  INSTAGRAM_RESTRICTED_MESSAGE,
  looksLikeInstagramChrome,
  looksLikeInstagramLoginWall,
  looksLikeInstagramRestrictedMedia
} from './social-text';
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
    const extracted = await extractYouTubeTranscript(url);
    const document = buildDocument(capture.id, 'youtube', {
      title: extracted.title ?? capture.title,
      description: extracted.description ?? null,
      transcript: extracted.transcript || null,
      author: extracted.author ?? null,
      duration: extracted.duration ?? null,
      thumbnail: capture.thumbnail ?? getYouTubeThumbnailUrl(url)
    });

    if (!hasUsableExtractedContent(document)) {
      throw new Error('Could not extract usable YouTube content (no transcript or description).');
    }

    return {
      document,
      estimatedReadingTime: null,
      estimatedWatchTime: estimateWatchMinutes(extracted.duration)
    };
  }

  let html: string;
  try {
    html = await fetchPageHtml(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (platform === 'instagram') {
      throw new Error(
        `${message} Instagram metadata is unreliable — tap Try again when you have a stable connection.`
      );
    }
    throw new Error(`${message} Tap Try again to re-fetch this page.`);
  }

  const metadata = parseOpenGraphMetadata(html, url);
  let articleText = extractArticleText(html);

  if (platform === 'instagram') {
    if (looksLikeInstagramRestrictedMedia(html)) {
      throw new Error(INSTAGRAM_RESTRICTED_MESSAGE);
    }

    if (looksLikeInstagramLoginWall(html) && !metadata.description?.trim() && !metadata.thumbnail) {
      throw new Error(INSTAGRAM_LOGIN_WALL_MESSAGE);
    }

    const metaCaption = metadata.description?.trim() || '';
    const cleanedHtml = articleText ? cleanInstagramExtractedText(articleText) : '';
    const metaLooksClean = metaCaption.length >= 40 && !looksLikeInstagramChrome(metaCaption);

    if (metaLooksClean) {
      articleText = metaCaption;
    } else if (cleanedHtml && !looksLikeInstagramChrome(cleanedHtml)) {
      articleText = cleanedHtml;
    } else {
      articleText = [metaCaption, capture.title, capture.content].filter(Boolean).join('\n\n').trim();
      articleText = articleText ? cleanInstagramExtractedText(articleText) : '';
    }

    if (!articleText || looksLikeInstagramChrome(articleText)) {
      if (!metadata.thumbnail && !metadata.description) {
        throw new Error(INSTAGRAM_RESTRICTED_MESSAGE);
      }
      throw new Error(INSTAGRAM_EMPTY_EXTRACT_MESSAGE);
    }
  } else if (!articleText && (platform === 'twitter' || platform === 'tiktok')) {
    articleText = [metadata.description, metadata.title, capture.title, capture.content]
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }

  if (!articleText) {
    const fallback = [metadata.description, metadata.title, capture.title, capture.content]
      .filter(Boolean)
      .join('\n\n')
      .trim();
    if (fallback) {
      articleText = platform === 'instagram' ? cleanInstagramExtractedText(fallback) : fallback;
    }
  }

  const document = buildDocument(capture.id, platform === 'instagram' ? 'instagram' : 'article', {
    title: metadata.title ?? capture.title,
    description: metadata.description ?? null,
    articleText: articleText || null,
    thumbnail: metadata.thumbnail ?? capture.thumbnail,
    author: metadata.author ?? metadata.source ?? null
  });

  if (!hasUsableExtractedContent(document)) {
    throw new Error(
      platform === 'instagram'
        ? 'Could not extract Instagram content. Check your connection and tap Try again.'
        : 'Could not extract usable page content. Check your connection and tap Try again.'
    );
  }

  return {
    document,
    estimatedReadingTime: articleText ? estimateReadingMinutes(articleText) : null,
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
