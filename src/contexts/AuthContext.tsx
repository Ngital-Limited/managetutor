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
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  // Impersonation
  impersonation: ImpersonationData | null;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
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
          setImpersonation(null);
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

  const impersonateUser = async (userId: string) => {
    // Only admins can impersonate
    if (role !== 'admin') return;

    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('full_name, avatar_url, phone').eq('id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);

    if (profileRes.data && roleRes.data && roleRes.data.length > 0) {
      const userRole = roleRes.data[0].role as AppRole;
      setImpersonation({
        userId,
        role: userRole,
        profile: profileRes.data as UserProfile,
      });
    }
  };

  const stopImpersonation = () => {
    setImpersonation(null);
  };

  const signUp = async (email: string, password: string, fullName: string, selectedRole: AppRole) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { error };
    }

    if (data.user) {
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    setImpersonation(null);
  };

  // Effective values: when impersonating, use impersonated user's data
  const effectiveUserId = impersonation ? impersonation.userId : user?.id ?? null;
  const effectiveRole = impersonation ? impersonation.role : role;

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
