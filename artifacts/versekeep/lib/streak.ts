// ═══════════════════════════════════════════════════════
// FILE: lib/streak.ts
// Reading streak management — calls the Supabase
// update_streak() function and caches result locally
// ═══════════════════════════════════════════════════════
import { useEffect, useState, useCallback } from 'react';
import { supabase, getUserId } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY     = 'versekeep_streak';
const LAST_READ_KEY  = 'versekeep_last_read';

export type StreakData = {
  count:      number;
  lastReadAt: string | null;
  todayDone:  boolean;
  weekDays:   boolean[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
};

// ─── Persist streak locally (offline read) ────────────
async function cacheStreak(data: StreakData): Promise<void> {
  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

async function getCachedStreak(): Promise<StreakData | null> {
  const raw = await AsyncStorage.getItem(STREAK_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ─── Build week day array (which days user read) ──────
function buildWeekDays(lastReadAt: string | null, count: number): boolean[] {
  const today  = new Date();
  const days   = Array(7).fill(false) as boolean[];
  if (!lastReadAt || count === 0) return days;

  const lastRead = new Date(lastReadAt);
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat

  // Mark today if user has read today
  const todayStr = today.toISOString().slice(0, 10);
  const lastStr  = lastRead.toISOString().slice(0, 10);

  if (todayStr === lastStr) {
    // User read today — mark streak days going backwards
    const daysToMark = Math.min(count, 7);
    for (let i = 0; i < daysToMark; i++) {
      const idx = ((dayOfWeek - i) + 7) % 7;
      days[idx] = true;
    }
  } else {
    // User read up to yesterday — mark from yesterday back
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    const yestDay = yest.getDay();
    const daysToMark = Math.min(count, 7);
    for (let i = 0; i < daysToMark; i++) {
      const idx = ((yestDay - i) + 7) % 7;
      days[idx] = true;
    }
  }
  return days;
}

// ─── Update streak (call when user opens/reads a verse) ─
export async function updateStreak(): Promise<StreakData> {
  try {
    const uid = await getUserId();

    // Call Postgres function
    const { data, error } = await supabase.rpc('update_streak', {
      p_user_id: uid,
    });
    if (error) throw error;

    const count = data as number;

    // Fetch updated profile for lastReadAt
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('last_read_at, streak_count')
      .eq('id', uid)
      .single();

    const lastReadAt = profile?.last_read_at ?? null;
    const today      = new Date().toISOString().slice(0, 10);
    const todayDone  = lastReadAt === today;

    const streakData: StreakData = {
      count,
      lastReadAt,
      todayDone,
      weekDays: buildWeekDays(lastReadAt, count),
    };

    await cacheStreak(streakData);
    return streakData;

  } catch (e) {
    console.warn('[VerseKeep] Streak update failed:', e);
    // Return cached or default
    const cached = await getCachedStreak();
    return cached ?? { count: 0, lastReadAt: null, todayDone: false, weekDays: Array(7).fill(false) };
  }
}

// ─── Hook: use streak in any component ────────────────
export function useStreak() {
  const [streak,  setStreak]  = useState<StreakData>({
    count: 0, lastReadAt: null, todayDone: false, weekDays: Array(7).fill(false),
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (markToday = false) => {
    try {
      if (markToday) {
        const data = await updateStreak();
        setStreak(data);
      } else {
        // Just read cached / Supabase without updating
        const cached = await getCachedStreak();
        if (cached) { setStreak(cached); return; }

        const uid = await getUserId();
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('last_read_at, streak_count')
          .eq('id', uid)
          .single();

        const count      = profile?.streak_count ?? 0;
        const lastReadAt = profile?.last_read_at  ?? null;
        const today      = new Date().toISOString().slice(0, 10);

        const data: StreakData = {
          count,
          lastReadAt,
          todayDone:  lastReadAt === today,
          weekDays:   buildWeekDays(lastReadAt, count),
        };
        setStreak(data);
        await cacheStreak(data);
      }
    } catch (e) {
      // Not logged in or offline — keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(false); }, [refresh]);

  return { streak, loading, refresh };
}
