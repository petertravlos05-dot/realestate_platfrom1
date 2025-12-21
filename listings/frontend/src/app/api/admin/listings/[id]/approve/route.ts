import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const property = await prisma.property.update({
      where: { id: params.id },
      data: { 
        status: 'approved',
        isVerified: true 
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Το ακίνητο εγκρίθηκε επιτυχώς',
      property
    });
  } catch (error) {
    console.error('Error approving property:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 