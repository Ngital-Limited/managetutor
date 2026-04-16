import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

type AppRole = 'parent' | 'tutor' | 'agency' | 'admin';

interface UserProfile {
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
}

interface ImpersonationData {
  userId: string;
  role: AppRole;
  profile: UserProfile;
  originalSession: Session;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: AppRole, phone?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  // Impersonation
  impersonation: ImpersonationData | null;
  impersonateUser: (userId: string) => Promise<{ error: string | null }>;
  stopImpersonation: () => Promise<void>;
  effectiveUserId: string | null;
  effectiveRole: AppRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationData | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip auth state changes while impersonating (we manage it manually)
        if (impersonation) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            await Promise.all([
              fetchUserRole(session.user.id),
              fetchProfile(session.user.id),
            ]);
            setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await Promise.all([
          fetchUserRole(session.user.id),
          fetchProfile(session.user.id),
        ]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (data && !error && data.length > 0) {
      const roles = data.map(d => d.role as AppRole);
      if (roles.includes('admin')) {
        setRole('admin');
      } else {
        setRole(roles[0]);
      }
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, phone')
      .eq('id', userId)
      .single();
    
    if (data && !error) {
      setProfile(data as UserProfile);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const impersonateUser = async (userId: string): Promise<{ error: string | null }> => {
    if (role !== 'admin' || !session) {
      return { error: 'Admin access required' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('impersonate-user', {
        body: { targetUserId: userId },
      });

      if (error) {
        console.error('Impersonation error:', error);
        return { error: error.message || 'Failed to impersonate' };
      }

      if (data?.error) {
        return { error: data.error };
      }

      if (!data?.session) {
        return { error: 'No session returned' };
      }

      // Store original admin session
      const originalSession = session;

      // Set the impersonated user's session in the supabase client
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      // Update state with impersonated user data
      setImpersonation({
        userId,
        role: data.role as AppRole,
        profile: data.profile as UserProfile,
        originalSession,
      });

      // Update displayed role and profile
      setRole(data.role as AppRole);
      setProfile(data.profile as UserProfile);
      setUser(data.session.user);
      setSession(data.session);

      return { error: null };
    } catch (err: any) {
      console.error('Impersonation error:', err);
      return { error: err.message || 'Failed to impersonate' };
    }
  };

  const stopImpersonation = async () => {
    if (!impersonation) return;

    const { originalSession } = impersonation;

    // Restore admin session
    await supabase.auth.setSession({
      access_token: originalSession.access_token,
      refresh_token: originalSession.refresh_token,
    });

    setImpersonation(null);
    setUser(originalSession.user);
    setSession(originalSession);

    // Re-fetch admin role and profile
    await Promise.all([
      fetchUserRole(originalSession.user.id),
      fetchProfile(originalSession.user.id),
    ]);
  };

  const signUp = async (email: string, password: string, fullName: string, selectedRole: AppRole, phone?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName, phone: phone || '' },
      },
    });

    if (error) return { error };

    if (data.user) {
      // Update phone on profile
      if (phone) {
        await supabase.from('profiles').update({ phone }).eq('id', data.user.id);
      }
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role: selectedRole });

      if (roleError) {
        console.error('Error setting user role:', roleError);
      } else {
        setRole(selectedRole);
      }

      if (selectedRole === 'tutor') {
        await supabase.from('tutor_profiles').insert({
          user_id: data.user.id,
          gender: 'male',
        });
      } else if (selectedRole === 'agency') {
        await supabase.from('agency_profiles').insert({
          user_id: data.user.id,
          agency_name: fullName,
        });
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      return { error: result.error instanceof Error ? result.error : new Error(String(result.error)) };
    }
    return { error: null };
  };

  const signOut = async () => {
    if (impersonation) {
      await stopImpersonation();
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    setImpersonation(null);
  };

  const effectiveUserId = user?.id ?? null;
  const effectiveRole = role;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      role,
      profile,
      loading,
      refreshProfile,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      impersonation,
      impersonateUser,
      stopImpersonation,
      effectiveUserId,
      effectiveRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
