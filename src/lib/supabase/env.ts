export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Auth is only active once the public Supabase keys are configured. */
export const AUTH_ENABLED = SUPABASE_URL.length > 0 && SUPABASE_ANON.length > 0;
