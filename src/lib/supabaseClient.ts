"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Lazy singleton Supabase client.
 *
 * Why lazy and why it can return null: if the two env vars are missing,
 * creating the client at module load would crash the production build.
 * Instead we return null and the UI shows a "finish your setup" screen —
 * you get a clear message instead of a white page.
 *
 * Talking to Supabase directly from the browser is safe here because every
 * table has Row Level Security (see supabase/schema.sql). The anon key is
 * meant to be public; the policies are the lock.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (url.includes("YOUR-PROJECT-ref") || key.includes("YOUR-ANON")) return null;

  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}
