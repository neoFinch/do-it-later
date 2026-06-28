import { initializeCaptureService } from '../services/capture.service';
import { initializeShareService } from '../services/share.service';
import { processStaleCaptures } from '../services/processing.service';

let bootstrapPromise: Promise<void> | null = null;

export const bootstrapApp = async (): Promise<void> => {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    await initializeCaptureService();

    try {
      await initializeShareService();
    } catch (error) {
      console.warn('Share service bootstrap failed', error);
    }

    void processStaleCaptures(5).catch((error) => {
      console.warn('Background content processing failed', error);
    });
  })().catch((error) => {
    bootstrapPromise = null;
    throw error;
  });

  return bootstrapPromise;
};
