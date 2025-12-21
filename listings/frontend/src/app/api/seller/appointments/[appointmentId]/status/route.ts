import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { appointmentId: string } }) {
  try {
    const { appointmentId } = params;
    const { status } = await req.json();

    // Ενημέρωση ViewingRequest στη βάση
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

    // Δημιουργία ειδοποίησης στον buyer
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

    if (status.toUpperCase() === 'ACCEPTED') {
      notificationMessage = `Το ραντεβού σας επιβεβαιώθηκε για τις ${formattedDate} από τον ${updated.property.user.name}. Παρακαλώ εμφανιστείτε στην ώρα που συμφωνήσατε.`;
      notificationType = 'APPOINTMENT_ACCEPTED';
    } else if (status.toUpperCase() === 'REJECTED') {
      notificationMessage = `Η ημερομηνία ${formattedDate} δεν εγκρίθηκε από τον ${updated.property.user.name}. Παρακαλώ προγραμματίστε νέα ημερομηνία.`;
      notificationType = 'APPOINTMENT_REJECTED';
    }

    if (notificationMessage) {
      await prisma.notification.create({
        data: {
          userId: updated.buyerId,
          type: notificationType,
          title: status.toUpperCase() === 'ACCEPTED' ? 'Ραντεβού Επιβεβαιώθηκε' : 'Ραντεβού Απορρίφθηκε',
          message: notificationMessage,
          isRead: false,
          metadata: {
            appointmentId: updated.id,
            propertyId: updated.propertyId,
            propertyTitle: updated.property.title,
            sellerName: updated.property.user.name,
            date: updated.date,
            time: updated.time,
            status: status.toUpperCase(),
            recipient: 'buyer'
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