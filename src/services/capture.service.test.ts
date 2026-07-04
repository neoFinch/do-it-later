import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Capture } from '../types/capture';

vi.mock('../database/capture.repository', () => ({
  initializeCaptureTable: vi.fn(),
  saveCapture: vi.fn(),
  findUrlCaptureByUrl: vi.fn(),
  getCaptureById: vi.fn(),
  listCaptures: vi.fn(),
  updateCapture: vi.fn()
}));

vi.mock('../database/content-document.repository', () => ({
  initializeContentDocumentTable: vi.fn()
}));

vi.mock('../database/ai-analysis.repository', () => ({
  initializeAiAnalysisTable: vi.fn()
}));

vi.mock('../database/processing.repository', () => ({
  initializeCaptureProcessingTable: vi.fn()
}));

vi.mock('./metadata.service', () => ({
  fetchUrlMetadata: vi.fn()
}));

vi.mock('./processing.service', () => ({
  queueCaptureProcessing: vi.fn()
}));

vi.mock('../store/captureStore', () => ({
  useCaptureStore: {
    getState: () => ({
      initialized: false,
      reload: vi.fn()
    })
  }
}));

import * as repository from '../database/capture.repository';
import { createUrlCapture } from './capture.service';
import { queueCaptureProcessing } from './processing.service';

describe('capture.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an existing capture id for duplicate urls', async () => {
    const existing: Capture = {
      id: 'existing-id',
      type: 'url',
      title: 'Example',
      url: 'https://example.com/page',
      content: null,
      source: null,
      thumbnail: 'https://example.com/thumb.jpg',
      status: 'INBOX',
      createdAt: Date.now()
    };

    vi.mocked(repository.findUrlCaptureByUrl).mockResolvedValue(existing);

    const id = await createUrlCapture('https://www.example.com/page/');

    expect(id).toBe('existing-id');
    expect(repository.saveCapture).not.toHaveBeenCalled();
    expect(queueCaptureProcessing).not.toHaveBeenCalled();
  });

  it('re-queues enrichment when a duplicate url is missing metadata', async () => {
    const existing: Capture = {
      id: 'existing-id',
      type: 'url',
      title: 'https://example.com/page',
      url: 'https://example.com/page',
      content: null,
      source: null,
      thumbnail: null,
      status: 'INBOX',
      createdAt: Date.now()
    };

    vi.mocked(repository.findUrlCaptureByUrl).mockResolvedValue(existing);

    const id = await createUrlCapture('https://example.com/page');

    expect(id).toBe('existing-id');
    expect(repository.saveCapture).not.toHaveBeenCalled();
    expect(queueCaptureProcessing).toHaveBeenCalledWith('existing-id');
  });

  it('creates a new capture when the url is unique', async () => {
    vi.mocked(repository.findUrlCaptureByUrl).mockResolvedValue(null);

    const id = await createUrlCapture('https://example.com/new-page');

    expect(id).toBeTruthy();
    expect(repository.saveCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'url',
        url: 'https://example.com/new-page',
        status: 'INBOX'
      })
    );
    expect(queueCaptureProcessing).toHaveBeenCalledWith(id);
  });
});
