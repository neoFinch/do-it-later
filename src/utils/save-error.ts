import { formatDatabaseError } from '../database/sqlite';

export const formatSaveError = (error: unknown): string => {
  const message = formatDatabaseError(error).trim();
  if (!message) {
    return 'Could not save. Try again.';
  }
  return message.length > 120 ? `${message.slice(0, 117)}...` : message;
};
