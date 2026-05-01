import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

const SOURCE_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  google: 'Google Search',
  youtube: 'YouTube',
  friend: 'Friend / Family',
  newspaper: 'Newspaper / Ad',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  other: 'Other',
};

const formatLabel = (key: string | null) => {
  if (!key) return 'Not specified';
  return SOURCE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
};

export function ReferralAnalyticsTab() {
  const [rows, setRows] = useState<{ referral_source: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('referral_source')
        .limit(10000);
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const { chartData, total, specified } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = r.referral_source || '__unspecified__';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const data = Array.from(counts.entries())
      .map(([key, count]) => ({
        key,
        name: key === '__unspecified__' ? 'Not specified' : formatLabel(key),
        count,
      }))
      .sort((a, b) => b.count - a.count);
    const total = rows.length;
    const specified = rows.filter(r => r.referral_source).length;
    return { chartData: data, total, specified };
  }, [rows]);

  const max = chartData[0]?.count || 1;
  const palette = [
    'hsl(var(--primary))',
    'hsl(var(--primary) / 0.85)',
    'hsl(var(--primary) / 0.7)',
    'hsl(var(--primary) / 0.55)',
    'hsl(var(--primary) / 0.4)',
    'hsl(var(--muted-foreground) / 0.6)',
  ];

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-xl font-semibold">Referral Source Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Where users heard about the platform during signup
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> With Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{specified}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {total > 0 ? Math.round((specified / total) * 100) : 0}% provided source
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Top Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {chartData.find(d => d.key !== '__unspecified__')?.name || '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {chartData.find(d => d.key !== '__unspecified__')?.count || 0} users
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
          ) : chartData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No data yet</div>
          ) : (
            <>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={palette[i % palette.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 space-y-2">
                {chartData.map((d, i) => {
                  const pct = total > 0 ? (d.count / total) * 100 : 0;
                  const barPct = (d.count / max) * 100;
                  return (
                    <div key={d.key} className="flex items-center gap-3">
                      <div className="w-36 shrink-0 text-sm flex items-center gap-2">
                        <span className="truncate">{d.name}</span>
                        {d.key === '__unspecified__' && (
                          <Badge variant="outline" className="text-[10px]">N/A</Badge>
                        )}
                      </div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${barPct}%`, background: palette[i % palette.length] }}
                        />
                      </div>
                      <div className="w-24 text-right text-xs text-muted-foreground tabular-nums">
                        {d.count} · {pct.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
