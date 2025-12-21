import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  BUYER = 'BUYER',
  SELLER = 'SELLER'
}

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        phone: { label: 'Phone', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if ((!credentials?.email && !credentials?.phone) || !credentials?.password) {
          return null;
        }

        let user = null;

        // If email is provided, try to find user by email first
        if (credentials.email) {
          // First try to find user by main email
          user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          // If not found, try to find by company email
          if (!user) {
            user = await prisma.user.findFirst({
              where: {
                companyEmail: credentials.email,
              },
            });
          }
        }

        // If phone is provided and no user found yet, try to find by phone
        if (!user && credentials.phone) {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { phone: credentials.phone },
                { companyPhone: credentials.phone },
                { contactPersonPhone: credentials.phone }
              ]
            },
          });
        }

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email, // Always return the main email for session
          name: user.name,
          role: user.role as UserRole,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 