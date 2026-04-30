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
  /** After this timestamp, value is considered stale (needs revalidation). */
  freshUntil: number;
  /** After this timestamp, value is fully expired and must be re-fetched. */
  staleUntil: number;
  /** Configured TTL in ms (for dashboard display). */
  ttl: number;
  /** Configured SWR window in ms (for dashboard display). */
  swr: number;
  /** Last write time (ms epoch). */
  writtenAt: number;
  /** Successful fetches written to this key. */
  refreshCount: number;
  /** Last read time (ms epoch). */
  lastAccess: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
type Listener<T = unknown> = (value: T) => void;
const listeners = new Map<string, Set<Listener>>();

/** Per-key counters used by the cache dashboard. */
type KeyMetric = {
  hits: number;        // fresh-cache hits
  staleHits: number;   // SWR stale-but-served hits
  misses: number;      // had to wait for fetch (cold or expired)
  errors: number;      // fetcher rejected
  totalLatencyMs: number; // sum of fetcher durations (for avg)
};
const metrics = new Map<string, KeyMetric>();

function bumpMetric(key: string, field: keyof KeyMetric, by = 1): void {
  let m = metrics.get(key);
  if (!m) { m = { hits: 0, staleHits: 0, misses: 0, errors: 0, totalLatencyMs: 0 }; metrics.set(key, m); }
  (m[field] as number) += by;
}


export interface CacheOptions {
  /** Time-to-live in milliseconds. Default 60s. */
  ttl?: number;
  /**
   * Stale-while-revalidate window (ms) added on top of `ttl`.
   *
   * After `ttl` elapses the cached value is "stale" but still returned
   * instantly; a background fetch refreshes it. After `ttl + swr` the
   * value is fully expired and the next call awaits the fetch.
   *
   * Default 0 (classic TTL behavior).
   */
  swr?: number;
  /** Force a fresh fetch and overwrite the cached value. */
  force?: boolean;
}

const DEFAULT_TTL = 60_000;

function notify(key: string, value: unknown): void {
  const subs = listeners.get(key);
  if (!subs) return;
  for (const fn of subs) {
    try { fn(value); } catch { /* ignore subscriber errors */ }
  }
}

function refresh<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number,
  swr: number
): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const startedAt = Date.now();
  const promise = (async () => {
    try {
      const value = await fetcher();
      const now = Date.now();
      const prev = store.get(key);
      store.set(key, {
        value,
        freshUntil: now + ttl,
        staleUntil: now + ttl + swr,
        ttl,
        swr,
        writtenAt: now,
        refreshCount: (prev?.refreshCount ?? 0) + 1,
        lastAccess: prev?.lastAccess ?? now,
      });
      bumpMetric(key, 'totalLatencyMs', now - startedAt);
      notify(key, value);
      return value;
    } catch (err) {
      bumpMetric(key, 'errors');
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = DEFAULT_TTL, swr = 0, force = false } = options;
  const now = Date.now();

  if (!force) {
    const hit = store.get(key) as CacheEntry<T> | undefined;
    if (hit) {
      hit.lastAccess = now;
      if (hit.freshUntil > now) {
        bumpMetric(key, 'hits');
        return hit.value;
      }
      if (swr > 0 && hit.staleUntil > now) {
        bumpMetric(key, 'staleHits');
        void refresh(key, fetcher, ttl, swr).catch(() => { /* swallow */ });
        return hit.value;
      }
    }
    const pending = inflight.get(key) as Promise<T> | undefined;
    if (pending) {
      bumpMetric(key, 'misses');
      return pending;
    }
  }

  bumpMetric(key, 'misses');
  return refresh(key, fetcher, ttl, swr);
}

/**
 * Subscribe to background refreshes for a cache key.
 * Returns an unsubscribe function. Useful for SWR consumers that need to
 * re-render when a stale value gets revalidated.
 */
export function subscribe<T>(key: string, listener: (value: T) => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener as Listener);
  return () => {
    const s = listeners.get(key);
    if (!s) return;
    s.delete(listener as Listener);
    if (s.size === 0) listeners.delete(key);
  };
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
  listeners.clear();
}

// ── Introspection (admin cache dashboard) ──────────────────────────────

export interface CacheStatRow {
  key: string;
  status: 'fresh' | 'stale' | 'expired' | 'empty';
  ttlMs: number;
  swrMs: number;
  ageMs: number;            // time since last write
  freshForMs: number;       // ms remaining until stale (negative = stale)
  expiresInMs: number;      // ms remaining until fully expired
  refreshCount: number;
  hits: number;
  staleHits: number;
  misses: number;
  errors: number;
  hitRate: number;          // 0..1, fresh+stale hits ÷ total reads
  avgFetchMs: number;
  approxBytes: number;      // rough JSON size estimate
}

function approxSize(value: unknown): number {
  try { return JSON.stringify(value)?.length ?? 0; } catch { return 0; }
}

/** Snapshot of every cache entry + counters, for the admin dashboard. */
export function getCacheStats(): {
  rows: CacheStatRow[];
  totals: {
    entries: number;
    fresh: number;
    stale: number;
    hits: number;
    staleHits: number;
    misses: number;
    errors: number;
    hitRate: number;
    approxBytes: number;
    inflight: number;
    listeners: number;
  };
} {
  const now = Date.now();
  const allKeys = new Set<string>([...store.keys(), ...metrics.keys()]);
  const rows: CacheStatRow[] = [];

  let fresh = 0, stale = 0, totalHits = 0, totalStale = 0, totalMisses = 0, totalErrors = 0, totalBytes = 0;

  for (const key of allKeys) {
    const entry = store.get(key);
    const m = metrics.get(key) ?? { hits: 0, staleHits: 0, misses: 0, errors: 0, totalLatencyMs: 0 };
    const reads = m.hits + m.staleHits + m.misses;
    const hitRate = reads === 0 ? 0 : (m.hits + m.staleHits) / reads;
    const avgFetchMs = m.misses + m.errors === 0 ? 0 : m.totalLatencyMs / Math.max(1, (entry?.refreshCount ?? 0));
    const status: CacheStatRow['status'] = !entry
      ? 'empty'
      : entry.freshUntil > now ? 'fresh'
      : entry.staleUntil > now ? 'stale'
      : 'expired';
    if (status === 'fresh') fresh++;
    else if (status === 'stale') stale++;

    const bytes = entry ? approxSize(entry.value) : 0;
    totalHits += m.hits;
    totalStale += m.staleHits;
    totalMisses += m.misses;
    totalErrors += m.errors;
    totalBytes += bytes;

    rows.push({
      key,
      status,
      ttlMs: entry?.ttl ?? 0,
      swrMs: entry?.swr ?? 0,
      ageMs: entry ? now - entry.writtenAt : 0,
      freshForMs: entry ? entry.freshUntil - now : 0,
      expiresInMs: entry ? entry.staleUntil - now : 0,
      refreshCount: entry?.refreshCount ?? 0,
      hits: m.hits,
      staleHits: m.staleHits,
      misses: m.misses,
      errors: m.errors,
      hitRate,
      avgFetchMs,
      approxBytes: bytes,
    });
  }

  rows.sort((a, b) => (b.hits + b.staleHits + b.misses) - (a.hits + a.staleHits + a.misses));

  const totalReads = totalHits + totalStale + totalMisses;
  return {
    rows,
    totals: {
      entries: store.size,
      fresh,
      stale,
      hits: totalHits,
      staleHits: totalStale,
      misses: totalMisses,
      errors: totalErrors,
      hitRate: totalReads === 0 ? 0 : (totalHits + totalStale) / totalReads,
      approxBytes: totalBytes,
      inflight: inflight.size,
      listeners: listeners.size,
    },
  };
}

/** Reset hit/miss counters (entries themselves are kept). */
export function resetCacheMetrics(): void {
  metrics.clear();
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

