import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Verify user has access to this ticket
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { userId: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Admin can see all messages, users can only see their own tickets
    if (session.user.role !== 'ADMIN' && session.user.role !== 'admin' && ticket.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messages = await prisma.supportMessage.findMany({
      where: { ticketId },
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
    });

    // Parse metadata for each message
    const messagesWithMetadata = messages.map(message => ({
      ...message,
      metadata: (message as any).metadata ? JSON.parse((message as any).metadata as string) : null
    }));

    return NextResponse.json({ messages: messagesWithMetadata });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, content, isMultipleChoice, options } = body;

    if (!ticketId || !content) {
      return NextResponse.json({ error: 'Ticket ID and content are required' }, { status: 400 });
    }

    // Verify user has access to this ticket
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { 
        userId: true,
        title: true,
        category: true,
        propertyId: true
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Admin can reply to any ticket, users can only reply to their own tickets
    if (session.user.role !== 'ADMIN' && session.user.role !== 'admin' && ticket.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Προετοιμασία δεδομένων μηνύματος
    const messageData: any = {
      content,
      ticketId,
      userId: session.user.id,
      isFromAdmin: session.user.role === 'ADMIN' || session.user.role === 'admin'
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

    // Update ticket's updatedAt timestamp
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() }
    });

    // Δημιουργία ειδοποίησης για τον buyer όταν ο admin στέλνει μήνυμα
    if (session.user.role === 'ADMIN' || session.user.role === 'admin') {
      try {
        console.log('=== Creating support message notification ===');
        console.log('Ticket userId:', ticket.userId);
        console.log('Ticket title:', ticket.title);
        console.log('Message id:', message.id);
        
        // Βρίσκουμε το όνομα του ακινήτου αν υπάρχει
        let propertyTitle = '';
        if (ticket.propertyId) {
          const property = await prisma.property.findUnique({
            where: { id: ticket.propertyId },
            select: { title: true }
          });
          propertyTitle = property?.title || '';
        }

        // Δημιουργούμε το μήνυμα της ειδοποίησης
        let notificationMessage = '';
        if (propertyTitle) {
          notificationMessage = `Λάβατε νέο μήνυμα από τον διαχειριστή σχετικά με το ακίνητο '${propertyTitle}'`;
        } else {
          notificationMessage = `Λάβατε νέο μήνυμα από τον διαχειριστή`;
        }

        // Προσθέτουμε το περιεχόμενο του μηνύματος (κομμένο αν είναι μεγάλο)
        const messagePreview = content.length > 100 ? content.substring(0, 100) + '...' : content;
        notificationMessage += `\n\n${messagePreview}`;

        const notification = await prisma.notification.create({
          data: {
            userId: ticket.userId,
            type: 'SUPPORT_MESSAGE',
            title: 'Νέο Μήνυμα Υποστήριξης',
            message: notificationMessage,
            isRead: false,
            metadata: {
              ticketId: ticketId,
              ticketTitle: ticket.title,
              ticketCategory: ticket.category,
              messageId: message.id,
              isFromAdmin: true,
              propertyTitle: propertyTitle,
              fullMessage: content
            }
          }
        });
        
        console.log('=== Support message notification created successfully ===');
        console.log('Notification id:', notification.id);
        console.log('Notification data:', notification);
      } catch (notificationError) {
        console.error('Error creating support message notification:', notificationError);
        console.error('Error details:', {
          userId: ticket.userId,
          type: 'SUPPORT_MESSAGE',
          title: 'Νέο Μήνυμα Υποστήριξης',
          message: `Λάβατε νέο μήνυμα για το ticket "${ticket.title}". Πατήστε για να δείτε την απάντηση.`,
          metadata: {
            ticketId: ticketId,
            ticketTitle: ticket.title,
            ticketCategory: ticket.category,
            messageId: message.id,
            isFromAdmin: true
          }
        });
        // Δεν σταματάμε την εκτέλεση αν αποτύχει η ειδοποίηση
      }
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 