import { supabase } from '@/integrations/supabase/client';

const DEFAULT_COMMISSION_PCT = 20;
let cachedPct: number | null = null;
let cacheTime = 0;
const CACHE_MS = 60_000; // 1 minute

/**
 * Fetch the platform commission percentage from platform_settings.
 * Falls back to DEFAULT_COMMISSION_PCT (20%) if missing or unreadable.
 * Cached for 60s to avoid repeated reads.
 */
export async function getPlatformCommissionPct(): Promise<number> {
  const now = Date.now();
  if (cachedPct !== null && now - cacheTime < CACHE_MS) return cachedPct;

  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'platform_commission_pct')
      .maybeSingle();
    const parsed = data?.value ? Number(data.value) : NaN;
    cachedPct = Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : DEFAULT_COMMISSION_PCT;
  } catch {
    cachedPct = DEFAULT_COMMISSION_PCT;
  }
  cacheTime = now;
  return cachedPct;
}

export interface FeeSplit {
  classFee: number;
  platformCommission: number;
  tutorPayout: number;
  commissionPct: number;
}

/** Compute integer-rounded commission/payout split for a given class fee. */
export function computeFeeSplit(classFee: number, commissionPct: number): FeeSplit {
  const fee = Math.max(0, Math.round(classFee || 0));
  const pct = Math.max(0, Math.min(100, commissionPct));
  const commission = Math.round((fee * pct) / 100);
  const payout = Math.max(0, fee - commission);
  return { classFee: fee, platformCommission: commission, tutorPayout: payout, commissionPct: pct };
}

/** Convenience: fetch the live pct then compute the split. */
export async function calculateFeeSplit(classFee: number): Promise<FeeSplit> {
  const pct = await getPlatformCommissionPct();
  return computeFeeSplit(classFee, pct);
}
