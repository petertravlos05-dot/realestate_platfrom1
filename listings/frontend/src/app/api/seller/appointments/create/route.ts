import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' }, { status: 401 });
    }

    const { propertyId, buyerId, date, time, notes } = await req.json();

    // Έλεγχος αν το ακίνητο ανήκει στον seller
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        userId: session.user.id
      },
      include: {
        user: true
      }
    });

    if (!property) {
      return NextResponse.json({ error: 'Το ακίνητο δεν βρέθηκε ή δεν ανήκει σε εσάς' }, { status: 404 });
    }

    // Έλεγχος αν ο buyer υπάρχει
    const buyer = await prisma.user.findUnique({
      where: { id: buyerId }
    });

    if (!buyer) {
      return NextResponse.json({ error: 'Ο αγοραστής δεν βρέθηκε' }, { status: 404 });
    }

    // Δημιουργία του ραντεβού
    const appointment = await prisma.viewingRequest.create({
      data: {
        propertyId,
        buyerId,
        date: new Date(date),
        time,
        endTime: time,
        status: 'PENDING'
      },
      include: {
        property: true,
        buyer: true
      }
    });

    // Δημιουργία ειδοποίησης για τον seller
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: 'SELLER_APPOINTMENT',
        title: 'Νέο Ραντεβού',
        message: `Δημιουργήθηκε νέο ραντεβού για το ακίνητό σας "${property.title}" με τον χρήστη ${buyer.name} στις ${date} στις ${time}`,
        propertyId: propertyId,
        metadata: {
          appointmentId: appointment.id,
          buyerName: buyer.name,
          propertyTitle: property.title,
          date,
          time,
          recipient: 'seller'
        }
      }
    });

    // Δημιουργία ειδοποίησης για τον buyer
    await prisma.notification.create({
      data: {
        userId: buyerId,
        type: 'APPOINTMENT_CREATED',
        title: 'Νέο Ραντεβού',
        message: `Δημιουργήθηκε ραντεβού για το ακίνητο "${property.title}" στις ${date} στις ${time}`,
        propertyId: propertyId,
        metadata: {
          appointmentId: appointment.id,
          propertyTitle: property.title,
          date,
          time
        }
      }
    });

    return NextResponse.json({ 
      message: 'Το ραντεβού δημιουργήθηκε με επιτυχία',
      appointment
    });

  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Σφάλμα κατά τη δημιουργία του ραντεβού' }, { status: 500 });
  }
} 