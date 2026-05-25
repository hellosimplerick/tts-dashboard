import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "tts-dashboard.db");

let db: Database.Database | null = null;

function ensureColumn(database: Database.Database, table: string, column: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((c) => c.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS configurations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'openai',
        model TEXT NOT NULL DEFAULT 'gpt-4o-mini-tts',
        voice TEXT NOT NULL DEFAULT 'alloy',
        script TEXT NOT NULL DEFAULT '',
        voice_affect TEXT NOT NULL DEFAULT '',
        tone TEXT NOT NULL DEFAULT '',
        pacing TEXT NOT NULL DEFAULT '',
        emphasis TEXT NOT NULL DEFAULT '',
        pauses TEXT NOT NULL DEFAULT '',
        avoid TEXT NOT NULL DEFAULT '',
        quick_mutations TEXT NOT NULL DEFAULT '[]',
        speed TEXT NOT NULL DEFAULT '1.0',
        format TEXT NOT NULL DEFAULT 'mp3',
        sample_rate TEXT NOT NULL DEFAULT '44100',
        provider_options TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS generations (
        id TEXT PRIMARY KEY,
        config_name TEXT NOT NULL DEFAULT '',
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        voice TEXT NOT NULL,
        script TEXT NOT NULL,
        voice_instructions TEXT NOT NULL DEFAULT '',
        quick_mutations TEXT NOT NULL DEFAULT '[]',
        speed TEXT NOT NULL DEFAULT '1.0',
        format TEXT NOT NULL DEFAULT 'mp3',
        sample_rate TEXT NOT NULL DEFAULT '44100',
        provider_options TEXT NOT NULL DEFAULT '{}',
        audio_url TEXT NOT NULL,
        filename TEXT NOT NULL,
        char_count INTEGER NOT NULL DEFAULT 0,
        estimated_cost TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    ensureColumn(db, "configurations", "provider", "TEXT NOT NULL DEFAULT 'openai'");
    ensureColumn(db, "configurations", "speed", "TEXT NOT NULL DEFAULT '1.0'");
    ensureColumn(db, "configurations", "format", "TEXT NOT NULL DEFAULT 'mp3'");
    ensureColumn(db, "configurations", "sample_rate", "TEXT NOT NULL DEFAULT '44100'");
    ensureColumn(db, "configurations", "provider_options", "TEXT NOT NULL DEFAULT '{}'");
  }
  return db;
}

export interface TtsConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
  voice: string;
  script: string;
  voice_affect: string;
  tone: string;
  pacing: string;
  emphasis: string;
  pauses: string;
  avoid: string;
  quick_mutations: string;
  speed: string;
  format: string;
  sample_rate: string;
  provider_options: string;
  created_at: string;
  updated_at: string;
}

export interface TtsGeneration {
  id: string;
  config_name: string;
  provider: string;
  model: string;
  voice: string;
  script: string;
  voice_instructions: string;
  quick_mutations: string;
  speed: string;
  format: string;
  sample_rate: string;
  provider_options: string;
  audio_url: string;
  filename: string;
  char_count: number;
  estimated_cost: string;
  notes: string;
  created_at: string;
}
