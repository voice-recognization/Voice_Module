import os
import sqlite3
from datetime import datetime, timezone

class StorageService:
    def __init__(self, db_path):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._initialize()

    def _connect(self):
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self):
        with self._connect() as con:
            con.execute("""
                CREATE TABLE IF NOT EXISTS analyses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    sha256 TEXT NOT NULL,
                    size_bytes INTEGER NOT NULL,
                    result TEXT NOT NULL,
                    confidence REAL,
                    created_at TEXT NOT NULL
                )
            """)
            con.execute("CREATE INDEX IF NOT EXISTS idx_analyses_sha256 ON analyses(sha256)")

    def save_analysis(self, filename, sha256, size_bytes, result, confidence):
        created_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as con:
            cursor = con.execute("""
                INSERT INTO analyses(filename, sha256, size_bytes, result, confidence, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (filename, sha256, size_bytes, result, confidence, created_at))
            return cursor.lastrowid

    def list_analyses(self, limit=50):
        with self._connect() as con:
            rows = con.execute("""
                SELECT id, filename, sha256, size_bytes, result, confidence, created_at
                FROM analyses ORDER BY id DESC LIMIT ?
            """, (limit,)).fetchall()
            return [dict(row) for row in rows]

    def get_analysis(self, record_id):
        with self._connect() as con:
            row = con.execute("""
                SELECT id, filename, sha256, size_bytes, result, confidence, created_at
                FROM analyses WHERE id = ?
            """, (record_id,)).fetchone()
            return dict(row) if row else None
