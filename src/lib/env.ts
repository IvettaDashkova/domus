/**
 * Lazy, validated env access.
 *
 * IMPORTANT: never validate/parse at module top-level — that would evaluate
 * DATABASE_URL at build time and break `next build` (ERR_INVALID_URL on Vercel).
 * Call these getters INSIDE request handlers / scripts only.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

/** Superuser/migration connection (full privileges, bypasses RLS as owner). */
export function databaseUrl(): string {
  return required("DATABASE_URL");
}

/** App connection: non-superuser role subject to RLS. Falls back to DATABASE_URL. */
export function appDatabaseUrl(): string {
  return process.env.APP_DATABASE_URL || required("DATABASE_URL");
}

export function osrmUrl(): string {
  return process.env.OSRM_URL || "http://localhost:5000";
}

export const TEXT_EMBED_MODEL =
  process.env.TEXT_EMBED_MODEL || "Xenova/bge-small-en-v1.5";
export const IMAGE_EMBED_MODEL =
  process.env.IMAGE_EMBED_MODEL || "Xenova/clip-vit-base-patch32";

/** Locked embedding dimensions — do not change without a migration. */
export const TEXT_EMBED_DIM = 384;
export const IMAGE_EMBED_DIM = 512;
