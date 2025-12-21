import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateId } from '@/lib/utils/id';
import { generateOTP } from '@/lib/utils/otp';
import { sendOtpEmail, sendOtpSms } from '@/lib/utils/send-otp';
import { validateJwtToken } from '@/middleware';
import { UserRole } from '@/lib/auth';

// Ορίζουμε το TransactionStage enum
const TransactionStage = {
  PENDING: 'PENDING',
  MEETING_SCHEDULED: 'MEETING_SCHEDULED',
  DEPOSIT_PAID: 'DEPOSIT_PAID',
  FINAL_SIGNING: 'FINAL_SIGNING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const;

interface PropertyLead {
  id: string;
  propertyId: string;
  buyerId: string;
  agentId: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, propertyId, buyerName, buyerEmail, buyerPhone, otpMethod } = body;

    // --- ΣΕΝΑΡΙΟ 1: Ο ΑΓΟΡΑΣΤΗΣ ΕΙΝΑΙ ΣΥΝΔΕΔΕΜΕΝΟΣ (ΚΛΗΣΗ ΑΠΟ ConfirmAgentConnectionModal) ---
    if (!buyerEmail && !buyerName) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const buyerId = session.user.id;

      // Έλεγχος αν ο χρήστης είναι ο ιδιοκτήτης του ακινήτου
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { userId: true }
      });

      if (property && property.userId === buyerId) {
        return NextResponse.json(
          { error: 'Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς' },
          { status: 400 }
        );
      }

      // Έλεγχος αν υπάρχει ήδη σύνδεση
      const existingConnection = await prisma.buyerAgentConnection.findFirst({
        where: { buyerId, agentId, propertyId },
      });

      if (existingConnection) {
        return NextResponse.json({ error: 'Connection already exists' }, { status: 400 });
      }

      // Δημιουργία της σύνδεσης απευθείας, χωρίς OTP
      const connection = await prisma.buyerAgentConnection.create({
        data: {
          buyerId,
          agentId,
          propertyId,
          status: 'CONFIRMED', // Απευθείας επιβεβαίωση
        },
      });

      // Δημιουργία PropertyLead και Transaction για την απευθείας σύνδεση
      const lead = await prisma.propertyLead.create({
          data: {
              propertyId: connection.propertyId,
              buyerId: connection.buyerId,
              agentId: connection.agentId,
              status: 'PENDING',
              notes: 'Connection established directly by buyer.',
          },
      });

      const propertyDetails = await prisma.property.findUnique({
          where: { id: connection.propertyId },
          select: { userId: true, title: true }
      });

      if (propertyDetails) {
          const transaction = await prisma.transaction.create({
              data: {
                  buyerId: connection.buyerId,
                  agentId: connection.agentId,
                  propertyId: connection.propertyId,
                  sellerId: propertyDetails.userId,
                  status: 'PRE_DEPOSIT',
                  stage: 'PENDING',
                  leadId: lead.id,
              },
          });

                // Δημιουργία ειδοποίησης στον seller για νέο ενδιαφέρον
      const buyer = await prisma.user.findUnique({
          where: { id: connection.buyerId },
          select: { name: true, email: true }
      });

      if (buyer) {
          await prisma.notification.create({
              data: {
                  userId: propertyDetails.userId,
                  title: 'Νέο Ενδιαφέρον',
                  message: `Ο ${buyer.name} (${buyer.email}) συνδέθηκε με μεσίτη και ενδιαφέρεται για το ακίνητό σας "${propertyDetails.title}".`,
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

          // Δημιουργία ειδοποίησης στον agent για νέα σύνδεση
          await prisma.notification.create({
              data: {
                  userId: connection.agentId,
                  title: 'Νέα Σύνδεση με Αγοραστή',
                  message: `Ο χρήστης ${buyer.name} αποδέχθηκε να συνδεθεί μαζί σας για το ακίνητο "${propertyDetails.title}".`,
                  type: 'AGENT_CLIENT_CONNECTION',
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
      }
      }

      return NextResponse.json({ success: true, connection });
    }

    // --- ΣΕΝΑΡΙΟ 2: Ο ΜΕΣΙΤΗΣ ΠΡΟΣΘΕΤΕΙ ΕΝΔΙΑΦΕΡΟΜΕΝΟ (ΚΛΗΣΗ ΑΠΟ AddInterestedBuyerModal) ---
    if (!agentId || !propertyId || !buyerName || !buyerEmail) {
      return NextResponse.json({ error: 'Missing required fields for new lead' }, { status: 400 });
    }

    // Βρίσκουμε ή δημιουργούμε τον buyer με βάση το email
    let buyer = await prisma.user.findUnique({ where: { email: buyerEmail } });
    if (!buyer) {
      buyer = await prisma.user.create({
        data: {
          name: buyerName,
          email: buyerEmail,
          phone: buyerPhone || '',
          role: UserRole.BUYER,
          password: 'lead-' + Date.now(), // placeholder
        },
      });
    }

    // Έλεγχος αν ο buyer είναι ο ιδιοκτήτης του ακινήτου
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { userId: true }
    });

    if (property && property.userId === buyer.id) {
      return NextResponse.json(
        { error: 'Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς' },
        { status: 400 }
      );
    }

    // Έλεγχος αν υπάρχει ήδη σύνδεση
    const existingConnection = await prisma.buyerAgentConnection.findFirst({
      where: {
        buyerId: buyer.id,
        agentId,
        propertyId,
      },
    });

    if (existingConnection) {
      return NextResponse.json({ error: 'Connection already exists' }, { status: 400 });
    }

    // Δημιουργία νέας σύνδεσης σε κατάσταση pending
    const connection = await prisma.buyerAgentConnection.create({
      data: {
        buyerId: buyer.id,
        agentId,
        propertyId,
        status: 'PENDING',
      },
    });

    // Δημιουργία και αποστολή OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 λεπτά

    await prisma.buyerAgentConnection.update({
      where: { id: connection.id },
      data: { otpCode: otp, otpExpires },
    });

    if (otpMethod === 'email') {
      await sendOtpEmail(buyerEmail, otp);
    } else if (otpMethod === 'sms' && buyerPhone) {
      await sendOtpSms(buyerPhone, otp);
    }

    // Επιστρέφουμε τα δεδομένα για το βήμα του OTP
    return NextResponse.json({
      connectionId: connection.id,
      buyerId: buyer.id,
      agentId,
      propertyId,
    });

  } catch (error) {
    console.error('Error creating buyer-agent connection:', error);
    if (error instanceof Error && error.message.includes('PROPERTY_ALREADY_VIEWED')) {
        return NextResponse.json({ error: 'PROPERTY_ALREADY_VIEWED', message: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 