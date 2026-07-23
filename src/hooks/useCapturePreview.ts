import { useEffect, useMemo, useState } from 'react';
import { Capture } from '../types/capture';
import {
  isLegacyLocalFilePath,
  isPersistedCapturePath,
  isRemoteHttpUrl,
  resolveCapturePreviewUrl,
  resolveThumbnailPreviewUrl
} from '../services/file.service';
import { buildRemoteImageProxyUrl, shouldProxyRemoteImage } from '../services/http.service';
import { METADATA_USER_AGENT } from '../services/metadata.service';
import { normalizeUrl } from '../services/link.service';
import { resolveThumbnailForUrl } from '../services/thumbnail.service';

const getSyncPreviewUrl = (capture: Capture): string | null => {
  if (capture.type === 'url') {
    if (capture.thumbnail && isRemoteHttpUrl(capture.thumbnail)) {
      if (shouldProxyRemoteImage(capture.thumbnail, capture.url ?? undefined)) {
        return buildRemoteImageProxyUrl(capture.thumbnail, {
          referer: capture.url ? normalizeUrl(capture.url) : undefined,
          userAgent: METADATA_USER_AGENT
        });
      }
      return capture.thumbnail;
    }
    return resolveThumbnailForUrl(capture.url ?? '') ?? null;
  }

  return null;
};

const captureNeedsAsyncPreview = (capture: Capture): boolean => {
  if (capture.type === 'file') {
    return true;
  }

  if (capture.type === 'url' && capture.thumbnail && isPersistedCapturePath(capture.thumbnail)) {
    return true;
  }

  return capture.type === 'note' && !!capture.content && isLegacyLocalFilePath(capture.content);
};

export const useCapturePreview = (capture: Capture): string | null => {
  const syncUrl = useMemo(
    () => getSyncPreviewUrl(capture),
    [capture.type, capture.thumbnail, capture.url]
  );
  const needsAsync = captureNeedsAsyncPreview(capture);
  const [asyncUrl, setAsyncUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!needsAsync) {
      setAsyncUrl(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const url =
        capture.type === 'url' && capture.thumbnail && isPersistedCapturePath(capture.thumbnail)
          ? await resolveThumbnailPreviewUrl(capture.thumbnail, capture.url ?? undefined)
          : await resolveCapturePreviewUrl(capture);

      if (!cancelled) {
        setAsyncUrl(url);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [capture.id, capture.type, capture.content, capture.thumbnail, capture.source, capture.url, needsAsync]);

  return needsAsync ? asyncUrl : syncUrl;
};
