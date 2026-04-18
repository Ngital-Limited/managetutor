import { NavLink } from 'react-router-dom';
import { useSidebar } from '@/components/ui/sidebar';
import { Home, FileText, Briefcase, User, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/tutor/dashboard', label: 'Home', icon: Home, end: true },
  { to: '/tutor/applications', label: 'Applied', icon: FileText },
  { to: '/tutor/find-jobs', label: 'Jobs', icon: Briefcase },
  { to: '/tutor/profile', label: 'Profile', icon: User },
];

export function TutorBottomNav() {
  const { setOpenMobile } = useSidebar();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Tutor navigation"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
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
