import { create } from 'zustand';
import { Capture, CaptureStatus } from '../types/capture';
import * as captureService from '../services/capture.service';
import { seedMockCapturesIfEmpty } from '../services/seed.service';
import { resetDatabase } from '../database/sqlite';
import { isSameCaptureDisplay } from '../utils/capture-display';

const EMPTY_STATUS_COUNTS: Record<CaptureStatus, number> = {
  INBOX: 0,
  REVIEWED: 0,
  ARCHIVED: 0
};

interface CaptureState {
  captures: Capture[];
  statusFilter: CaptureStatus;
  statusCounts: Record<CaptureStatus, number>;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  reload: (options?: { silent?: boolean }) => Promise<void>;
  setStatusFilter: (status: CaptureStatus) => Promise<void>;
  search: (query: string) => Promise<void>;
  addUrlCapture: (url: string, title?: string | null) => Promise<void>;
  addNoteCapture: (content: string, title?: string | null) => Promise<void>;
  removeCapture: (id: string) => Promise<void>;
  updateCaptureTitle: (id: string, title: string) => Promise<void>;
  updateCaptureStatus: (id: string, status: CaptureStatus) => Promise<void>;
  patchCapture: (id: string, updates: Partial<Omit<Capture, 'id' | 'createdAt'>>) => void;
  patchCaptures: (patches: Record<string, Partial<Omit<Capture, 'id' | 'createdAt'>>>) => void;
  repairDatabase: () => Promise<void>;
}

const loadCapturesAndCounts = async (status: CaptureStatus, query?: string) => {
  const [captures, statusCounts] = await Promise.all([
    query?.trim()
      ? captureService.searchCaptures(query, status)
      : captureService.listCaptures(status),
    captureService.countCapturesByStatus()
  ]);

  return { captures, statusCounts };
};

export const useCaptureStore = create<CaptureState>((set, get) => ({
  captures: [],
  statusFilter: 'INBOX',
  statusCounts: EMPTY_STATUS_COUNTS,
  loading: false,
  initialized: false,
  init: async () => {
    if (get().initialized) {
      return;
    }

    set({ loading: true });
    try {
      await captureService.initializeCaptureService();
      if (import.meta.env.DEV) {
        await seedMockCapturesIfEmpty();
      }
      const { statusFilter } = get();
      await captureService.refreshDirtyCaptureTitles();
      const { captures, statusCounts } = await loadCapturesAndCounts(statusFilter);
      set({ captures, statusCounts, loading: false, initialized: true });
      captureService.enrichStaleUrlCaptures(captures);
    } catch (error) {
      console.error('CaptureStore: init failed', error);
      set({ loading: false });
      throw error;
    }
  },
  reload: async (options) => {
    const silent = options?.silent === true;
    if (!silent) {
      console.log('[LaterStore] reload called');
      set({ loading: true });
    }
    try {
      const { statusFilter } = get();
      if (!silent) {
        await captureService.refreshDirtyCaptureTitles();
      }
      const { captures, statusCounts } = await loadCapturesAndCounts(statusFilter);
      if (!silent) {
        console.log('[LaterStore] reload finished', captures.length, 'captures');
      }
      set({ captures, statusCounts, loading: false, initialized: true });
      if (!silent) {
        captureService.enrichStaleUrlCaptures(captures);
      }
    } catch (error) {
      console.error('CaptureStore: reload failed', error);
      set({ loading: false });
      throw error;
    }
  },
  setStatusFilter: async (status: CaptureStatus) => {
    set({ statusFilter: status, loading: true });
    const { captures, statusCounts } = await loadCapturesAndCounts(status);
    set({ captures, statusCounts, loading: false });
  },
  search: async (query: string) => {
    set({ loading: true });
    const { statusFilter } = get();
    const { captures, statusCounts } = await loadCapturesAndCounts(statusFilter, query);
    set({ captures, statusCounts, loading: false });
  },
  addUrlCapture: async (url: string, title?: string | null) => {
    await captureService.createUrlCapture(url, title);
    try {
      await get().reload();
    } catch (error) {
      console.error('CaptureStore: reload after URL add failed', error);
    }
  },
  addNoteCapture: async (content: string, title?: string | null) => {
    await captureService.createNoteCapture(content, title);
    try {
      await get().reload();
    } catch (error) {
      console.error('CaptureStore: reload after note add failed', error);
    }
  },
  removeCapture: async (id: string) => {
    await captureService.deleteCapture(id);
    await get().reload();
  },
  updateCaptureTitle: async (id: string, title: string) => {
    await captureService.updateCaptureTitle(id, title);
    await get().reload();
  },
  updateCaptureStatus: async (id: string, status: CaptureStatus) => {
    await captureService.updateCaptureStatus(id, status);
    await get().reload();
  },
  patchCapture: (id, updates) => {
    get().patchCaptures({ [id]: updates });
  },
  patchCaptures: (patches) => {
    set((state) => {
      let changed = false;
      const captures = state.captures.slice();

      for (const [id, updates] of Object.entries(patches)) {
        const index = captures.findIndex((capture) => capture.id === id);
        if (index === -1) {
          continue;
        }

        const existing = captures[index];
        if (isSameCaptureDisplay(existing, { ...existing, ...updates })) {
          continue;
        }

        captures[index] = { ...existing, ...updates };
        changed = true;
      }

      if (!changed) {
        return state;
      }

      console.log('[LaterStore] patchCaptures', Object.keys(patches).join(','));

      return { captures };
    });
  },
  repairDatabase: async () => {
    set({ loading: true, initialized: false, captures: [], statusCounts: EMPTY_STATUS_COUNTS });
    await resetDatabase();
    await get().init();
  }
}));
