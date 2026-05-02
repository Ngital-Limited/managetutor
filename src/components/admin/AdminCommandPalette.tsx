import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, BarChart3, Briefcase, FileText, Users, GraduationCap, CreditCard, Settings, Zap, Bell, MapPin, Shield, TrendingUp, DollarSign } from 'lucide-react';

interface CommandItem {
  title: string;
  value: string;
  icon: any;
  group: string;
  keywords?: string;
}

const ALL_COMMANDS: CommandItem[] = [
  { title: 'Dashboard Overview', value: 'overview', icon: BarChart3, group: 'Navigation' },
  { title: 'Jobs', value: 'jobs', icon: Briefcase, group: 'Navigation', keywords: 'tuition posting' },
  { title: 'Applications', value: 'applications', icon: FileText, group: 'Navigation' },
  { title: 'Guardians / Parents', value: 'guardians', icon: Users, group: 'Navigation' },
  { title: 'Tutor Profiles', value: 'tutor_profiles', icon: GraduationCap, group: 'Navigation' },
  { title: 'Verifications', value: 'verifications', icon: Shield, group: 'Navigation' },
  { title: 'Payments', value: 'payments', icon: CreditCard, group: 'Navigation' },
  { title: 'Transaction Ledger', value: 'ledger', icon: FileText, group: 'Finance' },
  { title: 'Commissions', value: 'commissions', icon: DollarSign, group: 'Finance' },
  { title: 'Hires', value: 'hires', icon: Users, group: 'Finance' },
  { title: 'Tutor Earnings', value: 'tutor_earnings', icon: TrendingUp, group: 'Finance' },
  { title: 'Invoices', value: 'invoices', icon: FileText, group: 'Finance' },
  { title: 'Refunds', value: 'refunds', icon: CreditCard, group: 'Finance' },
  { title: 'Smart Matching', value: 'smart_match', icon: Zap, group: 'Intelligence' },
  { title: 'Pipeline & Funnel', value: 'pipeline', icon: TrendingUp, group: 'Intelligence' },
  { title: 'Conversion Funnel', value: 'conversion_funnel', icon: TrendingUp, group: 'Analytics' },
  { title: 'Geographic Analytics', value: 'geographic', icon: MapPin, group: 'Analytics' },
  { title: 'Send Notification', value: 'send_notification', icon: Bell, group: 'Operations' },
  { title: 'Bulk Actions', value: 'bulk_actions', icon: Users, group: 'Operations' },
  { title: 'Enforcement', value: 'enforcement', icon: Shield, group: 'Operations' },
  { title: 'Broadcast', value: 'broadcast', icon: Bell, group: 'Communication' },
  { title: 'Support Tickets', value: 'tickets', icon: FileText, group: 'Communication' },
  { title: 'CMS Pages', value: 'cms', icon: FileText, group: 'Content' },
  { title: 'General Settings', value: 'settings', icon: Settings, group: 'Settings' },
  { title: 'Platform Data', value: 'platform_data', icon: Settings, group: 'Settings' },
  { title: 'Sub-Admin Roles', value: 'rbac', icon: Shield, group: 'Settings' },
  { title: 'Export Center', value: 'export_center', icon: FileText, group: 'Settings' },
  { title: 'Activity Log', value: 'activity_log', icon: FileText, group: 'Settings' },
];

interface AdminCommandPaletteProps {
  onNavigate: (tab: string) => void;
}

export function AdminCommandPalette({ onNavigate }: AdminCommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const filtered = query.trim()
    ? ALL_COMMANDS.filter(c =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.group.toLowerCase().includes(query.toLowerCase()) ||
        c.keywords?.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_COMMANDS;

  const groups = [...new Set(filtered.map(c => c.group))];

  const handleSelect = (value: string) => {
    onNavigate(value);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 h-8 px-3 text-xs text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Quick nav…</span>
        <kbd className="hidden lg:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <div className="flex items-center border-b border-border px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search admin sections…"
              className="border-0 focus-visible:ring-0 h-11 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            {groups.map(group => (
              <div key={group}>
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
                {filtered.filter(c => c.group === group).map(cmd => (
                  <button
                    key={cmd.value}
                    onClick={() => handleSelect(cmd.value)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left"
                  >
                    <cmd.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    {cmd.title}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No results found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
