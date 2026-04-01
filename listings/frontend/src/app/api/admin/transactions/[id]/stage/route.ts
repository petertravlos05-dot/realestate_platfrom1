import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { generateId } from '@/lib/utils/id';

const VALID_STAGES = [
  'PENDING', 
  'MEETING_SCHEDULED', 
  'DEPOSIT_PAID', 
  'FINAL_SIGNING', 
  'COMPLETED', 
  'CANCELLED'
] as const;

type Stage = typeof VALID_STAGES[number];

// Regex για έλεγχο UUID και CUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID_REGEX = /^[a-z0-9]+$/i;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('=== Stage Update API Call START ===', {
      id,
      timestamp: new Date().toISOString()
    });

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { stage } = await request.json();
    const normalizedStage = stage.toUpperCase();
    
    console.log('Request data:', {
      id,
      stage,
      normalizedStage,
      isUUID: UUID_REGEX.test(id),
      isCUID: CUID_REGEX.test(id)
    });

    // Έλεγχος εγκυρότητας του ID
    if (!id || (UUID_REGEX.test(id) === false && CUID_REGEX.test(id) === false)) {
      console.log('❌ Invalid ID format:', id);
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Έλεγχος εγκυρότητας του stage
    if (!VALID_STAGES.includes(normalizedStage as Stage)) {
      console.log('❌ Invalid stage:', normalizedStage);
      console.log('Valid stages:', VALID_STAGES);
      return NextResponse.json(
        { error: `Invalid transaction stage. Must be one of: ${VALID_STAGES.join(', ')}` },
        { status: 400 }
      );
    }

    let transaction;

    // Αν το ID είναι UUID, είναι propertyLead ή connectionId
    if (UUID_REGEX.test(id)) {
      console.log('🔍 Searching for propertyLead with UUID:', id);
      const propertyLead = await prisma.propertyLead.findUnique({
        where: { id },
        include: {
          buyer: true,
          property: {
            include: {
              user: true
            }
          },
          transaction: true
        }
      });

      if (propertyLead) {
        console.log('✅ Found propertyLead:', {
          id: propertyLead.id,
          transactionId: propertyLead.transactionId,
          hasTransaction: !!propertyLead.transaction
        });

        // Αν υπάρχει ήδη transaction, το χρησιμοποιούμε
        if (propertyLead.transaction) {
          console.log('🔄 Using existing transaction:', propertyLead.transaction.id);
          transaction = propertyLead.transaction;
        } else {
          console.log('➕ Creating new transaction from propertyLead');
      // Δημιουργούμε νέα συναλλαγή από το propertyLead
      transaction = await prisma.transaction.create({
        data: {
          propertyId: propertyLead.propertyId,
          buyerId: propertyLead.buyerId,
          sellerId: propertyLead.property.userId,
          agentId: propertyLead.agentId,
              stage: normalizedStage,
              leadId: propertyLead.id
        }
      });

          console.log('✅ Created new transaction:', transaction.id);

          // Ενημερώνουμε το lead με το νέο transaction ID
          await prisma.propertyLead.update({
            where: { id: propertyLead.id },
            data: { transactionId: transaction.id }
          });
        }
      } else {
        console.log('🔍 PropertyLead not found, trying to find connection:', id);
        const connection = await prisma.buyerAgentConnection.findUnique({
          where: { id },
          include: {
            buyer: true,
            property: {
              include: {
                user: true
              }
            }
        }
      });

        if (!connection) {
          console.log('❌ Neither PropertyLead nor Connection found with ID:', id);
          return NextResponse.json({ error: 'PropertyLead or Connection not found' }, { status: 404 });
        }

        console.log('✅ Found connection:', {
          id: connection.id,
          buyerId: connection.buyerId,
          propertyId: connection.propertyId
        });

        // Δημιουργούμε νέα συναλλαγή από το connection
        transaction = await prisma.transaction.create({
          data: {
            propertyId: connection.propertyId,
            buyerId: connection.buyerId,
            sellerId: connection.property.userId,
            agentId: connection.agentId,
            stage: normalizedStage,
            leadId: connection.id
          }
      });

        console.log('✅ Created new transaction from connection:', transaction.id);
      }
    } 
    // Αν το ID είναι CUID, είναι transaction ή leadId
    else {
      console.log('🔍 Searching for transaction with CUID:', id);
      // Πρώτα προσπαθούμε να βρούμε το transaction με το ID
      transaction = await prisma.transaction.findUnique({
        where: { id }
      });

      if (transaction) {
        console.log('✅ Found transaction directly:', transaction.id);
      }

      // Αν δεν βρέθηκε transaction, προσπαθούμε να βρούμε το lead και μετά το transaction
      if (!transaction) {
        console.log('🔍 Transaction not found with ID, trying to find by leadId:', id);
        
        // Βρίσκουμε το lead
        const lead = await prisma.propertyLead.findUnique({
          where: { id },
          include: {
            transaction: true,
            property: {
              include: {
                user: true
              }
            }
          }
        });

        if (lead) {
          console.log('✅ Found lead:', {
            id: lead.id,
            transactionId: lead.transactionId,
            hasTransaction: !!lead.transaction
          });

          if (lead.transaction) {
            console.log('🔄 Using existing transaction:', lead.transaction.id);
            transaction = lead.transaction;
          } else {
            console.log('➕ Creating new transaction from lead');
            // Δημιουργούμε νέα συναλλαγή από το lead
            transaction = await prisma.transaction.create({
              data: {
                propertyId: lead.propertyId,
                buyerId: lead.buyerId,
                sellerId: lead.property.userId,
                agentId: lead.agentId,
                stage: normalizedStage,
                leadId: lead.id
              }
            });

            console.log('✅ Created new transaction:', transaction.id);

            // Ενημερώνουμε το lead με το νέο transaction ID
            await prisma.propertyLead.update({
              where: { id: lead.id },
              data: { transactionId: transaction.id }
            });
          }
        } else {
          console.log('❌ Transaction not found:', id);
          return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }
        }
      }

      // Ενημερώνουμε το stage της συναλλαγής
    console.log('🔄 Updating transaction stage:', {
      transactionId: transaction.id,
      newStage: normalizedStage
    });

      transaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
        stage: normalizedStage,
        progress: {
          create: {
          stage: normalizedStage,
            notes: `Stage updated to ${normalizedStage}`,
          createdById: session.user.id
        }
        }
      }
      });

    console.log('✅ Updated transaction:', {
      id: transaction.id,
      stage: transaction.stage
    });

    // Δημιουργούμε ειδοποίηση για τον buyer
    const buyerNotification = await prisma.notification.create({
      data: {
        id: generateId(),
        title: 'Transaction Stage Updated',
        message: `Transaction stage updated to ${normalizedStage}`,
        type: 'STAGE_UPDATE',
        isRead: false,
        userId: transaction.buyerId,
        propertyId: transaction.propertyId,
        metadata: JSON.parse(JSON.stringify({
          leadId: transaction.leadId,
          transactionId: transaction.id,
          stage: normalizedStage,
          shouldOpenModal: true
        }))
      }
    });
    console.log('✅ Created buyer notification:', buyerNotification.id);

    // Δημιουργούμε ειδοποίηση για τον agent αν υπάρχει
    if (transaction.agentId) {
      // Βρίσκουμε τα στοιχεία του buyer και του property
      const buyer = await prisma.user.findUnique({
        where: { id: transaction.buyerId },
        select: { name: true, email: true }
      });

      const property = await prisma.property.findUnique({
        where: { id: transaction.propertyId },
        select: { title: true }
      });

      // Μεταφράζουμε το στάδιο στα ελληνικά
      const stageTranslations: { [key: string]: string } = {
        'PENDING': 'Αναμονή για ραντεβού',
        'MEETING_SCHEDULED': 'Έγινε ραντεβού',
        'DEPOSIT_PAID': 'Έγινε προκαταβολή',
        'FINAL_SIGNING': 'Τελική υπογραφή',
        'COMPLETED': 'Ολοκληρώθηκε',
        'CANCELLED': 'Ακυρώθηκε'
      };

      const stageInGreek = stageTranslations[normalizedStage] || normalizedStage;
      const buyerName = buyer?.name || 'Άγνωστος ενδιαφερόμενος';
      const propertyTitle = property?.title || 'Άγνωστο ακίνητο';

      const agentNotification = await prisma.notification.create({
        data: {
          id: generateId(),
          title: 'Ενημέρωση Στάδιου Συναλλαγής',
          message: `Η συναλλαγή με τον ${buyerName} για το ακίνητο "${propertyTitle}" ενημερώθηκε σε: ${stageInGreek}`,
          type: 'AGENT_STAGE_UPDATE',
          isRead: false,
          userId: transaction.agentId,
          propertyId: transaction.propertyId,
          metadata: JSON.parse(JSON.stringify({
            leadId: transaction.leadId,
            transactionId: transaction.id,
            stage: normalizedStage,
            stageInGreek: stageInGreek,
            buyerId: transaction.buyerId,
            buyerName: buyerName,
            propertyTitle: propertyTitle,
            recipient: 'agent',
            shouldOpenModal: true
          }))
        }
      });
      console.log('✅ Created agent notification:', agentNotification.id);
    }

    console.log('=== Stage Update API Call END ===', {
      transactionId: transaction.id,
      newStage: transaction.stage,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('❌ Error updating transaction stage:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction stage' },
      { status: 500 }
    );
  }
} 