import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Παίρνουμε τα query parameters για φιλτράρισμα
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const category = searchParams.get('category') || '';
    const transactionStage = searchParams.get('transactionStage') || '';

    // Δημιουργούμε το where clause για φιλτράρισμα
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { property: { title: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (priority && priority !== 'all') {
      where.priority = priority;
    }
    
    if (category && category !== 'all') {
      where.category = category;
    }
    
    if (transactionStage && transactionStage !== 'all') {
      where.transaction = {
        stage: transactionStage
      };
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        property: {
          select: {
            id: true,
            title: true
          }
        },
        transaction: {
          select: {
            id: true,
            stage: true,
            property: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, title, description, category, priority, propertyId, transactionId } = body;

    if (!userId || !title || !description || !category || !priority) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Δημιουργία ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        createdBy: session.user.id, // Admin creates the ticket
        title,
        description,
        category,
        priority,
        propertyId: propertyId || undefined,
        transactionId: transactionId || undefined,
        messages: {
          create: [{
            content: description,
            userId: session.user.id,
            isFromAdmin: true
          }]
        }
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        createdByUser: { select: { id: true, name: true, email: true, role: true } },
        property: { select: { id: true, title: true } },
        transaction: { select: { id: true, stage: true, property: { select: { id: true, title: true } } } },
        messages: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error creating support ticket as admin:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 