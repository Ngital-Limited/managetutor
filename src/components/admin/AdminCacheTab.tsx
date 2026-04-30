import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Activity, Database, Trash2, RefreshCw, RotateCcw, Search } from 'lucide-react';
import {
  getCacheStats,
  invalidate,
  invalidatePrefix,
  clearCache,
  resetCacheMetrics,
  type CacheStatRow,
} from '@/lib/cache';

const REFRESH_INTERVAL_MS = 1000;

function formatMs(ms: number): string {
  if (!isFinite(ms)) return '—';
  const abs = Math.abs(ms);
  if (abs < 1000) return `${Math.round(ms)}ms`;
  if (abs < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (abs < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function statusBadge(status: CacheStatRow['status']) {
  const map: Record<CacheStatRow['status'], { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    fresh:   { label: 'Fresh',   variant: 'default' },
    stale:   { label: 'Stale',   variant: 'secondary' },
    expired: { label: 'Expired', variant: 'outline' },
    empty:   { label: 'Empty',   variant: 'outline' },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export function AdminCacheTab() {
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState(() => getCacheStats());
  const [filter, setFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => setSnapshot(getCacheStats()), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return snapshot.rows;
    return snapshot.rows.filter(r => r.key.toLowerCase().includes(q));
  }, [snapshot.rows, filter]);

  const totals = snapshot.totals;
  const hitRatePct = (totals.hitRate * 100).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Hit rate</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{hitRatePct}%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {totals.hits + totals.staleHits} hits / {totals.misses} misses
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Entries</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{totals.entries}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {totals.fresh} fresh · {totals.stale} stale
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">In-flight</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{totals.inflight}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {totals.listeners} subscribers
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Memory (approx)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{formatBytes(totals.approxBytes)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {totals.errors > 0 ? `${totals.errors} errors` : 'no errors'}
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" /> Cache entries
          </CardTitle>
          <CardDescription>
            Live view of every in-memory cache key. Updates every {REFRESH_INTERVAL_MS / 1000}s.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filter by key…"
                className="pl-7 h-8 text-xs"
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => setSnapshot(getCacheStats())}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
            <Button
              size="sm"
              variant={autoRefresh ? 'default' : 'outline'}
              onClick={() => setAutoRefresh(v => !v)}
            >
              <Activity className="h-3.5 w-3.5 mr-1" /> Auto {autoRefresh ? 'on' : 'off'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                resetCacheMetrics();
                setSnapshot(getCacheStats());
                toast({ title: 'Counters reset' });
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset counters
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                clearCache();
                setSnapshot(getCacheStats());
                toast({ title: 'Cache cleared' });
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear all
            </Button>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Key</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Hit rate</TableHead>
                  <TableHead className="text-xs text-right">Hits</TableHead>
                  <TableHead className="text-xs text-right">Stale</TableHead>
                  <TableHead className="text-xs text-right">Miss</TableHead>
                  <TableHead className="text-xs text-right">TTL</TableHead>
                  <TableHead className="text-xs text-right">SWR</TableHead>
                  <TableHead className="text-xs text-right">Age</TableHead>
                  <TableHead className="text-xs text-right">Fresh for</TableHead>
                  <TableHead className="text-xs text-right">Avg fetch</TableHead>
                  <TableHead className="text-xs text-right">Size</TableHead>
                  <TableHead className="text-xs"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-xs text-muted-foreground py-6">
                      No matching cache entries.
                    </TableCell>
                  </TableRow>
                )}
                {filteredRows.map(r => (
                  <TableRow key={r.key}>
                    <TableCell className="font-mono text-xs max-w-[280px] truncate" title={r.key}>{r.key}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {((r.hitRate) * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{r.hits}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{r.staleHits}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{r.misses}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{r.ttlMs ? formatMs(r.ttlMs) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{r.swrMs ? formatMs(r.swrMs) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{r.status === 'empty' ? '—' : formatMs(r.ageMs)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {r.status === 'empty' ? '—' : formatMs(Math.max(0, r.freshForMs))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{r.avgFetchMs ? formatMs(r.avgFetchMs) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{r.approxBytes ? formatBytes(r.approxBytes) : '—'}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => {
                          invalidate(r.key);
                          setSnapshot(getCacheStats());
                          toast({ title: 'Key invalidated', description: r.key });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Bulk-prefix invalidation helper */}
          <PrefixInvalidator onDone={() => setSnapshot(getCacheStats())} />
        </CardContent>
      </Card>
    </div>
  );
}

function PrefixInvalidator({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [prefix, setPrefix] = useState('');
  return (
    <div className="flex items-center gap-2 pt-2 border-t">
      <span className="text-xs text-muted-foreground">Invalidate by prefix:</span>
      <Input
        value={prefix}
        onChange={e => setPrefix(e.target.value)}
        placeholder="e.g. lookup:"
        className="h-8 text-xs max-w-[260px]"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={!prefix.trim()}
        onClick={() => {
          invalidatePrefix(prefix.trim());
          onDone();
          toast({ title: 'Prefix invalidated', description: prefix.trim() });
          setPrefix('');
        }}
      >
        Invalidate
      </Button>
    </div>
  );
}
