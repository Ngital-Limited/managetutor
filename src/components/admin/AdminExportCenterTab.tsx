import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Download, Users, GraduationCap, Briefcase, CreditCard, FileText, DollarSign, Bell, Activity } from 'lucide-react';

interface ExportDef {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: string;
  fetchFn: () => Promise<any[]>;
}

const toCSV = (data: any[]): string => {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => {
    const v = r[h];
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(','));
  return [headers.join(','), ...rows].join('\n');
};

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const EXPORTS: ExportDef[] = [
  {
    id: 'guardians', title: 'All Guardians', description: 'Parent/guardian profiles with status and signup date',
    icon: Users, category: 'Users',
    fetchFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email, phone, status, user_reference, created_at')
        .order('created_at', { ascending: false });
      return data || [];
    }
  },
  {
    id: 'tutors', title: 'All Tutors', description: 'Tutor profiles with availability, gender, district',
    icon: GraduationCap, category: 'Users',
    fetchFn: async () => {
      const { data } = await supabase.from('tutor_profiles').select('id, user_id, display_name, gender, is_available, is_verified, is_featured, experience_years, created_at')
        .order('created_at', { ascending: false });
      return data || [];
    }
  },
  {
    id: 'jobs', title: 'All Jobs', description: 'Job postings with status, salary, location',
    icon: Briefcase, category: 'Jobs',
    fetchFn: async () => {
      const { data } = await supabase.from('jobs').select('id, title, job_reference, status, salary_range, total_applications, total_views, created_at')
        .order('created_at', { ascending: false });
      return data || [];
    }
  },
  {
    id: 'applications', title: 'All Applications', description: 'Applications with status and timestamps',
    icon: FileText, category: 'Jobs',
    fetchFn: async () => {
      const { data } = await supabase.from('applications').select('id, job_id, tutor_id, status, created_at')
        .order('created_at', { ascending: false });
      return data || [];
    }
  },
  {
    id: 'payments', title: 'Payment Transactions', description: 'All payment records with amounts and status',
    icon: CreditCard, category: 'Finance',
    fetchFn: async () => {
      const { data } = await supabase.from('payment_transactions').select('id, user_id, amount, payment_type, status, payment_method, transaction_id, created_at')
        .order('created_at', { ascending: false });
      return data || [];
    }
  },
  {
    id: 'commissions', title: 'Commission Records', description: 'Commission due per hire with status',
    icon: DollarSign, category: 'Finance',
    fetchFn: async () => {
      const { data } = await supabase.from('commission_records' as any).select('*')
        .order('created_at', { ascending: false });
      return (data as any[]) || [];
    }
  },
  {
    id: 'notifications', title: 'Notifications Log', description: 'All in-app notifications sent',
    icon: Bell, category: 'Communication',
    fetchFn: async () => {
      const { data } = await supabase.from('notifications').select('id, user_id, title, type, is_read, created_at')
        .order('created_at', { ascending: false }).limit(1000);
      return data || [];
    }
  },
  {
    id: 'activity_logs', title: 'Admin Activity Log', description: 'Audit trail of all admin actions',
    icon: Activity, category: 'System',
    fetchFn: async () => {
      const { data } = await supabase.from('activity_logs' as any).select('*')
        .order('created_at', { ascending: false }).limit(1000);
      return (data as any[]) || [];
    }
  },
];

export function AdminExportCenterTab({ toast }: { toast: any }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = async (exp: ExportDef) => {
    setDownloading(exp.id);
    try {
      const data = await exp.fetchFn();
      if (!data.length) {
        toast({ title: 'No data', description: `No records found for ${exp.title}.` });
        return;
      }
      const csv = toCSV(data);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `${exp.id}_export_${date}.csv`);
      toast({ title: 'Downloaded', description: `${data.length} records exported.` });
    } catch {
      toast({ title: 'Error', description: 'Export failed.', variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  const categories = [...new Set(EXPORTS.map(e => e.category))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Export Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Download platform data as CSV files for offline analysis and reporting.</p>
      </div>

      {categories.map(cat => (
        <div key={cat} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{cat}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {EXPORTS.filter(e => e.category === cat).map(exp => (
              <Card key={exp.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <exp.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{exp.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{exp.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport(exp)}
                    disabled={downloading === exp.id}
                    className="shrink-0"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    {downloading === exp.id ? '…' : 'CSV'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
