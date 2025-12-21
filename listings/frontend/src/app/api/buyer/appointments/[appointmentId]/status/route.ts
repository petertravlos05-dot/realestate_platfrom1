import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { appointmentId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appointmentId } = params;
    const { status } = await req.json();

    // Εύρεση του ραντεβού και έλεγχος ότι ανήκει στον buyer
    const viewingRequest = await prisma.viewingRequest.findFirst({
      where: { 
        id: appointmentId,
        buyerId: session.user.id 
      },
      include: {
        property: {
          include: {
            user: true
          }
        },
        buyer: true
      }
    });

    if (!viewingRequest) {
      return NextResponse.json({ error: 'Appointment not found or unauthorized' }, { status: 404 });
    }

    // Ενημέρωση της κατάστασης του ραντεβού
    const updated = await prisma.viewingRequest.update({
      where: { id: appointmentId },
      data: { status: status.toUpperCase() },
      include: {
        property: {
          include: {
            user: true
          }
        },
        buyer: true
      }
    });

    // Δημιουργία ειδοποίησης στον seller για την αλλαγή κατάστασης
    const formattedDate = new Date(updated.date).toLocaleDateString('el-GR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let notificationMessage = '';
    let notificationType = '';

    if (status.toUpperCase() === 'CANCELLED') {
      notificationMessage = `Ο αγοραστής ${updated.buyer.name} ακύρωσε το ραντεβού για τις ${formattedDate} στο ακίνητό σας "${updated.property.title}".`;
      notificationType = 'APPOINTMENT_CANCELLED';
    } else if (status.toUpperCase() === 'COMPLETED') {
      notificationMessage = `Το ραντεβού με τον αγοραστή ${updated.buyer.name} για τις ${formattedDate} στο ακίνητό σας "${updated.property.title}" ολοκληρώθηκε.`;
      notificationType = 'APPOINTMENT_COMPLETED';
    }

    if (notificationMessage && updated.property?.user?.id) {
      await prisma.notification.create({
        data: {
          userId: updated.property.user.id,
          type: notificationType,
          title: status.toUpperCase() === 'CANCELLED' ? 'Ραντεβού Ακυρώθηκε' : 'Ραντεβού Ολοκληρώθηκε',
          message: notificationMessage,
          isRead: false,
          metadata: {
            appointmentId: updated.id,
            propertyId: updated.propertyId,
            propertyTitle: updated.property.title,
            buyerName: updated.buyer.name,
            date: updated.date,
            time: updated.time,
            status: status.toUpperCase(),
            recipient: 'seller'
          }
        }
      });
    }

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return NextResponse.json({ error: 'Σφάλμα κατά την ενημέρωση του ραντεβού' }, { status: 500 });
  }
} 