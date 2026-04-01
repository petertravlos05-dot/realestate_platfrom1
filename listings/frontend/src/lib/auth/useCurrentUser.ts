import { useSession } from 'next-auth/react';

export interface CurrentUser {
  userId: string | null;
  role: string | null;
  email: string | null;
  name: string | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  isAuthenticated: boolean;
}

/**
 * Hook to get current user from NextAuth session
 * Single source of truth for user identity and role
 */
export function useCurrentUser(): CurrentUser {
  const { data: session, status } = useSession();

  return {
    userId: session?.user?.id || null,
    role: session?.user?.role || null,
    email: session?.user?.email || null,
    name: session?.user?.name || null,
    status,
    isAuthenticated: status === 'authenticated' && !!session?.user?.id,
  };
}


