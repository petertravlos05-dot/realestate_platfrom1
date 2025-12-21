import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId } = params;
    const { status, date, comment } = await request.json();

    // Έλεγχος αν το ακίνητο υπάρχει
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        user: true
      }
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Αν είναι custom_date request
    if (status === 'custom_date' && date) {
      const viewingRequest = await prisma.viewingRequest.create({
        data: {
          propertyId,
          buyerId: session.user.id,
          date: new Date(date),
          time: new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

      // Δημιουργία ειδοποίησης στον seller για custom date request
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
            title: 'Νέα Πρόταση Ραντεβού',
            message: `Ο χρήστης ${viewingRequest.buyer.name} προτείνει ημερομηνία για ραντεβού στο ακίνητό σας "${viewingRequest.property.title}" στις ${formattedDate}.`,
            type: 'CUSTOM_APPOINTMENT_REQUEST',
            propertyId: propertyId,
            metadata: {
              viewingRequestId: viewingRequest.id,
              buyerId: session.user.id,
              buyerName: viewingRequest.buyer.name,
              date: date,
              comment: comment,
              recipient: 'seller'
            }
          },
        });
      }

      // Δημιουργία ειδοποίησης στον buyer για custom date request
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
          userId: session.user.id,
          title: 'Πρόταση Ραντεβού Στάλθηκε',
          message: `Η πρότασή σας για ραντεβού στις ${formattedDate} στάλθηκε στον πωλητή ${viewingRequest.property.user.name} και αναμένει έγκριση.`,
          type: 'CUSTOM_APPOINTMENT_REQUEST',
          propertyId: propertyId,
          metadata: {
            viewingRequestId: viewingRequest.id,
            sellerName: viewingRequest.property.user.name,
            date: date,
            comment: comment,
            recipient: 'buyer'
          }
        },
      });

      return NextResponse.json({ success: true, viewingRequest });
    }

    // Για άλλες ενημερώσεις ραντεβού
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling appointment:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 