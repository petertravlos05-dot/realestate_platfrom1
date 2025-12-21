import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: params.id,
      },
      include: {
        property: true,
        progress: true,
        notifications: true,
      },
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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { stage, ...updateData } = body;

    const transaction = await prisma.transaction.update({
      where: {
        id: params.id,
      },
      data: {
        ...updateData,
        progress: {
          update: {
            stage,
            updatedAt: new Date(),
          },
        },
      },
      include: {
        property: true,
        progress: true,
        notifications: true,
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Έλεγχος session
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'BUYER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Βρες τη συναλλαγή
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
    });
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    if (transaction.buyerId !== session.user.id) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    // Hard delete
    await prisma.transaction.delete({ where: { id: params.id } });
    console.log(`[DELETE] Transaction ${params.id} deleted by buyer ${session.user.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
} 