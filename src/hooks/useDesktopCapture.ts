import { useCallback, useEffect, useRef, useState } from 'react';
import { extractFirstUrl } from '../services/link.service';
import { isEditableKeyboardTarget, prefersDesktopUx } from '../utils/platform';

export interface DesktopCaptureHandlers {
  onUrl: (url: string) => Promise<void> | void;
  onFiles?: (files: File[]) => Promise<void> | void;
}

const getDragPayloadHasUrlOrFiles = (event: DragEvent): boolean => {
  const types = event.dataTransfer?.types;
  if (!types) {
    return false;
  }
  return (
    types.includes('Files') ||
    types.includes('text/uri-list') ||
    types.includes('text/plain') ||
    types.includes('text/html')
  );
};

const extractUrlFromDataTransfer = (dataTransfer: DataTransfer | null): string | null => {
  if (!dataTransfer) {
    return null;
  }

  const uriList = dataTransfer
    .getData('text/uri-list')
    ?.split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  if (uriList && /^https?:\/\//i.test(uriList)) {
    return uriList;
  }

  const plain = dataTransfer.getData('text/plain');
  if (plain) {
    return extractFirstUrl(plain);
  }

  return null;
};

/**
 * Inbox / desktop capture: paste URLs and drag-drop links (files optional via onFiles).
 */
export const useDesktopCapture = (
  handlers: DesktopCaptureHandlers,
  options?: { enabled?: boolean }
): { isDragging: boolean } => {
  const enabled = options?.enabled ?? prefersDesktopUx();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      if (!enabled || isEditableKeyboardTarget(event.target)) {
        return;
      }

      const text = event.clipboardData?.getData('text/plain')?.trim();
      if (!text) {
        return;
      }

      const url = extractFirstUrl(text);
      if (!url) {
        return;
      }

      event.preventDefault();
      await handlersRef.current.onUrl(url);
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onDragEnter = (event: DragEvent) => {
      if (!getDragPayloadHasUrlOrFiles(event)) {
        return;
      }
      event.preventDefault();
      dragDepthRef.current += 1;
      setIsDragging(true);
    };

    const onDragLeave = (event: DragEvent) => {
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsDragging(false);
      }
    };

    const onDragOver = (event: DragEvent) => {
      if (!getDragPayloadHasUrlOrFiles(event)) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    };

    const onDrop = async (event: DragEvent) => {
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);

      const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
      const url = extractUrlFromDataTransfer(event.dataTransfer ?? null);
      const current = handlersRef.current;

      if (url) {
        await current.onUrl(url);
        return;
      }

      if (files.length > 0 && current.onFiles) {
        await current.onFiles(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [enabled, handlePaste]);

  return { isDragging };
};
