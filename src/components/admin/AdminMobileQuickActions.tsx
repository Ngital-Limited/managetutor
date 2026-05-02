import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  UserCheck, Briefcase, AlertTriangle, CreditCard, BookOpen,
  Megaphone, LifeBuoy, Plus, CheckCircle2, Zap, FileText
} from 'lucide-react';

interface QuickAction {
  label: string;
  value: string;
  icon: React.ElementType;
  badge?: number;
  color: string;
}

interface Props {
  stats: {
    pendingVerifications: number;
    pendingJobs: number;
    pendingApplications: number;
    pendingReports: number;
  };
  onNavigate: (tab: string) => void;
}

export function AdminMobileQuickActions({ stats, onNavigate }: Props) {
  const actions: QuickAction[] = [
    { label: 'Verifications', value: 'verifications', icon: UserCheck, badge: stats.pendingVerifications, color: 'text-warning' },
    { label: 'Jobs', value: 'jobs', icon: Briefcase, badge: stats.pendingJobs, color: 'text-primary' },
    { label: 'Applications', value: 'applications', icon: FileText, badge: stats.pendingApplications, color: 'text-success' },
    { label: 'Reports', value: 'reports', icon: AlertTriangle, badge: stats.pendingReports, color: 'text-destructive' },
    { label: 'Post Job', value: 'post_job', icon: Plus, color: 'text-primary' },
    { label: 'Smart Match', value: 'smart_match', icon: Zap, color: 'text-warning' },
    { label: 'Demo Requests', value: 'demo_requests', icon: BookOpen, color: 'text-primary' },
    { label: 'Broadcast', value: 'broadcast', icon: Megaphone, color: 'text-success' },
    { label: 'Tickets', value: 'tickets', icon: LifeBuoy, color: 'text-warning' },
    { label: 'Hires', value: 'hires', icon: CheckCircle2, color: 'text-success' },
    { label: 'Payments', value: 'payments', icon: CreditCard, color: 'text-primary' },
    { label: 'Ledger', value: 'ledger', icon: FileText, color: 'text-muted-foreground' },
  ];

  return (
    <Card className="md:hidden">
      <CardContent className="p-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-4 gap-2">
          {actions.map((action) => (
            <button
              key={action.value}
              onClick={() => onNavigate(action.value)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors relative"
            >
              <div className="relative">
                <action.icon className={`h-5 w-5 ${action.color}`} />
                {action.badge && action.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {action.badge > 99 ? '99+' : action.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
