import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateJwtToken } from '@/middleware';
import { generateId } from '@/lib/utils/id';

export async function POST(request: Request) {
  try {
    // Πρώτα δοκιμάζουμε το JWT token (για το mobile app)
    const jwtUser = await validateJwtToken(request as any);
    let userId: string | undefined;

    if (jwtUser) {
      // Αν έχουμε έγκυρο JWT token, χρησιμοποιούμε το userId από αυτό
      userId = jwtUser.userId;
    } else {
      // Αλλιώς δοκιμάζουμε το next-auth session (για το web app)
    const session = await getServerSession(authOptions);
      userId = session?.user?.id;
    }

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { buyerId, agentId, propertyId, otpCode } = await request.json();

    // Ελέγχουμε αν υπάρχει ήδη connection για αυτά τα στοιχεία
    let connection = await prisma.buyerAgentConnection.findFirst({
      where: {
        buyerId,
        agentId,
        propertyId,
      },
    });

    // Αν δεν υπάρχει, δημιουργούμε νέο connection με το otpCode
    if (!connection) {
      const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 λεπτά
      connection = await prisma.buyerAgentConnection.create({
        data: {
          buyerId,
          agentId,
          propertyId,
          status: 'PENDING',
          otpCode,
          otpExpires,
        },
      });
    }

    // Έλεγχος αν το OTP έχει λήξει
    if (!connection.otpExpires || connection.otpExpires < new Date()) {
      return NextResponse.json({ message: 'OTP has expired' }, { status: 400 });
    }

    // Έλεγχος αν το OTP είναι σωστό
    if (connection.otpCode !== otpCode) {
      return NextResponse.json({ message: 'Invalid OTP' }, { status: 400 });
    }

    // Ενημέρωση της κατάστασης της σύνδεσης
    const updatedConnection = await prisma.buyerAgentConnection.update({
      where: { id: connection.id },
      data: {
        status: 'CONFIRMED',
        otpCode: null, // Καθαρίζουμε το OTP μετά την επιτυχή επαλήθευση
        otpExpires: null,
      },
    });

    // Δημιουργία PropertyLead
    const leadId = generateId();
    const lead = await prisma.propertyLead.create({
      data: {
        id: leadId,
        propertyId: connection.propertyId,
        buyerId: connection.buyerId,
        agentId: connection.agentId,
        status: 'PENDING',
        notes: 'Initial connection established',
      },
    });

    // Βρίσκουμε το sellerId από το property
    const property = await prisma.property.findUnique({
      where: { id: connection.propertyId },
      select: { userId: true }
    });
    if (!property) {
      throw new Error('Property not found');
    }

    // Δημιουργία συναλλαγής
    const transactionId = generateId();
    const transaction = await prisma.transaction.create({
      data: {
        id: transactionId,
        buyerId: connection.buyerId,
        agentId: connection.agentId,
        propertyId: connection.propertyId,
        sellerId: property.userId,
        status: 'PRE_DEPOSIT',
        stage: 'PENDING',
        leadId: leadId,
      },
    });

    // Ενημέρωση PropertyStats
    const statsId = generateId();
    await prisma.propertyStats.upsert({
      where: { propertyId: connection.propertyId },
      create: {
        id: statsId,
        propertyId: connection.propertyId,
        views: 1,
        interestedCount: 1,
        viewingCount: 0,
        lastViewed: new Date(),
      },
      update: {
        interestedCount: { increment: 1 },
        lastViewed: new Date(),
      },
    });

    // Δημιουργία ειδοποίησης στον seller για νέο ενδιαφέρον
    const buyer = await prisma.user.findUnique({
      where: { id: connection.buyerId },
      select: { name: true, email: true }
    });

    const propertyDetails = await prisma.property.findUnique({
      where: { id: connection.propertyId },
      select: { title: true, userId: true }
    });

    if (propertyDetails && buyer) {
      await prisma.notification.create({
        data: {
          userId: propertyDetails.userId,
          title: 'Νέο Ενδιαφέρον',
          message: `Ο μεσίτης πρόσθεσε τον ${buyer.name} (${buyer.email}) ως ενδιαφερόμενο για το ακίνητό σας "${propertyDetails.title}".`,
          type: 'PROPERTY_INTEREST',
          propertyId: connection.propertyId,
          metadata: {
            leadId: lead.id,
            transactionId: transaction.id,
            buyerId: connection.buyerId,
            agentId: connection.agentId,
            buyerName: buyer.name,
            buyerEmail: buyer.email,
            recipient: 'seller',
            shouldOpenModal: true
          }
        },
      });

      // Δημιουργία ειδοποίησης στον agent για επιτυχημένη προσθήκη ενδιαφερόμενου
      await prisma.notification.create({
        data: {
          userId: connection.agentId,
          title: 'Επιτυχημένη Προσθήκη Ενδιαφερόμενου',
          message: `Προσθέσατε επιτυχώς τον ${buyer.name} (${buyer.email}) ως ενδιαφερόμενο για το ακίνητο "${propertyDetails.title}".`,
          type: 'AGENT_LEAD_ADDED',
          propertyId: connection.propertyId,
          metadata: {
            leadId: lead.id,
            transactionId: transaction.id,
            buyerId: connection.buyerId,
            agentId: connection.agentId,
            buyerName: buyer.name,
            buyerEmail: buyer.email,
            propertyTitle: propertyDetails.title,
            recipient: 'agent',
            shouldOpenModal: true
          }
        },
      });

      // Δημιουργία ειδοποίησης στον buyer για επιτυχημένη σύνδεση με agent
      await prisma.notification.create({
        data: {
          userId: connection.buyerId,
          title: 'Επιτυχής Σύνδεση με Μεσίτη',
          message: `✅ Η σύνδεσή σας με τον μεσίτη ολοκληρώθηκε με επιτυχία!`,
          type: 'INTERESTED',
          propertyId: connection.propertyId,
          metadata: {
            leadId: lead.id,
            transactionId: transaction.id,
            shouldOpenModal: false
          }
        },
      });
    }

    return NextResponse.json({
      message: 'OTP verified successfully',
      connection: updatedConnection,
      lead,
      transaction,
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 