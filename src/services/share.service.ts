import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { CapacitorShareTarget, ShareReceivedEvent } from '@capgo/capacitor-share-target';
import { initializeCaptureService, createUrlCapture, createNoteCapture, createFileCapture } from './capture.service';
import { extractFirstUrl } from './link.service';
import { useCaptureStore } from '../store/captureStore';

const LOG_TAG = '[ShareService]';
const PENDING_SHARES_DIR = 'pending_shares';

type HandleSharedTextOptions = {
  showToast?: boolean;
};

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
let pendingSharesPromise: Promise<void> | null = null;
const recentShares = new Map<string, number>();

export const parsePendingSharePayload = (raw: string): ShareReceivedEvent | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<ShareReceivedEvent>;
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      texts: Array.isArray(parsed.texts) ? parsed.texts.filter((text): text is string => typeof text === 'string') : [],
      files: Array.isArray(parsed.files)
        ? parsed.files.filter(
            (file): file is NonNullable<ShareReceivedEvent['files']>[number] =>
              !!file && typeof file.uri === 'string'
          )
        : []
    };
  } catch (error) {
    console.warn(`${LOG_TAG} Failed to parse pending share JSON`, error);
    return null;
  }
};

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

const handleSharedText = async (
  event: ShareReceivedEvent,
  options: HandleSharedTextOptions = {}
): Promise<void> => {
  const showToast = options.showToast !== false;
  console.log(`${LOG_TAG} handleSharedText`, event);

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
      if (showToast && Toast) {
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
      if (showToast && Toast) {
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
      if (showToast && Toast) {
        await Toast.show({ text: 'Nothing to capture from share', duration: 'short' }).catch(() => {});
      }
      return;
    }

    console.log('Creating note capture for', sharedText);
    await createNoteCapture(sharedText, event.title || undefined);
    if (showToast && Toast) {
      await Toast.show({ text: 'Note captured!', duration: 'short' });
    }
    try {
      await useCaptureStore.getState().reload();
    } catch (e) {
      console.warn('Failed to reload capture store after text share', e);
    }
  } catch (error) {
    console.error('Error handling shared text', error);
    if (showToast && Toast) {
      await Toast.show({ text: 'Failed to capture', duration: 'short' }).catch(() => {});
    }
  }
};

export const processPendingShares = async (): Promise<void> => {
  if (Capacitor.getPlatform() === 'web') {
    return;
  }

  if (pendingSharesPromise) {
    return pendingSharesPromise;
  }

  pendingSharesPromise = (async () => {
    console.log(`${LOG_TAG} Checking pending_shares queue`);

    let entries: Awaited<ReturnType<typeof Filesystem.readdir>>;
    try {
      entries = await Filesystem.readdir({
        path: PENDING_SHARES_DIR,
        directory: Directory.Data
      });
    } catch (error) {
      console.log(`${LOG_TAG} No pending_shares directory yet`, error);
      return;
    }

    const jsonFiles = entries.files
      .filter((file) => file.type === 'file' && file.name.startsWith('share-') && file.name.endsWith('.json'))
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`${LOG_TAG} Found ${jsonFiles.length} pending share file(s)`);

    for (const file of jsonFiles) {
      const filePath = `${PENDING_SHARES_DIR}/${file.name}`;

      try {
        const readResult = await Filesystem.readFile({
          path: filePath,
          directory: Directory.Data,
          encoding: Encoding.UTF8
        });

        const raw = typeof readResult.data === 'string' ? readResult.data : '';
        const payload = parsePendingSharePayload(raw);
        if (!payload) {
          console.warn(`${LOG_TAG} Skipping invalid pending share`, file.name);
          continue;
        }

        const dedupKey = getShareDedupKey(payload);
        if (isDuplicateShare(dedupKey)) {
          console.log(`${LOG_TAG} Skipping duplicate pending share`, dedupKey);
          await Filesystem.deleteFile({ path: filePath, directory: Directory.Data });
          continue;
        }

        await handleSharedText(payload, { showToast: false });
        await Filesystem.deleteFile({ path: filePath, directory: Directory.Data });
        console.log(`${LOG_TAG} Processed pending share`, file.name);
      } catch (error) {
        console.error(`${LOG_TAG} Failed to process pending share`, file.name, error);
      }
    }
  })().finally(() => {
    pendingSharesPromise = null;
  });

  try {
    await pendingSharesPromise;
  } catch (error) {
    pendingSharesPromise = null;
    console.error(`${LOG_TAG} Pending share drain failed`, error);
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
