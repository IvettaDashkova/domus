/**
 * Thin fetch wrapper for the browser: sets the JSON content-type when there's a
 * body, parses the response (falling back to `{}` on a non-JSON body so callers
 * can safely read `data.error` / `data.results`), and returns `{ ok, status,
 * data }`. An aborted request still rejects, so callers keep their try/catch.
 */

// `any`-shaped JSON payload without tripping @typescript-eslint/no-explicit-any.
type Json = ReturnType<typeof JSON.parse>;

export interface ApiResult<T = Json> {
  ok: boolean;
  status: number;
  data: T;
}

export async function apiJson<T = Json>(
  url: string,
  opts: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<ApiResult<T>> {
  const { method = "GET", body, signal } = opts;
  const res = await fetch(url, {
    method,
    headers:
      body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** POST a JSON body — the common case. */
export const postJson = <T = Json>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
) => apiJson<T>(url, { method: "POST", body, signal });
