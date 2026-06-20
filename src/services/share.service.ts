import { Capacitor } from '@capacitor/core';
import { CapacitorShareTarget, ShareReceivedEvent } from '@capgo/capacitor-share-target';
import { initializeCaptureService, createUrlCapture, createNoteCapture, createFileCapture } from './capture.service';
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

const extractUrl = (text: string): string | null => {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
};

const handleSharedText = async (event: ShareReceivedEvent): Promise<void> => {
  console.log('handleSharedText called', event);
  
  try {
    const files = event.files ?? [];
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

    const sharedText = event.texts?.find((text) => !!text?.trim()) ?? '';
    if (!sharedText) {
      console.warn('No text found in share event');
      return;
    }

    const url = extractUrl(sharedText);
    if (url) {
      console.log('Creating URL capture for', url);
      await createUrlCapture(url, event.title || url);
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

  try {
    await initializeCaptureService();
    await CapacitorShareTarget.addListener('shareReceived', async (event) => {
      await handleSharedText(event);
    });
  } catch (error) {
    console.warn('Failed to initialize share target listener', error);
  }
};

export const cleanupShareService = async (): Promise<void> => {
  try {
    await CapacitorShareTarget.removeAllListeners();
  } catch (error) {
    console.warn('Failed to cleanup share target listeners', error);
  }
};
