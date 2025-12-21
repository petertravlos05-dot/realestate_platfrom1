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
    if (!session) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('=== Seller Transaction Details Debug ===');
    console.log('Requested transaction ID:', params.id);
    console.log('Session user:', {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role
    });

    // Βρίσκουμε το transaction και ελέγχουμε αν ανήκει στον χρήστη
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        property: {
          userId: session.user.id // Ελέγχουμε αν το property ανήκει στον χρήστη
        },
        // Προσθήκη φίλτρου για να πάρουμε μόνο τις έγκυρες συναλλαγές
        NOT: {
          status: 'CANCELLED'
        }
      },
      include: {
        property: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        buyer: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        agent: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        progress: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            createdBy: {
              select: {
                email: true
              }
            }
          }
        }
      }
    });

    if (!transaction) {
      console.log('❌ Transaction not found or unauthorized');
      console.log('Transaction ID:', params.id);
      console.log('Seller ID:', session.user.id);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    console.log('✅ Found transaction:', {
      id: transaction.id,
      propertyId: transaction.propertyId,
      buyerId: transaction.buyerId,
      agentId: transaction.agentId,
      stage: transaction.stage,
      status: transaction.status,
      propertyOwnerId: transaction.property.userId
    });

    // Ensure transaction.id is string and include stage/status
    const response = {
      ...transaction,
      id: String(transaction.id),
      progress: {
        stage: transaction.stage || 'PENDING',
        status: transaction.status || 'PENDING',
        updatedAt: transaction.updatedAt,
        notifications: transaction.progress.map(p => ({
          id: p.id,
          message: p.notes || '',
          recipient: p.createdBy?.email === transaction.buyer.email ? 'buyer' :
                    p.createdBy?.email === transaction.property.user.email ? 'seller' :
                    'agent',
          stage: p.stage,
          category: 'general',
          createdAt: p.createdAt.toISOString(),
          isUnread: false
        }))
      }
    };

    console.log('✅ Returning transaction data:', {
      id: response.id,
      stage: response.progress.stage,
      status: response.progress.status,
      notificationsCount: response.progress.notifications.length
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error fetching transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 