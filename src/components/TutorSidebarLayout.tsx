import { ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import {
  Home, FileText, Calendar, Briefcase, User, CreditCard, LogOut,
  Sparkles, Zap, ShieldCheck, X,
} from 'lucide-react';
import { TutorBottomNav } from '@/components/TutorBottomNav';

const tutorSidebarGroups: { label: string; items: { title: string; url: string; icon: any; end?: boolean }[] }[] = [
  {
    label: 'Main',
    items: [
      { title: 'Dashboard', url: '/tutor/dashboard', icon: Home, end: true },
      { title: 'My Applications', url: '/tutor/applications', icon: FileText },
      { title: 'Demo Classes', url: '/tutor/dashboard#demo-classes', icon: Calendar },
    ],
  },
  {
    label: 'Find Work',
    items: [
      { title: 'Find Jobs', url: '/tutor/find-jobs', icon: Briefcase },
      { title: 'Job Recommendations', url: '/tutor/recommendations', icon: Sparkles },
    ],
  },
  {
    label: 'Profile',
    items: [
      { title: 'My Profile', url: '/tutor/profile', icon: User },
      { title: 'Boost Your Profile', url: '/tutor/boost', icon: Zap },
      { title: 'Verify Badge Payment', url: '/tutor/verify-badge', icon: ShieldCheck },
    ],
  },
  {
    label: 'Billing',
    items: [
      { title: 'Monthly Plan', url: '/pricing', icon: CreditCard },
    ],
  },
];

function TutorSidebarInner() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  const { profile, user } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  const { setOpenMobile } = useSidebar();
  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            {!collapsed && <Logo size="sm" />}
            {isMobile && (
              <button
                type="button"
                onClick={() => setOpenMobile(false)}
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </SidebarGroupLabel>
          <div className={`flex items-center gap-3 px-3 py-3 ${collapsed ? 'justify-center' : ''}`}>
            <Avatar className="h-9 w-9 shrink-0 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{profile?.full_name || user?.email?.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {tutorSidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/tutor/dashboard'}
                      onClick={handleNavClick}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

interface TutorSidebarLayoutProps {
  children: ReactNode;
  title: string;
}

export function TutorSidebarLayout({ children, title }: TutorSidebarLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <TutorSidebarInner />
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <header className="sticky top-0 z-40 h-14 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-3 sm:px-4">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="hidden md:inline-flex" />
              <span className="text-base sm:text-lg font-bold truncate">{title}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={handleSignOut} className="px-2 sm:px-3">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto pb-20 md:pb-0">
            {children}
          </main>
          <TutorBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
