import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId, buyerId, date, time } = body;
    if (!propertyId || !buyerId || !date || !time) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    
    const viewingRequest = await prisma.viewingRequest.create({
      data: {
        propertyId,
        buyerId,
        date: new Date(date),
        time,
        endTime: time, // μπορείς να το αλλάξεις αν χρειάζεται
        status: 'PENDING',
      },
      include: {
        property: {
          include: {
            user: true
          }
        },
        buyer: true,
      },
    });

    // Δημιουργία ειδοποίησης στον seller
    if (viewingRequest.property?.user?.id) {
      const formattedDate = new Date(date).toLocaleDateString('el-GR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      await prisma.notification.create({
        data: {
          userId: viewingRequest.property.user.id,
          title: 'Νέο Αίτημα Ραντεβού',
          message: `Ο χρήστης ${viewingRequest.buyer.name} ζητά να προγραμματίσει ραντεβού για το ακίνητό σας "${viewingRequest.property.title}" στις ${formattedDate}.`,
          type: 'APPOINTMENT_REQUEST',
          propertyId: propertyId,
          metadata: {
            viewingRequestId: viewingRequest.id,
            buyerId: buyerId,
            buyerName: viewingRequest.buyer.name,
            date: date,
            time: time,
            recipient: 'seller'
          }
        },
      });
    }

    return NextResponse.json({ success: true, viewingRequest });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 