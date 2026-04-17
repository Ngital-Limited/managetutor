import { supabase } from '@/integrations/supabase/client';

const DEFAULT_MIN = 70;
let cached: number | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

/** Fetch min_profile_completeness setting (cached 60s, fallback 70). */
export async function getMinProfileCompleteness(): Promise<number> {
  const now = Date.now();
  if (cached !== null && now - cachedAt < CACHE_MS) return cached;
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'min_profile_completeness')
      .maybeSingle();
    const parsed = data?.value ? Number(data.value) : NaN;
    cached = Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : DEFAULT_MIN;
  } catch {
    cached = DEFAULT_MIN;
  }
  cachedAt = now;
  return cached;
}
