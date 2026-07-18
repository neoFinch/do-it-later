import { describe, expect, it, vi, beforeEach } from 'vitest';
import { refreshCaptureMedia, refreshCaptureThumbnail } from './capture-refresh.service';

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
import { createDefaultProcessingState } from '../types/capture-processing';

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
      ...createDefaultProcessingState('c1', Date.now()),
      extractionStatus: 'completed'
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
      ...createDefaultProcessingState('c2', Date.now()),
      extractionStatus: 'failed',
      analysisStatus: 'skipped',
      extractionError: 'Instagram blocked this page (login wall).'
    });

    const result = await refreshCaptureMedia('c2');

    expect(result.extractionOk).toBe(false);
    expect(result.thumbnailPresent).toBe(false);
    expect(result.userMessage).toContain('Instagram blocked');
  });

  it('refreshes only the preview thumbnail for url captures', async () => {
    const capture = {
      id: 'c3',
      type: 'url' as const,
      title: 'Old reel',
      url: 'https://www.instagram.com/reel/abc/',
      content: null,
      source: 'Instagram',
      thumbnail: null,
      status: 'INBOX' as const,
      createdAt: Date.now()
    };

    vi.mocked(getCapture)
      .mockResolvedValueOnce(capture)
      .mockResolvedValueOnce({ ...capture, thumbnail: 'captures/c3/thumbnail.jpg' });
    vi.mocked(enrichUrlCapture).mockResolvedValue({
      updated: true,
      thumbnail: 'captures/c3/thumbnail.jpg',
      title: 'Old reel',
      error: null
    });

    const result = await refreshCaptureThumbnail('c3');

    expect(enrichUrlCapture).toHaveBeenCalledWith('c3', capture.url, capture.title, {
      force: true,
      thumbnailOnly: true
    });
    expect(extractCapture).not.toHaveBeenCalled();
    expect(result.thumbnailPresent).toBe(true);
    expect(result.userMessage).toContain('Preview image updated');
  });
});
