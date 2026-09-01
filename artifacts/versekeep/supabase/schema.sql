-- ═══════════════════════════════════════════════════════════
-- VerseKeep — Complete Supabase Schema v1.0
-- Run this entire file in Supabase → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search

-- ─────────────────────────────────────────────────────────
-- TABLE: user_profiles
-- Extends auth.users with display name and preferences
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  avatar_url      TEXT,
  preferred_trans TEXT    NOT NULL DEFAULT 'NIV',
  streak_count    INTEGER NOT NULL DEFAULT 0,
  last_read_at    DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on sign up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ─────────────────────────────────────────────────────────
-- TABLE: verses
-- Core table — saved Bible verses per user
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verses (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference    TEXT        NOT NULL,                   -- "John 3:16"
  translation  TEXT        NOT NULL DEFAULT 'NIV',    -- NIV | KJV | ESV | NLT | NKJV
  verse_text   TEXT        NOT NULL,
  note         TEXT,                                   -- personal reflection
  tags         TEXT[]      NOT NULL DEFAULT '{}',     -- ["Love","Faith"]
  bookmarked   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verses"
  ON verses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verses"
  ON verses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verses"
  ON verses FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own verses"
  ON verses FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS verses_user_id_idx        ON verses(user_id);
CREATE INDEX IF NOT EXISTS verses_bookmarked_idx     ON verses(user_id, bookmarked);
CREATE INDEX IF NOT EXISTS verses_created_at_idx     ON verses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS verses_tags_gin_idx       ON verses USING GIN(tags);
CREATE INDEX IF NOT EXISTS verses_text_trgm_idx      ON verses USING GIN(verse_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS verses_reference_trgm_idx ON verses USING GIN(reference gin_trgm_ops);


-- ─────────────────────────────────────────────────────────
-- TABLE: tasks
-- Actionable to-dos linked to a saved verse
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verse_id    UUID        NOT NULL REFERENCES verses(id) ON DELETE CASCADE,
  text        TEXT        NOT NULL,
  done        BOOLEAN     NOT NULL DEFAULT FALSE,
  due_date    DATE,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE USING (auth.uid() = user_id);

-- Auto-set completed_at when done flips to true
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.done = TRUE AND OLD.done = FALSE THEN
    NEW.completed_at = NOW();
  ELSIF NEW.done = FALSE THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

CREATE INDEX IF NOT EXISTS tasks_verse_id_idx  ON tasks(verse_id);
CREATE INDEX IF NOT EXISTS tasks_user_id_idx   ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_done_idx      ON tasks(user_id, done);


-- ─────────────────────────────────────────────────────────
-- TABLE: reminders
-- Daily push notification preferences per user
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verse_id    UUID        REFERENCES verses(id) ON DELETE SET NULL,
  remind_at   TIME        NOT NULL DEFAULT '07:00',
  timezone    TEXT        NOT NULL DEFAULT 'Africa/Nairobi',
  verse_type  TEXT        NOT NULL DEFAULT 'random', -- random | today | specific
  days        INTEGER[]   NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sun..6=Sat
  enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  expo_token  TEXT,       -- Expo push token for server-side delivery
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)        -- One reminder config per user
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminders"
  ON reminders FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON reminders(user_id);
CREATE INDEX IF NOT EXISTS reminders_enabled_idx ON reminders(enabled, remind_at);


-- ─────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at trigger (applied to all tables)
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER verses_updated_at
  BEFORE UPDATE ON verses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────────────────────
-- VIEW: user_stats
-- Used by Dashboard screen for stats row
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW user_stats AS
SELECT
  v.user_id,
  COUNT(*)                                        AS total_saved,
  COUNT(*) FILTER (WHERE v.bookmarked)            AS total_bookmarked,
  COUNT(*) FILTER (WHERE v.note IS NOT NULL
                     AND v.note <> '')            AS total_reflections,
  COUNT(DISTINCT t.id)                            AS total_tasks,
  COUNT(DISTINCT t.id) FILTER (WHERE t.done)     AS tasks_done
FROM verses v
LEFT JOIN tasks t ON t.verse_id = v.id
GROUP BY v.user_id;

-- RLS: users only see their own stats
ALTER VIEW user_stats SET (security_invoker = true);


-- ─────────────────────────────────────────────────────────
-- STREAK UPDATE FUNCTION
-- Call this from app when user opens/reads a verse
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_last_date DATE;
  v_streak    INTEGER;
  v_today     DATE := CURRENT_DATE;
BEGIN
  SELECT last_read_at, streak_count
  INTO   v_last_date, v_streak
  FROM   user_profiles
  WHERE  id = p_user_id;

  IF v_last_date IS NULL THEN
    -- First time reading
    UPDATE user_profiles
    SET last_read_at = v_today, streak_count = 1
    WHERE id = p_user_id;
    RETURN 1;

  ELSIF v_last_date = v_today THEN
    -- Already read today — no change
    RETURN v_streak;

  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    -- Read yesterday — increment streak
    UPDATE user_profiles
    SET last_read_at = v_today, streak_count = streak_count + 1
    WHERE id = p_user_id;
    RETURN v_streak + 1;

  ELSE
    -- Missed a day — reset streak
    UPDATE user_profiles
    SET last_read_at = v_today, streak_count = 1
    WHERE id = p_user_id;
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────
-- SAMPLE DATA (optional — comment out for production)
-- Inserts demo verses for testing. Replace USER_UUID with
-- an actual user ID from auth.users after signing up.
-- ─────────────────────────────────────────────────────────
/*
DO $$
DECLARE v_user UUID := 'REPLACE_WITH_YOUR_USER_UUID';
        v1 UUID; v2 UUID; v3 UUID;
BEGIN
  INSERT INTO verses (id, user_id, reference, translation, verse_text, note, tags, bookmarked)
  VALUES
    (uuid_generate_v4(), v_user, 'John 3:16',        'NIV', 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',  'The entire gospel in one sentence.',  ARRAY['Love','Salvation'], TRUE)  RETURNING id INTO v1,
    (uuid_generate_v4(), v_user, 'Philippians 4:13', 'NIV', 'I can do all this through him who gives me strength.',                                                                                  'My anchor verse for tough days.',     ARRAY['Strength','Faith'],  TRUE)  RETURNING id INTO v2,
    (uuid_generate_v4(), v_user, 'Psalm 23:1',       'KJV', 'The Lord is my shepherd; I shall not want.',                                                                                            NULL,                                  ARRAY['Peace'],             FALSE) RETURNING id INTO v3;

  INSERT INTO tasks (user_id, verse_id, text, done)
  VALUES
    (v_user, v1, 'Share this verse with a friend this week', FALSE),
    (v_user, v2, 'Memorise this by end of month',            FALSE),
    (v_user, v2, 'Write it on a sticky note at my desk',     TRUE);
END $$;
*/
