import { create } from 'zustand';
import { Capture } from '../types/capture';
import * as captureService from '../services/capture.service';

interface CaptureState {
  captures: Capture[];
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  reload: () => Promise<void>;
  search: (query: string) => Promise<void>;
  addUrlCapture: (url: string, title?: string | null) => Promise<void>;
  addNoteCapture: (content: string, title?: string | null) => Promise<void>;
  removeCapture: (id: string) => Promise<void>;
  updateCaptureTitle: (id: string, title: string) => Promise<void>;
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  captures: [],
  loading: false,
  initialized: false,
  init: async () => {
    if (get().initialized) {
      return;
    }

    set({ loading: true });
    await captureService.initializeCaptureService();
    const captures = await captureService.listCaptures();
    set({ captures, loading: false, initialized: true });
    captureService.enrichStaleUrlCaptures(captures);
  },
  reload: async () => {
    console.log('CaptureStore: reload called');
    set({ loading: true });
    const captures = await captureService.listCaptures();
    console.log('CaptureStore: reload finished, got', captures.length, 'captures');
    set({ captures, loading: false });
    captureService.enrichStaleUrlCaptures(captures);
  },
  search: async (query: string) => {
    set({ loading: true });
    const captures = await captureService.searchCaptures(query);
    set({ captures, loading: false });
  },
  addUrlCapture: async (url: string, title?: string | null) => {
    await captureService.createUrlCapture(url, title);
    await get().reload();
  },
  addNoteCapture: async (content: string, title?: string | null) => {
    await captureService.createNoteCapture(content, title);
    await get().reload();
  },
  removeCapture: async (id: string) => {
    await captureService.deleteCapture(id);
    await get().reload();
  },
  updateCaptureTitle: async (id: string, title: string) => {
    await captureService.updateCaptureTitle(id, title);
    await get().reload();
  }
}));
