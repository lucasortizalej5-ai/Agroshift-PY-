"""SQLite local. Las coordenadas y respuestas NASA no se versionan."""
from contextlib import contextmanager
from pathlib import Path
import json
import sqlite3
from datetime import datetime, timezone
from uuid import uuid4
from .services.geo import area_hectares

def utcnow():
    return datetime.now(timezone.utc).isoformat()

class Database:
    def __init__(self, path: Path):
        self.path = path

    @contextmanager
    def connection(self):
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute('PRAGMA foreign_keys = ON')
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def initialize(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as con:
            con.execute('PRAGMA journal_mode = WAL')
            con.executescript('''
                CREATE TABLE IF NOT EXISTS parcels (
                    id TEXT PRIMARY KEY, data TEXT NOT NULL,
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS climate_snapshots (
                    parcel_id TEXT PRIMARY KEY REFERENCES parcels(id) ON DELETE CASCADE,
                    data TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS nasa_cache (
                    cache_key TEXT PRIMARY KEY, data TEXT NOT NULL, fetched_at TEXT NOT NULL
                );
                PRAGMA user_version = 1;
            ''')

    def _parcel(self, row):
        if row is None:
            return None
        result = dict(row)
        data = json.loads(result.pop('data'))
        return {**data, **result, 'area_ha': area_hectares(data['radius_m'])}

    def list_parcels(self):
        with self.connection() as con:
            return [self._parcel(row) for row in con.execute('SELECT * FROM parcels ORDER BY created_at DESC')]

    def get_parcel(self, parcel_id):
        with self.connection() as con:
            return self._parcel(con.execute('SELECT * FROM parcels WHERE id = ?', (parcel_id,)).fetchone())

    def save_parcel(self, data, parcel_id=None):
        payload = data.model_dump(mode='json')
        timestamp = utcnow()
        with self.connection() as con:
            if parcel_id:
                row = con.execute('SELECT * FROM parcels WHERE id = ?', (parcel_id,)).fetchone()
                if row is None:
                    return None
                old = json.loads(row['data'])
                if any(old[k] != payload[k] for k in ['latitude', 'longitude']):
                    con.execute('DELETE FROM climate_snapshots WHERE parcel_id = ?', (parcel_id,))
                con.execute('UPDATE parcels SET data = ?, updated_at = ? WHERE id = ?',
                            (json.dumps(payload), timestamp, parcel_id))
            else:
                parcel_id = str(uuid4())
                con.execute('INSERT INTO parcels VALUES (?, ?, ?, ?)',
                            (parcel_id, json.dumps(payload), timestamp, timestamp))
        return self.get_parcel(parcel_id)

    def delete_parcel(self, parcel_id):
        with self.connection() as con:
            return con.execute('DELETE FROM parcels WHERE id = ?', (parcel_id,)).rowcount > 0

    def snapshot(self, parcel_id):
        with self.connection() as con:
            row = con.execute('SELECT data FROM climate_snapshots WHERE parcel_id = ?', (parcel_id,)).fetchone()
            return json.loads(row['data']) if row else None

    def save_snapshot(self, parcel_id, result):
        with self.connection() as con:
            con.execute('INSERT INTO climate_snapshots VALUES (?, ?) ON CONFLICT(parcel_id) DO UPDATE SET data=excluded.data',
                        (parcel_id, json.dumps(result)))

    def cache_get(self, key):
        with self.connection() as con:
            row = con.execute('SELECT * FROM nasa_cache WHERE cache_key = ?', (key,)).fetchone()
            return dict(row) if row else None

    def cache_put(self, key, data):
        with self.connection() as con:
            con.execute('INSERT INTO nasa_cache VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET data=excluded.data, fetched_at=excluded.fetched_at',
                        (key, json.dumps(data), data['fetched_at']))
