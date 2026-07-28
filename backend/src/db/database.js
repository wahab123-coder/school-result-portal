const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_DIR  = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'school.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

let _db        = null;
let _inTransaction = false; // track when we're inside a transaction

// ── Statement wrapper ────────────────────────────────────────────────────────
class Statement {
  constructor(db, sql) {
    this._db  = db;
    this._sql = sql;
  }

  /** Return first row as a plain object, or undefined */
  get(...params) {
    const results = this._db._raw.exec(this._sql, params.flat());
    if (!results.length || !results[0].values.length) return undefined;
    const { columns, values } = results[0];
    return Object.fromEntries(columns.map((c, i) => [c, values[0][i]]));
  }

  /** Return all rows as an array of plain objects */
  all(...params) {
    const results = this._db._raw.exec(this._sql, params.flat());
    if (!results.length) return [];
    const { columns, values } = results[0];
    return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
  }

  /**
   * Execute a write statement.
   * Only persists to disk when NOT inside a transaction
   * (the transaction wrapper saves after COMMIT).
   */
  run(...params) {
    this._db._raw.run(this._sql, params.flat());
    const changes = this._db._raw.getRowsModified();
    const [[lastId]] = this._db._raw.exec('SELECT last_insert_rowid()')[0].values;

    // Only flush to disk for standalone writes (not mid-transaction)
    if (!_inTransaction) {
      saveDB();
    }

    return { changes, lastInsertRowid: lastId };
  }
}

// ── DB wrapper ───────────────────────────────────────────────────────────────
class DB {
  constructor(sqlJsDb) {
    this._raw = sqlJsDb;
  }

  prepare(sql) {
    return new Statement(this, sql);
  }

  exec(sql) {
    this._raw.exec(sql);
    if (!_inTransaction) saveDB();
  }

  pragma(str) {
    this._raw.exec(`PRAGMA ${str}`);
  }

  /**
   * Wrap a function in a BEGIN/COMMIT transaction.
   * Returns a callable that executes the function transactionally.
   * On any error, automatically rolls back and re-throws.
   */
  transaction(fn) {
    return (...args) => {
      _inTransaction = true;
      this._raw.run('BEGIN');
      try {
        const result = fn(...args);
        this._raw.run('COMMIT');
        _inTransaction = false;
        saveDB(); // single flush after successful commit
        return result;
      } catch (err) {
        this._raw.run('ROLLBACK');
        _inTransaction = false;
        throw err;
      }
    };
  }
}

// ── Persist in-memory DB to file ─────────────────────────────────────────────
function saveDB() {
  if (!_db) return;
  try {
    const data = _db._raw.export();
    const buf  = Buffer.from(data);
    // Write to a temp file first, then rename — avoids partial writes on Windows
    const tmpPath = DB_PATH + '.tmp';
    fs.writeFileSync(tmpPath, buf);
    fs.renameSync(tmpPath, DB_PATH);
  } catch (e) {
    console.error('saveDB error:', e.message);
    // Fallback: try direct write
    try {
      const data = _db._raw.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e2) {
      console.error('saveDB fallback error:', e2.message);
    }
  }
}

// ── Initialise (call once at startup) ────────────────────────────────────────
async function initDB() {
  const SQL = await initSqlJs();

  const sqlJsDb = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  _db = new DB(sqlJsDb);

  // Run all DDL statements one at a time to avoid sql.js multi-statement issues
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      admission_number TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      class_id INTEGER,
      gender TEXT,
      date_of_birth TEXT,
      parent_phone TEXT,
      profile_picture TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      full_name TEXT NOT NULL,
      employee_id TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS teacher_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER,
      class_id INTEGER,
      UNIQUE(teacher_id, class_id)
    )`,
    `CREATE TABLE IF NOT EXISTS teacher_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER,
      subject_id INTEGER,
      UNIQUE(teacher_id, subject_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      is_current INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      term TEXT NOT NULL,
      ca1 REAL DEFAULT 0,
      ca2 REAL DEFAULT 0,
      exam REAL DEFAULT 0,
      grade TEXT,
      remark TEXT,
      entered_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, subject_id, session_id, term)
    )`,
    `CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      term TEXT NOT NULL,
      total_score REAL DEFAULT 0,
      average REAL DEFAULT 0,
      position INTEGER,
      teacher_remark TEXT,
      principal_remark TEXT,
      is_published INTEGER DEFAULT 0,
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, session_id, term)
    )`
  ];

  for (const sql of tables) {
    _db._raw.exec(sql);
  }
  saveDB();

  console.log('Database initialized successfully');
  return _db;
}

function getDB() {
  if (!_db) throw new Error('Database not initialized. Call initDB() first.');
  return _db;
}

module.exports = { initDB, getDB, saveDB };
