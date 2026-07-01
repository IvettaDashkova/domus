"use client";

import { createBrowserClient } from "@supabase/ssr";
import { AUTH_ENABLED, SUPABASE_ANON, SUPABASE_URL } from "@/lib/supabase/env";

/** Browser Supabase client, or null if auth isn't configured. */
export function supabaseBrowser() {
  if (!AUTH_ENABLED) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
}
