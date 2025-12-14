import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  primaryRole: AppRole | null;
  homePath: string;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isStaff: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  const fetchUserRoles = async (userId: string) => {
    setRolesLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (!error && data) {
        setRoles(data.map(r => r.role as AppRole));
      } else {
        setRoles([]);
      }
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserRoles(session.user.id);
        } else {
          setRoles([]);
          setRolesLoading(false);
        }

        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserRoles(session.user.id);
      } else {
        setRolesLoading(false);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name }
      }
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const isAdmin = roles.includes('ADMIN');
  const isStaff = roles.includes('STAFF');

  const primaryRole = useMemo<AppRole | null>(() => {
    if (roles.includes('ADMIN')) return 'ADMIN';
    if (roles.includes('STAFF')) return 'STAFF';
    if (roles.includes('FLEET')) return 'FLEET';
    if (roles.includes('DRIVER')) return 'DRIVER';
    if (roles.includes('CUSTOMER')) return 'CUSTOMER';
    return null;
  }, [roles]);

  const homePath = useMemo(() => {
    if (primaryRole === 'ADMIN' || primaryRole === 'STAFF') return '/admin';
    if (primaryRole === 'DRIVER') return '/driver';
    if (primaryRole === 'FLEET') return '/fleet';
    // CUSTOMER vai ser o site público depois
    if (primaryRole === 'CUSTOMER') return '/';
    return '/unauthorized';
  }, [primaryRole]);

  const hasRole = (role: AppRole) => roles.includes(role);

  const isLoading = loading || rolesLoading;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading: isLoading,
      roles,
      primaryRole,
      homePath,
      hasRole,
      isAdmin,
      isStaff,
      signIn,
      signUp,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
