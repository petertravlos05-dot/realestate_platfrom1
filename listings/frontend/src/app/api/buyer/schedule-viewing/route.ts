import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const {
      availabilityId,
      customDate,
      customStartTime,
      customEndTime,
      isCustomRequest,
    } = body;
    const propertyId = params.id;

    // Έλεγχος αν το ακίνητο υπάρχει
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true },
    });

    if (!property) {
      return new NextResponse('Property not found', { status: 404 });
    }

    if (isCustomRequest) {
      // Δημιουργία αιτήματος προβολής με προτεινόμενη ημερομηνία
      const viewingRequest = await prisma.viewingRequest.create({
        data: {
          propertyId,
          buyerId: session.user.id,
          date: new Date(customDate),
          time: customStartTime,
          endTime: customEndTime,
          status: 'PENDING_SELLER_APPROVAL',
        },
      });

      // Ειδοποίηση στον seller
      await prisma.notification.create({
        data: {
          userId: property.userId,
          title: 'Νέο Αίτημα Προβολής',
          message: `Ο χρήστης ${session.user.name} ζητά να προγραμματίσει προβολή του ακινήτου ${property.title} στις ${new Date(customDate).toLocaleDateString('el-GR')} ${customStartTime}-${customEndTime}`,
          type: 'VIEWING_REQUEST',
        },
      });

      return NextResponse.json(viewingRequest);
    } else {
      // Έλεγχος αν η διαθεσιμότητα υπάρχει και είναι διαθέσιμη
      const availability = await prisma.propertyAvailability.findUnique({
        where: { id: availabilityId },
      });

      if (!availability || !availability.isAvailable) {
        return new NextResponse('Availability not found or not available', { status: 400 });
      }

      // Δημιουργία προγραμματισμένης προβολής
      const viewingRequest = await prisma.viewingRequest.create({
        data: {
          propertyId,
          buyerId: session.user.id,
          date: availability.date,
          time: availability.startTime,
          endTime: availability.endTime,
          status: 'SCHEDULED',
        },
      });

      // Ενημέρωση διαθεσιμότητας
      await prisma.propertyAvailability.update({
        where: { id: availabilityId },
        data: { isAvailable: false },
      });

      // Ειδοποίηση στον seller
      await prisma.notification.create({
        data: {
          userId: property.userId,
          title: 'Νέα Προγραμματισμένη Προβολή',
          message: `Ο χρήστης ${session.user.name} προγραμμάτισε προβολή του ακινήτου ${property.title} στις ${availability.date.toLocaleDateString('el-GR')} ${availability.startTime}-${availability.endTime}`,
          type: 'VIEWING_SCHEDULED',
        },
      });

      return NextResponse.json(viewingRequest);
    }
  } catch (error) {
    console.error('Error scheduling viewing:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 