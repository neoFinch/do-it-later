import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const DATABASE_NAME = 'capture_inbox';
const DATABASE_VERSION = 5;
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
  schemaVersion INTEGER NOT NULL DEFAULT 5,
  lens TEXT NOT NULL DEFAULT 'general',
  topics TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'intermediate',
  targetAudience TEXT NOT NULL,
  contentType TEXT NOT NULL,
  implementationLevel TEXT NOT NULL DEFAULT 'none',
  learningStyle TEXT NOT NULL DEFAULT 'conceptual',
  codeWalkthrough INTEGER NOT NULL DEFAULT 0,
  viewerExpectationYouWillLearn TEXT NOT NULL DEFAULT '[]',
  viewerExpectationYouWillNotLearn TEXT NOT NULL DEFAULT '[]',
  viewerExpectationYouWillGet TEXT NOT NULL DEFAULT '[]',
  viewerExpectationYouWillNotGet TEXT NOT NULL DEFAULT '[]',
  expectedLearning TEXT NOT NULL DEFAULT 'medium',
  expectedValue TEXT NOT NULL DEFAULT 'medium',
  potentialDisappointment TEXT NOT NULL DEFAULT 'medium',
  recommendation TEXT NOT NULL DEFAULT '',
  estimatedReadingTime INTEGER,
  estimatedWatchTime INTEGER,
  prerequisites TEXT NOT NULL DEFAULT '[]',
  learningOutcomes TEXT NOT NULL DEFAULT '[]',
  lensFields TEXT NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL,
  keyTakeaways TEXT NOT NULL DEFAULT '[]',
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

const migrateAiAnalysisV3 = async (db: SQLiteDBConnection): Promise<void> => {
  const tableInfo = await db.query('PRAGMA table_info(ai_analysis);');
  const columns = (tableInfo.values ?? []).map((row: { name?: string }) => row.name);

  if (columns.length === 0) {
    return;
  }

  if (columns.includes('implementationLevel')) {
    return;
  }

  await db.execute(
    `CREATE TABLE ai_analysis_v3 (
      captureId TEXT PRIMARY KEY NOT NULL,
      topics TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      targetAudience TEXT NOT NULL,
      contentType TEXT NOT NULL,
      implementationLevel TEXT NOT NULL DEFAULT 'none',
      learningStyle TEXT NOT NULL DEFAULT 'conceptual',
      codeWalkthrough INTEGER NOT NULL DEFAULT 0,
      viewerExpectationYouWillLearn TEXT NOT NULL DEFAULT '[]',
      viewerExpectationYouWillNotLearn TEXT NOT NULL DEFAULT '[]',
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
    );`,
    false,
    false
  );

  await db.execute(
    `INSERT INTO ai_analysis_v3
      (captureId, topics, difficulty, targetAudience, contentType,
       implementationLevel, learningStyle, codeWalkthrough,
       viewerExpectationYouWillLearn, viewerExpectationYouWillNotLearn,
       estimatedReadingTime, estimatedWatchTime, prerequisites, learningOutcomes,
       summary, keyTakeaways, reasoning, confidence, analyzedAt)
     SELECT
       captureId, topics, difficulty, targetAudience, contentType,
       CASE WHEN containsHandsOn = 1 THEN 'medium' ELSE 'none' END,
       CASE WHEN containsHandsOn = 1 THEN 'mixed' WHEN containsCode = 1 THEN 'mixed' ELSE 'conceptual' END,
       containsCode,
       '[]', '[]',
       estimatedReadingTime, estimatedWatchTime, prerequisites, learningOutcomes,
       summary, keyTakeaways, reasoning, confidence, analyzedAt
     FROM ai_analysis;`,
    false,
    false
  );

  await db.execute('DROP TABLE ai_analysis;', false, false);
  await db.execute('ALTER TABLE ai_analysis_v3 RENAME TO ai_analysis;', false, false);
};

const migrateAiAnalysisV4 = async (db: SQLiteDBConnection): Promise<void> => {
  const tableInfo = await db.query('PRAGMA table_info(ai_analysis);');
  const columns = (tableInfo.values ?? []).map((row: { name?: string }) => row.name);

  if (columns.length === 0 || columns.includes('expectedLearning')) {
    return;
  }

  await db.execute("ALTER TABLE ai_analysis ADD COLUMN expectedLearning TEXT NOT NULL DEFAULT 'medium';", false, false);
  await db.execute(
    "ALTER TABLE ai_analysis ADD COLUMN potentialDisappointment TEXT NOT NULL DEFAULT 'medium';",
    false,
    false
  );
  await db.execute("ALTER TABLE ai_analysis ADD COLUMN recommendation TEXT NOT NULL DEFAULT '';", false, false);
  await db.execute(
    "UPDATE ai_analysis SET recommendation = summary WHERE recommendation = '' AND summary != '';",
    false,
    false
  );
};

const addColumnIfMissing = async (
  db: SQLiteDBConnection,
  columns: string[],
  name: string,
  ddl: string
): Promise<void> => {
  if (!columns.includes(name)) {
    await db.execute(`ALTER TABLE ai_analysis ADD COLUMN ${ddl};`, false, false);
  }
};

const migrateAiAnalysisV5 = async (db: SQLiteDBConnection): Promise<void> => {
  const tableInfo = await db.query('PRAGMA table_info(ai_analysis);');
  const columns = (tableInfo.values ?? []).map((row: { name?: string }) => row.name).filter(Boolean) as string[];

  if (columns.length === 0) {
    return;
  }

  await addColumnIfMissing(db, columns, 'schemaVersion', 'schemaVersion INTEGER NOT NULL DEFAULT 5');
  await addColumnIfMissing(db, columns, 'lens', "lens TEXT NOT NULL DEFAULT 'technology'");
  await addColumnIfMissing(db, columns, 'lensFields', "lensFields TEXT NOT NULL DEFAULT '{}'");
  await addColumnIfMissing(db, columns, 'expectedValue', "expectedValue TEXT NOT NULL DEFAULT 'medium'");
  await addColumnIfMissing(
    db,
    columns,
    'viewerExpectationYouWillGet',
    "viewerExpectationYouWillGet TEXT NOT NULL DEFAULT '[]'"
  );
  await addColumnIfMissing(
    db,
    columns,
    'viewerExpectationYouWillNotGet',
    "viewerExpectationYouWillNotGet TEXT NOT NULL DEFAULT '[]'"
  );

  await db.execute(
    `UPDATE ai_analysis
     SET expectedValue = expectedLearning
     WHERE (expectedValue IS NULL OR expectedValue = 'medium')
       AND expectedLearning IS NOT NULL
       AND expectedLearning != '';`,
    false,
    false
  );

  await db.execute(
    `UPDATE ai_analysis
     SET viewerExpectationYouWillGet = viewerExpectationYouWillLearn
     WHERE (viewerExpectationYouWillGet IS NULL OR viewerExpectationYouWillGet = '[]')
       AND viewerExpectationYouWillLearn IS NOT NULL
       AND viewerExpectationYouWillLearn != '[]';`,
    false,
    false
  );

  await db.execute(
    `UPDATE ai_analysis
     SET viewerExpectationYouWillNotGet = viewerExpectationYouWillNotLearn
     WHERE (viewerExpectationYouWillNotGet IS NULL OR viewerExpectationYouWillNotGet = '[]')
       AND viewerExpectationYouWillNotLearn IS NOT NULL
       AND viewerExpectationYouWillNotLearn != '[]';`,
    false,
    false
  );
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
    await migrateAiAnalysisV3(db);
    await migrateAiAnalysisV4(db);
    await migrateAiAnalysisV5(db);
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
