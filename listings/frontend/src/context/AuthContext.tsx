'use client';

import React, { createContext, useContext } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { clearAuthStorage } from '@/lib/api/client';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const login = async (email: string, password: string) => {
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      throw new Error(result.error);
    }
  };

  const logout = async () => {
    clearAuthStorage();
    await signOut({ redirect: false });
  };

  const value = {
    user: session?.user as User | null,
    isAuthenticated: !!session?.user,
    isLoading: status === 'loading',
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider; 