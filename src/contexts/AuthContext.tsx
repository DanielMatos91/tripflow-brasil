import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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

// Role priority order
const ROLE_PRIORITY: AppRole[] = ['ADMIN', 'STAFF', 'FLEET', 'DRIVER', 'CUSTOMER'];

function getPrimaryRole(roles: AppRole[]): AppRole | null {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return null;
}

function getHomePath(primaryRole: AppRole | null): string {
  switch (primaryRole) {
    case 'ADMIN':
    case 'STAFF':
      return '/admin';
    case 'DRIVER':
      return '/driver';
    case 'FLEET':
      return '/fleet';
    case 'CUSTOMER':
      return '/';
    default:
      return '/unauthorized';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchUserRoles = useCallback(async (userId: string): Promise<AppRole[]> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }

      return (data || []).map(r => r.role as AppRole);
    } catch (err) {
      console.error('Exception fetching roles:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          const userRoles = await fetchUserRoles(initialSession.user.id);
          if (isMounted) {
            setRoles(userRoles);
          }
        } else {
          setSession(null);
          setUser(null);
          setRoles([]);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted || !initialized) return;

        console.log('Auth state changed:', event);

        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);

          // Only fetch roles on sign in events
          if (event === 'SIGNED_IN') {
            const userRoles = await fetchUserRoles(newSession.user.id);
            if (isMounted) {
              setRoles(userRoles);
            }
          }
        } else {
          setSession(null);
          setUser(null);
          setRoles([]);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRoles, initialized]);

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
  const primaryRole = getPrimaryRole(roles);
  const homePath = getHomePath(primaryRole);
  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
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
