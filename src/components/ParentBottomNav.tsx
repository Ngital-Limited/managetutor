import { useSidebar } from '@/components/ui/sidebar';
import { Home, Briefcase, Users, Calendar, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionKey = 'overview' | 'jobs' | 'applicants' | 'demo' | 'tuitions' | 'payments' | 'profile';

interface Props {
  activeSection: SectionKey;
  setActiveSection: (s: SectionKey) => void;
  pendingApplicants?: number;
}

const items: { key: SectionKey; label: string; icon: any }[] = [
  { key: 'overview', label: 'Home', icon: Home },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'applicants', label: 'Applicants', icon: Users },
  { key: 'demo', label: 'Demos', icon: Calendar },
];

export function ParentBottomNav({ activeSection, setActiveSection, pendingApplicants = 0 }: Props) {
  const { setOpenMobile } = useSidebar();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Parent navigation"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const isActive = activeSection === item.key;
          const showBadge = item.key === 'applicants' && pendingApplicants > 0;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => setActiveSection(item.key)}
                className={cn(
                  'relative flex w-full flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {showBadge && (
                  <span className="absolute top-1 right-1/2 translate-x-4 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {pendingApplicants > 9 ? '9+' : pendingApplicants}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            className="flex w-full flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
            <span>Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
