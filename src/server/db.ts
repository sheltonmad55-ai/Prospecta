import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PROVINCES } from '../lib/contracts.ts';

let database: DatabaseSync | undefined;
export const id = () => randomUUID();
export const now = () => new Date().toISOString();
export function db() {
  if (database) return database;
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || (process.env.NODE_ENV === 'production' && !process.env.PROSPECTA_DB_PATH));
  const filename = process.env.PROSPECTA_DB_PATH || (isServerless ? path.join('/tmp', 'prospecta.sqlite') : path.join(process.cwd(), 'data', 'prospecta.sqlite'));
  mkdirSync(path.dirname(filename), { recursive: true });
  database = new DatabaseSync(filename);
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'owner',marketing INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,profile TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS auth_tokens(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,expires_at TEXT NOT NULL,used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,link TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS locations(id TEXT PRIMARY KEY,name TEXT NOT NULL,kind TEXT NOT NULL,country_code TEXT NOT NULL DEFAULT 'MZ',source TEXT NOT NULL,version TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS businesses(id TEXT PRIMARY KEY,data TEXT NOT NULL,source_key TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS searches(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,filters TEXT NOT NULL,tasks TEXT NOT NULL,results TEXT NOT NULL DEFAULT '[]',status TEXT NOT NULL,mode TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,kind TEXT NOT NULL,payload TEXT NOT NULL,payload_hash TEXT NOT NULL,idempotency_key TEXT NOT NULL,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,lease_until TEXT,next_run_at TEXT NOT NULL,result TEXT,error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(workspace_id,kind,idempotency_key));
    CREATE TABLE IF NOT EXISTS credit_entries(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,job_id TEXT,kind TEXT NOT NULL CHECK(kind IN ('grant','reserve','release','consume')),units INTEGER NOT NULL CHECK(units>0),description TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(job_id,kind));
    CREATE TABLE IF NOT EXISTS analyses(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,business_id TEXT NOT NULL REFERENCES businesses(id),job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,input_hash TEXT NOT NULL,data TEXT NOT NULL,draft TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(workspace_id,id));
    CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,business_id TEXT NOT NULL REFERENCES businesses(id),stage TEXT NOT NULL DEFAULT 'Novo',note TEXT NOT NULL DEFAULT '',next_action TEXT NOT NULL DEFAULT '',next_action_at TEXT,amount_minor INTEGER CHECK(amount_minor IS NULL OR amount_minor>=0),created_at TEXT NOT NULL,UNIQUE(workspace_id,business_id),UNIQUE(workspace_id,id));
    CREATE TABLE IF NOT EXISTS activities(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,lead_id TEXT NOT NULL,type TEXT NOT NULL,note TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(workspace_id,lead_id) REFERENCES leads(workspace_id,id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS suppressions(workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,business_id TEXT NOT NULL REFERENCES businesses(id),reason TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(workspace_id,business_id));
    CREATE TABLE IF NOT EXISTS corrections(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,business_id TEXT NOT NULL REFERENCES businesses(id),note TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS privacy_requests(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,type TEXT NOT NULL CHECK(type IN ('export','delete')),status TEXT NOT NULL,created_at TEXT NOT NULL,completed_at TEXT);
    CREATE TABLE IF NOT EXISTS audit_events(id TEXT PRIMARY KEY,actor_id TEXT,workspace_id TEXT,action TEXT NOT NULL,target_id TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth_flows(token_hash TEXT PRIMARY KEY,storage TEXT NOT NULL,intent TEXT NOT NULL CHECK(intent IN ('login','register')),marketing INTEGER NOT NULL,expires_at TEXT NOT NULL,used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS user_consents(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,terms_version TEXT NOT NULL,marketing INTEGER NOT NULL,source TEXT NOT NULL,accepted_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_jobs_ready ON jobs(status,next_run_at);
    CREATE INDEX IF NOT EXISTS idx_leads_workspace ON leads(workspace_id,stage,next_action_at);
    CREATE INDEX IF NOT EXISTS idx_analysis_workspace ON analyses(workspace_id,business_id,input_hash);
    INSERT OR IGNORE INTO migrations VALUES(1,datetime('now'));
    INSERT OR IGNORE INTO migrations VALUES(2,datetime('now'));
  `);
  // Clean up any legacy synthetic businesses, searches, and demo/duplicate entries
  try {
    database.exec("PRAGMA foreign_keys=OFF;");
    database.exec("DELETE FROM businesses WHERE data LIKE '%Directório Empresarial MZ%' OR data LIKE '%Direct%rio Empresarial MZ%' OR data LIKE '%Central%' OR id LIKE 'b-%' OR id LIKE 'demo-%';");
    database.exec("DELETE FROM searches WHERE filters LIKE '%Central%' OR results LIKE '%b-%' OR results LIKE '%demo-%' OR tasks LIKE '%Central%' OR filters LIKE '%Directório%';");
    
    // Deduplicate any existing businesses in SQLite table by normalized name
    const allBiz = database.prepare("SELECT id, data FROM businesses").all() as { id: string; data: string }[];
    const seenNames = new Set<string>();
    for (const bRow of allBiz) {
      try {
        const obj = JSON.parse(bRow.data);
        const nameKey = (obj.name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        if (!nameKey || seenNames.has(nameKey) || (obj.source && obj.source.includes('Directório Empresarial MZ'))) {
          database.prepare("DELETE FROM businesses WHERE id = ?").run(bRow.id);
        } else {
          seenNames.add(nameKey);
        }
      } catch {
        database.prepare("DELETE FROM businesses WHERE id = ?").run(bRow.id);
      }
    }
    database.exec("PRAGMA foreign_keys=ON;");
  } catch (cleanErr) {
    console.error('[db init cleanup error]:', cleanErr);
  }
  seed(database);
  return database;
}
function seed(database: DatabaseSync) {
  const insertLocation = database.prepare('INSERT OR IGNORE INTO locations VALUES(?,?,?,?,?,?)');
  PROVINCES.forEach((province, i) => insertLocation.run(`province-${i}`,province,'province','MZ','Catálogo inicial de unidades de primeiro nível; distritos não incluídos','2026-10-15'));
}
export function transaction<T>(operation: () => T): T {
  const database=db();database.exec('BEGIN IMMEDIATE');
  try {const result=operation();database.exec('COMMIT');return result;} catch(error) {database.exec('ROLLBACK');throw error;}
}
export function closeDb() { database?.close();database=undefined; }
