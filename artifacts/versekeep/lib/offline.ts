// ═══════════════════════════════════════════════════════════
// FILE: lib/offline.ts
// Local SQLite cache using expo-sqlite
// Saves all verses to device storage — works with no internet
// ═══════════════════════════════════════════════════════════
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'versekeep.db';

// ─── Open / create database ──────────────────────────────
let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  return _db;
}

// ─── Initialize tables on first run ─────────────────────
export async function initOfflineDb(): Promise<void> {
  const db = await getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS cached_verses (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      reference   TEXT NOT NULL,
      translation TEXT NOT NULL DEFAULT 'NIV',
      verse_text  TEXT NOT NULL,
      note        TEXT,
      tags        TEXT NOT NULL DEFAULT '[]',
      bookmarked  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL,
      synced_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cached_user
      ON cached_verses(user_id);

    CREATE INDEX IF NOT EXISTS idx_cached_bookmarked
      ON cached_verses(user_id, bookmarked);

    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// ─── Types ───────────────────────────────────────────────
export type CachedVerse = {
  id:          string;
  user_id:     string;
  reference:   string;
  translation: string;
  verse_text:  string;
  note:        string | null;
  tags:        string[];
  bookmarked:  boolean;
  created_at:  string;
};

// ─── Write verses to cache ───────────────────────────────
export async function cacheVerses(verses: CachedVerse[]): Promise<void> {
  if (!verses.length) return;
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    for (const v of verses) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_verses
         (id, user_id, reference, translation, verse_text, note, tags, bookmarked, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          v.id, v.user_id, v.reference, v.translation,
          v.verse_text, v.note ?? null,
          JSON.stringify(v.tags), v.bookmarked ? 1 : 0, v.created_at,
        ]
      );
    }
    // Record last sync time
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync', datetime('now'))`
    );
  });
}

// ─── Read all cached verses for a user ──────────────────
export async function getCachedVerses(userId: string): Promise<CachedVerse[]> {
  const db   = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM cached_verses WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map(row => ({
    ...row,
    tags:       JSON.parse(row.tags ?? '[]'),
    bookmarked: row.bookmarked === 1,
  }));
}

// ─── Get single cached verse ─────────────────────────────
export async function getCachedVerse(id: string): Promise<CachedVerse | null> {
  const db  = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM cached_verses WHERE id = ?`, [id]
  );
  if (!row) return null;
  return { ...row, tags: JSON.parse(row.tags ?? '[]'), bookmarked: row.bookmarked === 1 };
}

// ─── Search cached verses ────────────────────────────────
export async function searchCachedVerses(userId: string, query: string): Promise<CachedVerse[]> {
  const db   = await getDb();
  const like = `%${query.toLowerCase()}%`;
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM cached_verses
     WHERE user_id = ?
       AND (LOWER(reference) LIKE ? OR LOWER(verse_text) LIKE ?)
     ORDER BY created_at DESC LIMIT 20`,
    [userId, like, like]
  );
  return rows.map(row => ({
    ...row,
    tags:       JSON.parse(row.tags ?? '[]'),
    bookmarked: row.bookmarked === 1,
  }));
}

// ─── Update cached note / bookmark ──────────────────────
export async function updateCachedVerse(
  id: string,
  updates: Partial<Pick<CachedVerse, 'note' | 'bookmarked' | 'tags'>>
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const vals: any[]    = [];

  if ('note'       in updates) { sets.push('note = ?');       vals.push(updates.note ?? null); }
  if ('bookmarked' in updates) { sets.push('bookmarked = ?'); vals.push(updates.bookmarked ? 1 : 0); }
  if ('tags'       in updates) { sets.push('tags = ?');       vals.push(JSON.stringify(updates.tags)); }

  if (!sets.length) return;
  vals.push(id);
  await db.runAsync(`UPDATE cached_verses SET ${sets.join(', ')} WHERE id = ?`, vals);
}

// ─── Delete cached verse ─────────────────────────────────
export async function deleteCachedVerse(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM cached_verses WHERE id = ?`, [id]);
}

// ─── Get last sync time ──────────────────────────────────
export async function getLastSyncTime(): Promise<string | null> {
  const db  = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'last_sync'`
  );
  return row?.value ?? null;
}

// ─── Clear all cache for a user (on sign out) ────────────
export async function clearCache(userId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM cached_verses WHERE user_id = ?`, [userId]);
}


// ═══════════════════════════════════════════════════════════
// Syncs Supabase → local SQLite cache
// Call on app start + after any data change
// ═══════════════════════════════════════════════════════════
import { supabase, getUserId } from './supabase';
import NetInfo from '@react-native-community/netinfo';

export async function syncVersesToCache(): Promise<{ ok: boolean; count: number }> {
  // Skip if offline
  const net = await NetInfo.fetch();
  if (!net.isConnected) return { ok: false, count: 0 };

  try {
    const uid = await getUserId();

    const { data, error } = await supabase
      .from('verses')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data?.length) return { ok: true, count: 0 };

    const verses: CachedVerse[] = data.map(v => ({
      id:          v.id,
      user_id:     v.user_id,
      reference:   v.reference,
      translation: v.translation,
      verse_text:  v.verse_text,
      note:        v.note,
      tags:        v.tags ?? [],
      bookmarked:  v.bookmarked,
      created_at:  v.created_at,
    }));

    await cacheVerses(verses);
    return { ok: true, count: verses.length };
  } catch (e) {
    console.warn('[VerseKeep] Sync failed:', e);
    return { ok: false, count: 0 };
  }
}

// ─── Hook: use offline-first verses ─────────────────────
// Usage in any screen:
//   const { verses, loading, isOffline } = useOfflineVerses();
import { useState, useEffect } from 'react';

export function useOfflineVerses() {
  const [verses,    setVerses]    = useState<CachedVerse[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const net = await NetInfo.fetch();
        const online = !!net.isConnected;
        setIsOffline(!online);

        const uid = await getUserId();

        if (online) {
          // Try fresh Supabase data
          const { data } = await supabase
            .from('verses').select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false });

          if (data?.length && isMounted) {
            const mapped: CachedVerse[] = data.map(v => ({
              id:v.id, user_id:v.user_id, reference:v.reference,
              translation:v.translation, verse_text:v.verse_text,
              note:v.note, tags:v.tags??[], bookmarked:v.bookmarked, created_at:v.created_at
            }));
            setVerses(mapped);
            // Update cache silently
            cacheVerses(mapped).catch(() => {});
            return;
          }
        }

        // Fallback to local cache
        const cached = await getCachedVerses(uid);
        if (isMounted) setVerses(cached);
      } catch (e) {
        // If getUserId throws (not logged in) just set empty
        if (isMounted) setVerses([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, []);

  return { verses, loading, isOffline };
}
