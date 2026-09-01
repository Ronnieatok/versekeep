# VerseKeep

VerseKeep is a personal Bible verse journal built with Expo Router and Supabase.
It supports account-based verse storage, Bible search, notes, bookmarks, reminders,
reading streaks, sharing, and offline-first caching.

## Run the mobile app

```bash
pnpm install
pnpm --filter @workspace/versekeep run dev
```

Open the Expo preview or scan the QR code with Expo Go.

## Required environment variables

Configure these values in the Expo/Vercel environment. Do not commit the values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_BIBLE_API_KEY`

For a new Supabase project, run `artifacts/versekeep/supabase/schema.sql`
in the Supabase SQL Editor before signing in.

## Deploy the web version to Vercel

The repository includes `vercel.json`. Vercel will:

1. Install the pnpm workspace.
2. Export the Expo web build from `artifacts/versekeep`.
3. Serve the generated static web app with client-side route rewrites.

Set the three `EXPO_PUBLIC_*` variables in Vercel under **Project Settings →
Environment Variables**, then deploy the `main` branch.

The native Android and iOS builds continue to use Expo; Vercel hosts the browser
version only.