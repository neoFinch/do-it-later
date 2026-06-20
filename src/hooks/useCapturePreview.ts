import { useEffect, useState } from 'react';
import { Capture } from '../types/capture';
import { resolveCapturePreviewUrl } from '../services/file.service';

export const useCapturePreview = (capture: Capture): string | null => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const url = await resolveCapturePreviewUrl(capture);
      if (!cancelled) {
        setPreviewUrl(url);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [capture.id, capture.type, capture.content, capture.thumbnail, capture.source]);

  return previewUrl;
};
