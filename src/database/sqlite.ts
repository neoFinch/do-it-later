import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const DATABASE_NAME = 'capture_inbox';
const DATABASE_VERSION = 2;
const DATABASE_MODE = 'no-encryption';

let sqliteConnection: SQLiteConnection | null = null;
let dbConnection: SQLiteDBConnection | null = null;
let databaseReady: Promise<void> | null = null;

const createCaptureTable = `
CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  url TEXT,
  content TEXT,
  source TEXT,
  thumbnail TEXT,
  status TEXT NOT NULL DEFAULT 'INBOX',
  createdAt INTEGER NOT NULL
);
`;

const createContentDocumentTable = `
CREATE TABLE IF NOT EXISTS content_documents (
  captureId TEXT PRIMARY KEY NOT NULL,
  title TEXT,
  description TEXT,
  articleText TEXT,
  transcript TEXT,
  author TEXT,
  publishedAt INTEGER,
  duration INTEGER,
  thumbnail TEXT,
  source TEXT NOT NULL,
  extractedAt INTEGER NOT NULL,
  FOREIGN KEY (captureId) REFERENCES captures(id) ON DELETE CASCADE
);
`;

const createAiAnalysisTable = `
CREATE TABLE IF NOT EXISTS ai_analysis (
  captureId TEXT PRIMARY KEY NOT NULL,
  topics TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  targetAudience TEXT NOT NULL,
  contentType TEXT NOT NULL,
  containsCode INTEGER NOT NULL,
  containsHandsOn INTEGER NOT NULL,
  estimatedReadingTime INTEGER,
  estimatedWatchTime INTEGER,
  prerequisites TEXT NOT NULL,
  learningOutcomes TEXT NOT NULL,
  summary TEXT NOT NULL,
  keyTakeaways TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  confidence REAL NOT NULL,
  analyzedAt INTEGER NOT NULL,
  FOREIGN KEY (captureId) REFERENCES captures(id) ON DELETE CASCADE
);
`;

const createCaptureProcessingTable = `
CREATE TABLE IF NOT EXISTS capture_processing (
  captureId TEXT PRIMARY KEY NOT NULL,
  extractionStatus TEXT NOT NULL DEFAULT 'pending',
  analysisStatus TEXT NOT NULL DEFAULT 'pending',
  extractionError TEXT,
  analysisError TEXT,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (captureId) REFERENCES captures(id) ON DELETE CASCADE
);
`;

const migrateCaptureTable = async (db: SQLiteDBConnection): Promise<void> => {
  const tableInfo = await db.query('PRAGMA table_info(captures);');
  const columns = (tableInfo.values ?? []).map((row: { name?: string }) => row.name);
  if (!columns.includes('status')) {
    await db.execute("ALTER TABLE captures ADD COLUMN status TEXT NOT NULL DEFAULT 'INBOX';", false, false);
  }
};

const migrateV2Tables = async (db: SQLiteDBConnection): Promise<void> => {
  await db.execute(createContentDocumentTable, false, false);
  await db.execute(createAiAnalysisTable, false, false);
  await db.execute(createCaptureProcessingTable, false, false);
};

const getSqliteConnection = (): SQLiteConnection => {
  if (!sqliteConnection) {
    sqliteConnection = new SQLiteConnection(CapacitorSQLite);
  }
  return sqliteConnection;
};

const closeConnection = async (): Promise<void> => {
  if (dbConnection && sqliteConnection) {
    try {
      const openState = await dbConnection.isDBOpen();
      if (openState.result) {
        await dbConnection.close();
      }
      await sqliteConnection.closeConnection(DATABASE_NAME, false);
    } catch {
      // Ignore close errors during recovery.
    }
  }
  dbConnection = null;
};

const deleteLocalDatabase = async (): Promise<void> => {
  if (Capacitor.getPlatform() === 'web') {
    return;
  }

  try {
    await CapacitorSQLite.deleteDatabase({ database: DATABASE_NAME });
  } catch {
    // Database may not exist yet.
  }
};

const openFreshConnection = async (): Promise<SQLiteDBConnection> => {
  const connection = getSqliteConnection();

  if (Capacitor.getPlatform() === 'web') {
    await connection.initWebStore();
  }

  await connection.checkConnectionsConsistency();

  if (!(await connection.isConnection(DATABASE_NAME, false)).result) {
    dbConnection = await connection.createConnection(
      DATABASE_NAME,
      false,
      DATABASE_MODE,
      DATABASE_VERSION,
      false
    );
  } else {
    dbConnection = await connection.retrieveConnection(DATABASE_NAME, false);
  }

  const openState = await dbConnection.isDBOpen();
  if (!openState.result) {
    await dbConnection.open();
  }

  return dbConnection;
};

const initializeOnce = async (allowReset: boolean): Promise<void> => {
  try {
    const db = await openFreshConnection();
    await db.execute(createCaptureTable, false, false);
    await migrateCaptureTable(db);
    await migrateV2Tables(db);
  } catch (error) {
    await closeConnection();
    databaseReady = null;

    if (allowReset && Capacitor.getPlatform() !== 'web') {
      await deleteLocalDatabase();
      sqliteConnection = null;
      return initializeOnce(false);
    }

    throw error;
  }
};

const ensureDatabaseReady = (): Promise<void> => {
  if (!databaseReady) {
    databaseReady = initializeOnce(true).catch((error) => {
      databaseReady = null;
      throw error;
    });
  }
  return databaseReady;
};

export const initDatabase = async (): Promise<void> => {
  await ensureDatabaseReady();
};

export const getDatabase = async (): Promise<SQLiteDBConnection> => {
  await ensureDatabaseReady();
  if (!dbConnection) {
    throw new Error('Database connection is not available.');
  }
  return dbConnection;
};

export const resetDatabase = async (): Promise<void> => {
  databaseReady = null;
  await closeConnection();
  await deleteLocalDatabase();
  sqliteConnection = null;
};

export const formatDatabaseError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
