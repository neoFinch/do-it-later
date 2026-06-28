import { Capacitor } from '@capacitor/core';
import { CapacitorShareTarget, ShareReceivedEvent } from '@capgo/capacitor-share-target';
import { initializeCaptureService, createUrlCapture, createNoteCapture, createFileCapture } from './capture.service';
import { extractFirstUrl } from './link.service';
import { useCaptureStore } from '../store/captureStore';

let Toast: any = null;
// Load Toast only on native platforms
if (Capacitor.getPlatform() !== 'web') {
  import('@capacitor/toast').then(module => {
    Toast = module.Toast;
  }).catch(e => {
    console.warn('Toast module not available', e);
  });
}

const extractUrl = (text: string): string | null => extractFirstUrl(text);

const SHARE_DEDUP_WINDOW_MS = 5000;
let shareInitPromise: Promise<void> | null = null;
const recentShares = new Map<string, number>();

export const extractSharedText = (event: ShareReceivedEvent): string => {
  const fromTexts = event.texts?.find((text) => !!text?.trim())?.trim() ?? '';
  if (fromTexts) {
    return fromTexts;
  }

  return event.title?.trim() ?? '';
};

const getShareDedupKey = (event: ShareReceivedEvent): string => {
  const sharedText = extractSharedText(event);
  const url = sharedText ? extractUrl(sharedText) : null;
  if (url) {
    return url;
  }

  const files = event.files ?? [];
  if (files.length > 0) {
    return files.map((file) => file.uri).filter(Boolean).join('|');
  }

  return sharedText;
};

const isDuplicateShare = (key: string): boolean => {
  if (!key) {
    return false;
  }

  const now = Date.now();
  const lastSeen = recentShares.get(key);
  if (lastSeen !== undefined && now - lastSeen < SHARE_DEDUP_WINDOW_MS) {
    return true;
  }

  recentShares.set(key, now);
  for (const [seenKey, seenAt] of recentShares) {
    if (now - seenAt >= SHARE_DEDUP_WINDOW_MS) {
      recentShares.delete(seenKey);
    }
  }

  return false;
};

const handleSharedText = async (event: ShareReceivedEvent): Promise<void> => {
  console.log('handleSharedText called', event);

  try {
    await initializeCaptureService();
    const files = event.files ?? [];
    const sharedText = extractSharedText(event);
    const url = sharedText ? extractUrl(sharedText) : null;

    // Instagram often attaches a preview image plus the reel URL — prefer the link capture
    // so metadata enrichment can fetch the thumbnail and title.
    if (url) {
      console.log('Creating URL capture for', url);
      await createUrlCapture(url, event.title || sharedText || url);
      if (Toast) {
        await Toast.show({ text: 'URL captured!', duration: 'short' });
      }
      try {
        await useCaptureStore.getState().reload();
      } catch (e) {
        console.warn('Failed to reload capture store after url share', e);
      }
      return;
    }

    if (files.length > 0) {
      for (const file of files) {
        if (typeof file?.uri !== 'string') {
          continue;
        }
        await createFileCapture(
          {
            uri: file.uri,
            name: file.name || 'shared_file',
            mimeType: file.mimeType || 'application/octet-stream'
          },
          event.title || file.name || 'Shared file'
        );
      }
      if (Toast) {
        await Toast.show({
          text: files.length === 1 ? 'File captured!' : `${files.length} files captured!`,
          duration: 'short'
        });
      }
      try {
        await useCaptureStore.getState().reload();
      } catch (e) {
        console.warn('Failed to reload capture store after file share', e);
      }
      return;
    }

    if (!sharedText) {
      console.warn('No text found in share event', event);
      if (Toast) {
        await Toast.show({ text: 'Nothing to capture from share', duration: 'short' }).catch(() => {});
      }
      return;
    }

    console.log('Creating note capture for', sharedText);
    await createNoteCapture(sharedText, event.title || undefined);
    if (Toast) {
      await Toast.show({ text: 'Note captured!', duration: 'short' });
    }
    try {
      await useCaptureStore.getState().reload();
    } catch (e) {
      console.warn('Failed to reload capture store after text share', e);
    }
  } catch (error) {
    console.error('Error handling shared text', error);
    if (Toast) {
      await Toast.show({ text: 'Failed to capture', duration: 'short' }).catch(() => {});
    }
  }
};

export const initializeShareService = async (): Promise<void> => {
  if (Capacitor.getPlatform() === 'web') {
    return;
  }

  if (shareInitPromise) {
    return shareInitPromise;
  }

  shareInitPromise = (async () => {
    await CapacitorShareTarget.addListener('shareReceived', async (event) => {
      const dedupKey = getShareDedupKey(event);
      if (isDuplicateShare(dedupKey)) {
        console.log('Skipping duplicate share event', dedupKey);
        return;
      }
      await handleSharedText(event);
    });
  })();

  try {
    await shareInitPromise;
  } catch (error) {
    shareInitPromise = null;
    console.warn('Failed to initialize share target listener', error);
  }
};

export const cleanupShareService = async (): Promise<void> => {
  shareInitPromise = null;
};
