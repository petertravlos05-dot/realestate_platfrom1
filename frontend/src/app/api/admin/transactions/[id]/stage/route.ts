import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const VALID_STAGES = [
  'PENDING', 
  'MEETING_SCHEDULED', 
  'DEPOSIT_PAID', 
  'FINAL_SIGNING', 
  'COMPLETED', 
  'CANCELLED'
] as const;
type Stage = typeof VALID_STAGES[number];

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== Transaction Stage Update Debug ===');
    console.log('Updating transaction stage for ID:', params.id);
    
    // Έλεγχος εγκυρότητας του ID
    if (!params.id || typeof params.id !== 'string') {
      console.log('❌ Invalid transaction ID format:', params.id);
      return NextResponse.json(
        { error: 'Invalid transaction ID format' },
        { status: 400 }
      );
    }

    const { stage } = await request.json();
    const normalizedStage = stage.toUpperCase();
    console.log('New stage:', normalizedStage);

    if (!VALID_STAGES.includes(normalizedStage as Stage)) {
      console.log('❌ Invalid stage:', normalizedStage);
      return NextResponse.json(
        { error: 'Invalid transaction stage' },
        { status: 400 }
      );
    }

    // Έλεγχος για την ύπαρξη του transaction
    const existingTransaction = await prisma.transaction.findUnique({
      where: { 
        id: params.id
      },
      include: {
        property: true,
        buyer: true,
        agent: true,
        seller: true
      }
    });

    console.log('=== Current Record ===');
    console.log('Existing transaction:', JSON.stringify(existingTransaction, null, 2));

    if (!existingTransaction) {
      console.log('❌ Transaction not found');
      // Προσθήκη επιπλέον πληροφοριών για debugging
      const allTransactions = await prisma.transaction.findMany({
        select: { id: true, status: true, stage: true, leadId: true },
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      console.log('Recent transactions:', JSON.stringify(allTransactions, null, 2));
      
      return NextResponse.json(
        { error: 'Transaction not found', recentTransactions: allTransactions },
        { status: 404 }
      );
    }

    // Ενημέρωση transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: existingTransaction.id },
      data: {
        stage: normalizedStage,
        status: normalizedStage === 'COMPLETED' ? 'COMPLETED' : 
                normalizedStage === 'CANCELLED' ? 'CANCELLED' : 
                'IN_PROGRESS'
      },
      include: {
        property: true,
        buyer: true,
        agent: true,
        seller: true,
        notifications: true
      }
    });

    // Create progress record
    await prisma.transactionProgress.create({
      data: {
        transactionId: existingTransaction.id,
        stage: normalizedStage,
        completedAt: new Date(),
        notes: `Stage updated to ${normalizedStage}`,
        createdById: existingTransaction.agentId || existingTransaction.buyerId
      }
    });

    console.log('=== Updated Record ===');
    console.log('Stage:', updatedTransaction.stage);
    console.log('Status:', updatedTransaction.status);
    console.log('UpdatedAt:', updatedTransaction.updatedAt);
    console.log('Has notifications:', updatedTransaction.notifications?.length || 0);

    console.log('=== Update Complete ===');
    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error('Error updating transaction stage:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 