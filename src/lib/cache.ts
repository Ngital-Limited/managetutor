/**
 * Lightweight in-memory cache with TTL + request deduplication.
 *
 * Designed for frequently-read, rarely-changing data (lookups like
 * districts/subjects) and heavy aggregate queries (admin counts, job lists).
 *
 * - Per-key TTL
 * - In-flight request dedup (multiple components calling at once = 1 query)
 * - Manual invalidation by key or prefix (call after mutations)
 *
 * NOT for per-user secret data — keys must be stable and non-sensitive,
 * or namespaced by user id.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export interface CacheOptions {
  /** Time-to-live in milliseconds. Default 60s. */
  ttl?: number;
  /** Force a fresh fetch and overwrite the cached value. */
  force?: boolean;
}

const DEFAULT_TTL = 60_000;

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = DEFAULT_TTL, force = false } = options;
  const now = Date.now();

  if (!force) {
    const hit = store.get(key) as CacheEntry<T> | undefined;
    if (hit && hit.expiresAt > now) {
      return hit.value;
    }
    const pending = inflight.get(key) as Promise<T> | undefined;
    if (pending) return pending;
  }

  const promise = (async () => {
    try {
      const value = await fetcher();
      store.set(key, { value, expiresAt: Date.now() + ttl });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/** Remove a single cached key. */
export function invalidate(key: string): void {
  store.delete(key);
  inflight.delete(key);
}

/** Remove every cached key starting with `prefix`. */
export function invalidatePrefix(prefix: string): void {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
  for (const k of inflight.keys()) if (k.startsWith(prefix)) inflight.delete(k);
}

/** Wipe the entire cache (e.g., on sign-out). */
export function clearCache(): void {
  store.clear();
  inflight.clear();
}

/** Common TTL presets (ms). */
export const TTL = {
  short: 15_000, // counts, fast-moving lists
  medium: 60_000, // admin stats
  long: 5 * 60_000, // lookup tables
  veryLong: 30 * 60_000, // rarely-changing reference data
} as const;

/**
 * Build a stable, collision-safe cache key from a namespace + parameter object.
 *
 * Ensures different pagination/filter/search combinations produce distinct
 * keys, while equivalent params (regardless of insertion order) collapse to
 * the same key.
 *
 * Rules:
 * - Object keys are sorted alphabetically (deep)
 * - `undefined`, `null`, `''`, and empty arrays are dropped (treated as
 *   "no filter") so default views share a key
 * - Strings are trimmed + lowercased so " Math " and "math" match
 * - Arrays are sorted so [a,b] === [b,a] for set-like filters
 * - Nested objects are recursed
 *
 * Example:
 *   cacheKey('admin:tutors', { page: 2, pageSize: 25, filters: { gender: 'female' }, search: 'rahim' })
 *   // → "admin:tutors|filters.gender=female|page=2|pageSize=25|search=rahim"
 */
export function cacheKey(
  namespace: string,
  params: Record<string, unknown> = {}
): string {
  const parts = serializeParams(params);
  return parts.length === 0 ? namespace : `${namespace}|${parts.join('|')}`;
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function normalizeScalar(v: unknown): string {
  if (typeof v === 'string') return v.trim().toLowerCase();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

function serializeParams(obj: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = [];
  const keys = Object.keys(obj).sort();
  for (const k of keys) {
    const v = obj[k];
    if (isEmpty(v)) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      const items = v.filter((x) => !isEmpty(x)).map(normalizeScalar).sort();
      if (items.length === 0) continue;
      out.push(`${path}=[${items.join(',')}]`);
    } else if (typeof v === 'object') {
      out.push(...serializeParams(v as Record<string, unknown>, path));
    } else {
      out.push(`${path}=${normalizeScalar(v)}`);
    }
  }
  return out;
}

