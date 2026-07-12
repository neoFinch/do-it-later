import { describe, expect, it, vi, beforeEach } from 'vitest';
import { refreshCaptureMedia } from './capture-refresh.service';

vi.mock('./capture.service', () => ({
  getCapture: vi.fn(),
  enrichUrlCapture: vi.fn()
}));

vi.mock('./extraction.service', () => ({
  extractCapture: vi.fn()
}));

vi.mock('../database/processing.repository', () => ({
  getCaptureProcessing: vi.fn()
}));

import { enrichUrlCapture, getCapture } from './capture.service';
import { extractCapture } from './extraction.service';
import { getCaptureProcessing } from '../database/processing.repository';

describe('capture-refresh.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes metadata and extraction for url captures', async () => {
    const capture = {
      id: 'c1',
      type: 'url' as const,
      title: 'Post',
      url: 'https://www.instagram.com/p/abc/',
      content: null,
      source: 'Instagram',
      thumbnail: 'https://cdn.example/thumb.jpg',
      status: 'INBOX' as const,
      createdAt: Date.now()
    };

    const document = {
      captureId: 'c1',
      source: 'instagram' as const,
      articleText: 'Selfless hours and selfish hours for training and reflection.',
      extractedAt: Date.now()
    };

    vi.mocked(getCapture)
      .mockResolvedValueOnce(capture)
      .mockResolvedValueOnce({ ...capture, thumbnail: 'https://cdn.example/thumb.jpg' });
    vi.mocked(enrichUrlCapture).mockResolvedValue({
      updated: true,
      thumbnail: 'https://cdn.example/thumb.jpg',
      title: 'Post',
      error: null
    });
    vi.mocked(extractCapture).mockResolvedValue(document);
    vi.mocked(getCaptureProcessing).mockResolvedValue({
      captureId: 'c1',
      extractionStatus: 'completed',
      analysisStatus: 'pending',
      extractionError: null,
      analysisError: null,
      updatedAt: Date.now()
    });

    const result = await refreshCaptureMedia('c1');

    expect(enrichUrlCapture).toHaveBeenCalledWith('c1', capture.url, capture.title, { force: true });
    expect(extractCapture).toHaveBeenCalledWith('c1', { force: true });
    expect(result.extractionOk).toBe(true);
    expect(result.thumbnailPresent).toBe(true);
    expect(result.userMessage).toContain('updated');
  });

  it('explains when extraction fails after refresh', async () => {
    const capture = {
      id: 'c2',
      type: 'url' as const,
      title: null,
      url: 'https://www.instagram.com/reel/xyz/',
      content: null,
      source: null,
      thumbnail: null,
      status: 'INBOX' as const,
      createdAt: Date.now()
    };

    vi.mocked(getCapture).mockResolvedValue(capture);
    vi.mocked(enrichUrlCapture).mockResolvedValue({
      updated: false,
      thumbnail: null,
      title: null,
      error: 'Could not fetch a preview image for this link.'
    });
    vi.mocked(extractCapture).mockResolvedValue(null);
    vi.mocked(getCaptureProcessing).mockResolvedValue({
      captureId: 'c2',
      extractionStatus: 'failed',
      analysisStatus: 'skipped',
      extractionError: 'Instagram blocked this page (login wall).',
      analysisError: null,
      updatedAt: Date.now()
    });

    const result = await refreshCaptureMedia('c2');

    expect(result.extractionOk).toBe(false);
    expect(result.thumbnailPresent).toBe(false);
    expect(result.userMessage).toContain('Instagram blocked');
  });
});
