import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const transaction = await prisma.transaction.findUnique({
      where: {
        id: params.id,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            images: true,
            bedrooms: true,
            bathrooms: true,
            area: true,
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyName: true,
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyName: true,
          }
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyName: true,
            licenseNumber: true,
          }
        },
        progress: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                role: true,
              }
            }
          }
        },
        notifications: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { interestCancelled } = await request.json();
    
    console.log('=== Updating Transaction ===', {
      transactionId: params.id,
      interestCancelled
    });

    const updatedTransaction = await prisma.transaction.update({
      where: { id: params.id },
      data: { interestCancelled }
    });

    console.log('Updated transaction:', updatedTransaction);
    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 