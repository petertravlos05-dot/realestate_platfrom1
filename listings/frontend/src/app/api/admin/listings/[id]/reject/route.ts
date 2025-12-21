import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
        status: 'rejected',
        isVerified: false 
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
      message: 'Το ακίνητο απορρίφθηκε',
      property
    });
  } catch (error) {
    console.error('Error rejecting property:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 