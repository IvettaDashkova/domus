import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_ENABLED, SUPABASE_ANON, SUPABASE_URL } from "@/lib/supabase/env";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Server-side Supabase client (reads/writes the auth cookies). Null if auth
 *  isn't configured — callers then treat the request as unauthenticated. */
export async function supabaseServer(): Promise<SupabaseClient | null> {
  if (!AUTH_ENABLED) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // called from a Server Component — safe to ignore (middleware refreshes)
        }
      },
    },
  });
}

/** The signed-in user's email, or null if unauthenticated / auth disabled. */
export async function currentUserEmail(): Promise<string | null> {
  const supabase = await supabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}
