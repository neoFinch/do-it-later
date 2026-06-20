import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const DATABASE_NAME = 'capture_inbox';
const DATABASE_VERSION = 1;
const DATABASE_MODE = 'no-encryption';

let sqliteConnection: SQLiteConnection | null = null;
let dbConnection: SQLiteDBConnection | null = null;

const createCaptureTable = `
CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  url TEXT,
  content TEXT,
  source TEXT,
  thumbnail TEXT,
  createdAt INTEGER NOT NULL
);
`;

const ensureDatabase = async (): Promise<SQLiteDBConnection> => {
  if (!sqliteConnection) {
    sqliteConnection = new SQLiteConnection(CapacitorSQLite);
  }

  if (Capacitor.getPlatform() === 'web') {
    await sqliteConnection.initWebStore();
  }

  const connectionExists = await sqliteConnection.isConnection(DATABASE_NAME, false);
  if (!connectionExists.result) {
    await sqliteConnection.createConnection(DATABASE_NAME, false, DATABASE_MODE, DATABASE_VERSION, false);
  }

  if (!dbConnection) {
    dbConnection = await sqliteConnection.retrieveConnection(DATABASE_NAME, false);
    await dbConnection.open();
  }

  return dbConnection;
};

export const initDatabase = async (): Promise<void> => {
  const db = await ensureDatabase();
  await db.execute(createCaptureTable, false, false);
};

export const getDatabase = async (): Promise<SQLiteDBConnection> => {
  return ensureDatabase();
};
