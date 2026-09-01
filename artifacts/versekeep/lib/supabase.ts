import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co';
const FALLBACK_SUPABASE_ANON = 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON);

if (!isSupabaseConfigured) {
  console.warn(
    '[VerseKeep] Supabase env vars missing.\n' +
    'Create a .env file with:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...'
  );
}

export const supabase = createClient(
  SUPABASE_URL || FALLBACK_SUPABASE_URL,
  SUPABASE_ANON || FALLBACK_SUPABASE_ANON,
  {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false, // Required for React Native — no browser URL bar
  },
  },
);

// ─── Helper: get current user ID (throws if not logged in) ───
export async function getUserId(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error('Not authenticated');
  return session.user.id;
}

// ─── Helper: sign out cleanly ───
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
