import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface AutoRefreshControlProps {
  /** Stable storage key — preferences persist per scope */
  storageKey: string;
  /** Called when interval elapses (and toggle is on). Should perform the refresh. */
  onTick: () => void | Promise<void>;
  /** Optional default interval (ms) when nothing is stored. Defaults to 60_000. */
  defaultIntervalMs?: number;
  /** Optional default enabled. Defaults to false. */
  defaultEnabled?: boolean;
  className?: string;
}

const INTERVAL_OPTIONS = [
  { label: '15s', value: 15_000 },
  { label: '30s', value: 30_000 },
  { label: '1m', value: 60_000 },
  { label: '2m', value: 120_000 },
  { label: '5m', value: 300_000 },
  { label: '10m', value: 600_000 },
];

export function AutoRefreshControl({
  storageKey,
  onTick,
  defaultIntervalMs = 60_000,
  defaultEnabled = false,
  className = '',
}: AutoRefreshControlProps) {
  const enabledKey = `autoRefresh:${storageKey}:enabled`;
  const intervalKey = `autoRefresh:${storageKey}:interval`;

  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(enabledKey);
      return v === null ? defaultEnabled : v === '1';
    } catch { return defaultEnabled; }
  });
  const [intervalMs, setIntervalMs] = useState<number>(() => {
    try {
      const v = localStorage.getItem(intervalKey);
      const n = v ? parseInt(v, 10) : NaN;
      return Number.isFinite(n) && n > 0 ? n : defaultIntervalMs;
    } catch { return defaultIntervalMs; }
  });

  useEffect(() => {
    try { localStorage.setItem(enabledKey, enabled ? '1' : '0'); } catch {}
  }, [enabled, enabledKey]);
  useEffect(() => {
    try { localStorage.setItem(intervalKey, String(intervalMs)); } catch {}
  }, [intervalMs, intervalKey]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const id = window.setInterval(() => {
      if (cancelled) return;
      try { void onTick(); } catch {}
    }, intervalMs);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [enabled, intervalMs, onTick]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Switch
          id={`auto-refresh-${storageKey}`}
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label="Toggle auto-refresh"
        />
        <Label htmlFor={`auto-refresh-${storageKey}`} className="text-xs text-muted-foreground cursor-pointer">
          Auto
        </Label>
      </div>
      <Select
        value={String(intervalMs)}
        onValueChange={(v) => setIntervalMs(parseInt(v, 10))}
        disabled={!enabled}
      >
        <SelectTrigger className="h-8 w-[72px] text-xs" aria-label="Auto-refresh interval">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {INTERVAL_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
