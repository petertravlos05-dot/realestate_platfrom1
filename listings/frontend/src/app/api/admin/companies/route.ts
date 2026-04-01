import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminSession } from '@/lib/auth/admin-helpers';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdminSession(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companies = await prisma.user.findMany({
      where: {
        role: 'SELLER',
        isDeleted: false,
        OR: [
          { userType: 'COMPANY' },
          {
            AND: [{ companyName: { not: null } }, { NOT: { companyName: '' } }],
          },
        ],
      },
      orderBy: { createdAt: 'desc' as const },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        companyName: true,
        companyEmail: true,
        createdAt: true,
      },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
