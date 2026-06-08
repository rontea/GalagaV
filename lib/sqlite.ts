
import type { Database } from 'sql.js';
import { Project, Step, HighScore, GlobalConfig, UserProfile } from '../types';

let db: Database | null = null;
const DB_STORAGE_KEY = 'galagav_sqlite_db';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/sql-wasm.wasm';
const SQL_JS_MODULE_URL = 'https://esm.sh/sql.js@1.12.0';

/**
 * Helper: Efficiently convert Uint8Array to Base64 without stack overflow.
 */
function uint8ArrayToBase64(buffer: Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: Efficiently convert Base64 to Uint8Array.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function parseJSON<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Initializes the SQLite database. 
 * Checks Server Disk first, then LocalStorage, or starts fresh.
 */
export const initDB = async (): Promise<Database> => {
  if (db) return db;

  try {
    // 1. Fetch WASM
    const wasmResponse = await fetch(WASM_URL);
    const wasmBuffer = await wasmResponse.arrayBuffer();

    // 2. Load sql.js
    const sqlModule = await import(/* @vite-ignore */ SQL_JS_MODULE_URL);
    const initSqlJs = sqlModule.default || sqlModule;
    const SQL = await (initSqlJs as any)({ wasmBinary: new Uint8Array(wasmBuffer) });

    let databaseBinary: Uint8Array | null = null;

    // 3. ATTEMPT DISK LOAD (Server /storage/galagav.sqlite)
    try {
      console.log("[SQLITE] Attempting disk load from /storage/...");
      const serverResponse = await fetch('/__system/db-load');
      if (serverResponse.ok) {
        const buffer = await serverResponse.arrayBuffer();
        databaseBinary = new Uint8Array(buffer);
        console.log(`[SQLITE] Disk load success (${databaseBinary.length} bytes).`);
      }
    } catch (e) {
      console.warn("[SQLITE] Disk sync unavailable (offline/build mode).");
    }

    // 4. FALLBACK TO LOCALSTORAGE
    if (!databaseBinary) {
      const savedLocal = localStorage.getItem(DB_STORAGE_KEY);
      if (savedLocal) {
        databaseBinary = base64ToUint8Array(savedLocal);
        console.log("[SQLITE] LocalStorage load success.");
      }
    }

    // 5. INITIALIZE DB
    if (databaseBinary && databaseBinary.length > 16) {
      // Check for SQLite header: "SQLite format 3\0"
      const header = String.fromCharCode(...databaseBinary.slice(0, 15));
      if (header === "SQLite format 3") {
        try {
          db = new SQL.Database(databaseBinary);
          // Ensure schema is up to date for existing databases
          runMigrations(db);
          
          // Verify database is functional
          db.exec("SELECT 1");
        } catch (e) {
          console.error("[SQLITE] Binary corrupt, starting fresh", e);
          db = new SQL.Database();
          createSchema(db);
        }
      } else {
        console.warn("[SQLITE] Invalid database header, starting fresh.");
        db = new SQL.Database();
        createSchema(db);
      }
    } else {
      console.log("[SQLITE] Fresh initialization.");
      db = new SQL.Database();
      createSchema(db);
    }

    return db;
  } catch (error) {
    console.error("[SQLITE] Initialization failed:", error);
    throw error;
  }
};

const createSchema = (database: Database) => {
  database.run(`
    CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT, description TEXT, systemPrompt TEXT, icon TEXT, deletedAt INTEGER, repositoryUrl TEXT, localFolderPath TEXT, todoFolderPath TEXT, defaultBranch TEXT, version TEXT, tabOrder TEXT, timelines TEXT, snippets TEXT, rightPanelTimelineIds TEXT);
    CREATE TABLE IF NOT EXISTS steps (id TEXT PRIMARY KEY, projectId TEXT, parentId TEXT, title TEXT, category TEXT, status TEXT, content TEXT, notes TEXT, isTab INTEGER, createdAt INTEGER, archivedAt INTEGER, sortOrder INTEGER, imageUrl TEXT, todoId TEXT, timelineId TEXT, history TEXT);
    CREATE TABLE IF NOT EXISTS high_scores (id TEXT PRIMARY KEY, userId TEXT, pilotName TEXT, score INTEGER, timestamp INTEGER);
    CREATE TABLE IF NOT EXISTS user_profiles (uid TEXT PRIMARY KEY, name TEXT, pilotName TEXT, themePreference TEXT, createdAt INTEGER);
    CREATE TABLE IF NOT EXISTS global_config (key TEXT PRIMARY KEY, value TEXT);
  `);
};

const ensureProjectSchema = (database: Database) => {
  const result = database.exec("PRAGMA table_info(projects)");
  if (result.length && result[0].columns.includes('name')) {
    const columns = result[0].values.map(col => col[1]);
    if (!columns.includes('rightPanelTimelineIds')) {
      database.run("ALTER TABLE projects ADD COLUMN rightPanelTimelineIds TEXT;");
    }
  }
};

/**
 * Migration Layer: Ensures missing columns are added to existing tables.
 */
const runMigrations = (database: Database) => {
  try {
    // 1. Ensure 'steps' table has 'imageUrl' column
    const res = database.exec("PRAGMA table_info(steps)");
    if (res.length > 0) {
      const columns = res[0].values.map(row => row[1] as string);
      if (!columns.includes('imageUrl')) {
        console.log("[SQLITE_MIGRATION] Adding 'imageUrl' to 'steps' table...");
        database.run("ALTER TABLE steps ADD COLUMN imageUrl TEXT");
      }
      if (!columns.includes('todoId')) {
        console.log("[SQLITE_MIGRATION] Adding 'todoId' to 'steps' table...");
        database.run("ALTER TABLE steps ADD COLUMN todoId TEXT");
      }
      if (!columns.includes('timelineId')) {
        console.log("[SQLITE_MIGRATION] Adding 'timelineId' to 'steps' table...");
        database.run("ALTER TABLE steps ADD COLUMN timelineId TEXT");
      }
      if (!columns.includes('history')) {
        console.log("[SQLITE_MIGRATION] Adding 'history' to 'steps' table...");
        database.run("ALTER TABLE steps ADD COLUMN history TEXT");
      }
    }
    
    // Ensure 'projects' table has 'repositoryUrl' and 'localFolderPath' columns
    const projRes = database.exec("PRAGMA table_info(projects)");
    if (projRes.length > 0) {
      const columns = projRes[0].values.map(row => row[1] as string);
      if (!columns.includes('repositoryUrl')) {
        console.log("[SQLITE_MIGRATION] Adding 'repositoryUrl' to 'projects' table...");
        database.run("ALTER TABLE projects ADD COLUMN repositoryUrl TEXT");
      }
      if (!columns.includes('localFolderPath')) {
        console.log("[SQLITE_MIGRATION] Adding 'localFolderPath' to 'projects' table...");
        database.run("ALTER TABLE projects ADD COLUMN localFolderPath TEXT");
      }
      if (!columns.includes('todoFolderPath')) {
        console.log("[SQLITE_MIGRATION] Adding 'todoFolderPath' to 'projects' table...");
        database.run("ALTER TABLE projects ADD COLUMN todoFolderPath TEXT");
      }
      if (!columns.includes('defaultBranch')) {
        console.log("[SQLITE_MIGRATION] Adding 'defaultBranch' to 'projects' table...");
        database.run("ALTER TABLE projects ADD COLUMN defaultBranch TEXT");
      }
      if (!columns.includes('version')) {
        console.log("[SQLITE_MIGRATION] Adding 'version' to 'projects' table...");
        database.run("ALTER TABLE projects ADD COLUMN version TEXT");
      }
      if (!columns.includes('tabOrder')) {
        console.log("[SQLITE_MIGRATION] Adding 'tabOrder' to 'projects' table...");
        database.run("ALTER TABLE projects ADD COLUMN tabOrder TEXT");
      }
      if (!columns.includes('timelines')) {
        console.log("[SQLITE_MIGRATION] Adding 'timelines' to 'projects' table...");
        database.run("ALTER TABLE projects ADD COLUMN timelines TEXT");
      }
      if (!columns.includes('snippets')) {
        console.log("[SQLITE_MIGRATION] Adding 'snippets' to 'projects' table...");
        database.run("ALTER TABLE projects ADD COLUMN snippets TEXT");
      }
      if (!columns.includes('rightPanelTimelineIds')) {
        console.log("[SQLITE_MIGRATION] Adding 'rightPanelTimelineIds' to 'projects' table...");
        database.run("ALTER TABLE projects ADD COLUMN rightPanelTimelineIds TEXT");
      }
    }

    // Future migrations can be added here
  } catch (err) {
    console.error("[SQLITE_MIGRATION] Migration check failed:", err);
  }
};

/**
 * Persists the DB to LocalStorage and pushes to Server Disk.
 */
export const persistDB = async () => {
  if (!db) return;
  try {
    const data = db.export();
    
    // 1. Sync to LocalStorage (Immediate safety)
    try {
      const base64 = uint8ArrayToBase64(data);
      localStorage.setItem(DB_STORAGE_KEY, base64);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn("[SQLITE] LocalStorage quota exceeded. Relying on server sync.");
      } else {
        throw e;
      }
    }

    // 2. Push to Server Disk (storage/ folder)
    fetch('/__system/db-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: data
    }).catch(err => console.warn("[SQLITE_SYNC] Background disk push failed. Local save intact.", err));

  } catch (error) {
    console.error("[SQLITE] Persistence failed:", error);
  }
};

// --- Operations ---

export const getProjectsFromDB = (): Project[] => {
  if (!db) return [];
  const res = db.exec("SELECT * FROM projects");
  if (!res.length) return [];

  const columns = res[0].columns;

  return res[0].values.map(row => {
    const rowData: Record<string, any> = {};
    columns.forEach((col, idx) => {
      rowData[col] = row[idx];
    });

    const { id, name, description, systemPrompt, icon, deletedAt, repositoryUrl, localFolderPath, todoFolderPath, defaultBranch, version, tabOrder, timelines, snippets, rightPanelTimelineIds } = rowData;
    
    const stepRes = db!.exec("SELECT * FROM steps WHERE projectId = ? ORDER BY sortOrder ASC", [id]);
    const flatSteps: any[] = stepRes.length ? stepRes[0].values.map(s => ({
      id: s[0], projectId: s[1], parentId: s[2], title: s[3], category: s[4], status: s[5], content: s[6], notes: s[7], isTab: !!s[8], createdAt: s[9], archivedAt: s[10], imageUrl: s[12], todoId: s[13] || undefined, timelineId: s[14] || undefined, history: parseJSON(s[15], [])
    })) : [];

    const stepsMap: Record<string, Step> = {};
    flatSteps.forEach(s => { stepsMap[s.id] = { ...s, subSteps: [] }; });
    const rootSteps: Step[] = [];
    flatSteps.forEach(s => {
      if (s.parentId && stepsMap[s.parentId]) stepsMap[s.parentId].subSteps!.push(stepsMap[s.id]);
      else rootSteps.push(stepsMap[s.id]);
    });

    return {
      id: id as string, 
      name: name as string, 
      description: description as string, 
      systemPrompt: systemPrompt as string, 
      icon: icon as string || undefined, 
      deletedAt: deletedAt as number || undefined, 
      repositoryUrl: repositoryUrl as string || undefined, 
      localFolderPath: localFolderPath as string || undefined,
      todoFolderPath: todoFolderPath as string || undefined,
      defaultBranch: defaultBranch as string || undefined,
      version: version as string || undefined,
      tabOrder: parseJSON<string[]>(tabOrder, undefined as any),
      timelines: parseJSON(timelines, undefined as any),
      snippets: parseJSON(snippets, undefined as any),
      rightPanelTimelineIds: parseJSON<string[]>(rightPanelTimelineIds, undefined as any),
      steps: rootSteps
    };
  });
};

export const saveProjectsToDB = (projects: Project[]) => {
  if (!db) return;
  db.run("DELETE FROM projects");
  db.run("DELETE FROM steps");
  projects.forEach(p => {
    db!.run("INSERT INTO projects (id, name, description, systemPrompt, icon, deletedAt, repositoryUrl, localFolderPath, todoFolderPath, defaultBranch, version, tabOrder, timelines, snippets, rightPanelTimelineIds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [p.id, p.name, p.description, p.systemPrompt, p.icon || null, p.deletedAt || null, p.repositoryUrl || null, p.localFolderPath || null, p.todoFolderPath || null, p.defaultBranch || null, p.version || null, p.tabOrder ? JSON.stringify(p.tabOrder) : null, p.timelines ? JSON.stringify(p.timelines) : null, p.snippets ? JSON.stringify(p.snippets) : null, p.rightPanelTimelineIds ? JSON.stringify(p.rightPanelTimelineIds) : null]);
    const saveStep = (step: Step, parentId: string | null, index: number) => {
      // Robust fix: Use INSERT OR REPLACE to avoid UNIQUE constraint collisions on duplicate step hierarchies
      db!.run("INSERT OR REPLACE INTO steps (id, projectId, parentId, title, category, status, content, notes, isTab, createdAt, archivedAt, sortOrder, imageUrl, todoId, timelineId, history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [step.id, p.id, parentId, step.title, step.category, step.status, step.content, step.notes || null, step.isTab ? 1 : 0, step.createdAt || Date.now(), step.archivedAt || null, index, step.imageUrl || null, step.todoId || null, step.timelineId || null, step.history ? JSON.stringify(step.history) : null]
      );
      if (step.subSteps) step.subSteps.forEach((sub, subIdx) => saveStep(sub, step.id, subIdx));
    };
    p.steps.forEach((s, idx) => saveStep(s, null, idx));
  });
  persistDB();
};

export const saveScoreToDB = (score: HighScore) => {
  if (!db) return;
  db.run("INSERT INTO high_scores (id, userId, pilotName, score, timestamp) VALUES (?, ?, ?, ?, ?)", [score.id || `sc_${Date.now()}`, score.userId, score.pilotName, score.score, score.timestamp]);
  persistDB();
};

export const getScoresFromDB = (): HighScore[] => {
  if (!db) return [];
  const res = db.exec("SELECT * FROM high_scores ORDER BY score DESC LIMIT 10");
  return res.length ? res[0].values.map(row => ({ id: row[0] as string, userId: row[1] as string, pilotName: row[2] as string, score: row[3] as number, timestamp: row[4] as number })) : [];
};

export const saveProfileToDB = (profile: UserProfile) => {
  if (!db) return;
  db.run("INSERT OR REPLACE INTO user_profiles (uid, name, pilotName, themePreference, createdAt) VALUES (?, ?, ?, ?, ?)", [profile.uid, profile.name, profile.pilotName || null, profile.themePreference, profile.createdAt]);
  persistDB();
};

export const getProfileFromDB = (uid: string): UserProfile | null => {
  if (!db) return null;
  const res = db.exec("SELECT * FROM user_profiles WHERE uid = ?", [uid]);
  if (!res.length) return null;
  const row = res[0].values[0];
  return { uid: row[0] as string, name: row[1] as string, pilotName: row[2] as string || undefined, themePreference: row[3] as any, createdAt: row[4] as number };
};

export const saveConfigToDB = (config: GlobalConfig) => {
  if (!db) return;
  db.run("INSERT OR REPLACE INTO global_config (key, value) VALUES (?, ?)", ['main_config', JSON.stringify(config)]);
  persistDB();
};

export const getConfigFromDB = (): GlobalConfig | null => {
  if (!db) return null;
  const res = db.exec("SELECT value FROM global_config WHERE key = 'main_config'");
  try { return res.length ? JSON.parse(res[0].values[0][0] as string) : null; } catch { return null; }
};

export const migrateFromLocalStorage = (database: Database) => {
  const legacy = localStorage.getItem('galaga_global_config_v1');
  if (legacy) {
      try {
          database.run("INSERT OR REPLACE INTO global_config (key, value) VALUES (?, ?)", ['main_config', legacy]);
          persistDB();
      } catch (e) {}
  }
};
