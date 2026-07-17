import { useEffect, useMemo, useState } from 'react';
import { Capture } from '../types/capture';
import { isLegacyLocalFilePath, resolveCapturePreviewUrl } from '../services/file.service';
import { resolveThumbnailForUrl } from '../services/thumbnail.service';

const getSyncPreviewUrl = (capture: Capture): string | null => {
  if (capture.type === 'url') {
    if (capture.thumbnail) {
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
      return;
    }

    let cancelled = false;

    (async () => {
      const url = await resolveCapturePreviewUrl(capture);
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
