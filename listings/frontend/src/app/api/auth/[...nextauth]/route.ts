import { authOptions } from '@/lib/auth';
import NextAuth from 'next-auth';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 