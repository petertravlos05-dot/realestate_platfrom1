import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateJwtToken } from '@/middleware';

export async function POST(
  request: Request,
  { params }: { params: { property_id: string } }
) {
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
      return NextResponse.json(
        { error: 'Μη εξουσιοδοτημένη πρόσβαση' },
        { status: 401 }
      );
    }

    const { property_id } = params;

    // Έλεγχος αν το ακίνητο υπάρχει
    const property = await prisma.property.findUnique({
      where: { id: property_id },
      include: { user: true }
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Το ακίνητο δεν βρέθηκε' },
        { status: 404 }
      );
    }

    // Έλεγχος αν ο χρήστης έχει ήδη εκδηλώσει ενδιαφέρον
    const existingLead = await prisma.propertyLead.findFirst({
      where: {
        propertyId: property_id,
        buyerId: userId,
        interestCancelled: false
      }
    });

    if (existingLead) {
      return NextResponse.json(
        { error: 'Έχετε ήδη εκδηλώσει ενδιαφέρον για αυτό το ακίνητο' },
        { status: 400 }
      );
    }

    // Δημιουργία νέου lead
    const lead = await prisma.propertyLead.create({
      data: {
        propertyId: property_id,
        buyerId: userId,
        status: 'PENDING'
      },
      include: {
        property: true,
        buyer: true
      }
    });

    // Δημιουργία ειδοποίησης για τον buyer
    await prisma.notification.create({
      data: {
        userId: userId,
        type: 'INTERESTED',
        title: 'Εκδήλωση Ενδιαφέροντος',
        message: `✅ Η εκδήλωση ενδιαφέροντος καταχωρήθηκε με επιτυχία!`,
        propertyId: property_id,
        metadata: {
          leadId: lead.id,
          shouldOpenModal: false
        }
      }
    });

    // Δημιουργία ειδοποίησης για τον πωλητή (SELLER_INTEREST)
    console.log('=== DEBUG: Creating SELLER_INTEREST notification ===');
    console.log('Property userId:', property.userId);
    console.log('Property title:', property.title);
    console.log('Buyer name:', lead.buyer.name);
    
    const sellerNotification = await prisma.notification.create({
      data: {
        userId: property.userId,
        type: 'SELLER_INTEREST',
        title: 'Νέο Ενδιαφέρον',
        message: `Ο χρήστης ${lead.buyer.name} ενδιαφέρθηκε για το ακίνητό σας "${property.title}"`,
        propertyId: property_id,
        metadata: {
          leadId: lead.id,
          propertyId: property_id,
          buyerId: userId,
          buyerName: lead.buyer.name,
          propertyTitle: property.title,
          recipient: 'seller'
        }
      }
    });
    
    console.log('=== DEBUG: SELLER_INTEREST notification created ===');
    console.log('Notification ID:', sellerNotification.id);
    console.log('Notification userId:', sellerNotification.userId);
    console.log('Notification type:', sellerNotification.type);

    // Έλεγχος αν υπάρχει ήδη transaction
    let transaction = await prisma.transaction.findFirst({
      where: {
        propertyId: property_id,
        buyerId: userId,
        status: { not: 'CANCELLED' }
      }
    });

    if (!transaction) {
      // Έλεγχος αν υπάρχει ακυρωμένο transaction
      const cancelledTransaction = await prisma.transaction.findFirst({
        where: {
          propertyId: property_id,
          buyerId: userId,
          status: 'CANCELLED',
          interestCancelled: true
        }
      });
      
      if (cancelledTransaction) {
        // Επαναφορά του ακυρωμένου transaction
        let agentId = null;
        if (property.user) {
          agentId = property.user.id;
        }
        
        transaction = await prisma.transaction.update({
          where: { id: cancelledTransaction.id },
          data: {
            status: 'INTERESTED',
            stage: 'PENDING',
            interestCancelled: false,
            agentId: agentId ?? null,
            leadId: lead.id
          }
        });
        console.log('✅ Restored cancelled transaction:', {
          id: transaction.id,
          status: transaction.status,
          stage: transaction.stage,
          interestCancelled: transaction.interestCancelled
        });
        
        // Ενημερώνουμε το lead με το transaction ID
        await prisma.propertyLead.update({
          where: { id: lead.id },
          data: { transactionId: transaction.id }
        });
        console.log('✅ Lead updated with restored transaction ID:', lead.id);
        
        // Δημιουργούμε progress entry για την επαναφορά
        await prisma.transactionProgress.create({
          data: {
            transactionId: transaction.id,
            stage: 'PENDING',
            notes: 'Η συναλλαγή επαναφέρθηκε από τον αγοραστή',
            createdById: userId
          }
        });
        
        // Ενημερώνουμε και το τελευταίο progress entry ώστε να εμφανίζει το σωστό στάδιο
        const lastProgress = await prisma.transactionProgress.findFirst({
          where: { transactionId: transaction.id },
          orderBy: { createdAt: 'desc' }
        });
        
        if (lastProgress && lastProgress.stage === 'CANCELLED') {
          await prisma.transactionProgress.update({
            where: { id: lastProgress.id },
            data: {
              stage: 'PENDING',
              notes: 'Η συναλλαγή επαναφέρθηκε από τον αγοραστή'
            }
          });
        }
        
      } else {
        // Δημιουργία νέου transaction
        let agentId = null;
        if (property.user) {
          agentId = property.user.id;
        }
        
        transaction = await prisma.transaction.create({
          data: {
            propertyId: property_id,
            buyerId: userId,
            agentId: agentId ?? null,
            status: 'INTERESTED',
            stage: 'PENDING',
            leadId: lead.id
          }
        });
        console.log('✅ Created new transaction:', transaction.id);

        // Ενημερώνουμε το lead με το transaction ID
        await prisma.propertyLead.update({
          where: { id: lead.id },
          data: { transactionId: transaction.id }
        });
        console.log('✅ Lead updated with new transaction ID:', lead.id);
      }
    }

    return NextResponse.json({ 
      message: 'Το ενδιαφέρον σας καταγράφηκε με επιτυχία',
      lead,
      transaction
    });

  } catch (error) {
    console.error('Error expressing interest:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την εκδήλωση ενδιαφέροντος' },
      { status: 500 }
    );
  }
} 