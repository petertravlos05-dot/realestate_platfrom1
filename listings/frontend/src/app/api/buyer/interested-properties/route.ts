import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Transaction, TransactionProgress } from '@prisma/client';
import { validateJwtToken } from '@/middleware';

interface ExtendedTransaction extends Transaction {
  buyer: { 
    name: string; 
    email: string; 
    phone: string | null 
  };
  agent: { 
    name: string; 
    email: string; 
    phone: string | null 
  };
  progress: TransactionProgress[];
}

export async function GET(request: Request) {
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

    // Βρες όλα τα ενεργά leads του χρήστη
    const propertyLeads = await prisma.propertyLead.findMany({
      where: {
        buyerId: userId,
        interestCancelled: false
      },
      include: {
        property: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            },
            stats: true,
            transactions: {
              where: {
                buyerId: userId,
                OR: [
                  { NOT: { status: 'CANCELLED' } },
                  { AND: [{ status: 'CANCELLED' }, { interestCancelled: false }] }
                ]
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                buyer: { select: { name: true, email: true, phone: true } },
                agent: { select: { name: true, email: true, phone: true } },
                progress: { orderBy: { createdAt: 'desc' } }
              }
            }
          }
        }
      }
    });

    // Debug logs
    console.log('=== Buyer Interested Properties Debug ===');
    console.log('Property Leads:', propertyLeads.map(l => ({
      id: l.id,
      propertyId: l.propertyId,
      buyerId: l.buyerId,
      hasTransactions: l.property.transactions?.length > 0
    })));

    // Log transactions για κάθε property
    propertyLeads.forEach(lead => {
      console.log(`Transactions for property ${lead.propertyId}:`, 
        lead.property.transactions?.map(t => ({
          id: t.id,
          status: t.status,
          stage: t.stage,
          buyerId: t.buyerId,
          agentId: t.agentId
        }))
      );
    });

    // Log όλα τα transactions για αυτόν τον buyer
    const allBuyerTransactions = await prisma.transaction.findMany({
      where: {
        buyerId: userId,
        NOT: { status: 'CANCELLED' },
        interestCancelled: false
      }
    });
    console.log('All buyer transactions:', allBuyerTransactions.map(t => ({
      id: t.id,
      propertyId: t.propertyId,
      status: t.status,
      stage: t.stage
    })));

    const properties = propertyLeads.map(l => {
      const property = l.property as any;
      if (property.transactions && property.transactions.length > 0) {
        const transaction = property.transactions[0];
        // Βρες το πιο πρόσφατο progress
        const lastProgress = transaction.progress && transaction.progress.length > 0
          ? transaction.progress[0]
          : null;
        
        // Αν το transaction είναι ενεργό αλλά το τελευταίο progress είναι CANCELLED, 
        // εμφανίζουμε PENDING
        const effectiveStage = (lastProgress?.stage === 'CANCELLED' && transaction.status === 'INTERESTED') 
          ? 'PENDING' 
          : (lastProgress?.stage || 'PENDING');
        
        transaction.progress = lastProgress
          ? {
              stage: effectiveStage,
              updatedAt: lastProgress.updatedAt,
              notifications: transaction.progress.map((p: any) => ({
                id: p.id,
                message: p.message,
                recipient: p.recipient,
                stage: p.stage,
                category: p.category,
                createdAt: p.createdAt,
                isUnread: p.isUnread
              }))
            }
          : {
              stage: 'PENDING',
              updatedAt: transaction.updatedAt,
              notifications: []
            };
        property.transaction = transaction;
        property.agent = transaction.agent;
      }
      return property;
    });
    console.log('properties:', properties.map(p => ({ id: p.id, title: p.title })));

    return NextResponse.json({ properties });
  } catch (error) {
    console.error('Error fetching interested properties:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση των ακινήτων' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' }, { status: 401 });
    }
    const { propertyId } = await request.json();

    // Βρες το property για να πάρουμε τον τίτλο
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true }
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Το ακίνητο δεν βρέθηκε' },
        { status: 404 }
      );
    }

    // Έλεγχος αν ο χρήστης είναι ο ιδιοκτήτης του ακινήτου
    if (property.userId === session.user.id) {
      return NextResponse.json(
        { error: 'Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς' },
        { status: 400 }
      );
    }

    // Έλεγχος αν υπάρχει ήδη lead
    let lead = await prisma.propertyLead.findFirst({
      where: {
        propertyId,
        buyerId: session.user.id,
        interestCancelled: false
      }
    });
    
    // Αν δεν υπάρχει ενεργό lead, έλεγξε αν υπάρχει ακυρωμένο
    if (!lead) {
      const cancelledLead = await prisma.propertyLead.findFirst({
        where: {
          propertyId,
          buyerId: session.user.id,
          interestCancelled: true
        }
      });
      
      if (cancelledLead) {
        // Επαναφορά του ακυρωμένου lead
        lead = await prisma.propertyLead.update({
          where: { id: cancelledLead.id },
          data: {
            interestCancelled: false,
            status: 'PENDING'
          }
        });
        console.log('✅ Restored cancelled lead:', lead.id);
      } else {
        // Δημιουργία νέου lead
        lead = await prisma.propertyLead.create({
          data: {
            propertyId,
            buyerId: session.user.id,
            status: 'PENDING'
          }
        });
        console.log('✅ Created new lead:', lead.id);
      }
    }

    // Δημιουργούμε ειδοποίηση για τον buyer
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: 'INTERESTED',
        title: 'Εκδήλωση Ενδιαφέροντος',
        message: `✅ Η εκδήλωση ενδιαφέροντος καταχωρήθηκε με επιτυχία!`,
        propertyId: propertyId,
        metadata: {
          leadId: lead.id,
          shouldOpenModal: false
        }
      }
    });
    console.log('✅ Notification created for buyer');

    // Έλεγχος αν υπάρχει ήδη ενεργό transaction
    let transaction = await prisma.transaction.findFirst({
      where: {
        propertyId,
        buyerId: session.user.id,
        status: { not: 'CANCELLED' }
      }
    });
    
    // Αν δεν υπάρχει ενεργό transaction, έλεγξε αν υπάρχει ακυρωμένο
    if (!transaction) {
      const cancelledTransaction = await prisma.transaction.findFirst({
        where: {
          propertyId,
          buyerId: session.user.id,
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
          interestCancelled: transaction.interestCancelled,
          buyerId: transaction.buyerId,
          propertyId: transaction.propertyId
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
            createdById: session.user.id
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
        
        try {
          transaction = await prisma.transaction.create({
            data: {
              propertyId,
              buyerId: session.user.id,
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
        } catch (err) {
          console.error('❌ Error creating transaction:', err);
        }
      }
    }

    // Δημιουργούμε ειδοποίηση για τον agent αν υπάρχει
    if (transaction?.agentId) {
      await prisma.notification.create({
        data: {
          userId: transaction.agentId,
          type: 'INTERESTED',
          title: 'Νέο Ενδιαφέρον',
          message: `Ο χρήστης ${session.user.name} εκδήλωσε ενδιαφέρον για το ακίνητο "${property.title}"`,
          propertyId: propertyId,
          metadata: {
            leadId: lead.id,
            transactionId: transaction.id,
            shouldOpenModal: false
          }
        }
      });
      console.log('✅ Notification created for agent');
    }

    return NextResponse.json({ success: true, lead, transaction });
  } catch (error) {
    console.error('Error expressing interest:', error);
    return NextResponse.json({ error: 'Σφάλμα κατά την εκδήλωση ενδιαφέροντος' }, { status: 500 });
  }
} 