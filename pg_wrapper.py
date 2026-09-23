"""
PostgreSQL wrapper that provides a SQLite-compatible interface.
Translates SQLite syntax (?) to PostgreSQL (%s) so that server.py
queries work without modification.
"""
import psycopg2
from psycopg2.extras import RealDictCursor, RealDictRow
import os
import re
from dotenv import load_dotenv

load_dotenv()


class PgCursorWrapper:
    """Wraps a psycopg2 RealDictCursor to behave like sqlite3.Cursor."""
    def __init__(self, cursor):
        self._cursor = cursor

    def fetchone(self):
        row = self._cursor.fetchone()
        if row is None:
            return None
        return DictRow(row)

    def fetchall(self):
        rows = self._cursor.fetchall()
        return [DictRow(r) for r in rows]

    def __iter__(self):
        return iter(self.fetchall())


class DictRow(dict):
    """A dict subclass that also supports index-based access like sqlite3.Row."""
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        # PostgreSQL folds unquoted identifiers to lowercase.
        # Try lowercase if exact key not found.
        if key not in self and key.lower() in self:
            return super().__getitem__(key.lower())
        return super().__getitem__(key)

    def __contains__(self, key):
        if super().__contains__(key):
            return True
        if isinstance(key, str):
            return super().__contains__(key.lower())
        return False

    def get(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            return default


class PostgresWrapper:
    """
    Drop-in replacement for sqlite3.Connection used throughout server.py.
    Translates ? placeholders to %s and handles SQLite-specific syntax.
    """
    def __init__(self, conn):
        self.conn = conn
        self.conn.autocommit = False

    def execute(self, sql, params=()):
        # 1. Replace ? placeholders with %s (but not inside strings)
        sql = sql.replace('?', '%s')

        # 2. Handle INSERT OR IGNORE -> INSERT ... ON CONFLICT DO NOTHING
        if 'INSERT OR IGNORE INTO' in sql:
            sql = sql.replace('INSERT OR IGNORE INTO', 'INSERT INTO')
            # Add ON CONFLICT DO NOTHING at the end if not already present
            if 'ON CONFLICT' not in sql:
                sql = sql.rstrip().rstrip(')') + ') ON CONFLICT DO NOTHING'

        # 3. Handle AUTOINCREMENT -> (Postgres uses SERIAL, already handled in init_pg)
        # Nothing to do at query time.

        cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(sql, params)
        except Exception as e:
            self.conn.rollback()
            raise
        return PgCursorWrapper(cursor)

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()


def get_db():
    """Return a PostgresWrapper connected to Supabase PostgreSQL."""
    db_url = os.environ.get('SUPABASE_DB_URL')
    if not db_url:
        raise RuntimeError("SUPABASE_DB_URL environment variable is not set")
    conn = psycopg2.connect(db_url)
    return PostgresWrapper(conn)
