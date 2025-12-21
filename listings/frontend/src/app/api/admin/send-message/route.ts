import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, propertyId, content, isMultipleChoice, options } = body;

    if (!userId || !content) {
      return NextResponse.json({ error: 'User ID and content are required' }, { status: 400 });
    }

    // Επιβεβαίωση ότι ο χρήστης υπάρχει
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Επιβεβαίωση ότι το ακίνητο υπάρχει (αν δόθηκε)
    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId }
      });

      if (!property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }
    }

    // Δημιουργία ή εύρεση υπάρχοντος ticket
    let ticket = await prisma.supportTicket.findFirst({
      where: {
        userId,
        propertyId: propertyId || null,
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Αν δεν υπάρχει ανοιχτό ticket, δημιουργούμε νέο
    if (!ticket) {
      ticket = await prisma.supportTicket.create({
        data: {
          userId: userId, // Target user (who will receive the message)
          createdBy: session.user.id, // Admin creates the ticket
          propertyId: propertyId || null,
          title: `Μήνυμα από Admin${propertyId ? ' για συγκεκριμένο ακίνητο' : ''}`,
          description: 'Μήνυμα που ξεκίνησε ο Admin',
          category: propertyId ? 'PROPERTY_INQUIRY' : 'GENERAL',
          priority: 'MEDIUM',
          status: 'OPEN'
        }
      });
    }

    // Δημιουργία του μηνύματος
    const messageData: any = {
      content,
      ticketId: ticket.id,
      userId: session.user.id,
      isFromAdmin: true
    };

    // Προσθήκη δεδομένων πολλαπλής επιλογής αν υπάρχουν
    if (isMultipleChoice && options && options.length >= 2) {
      const validOptions = options.filter((option: string) => option.trim() !== '');
      if (validOptions.length >= 2) {
        messageData.metadata = JSON.stringify({
          isMultipleChoice: true,
          options: validOptions
        });
      }
    }

    const message = await prisma.supportMessage.create({
      data: messageData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Ενημέρωση του ticket
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { 
        updatedAt: new Date(),
        status: 'IN_PROGRESS'
      }
    });

    return NextResponse.json({ 
      message,
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status
      }
    });

  } catch (error) {
    console.error('Error sending admin message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 