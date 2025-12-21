import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface PropertyLead {
  id: string;
  status: string;
  updatedAt: Date;
  createdAt: Date;
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  agent: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  property: {
    id: string;
    title: string;
    status: string;
    images: string[];
    location?: string;
    price?: number;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    features?: string[];
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
  notifications?: Array<{
    id: string;
    message: string;
    createdAt: Date;
    recipient: string;
    category: string;
    isUnread: boolean;
    stage: string;
  }>;
}

interface Transaction {
  id: string;
  stage: string;
  status: string;
  updatedAt: Date;
  createdAt: Date;
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  agent: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  property: {
    id: string;
    title: string;
    status: string;
    images: string[];
    location?: string;
    price?: number;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    features?: string[];
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
  notifications?: Array<{
    id: string;
    message: string;
    createdAt: Date;
    recipient: string;
    category: string;
    isUnread: boolean;
    stage: string;
  }>;
  progress: Array<{
    id: string;
    stage: string;
    notes: string;
    comment?: string;
    createdAt: Date;
    createdBy: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cancelled = searchParams.get('cancelled') === 'true';

    console.log('=== Fetching Transactions ===', {
      cancelled,
      timestamp: new Date().toISOString()
    });

    const transactions = await prisma.transaction.findMany({
      where: {
        interestCancelled: cancelled
      },
      include: {
        property: {
          include: {
            user: true
          }
        },
        buyer: true,
        seller: true,
        agent: true,
        progress: {
          include: {
            createdBy: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    console.log('Found transactions:', {
      total: transactions.length,
      cancelled: transactions.filter(t => t.interestCancelled).length
    });

    // Ελέγχουμε αν ο χρήστης είναι admin στη βάση
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    console.log('User role from DB:', user?.role);

    if (!user || !user.role.toLowerCase().includes('admin')) {
      console.log('User is not admin:', user?.role);
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    // Πρώτα παίρνουμε όλα τα PropertyLeads
    const leads = await prisma.propertyLead.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          { status: 'pending' },
          { status: 'MEETING_SCHEDULED' },
          { status: 'meeting_scheduled' },
          { status: 'VIEWING_SCHEDULED' },
          { status: 'viewing_scheduled' },
          { status: 'NEGOTIATING' },
          { status: 'negotiating' },
          { status: 'CLOSED' },
          { status: 'closed' },
          { status: 'COMPLETED' },
          { status: 'completed' },
          { status: 'CANCELLED' },
          { status: 'cancelled' }
        ],
        interestCancelled: cancelled
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        property: {
          select: {
            id: true,
            title: true,
            status: true,
            price: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('Fetched leads:', leads.length); // Debug log

    // Πριν το mapping των leads και transactions, κάνω type assertion:

    const typedLeads = leads as any[];
    const typedTransactions = transactions as any[];

    // Και στο mapping χρησιμοποιώ τα typedLeads και typedTransactions αντί για leads και transactions
    const formattedTransactions = [
      ...typedLeads.map((lead: PropertyLead) => ({
        id: lead.id,
        buyer: {
          name: lead.buyer.name,
          email: lead.buyer.email,
          phone: lead.buyer.phone ?? ""
        },
        seller: {
          name: lead.property.user.name,
          email: lead.property.user.email,
          phone: lead.property.user.phone ?? ""
        },
        agent: lead.agent ? {
          name: lead.agent.name,
          email: lead.agent.email,
          phone: lead.agent.phone ?? ""
        } : undefined,
        property: {
          id: lead.property.id,
          title: lead.property.title,
          status: lead.property.status,
          price: lead.property.price,
          images: lead.property.images
        },
        status: lead.status ?? "",
        createdAt: lead.createdAt.toISOString(),
        progress: {
          stage: lead.status ?? "",
          updatedAt: lead.updatedAt.toISOString(),
          notifications: []
        }
      })),
      ...typedTransactions.map((transaction: Transaction) => ({
        id: transaction.id,
        buyer: {
          name: transaction.buyer.name,
          email: transaction.buyer.email,
          phone: transaction.buyer.phone ?? ""
        },
        seller: {
          name: transaction.property.user.name,
          email: transaction.property.user.email,
          phone: transaction.property.user.phone ?? ""
        },
        agent: transaction.agent ? {
          name: transaction.agent.name,
          email: transaction.agent.email,
          phone: transaction.agent.phone ?? ""
        } : undefined,
        property: {
          id: transaction.property.id,
          title: transaction.property.title,
          status: transaction.property.status,
          price: transaction.property.price,
          images: transaction.property.images
        },
        status: transaction.status ?? "",
        createdAt: transaction.createdAt.toISOString(),
        progress: {
          stage: transaction.progress[0]?.stage ?? transaction.status ?? "",
          updatedAt: transaction.progress[0]?.createdAt?.toISOString() || transaction.updatedAt?.toISOString() || transaction.createdAt.toISOString(),
          notifications: transaction.progress.map(p => ({
            id: p.id,
            message: p.notes ?? "",
            recipient: p.createdBy.email === transaction.buyer.email ? 'buyer' :
                      p.createdBy.email === transaction.property.user.email ? 'seller' :
                      p.createdBy.email === transaction.agent?.email ? 'agent' : '',
            createdAt: p.createdAt.toISOString()
          }))
        }
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log('Total formatted transactions:', formattedTransactions.length); // Debug log

    return NextResponse.json(formattedTransactions);
  } catch (error) {
    console.error('General error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId, stage, message, recipient } = await request.json();

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        buyer: true,
        agent: true,
        property: {
          include: {
            user: true
          }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Ενημέρωση του σταδίου της συναλλαγής
    const progress = await prisma.transactionProgress.create({
      data: {
        transactionId,
        stage,
        notes: message,
        createdById: session.user.id
      }
    });

    // Δημιουργία ειδοποίησης για τον παραλήπτη
    let recipientId;
    if (recipient === 'buyer') {
      recipientId = transaction.buyerId;
    } else if (recipient === 'seller') {
      recipientId = transaction.property.userId;
    } else if (recipient === 'agent' && transaction.agentId) {
      recipientId = transaction.agentId;
    }

    if (recipientId) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          title: 'Ενημέρωση Συναλλαγής',
          message,
          type: 'TRANSACTION_UPDATE',
          propertyId: transaction.propertyId
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 