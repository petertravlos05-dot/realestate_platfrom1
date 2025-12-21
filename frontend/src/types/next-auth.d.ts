import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'AGENT' | 'BUYER' | 'SELLER';
  }

  interface Session {
    user: User;
  }
} 