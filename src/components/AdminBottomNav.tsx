import { useSidebar } from '@/components/ui/sidebar';
import { LayoutDashboard, Users, Briefcase, DollarSign, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  activeTab: string;
  setActiveTab: (t: string) => void;
}

const items: { key: string; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'revenue', label: 'Revenue', icon: DollarSign },
];

export function AdminBottomNav({ activeTab, setActiveTab }: Props) {
  const { setOpenMobile } = useSidebar();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Admin navigation"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
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
