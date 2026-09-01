import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getUserId } from './supabase';

const VERSES_KEY = 'versekeep_cached_verses';
const SYNC_KEY = 'versekeep_last_sync';

export type CachedVerse = {
  id: string;
  user_id: string;
  reference: string;
  translation: string;
  verse_text: string;
  note: string | null;
  tags: string[];
  bookmarked: boolean;
  created_at: string;
};

async function readVerses(): Promise<CachedVerse[]> {
  const raw = await AsyncStorage.getItem(VERSES_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CachedVerse[]) : [];
  } catch {
    return [];
  }
}

export async function initOfflineDb(): Promise<void> {
  // AsyncStorage is the browser-safe persistence layer.
}

export async function cacheVerses(verses: CachedVerse[]): Promise<void> {
  if (!verses.length) return;
  const existing = await readVerses();
  const byId = new Map(existing.map((verse) => [verse.id, verse]));
  verses.forEach((verse) => byId.set(verse.id, verse));
  await AsyncStorage.setItem(VERSES_KEY, JSON.stringify(Array.from(byId.values())));
  await AsyncStorage.setItem(SYNC_KEY, new Date().toISOString());
}

export async function getCachedVerses(userId: string): Promise<CachedVerse[]> {
  return (await readVerses()).filter((verse) => verse.user_id === userId);
}

export async function getCachedVerse(id: string): Promise<CachedVerse | null> {
  return (await readVerses()).find((verse) => verse.id === id) ?? null;
}

export async function updateCachedVerse(
  id: string,
  updates: Partial<Pick<CachedVerse, 'note' | 'bookmarked' | 'tags'>>,
): Promise<void> {
  const verses = await readVerses();
  const next = verses.map((verse) => (verse.id === id ? { ...verse, ...updates } : verse));
  await AsyncStorage.setItem(VERSES_KEY, JSON.stringify(next));
}

export async function deleteCachedVerse(id: string): Promise<void> {
  const verses = await readVerses();
  await AsyncStorage.setItem(VERSES_KEY, JSON.stringify(verses.filter((verse) => verse.id !== id)));
}

export async function getLastSyncTime(): Promise<string | null> {
  return AsyncStorage.getItem(SYNC_KEY);
}

export async function clearCache(userId: string): Promise<void> {
  const verses = await readVerses();
  await AsyncStorage.setItem(
    VERSES_KEY,
    JSON.stringify(verses.filter((verse) => verse.user_id !== userId)),
  );
}

export async function syncVersesToCache(): Promise<{ ok: boolean; count: number }> {
  try {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('verses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const verses = (data ?? []) as CachedVerse[];
    await cacheVerses(verses);
    return { ok: true, count: verses.length };
  } catch {
    return { ok: false, count: 0 };
  }
}

export function useOfflineVerses() {
  const [verses, setVerses] = useState<CachedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const userId = await getUserId();
        const { data, error } = await supabase
          .from('verses')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        const fresh = (data ?? []) as CachedVerse[];
        if (fresh.length) {
          await cacheVerses(fresh);
          if (mounted) setVerses(fresh);
        } else if (mounted) {
          setVerses(await getCachedVerses(userId));
        }
      } catch {
        setIsOffline(true);
        try {
          const userId = await getUserId();
          if (mounted) setVerses(await getCachedVerses(userId));
        } catch {
          if (mounted) setVerses([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { verses, loading, isOffline };
}