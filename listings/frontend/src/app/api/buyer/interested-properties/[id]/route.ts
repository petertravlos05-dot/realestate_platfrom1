import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Μη εξουσιοδοτημένη πρόσβαση' },
        { status: 401 }
      );
    }

    const propertyId = params.id;
    const buyerId = session.user.id;

    console.log(`[DELETE] Cancelling interest for property ${propertyId} by buyer ${buyerId}`);
    console.log('=== DELETE API Debug ===', {
      propertyId,
      buyerId,
      timestamp: new Date().toISOString()
    });

    // Βρες το property lead
    const propertyLead = await prisma.propertyLead.findFirst({
      where: {
        propertyId,
        buyerId,
        interestCancelled: false
      },
      include: {
        property: {
          select: {
            title: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    console.log('Property Lead found:', {
      found: !!propertyLead,
      leadId: propertyLead?.id,
      propertyTitle: propertyLead?.property?.title
    });

    if (!propertyLead) {
      console.log('No property lead found for:', { propertyId, buyerId });
      return NextResponse.json(
        { error: 'Δεν βρέθηκε ενεργό ενδιαφέρον για αυτό το ακίνητο' },
        { status: 404 }
      );
    }

    // Ενημέρωσε το property lead ως ακυρωμένο
    console.log('Updating property lead:', { leadId: propertyLead.id });
    await prisma.propertyLead.update({
      where: { id: propertyLead.id },
      data: { 
        interestCancelled: true,
        status: 'CANCELLED'
      }
    });
    console.log('Property lead updated successfully');

    // Ενημέρωσε και τα buyer-agent connections για αυτό το property
    console.log('Updating buyer-agent connections');
    const updatedConnections = await prisma.buyerAgentConnection.updateMany({
      where: {
        propertyId,
        buyerId,
        interestCancelled: false
      },
      data: {
        interestCancelled: true
      }
    });
    console.log('Buyer-agent connections updated:', { count: updatedConnections.count });

    // Βρες και ακύρωσε το transaction αν υπάρχει
    console.log('Looking for transaction');
    const transaction = await prisma.transaction.findFirst({
      where: {
        propertyId,
        buyerId,
        status: { not: 'CANCELLED' }
      }
    });
    console.log('Transaction found:', {
      found: !!transaction,
      transactionId: transaction?.id,
      status: transaction?.status,
      stage: transaction?.stage
    });

    if (transaction) {
      // Ενημέρωσε το transaction ως ακυρωμένο
      console.log('Updating transaction:', { transactionId: transaction.id });
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          status: 'CANCELLED',
          stage: 'CANCELLED',
          interestCancelled: true
        }
      });
      console.log('Transaction updated successfully');

      // Δημιούργησε progress entry για την ακύρωση
      await prisma.transactionProgress.create({
        data: {
          transactionId: transaction.id,
          stage: 'CANCELLED',
          notes: 'Η συναλλαγή ακυρώθηκε από τον αγοραστή',
          createdById: buyerId
        }
      });

      // Δημιούργησε transaction notification
      await prisma.transactionNotification.create({
        data: {
          transactionId: transaction.id,
          type: 'SYSTEM',
          message: 'Η συναλλαγή ακυρώθηκε από τον αγοραστή',
          status: 'SENT'
        }
      });

      // Δημιούργησε ειδοποίηση για τον agent αν υπάρχει
      if (transaction.agentId) {
        await prisma.notification.create({
          data: {
            userId: transaction.agentId,
            type: 'CANCELLED',
            title: 'Ακύρωση Ενδιαφέροντος',
            message: `Ο αγοραστής ${session.user.name} ακύρωσε το ενδιαφέρον του για το ακίνητο "${propertyLead.property.title}"`,
            propertyId: propertyId,
            metadata: {
              leadId: propertyLead.id,
              transactionId: transaction.id,
              shouldOpenModal: false
            }
          }
        });
      }
    }

    // Δημιούργησε ειδοποίηση για τον buyer
    await prisma.notification.create({
      data: {
        userId: buyerId,
        type: 'CANCELLED',
        title: 'Ακύρωση Ενδιαφέροντος',
        message: `Το ενδιαφέρον σας για το ακίνητο "${propertyLead.property.title}" ακυρώθηκε επιτυχώς.`,
        propertyId: propertyId,
        metadata: {
          leadId: propertyLead.id,
          transactionId: transaction?.id,
          shouldOpenModal: false
        }
      }
    });

    console.log(`✅ Interest cancelled successfully for property ${propertyId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Το ενδιαφέρον ακυρώθηκε επιτυχώς' 
    });

  } catch (error) {
    console.error('Error cancelling interest:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ακύρωση του ενδιαφέροντος' },
      { status: 500 }
    );
  }
}
