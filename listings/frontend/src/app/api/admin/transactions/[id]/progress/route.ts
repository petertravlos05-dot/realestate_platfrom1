import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { generateId } from '@/lib/utils/id';

const prisma = new PrismaClient();

interface TransactionProgress {
  id: number;
  transactionId: number;
  stage: string;
  comment: string;
  createdAt: Date;
  createdById: string;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const transactionId = parseInt(params.id);
    if (isNaN(transactionId)) {
      return new NextResponse('Invalid transaction ID', { status: 400 });
    }

    const progress = await prisma.$queryRaw<TransactionProgress[]>`
      SELECT *
      FROM transaction_progress
      WHERE "transactionId" = ${transactionId}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    return NextResponse.json(progress[0] || { currentStage: 'INQUIRY', comment: '' });
  } catch (error) {
    console.error('Error fetching transaction progress:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { stage, notes } = await request.json();

    const progress = await prisma.transactionProgress.create({
      data: {
        id: generateId(),
        transactionId: params.id,
        stage,
        notes,
        createdById: session.user.id
      }
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error creating progress:', error);
    return NextResponse.json(
      { error: 'Failed to create progress' },
      { status: 500 }
    );
  }
} 