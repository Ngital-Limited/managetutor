import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Briefcase, FileText, DollarSign, Bell, CheckCircle2, LogIn, Clock } from 'lucide-react';
import { formatExactDate } from '@/lib/date';

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  detail: string;
  date: string;
  icon: React.ElementType;
  color: string;
}

export function AdminUserTimeline({ userId }: { userId: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const timeline: TimelineEvent[] = [];

      // Notifications (recent activity signals)
      const { data: notifs } = await supabase
        .from('notifications')
        .select('id, title, message, type, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      (notifs || []).forEach(n => {
        timeline.push({
          id: `notif-${n.id}`,
          type: 'notification',
          title: n.title,
          detail: n.message || '',
          date: n.created_at,
          icon: Bell,
          color: 'text-blue-500',
        });
      });

      // Applications (as tutor)
      const { data: tutorProfile } = await supabase
        .from('tutor_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (tutorProfile) {
        const { data: apps } = await supabase
          .from('applications')
          .select('id, status, created_at, jobs(title)')
          .eq('tutor_id', tutorProfile.id)
          .order('created_at', { ascending: false })
          .limit(15);

        (apps || []).forEach(a => {
          timeline.push({
            id: `app-${a.id}`,
            type: 'application',
            title: `Applied to "${(a.jobs as any)?.title || 'Job'}"`,
            detail: `Status: ${a.status}`,
            date: a.created_at,
            icon: FileText,
            color: 'text-amber-500',
          });
        });
      }

      // Jobs posted (as parent)
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, status, created_at, job_reference')
        .eq('parent_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      (jobs || []).forEach(j => {
        timeline.push({
          id: `job-${j.id}`,
          type: 'job',
          title: `Posted job "${j.title}"`,
          detail: `${j.job_reference || ''} — ${j.status}`,
          date: j.created_at,
          icon: Briefcase,
          color: 'text-emerald-500',
        });
      });

      // Payments
      const { data: payments } = await supabase
        .from('payment_transactions')
        .select('id, amount, listing_type, status, created_at, transaction_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      (payments || []).forEach(p => {
        timeline.push({
          id: `pay-${p.id}`,
          type: 'payment',
          title: `Payment ৳${p.amount} (${p.listing_type || 'payment'})`,
          detail: `${p.transaction_id} — ${p.status}`,
          date: p.created_at,
          icon: DollarSign,
          color: 'text-green-500',
        });
      });

      // Activity logs (admin actions on this user)
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('id, action, target_type, created_at, details')
        .eq('target_id', userId)
        .order('created_at', { ascending: false })
        .limit(15);

      (logs || []).forEach(l => {
        timeline.push({
          id: `log-${l.id}`,
          type: 'admin_action',
          title: `Admin: ${l.action?.replace(/_/g, ' ')}`,
          detail: l.target_type || '',
          date: l.created_at,
          icon: CheckCircle2,
          color: 'text-purple-500',
        });
      });

      // Sort by date descending
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(timeline);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="py-4 text-center text-sm text-muted-foreground">Loading timeline…</div>;
  if (events.length === 0) return <div className="py-4 text-center text-sm text-muted-foreground">No activity recorded</div>;

  return (
    <ScrollArea className="h-[400px]">
      <div className="relative pl-6 space-y-0">
        <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />
        {events.map((e, i) => (
          <div key={e.id} className="relative pb-4">
            <div className={`absolute left-[-17px] top-1 h-5 w-5 rounded-full bg-background border-2 border-border flex items-center justify-center`}>
              <e.icon className={`h-3 w-3 ${e.color}`} />
            </div>
            <div className="ml-2">
              <div className="text-sm font-medium leading-tight">{e.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{e.detail}</div>
              <div className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {formatExactDate(new Date(e.date))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
