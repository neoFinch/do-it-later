import mockBackup from '../../mock-data/mock-capture-data.json';
import * as repository from '../database/capture.repository';
import { ImportResult, importCaptures } from './backup.service';

export interface SeedResult extends ImportResult {
  cleared: boolean;
}

export const getMockCaptureJson = (): string => JSON.stringify(mockBackup);

export const seedMockCaptures = async (options?: { replace?: boolean }): Promise<SeedResult> => {
  await repository.initializeCaptureTable();

  let cleared = false;
  if (options?.replace) {
    await repository.clearAllCaptures();
    cleared = true;
  }

  const result = await importCaptures(getMockCaptureJson());
  return { ...result, cleared };
};

export const seedMockCapturesIfEmpty = async (): Promise<SeedResult | null> => {
  await repository.initializeCaptureTable();
  const counts = await repository.countCapturesByStatus();
  const total = counts.INBOX + counts.REVIEWED + counts.ARCHIVED;

  if (total > 0) {
    return null;
  }

  return seedMockCaptures();
};
