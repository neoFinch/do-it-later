import { describe, expect, it, vi, beforeEach } from 'vitest';
import { extractCapture } from './extraction.service';
import { Capture } from '../types/capture';

vi.mock('./capture.service', () => ({
  getCapture: vi.fn()
}));

vi.mock('./extractors/content-extractor.service', () => ({
  extractCaptureContent: vi.fn()
}));

vi.mock('../database/content-document.repository', () => ({
  getContentDocument: vi.fn(),
  saveContentDocument: vi.fn()
}));

vi.mock('../database/processing.repository', () => ({
  getCaptureProcessing: vi.fn(),
  saveCaptureProcessing: vi.fn()
}));

import { getCapture } from './capture.service';
import { extractCaptureContent } from './extractors/content-extractor.service';
import { getContentDocument, saveContentDocument } from '../database/content-document.repository';
import { getCaptureProcessing, saveCaptureProcessing } from '../database/processing.repository';

describe('extraction.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCaptureProcessing).mockResolvedValue(null);
    vi.mocked(saveCaptureProcessing).mockResolvedValue(undefined);
  });

  it('skips file captures', async () => {
    const capture: Capture = {
      id: 'file-1',
      type: 'file',
      title: 'Image',
      content: 'files/image.jpg',
      url: null,
      source: 'image/jpeg',
      thumbnail: null,
      status: 'INBOX',
      createdAt: Date.now()
    };

    vi.mocked(getCapture).mockResolvedValue(capture);
    vi.mocked(getContentDocument).mockResolvedValue(null);

    const result = await extractCapture('file-1');
    expect(result).toBeNull();
    expect(extractCaptureContent).not.toHaveBeenCalled();
    expect(saveCaptureProcessing).toHaveBeenCalled();
  });

  it('extracts note content and saves document', async () => {
    const capture: Capture = {
      id: 'note-1',
      type: 'note',
      title: 'Note',
      content: 'Remember OAuth redirect validation.',
      url: null,
      source: null,
      thumbnail: null,
      status: 'INBOX',
      createdAt: Date.now()
    };

    const document = {
      captureId: 'note-1',
      source: 'note' as const,
      articleText: 'Remember OAuth redirect validation.',
      extractedAt: Date.now()
    };

    vi.mocked(getCapture).mockResolvedValue(capture);
    vi.mocked(getContentDocument).mockResolvedValue(null);
    vi.mocked(extractCaptureContent).mockResolvedValue({
      document,
      estimatedReadingTime: 1,
      estimatedWatchTime: null
    });

    const result = await extractCapture('note-1');
    expect(saveContentDocument).toHaveBeenCalledWith(document);
    expect(result).toEqual(document);
  });
});
