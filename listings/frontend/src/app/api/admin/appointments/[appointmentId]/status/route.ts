import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { appointmentId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appointmentId } = params;
    const { status } = await req.json();

    // Έλεγχος αν το status είναι έγκυρο
    if (!['ACCEPTED', 'REJECTED', 'CANCELLED'].includes(status.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Εύρεση του ραντεβού
    const viewingRequest = await prisma.viewingRequest.findUnique({
      where: { id: appointmentId },
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
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
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
      notificationMessage = `Το ραντεβού σας επιβεβαιώθηκε για τις ${formattedDate} από τον admin. Παρακαλώ εμφανιστείτε στην ώρα που συμφωνήσατε.`;
      notificationType = 'APPOINTMENT_ACCEPTED';
    } else if (status.toUpperCase() === 'REJECTED') {
      notificationMessage = `Η ημερομηνία ${formattedDate} δεν εγκρίθηκε από τον admin. Παρακαλώ προγραμματίστε νέα ημερομηνία.`;
      notificationType = 'APPOINTMENT_REJECTED';
    } else if (status.toUpperCase() === 'CANCELLED') {
      notificationMessage = `Το ραντεβού σας για τις ${formattedDate} ακυρώθηκε από τον admin. Παρακαλώ επικοινωνήστε για νέα ημερομηνία.`;
      notificationType = 'APPOINTMENT_CANCELLED';
    }

    if (notificationMessage) {
      await prisma.notification.create({
        data: {
          userId: updated.buyerId,
          title: `Ραντεβού ${status.toUpperCase() === 'ACCEPTED' ? 'Εγκρίθηκε' : status.toUpperCase() === 'REJECTED' ? 'Απορρίφθηκε' : 'Ακυρώθηκε'}`,
          message: notificationMessage,
          type: notificationType,
          propertyId: updated.propertyId,
          metadata: {
            appointmentId: updated.id,
            propertyId: updated.propertyId,
            status: status.toUpperCase()
          },
          isRead: false
        }
      });
    }

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Error updating appointment status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
