import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Property, PropertyProgress, Notification } from '@prisma/client';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('=== Progress API Call START ===', {
    propertyId: params.id,
    timestamp: new Date().toISOString()
  });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { stage, status, message } = await request.json();
    const propertyId = params.id;

    console.log('Request data:', {
      stage,
      status,
      message,
      propertyId,
      userId: session.user.id
    });

    // Βρίσκουμε το property για να πάρουμε τον seller
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        user: true,
        progress: true
      }
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    type StageType = 'legalDocuments' | 'platformReview' | 'platformAssignment' | 'listing';
    const stageType = stage as StageType;

    // Προετοιμάζουμε τα δεδομένα για την ενημέρωση
    const updateData: any = {
      [`${stageType}Status`]: status
    };

    // Αν το βήμα ολοκληρώνεται, προσθέτουμε την ημερομηνία ολοκλήρωσης
    if (status === 'completed') {
      updateData[`${stageType}CompletedAt`] = new Date();
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        progress: {
          upsert: {
            create: {
              ...updateData
            },
            update: {
              ...updateData
            }
          }
        }
      },
      include: {
        progress: true
      }
    }) as Property & { progress: PropertyProgress };

    // Δημιουργία ειδοποίησης στον seller για κάθε ενημέρωση προόδου
    if (property.userId) {
      const stageNames = {
        legalDocuments: 'Νομικά Έγγραφα',
        platformReview: 'Έλεγχος Πλατφόρμας',
        platformAssignment: 'Ανάθεση Πλατφόρμας',
        listing: 'Δημοσίευση'
      };

      const stageName = stageNames[stageType] || stageType;

      // Δημιουργία ειδοποίησης στον seller
      await prisma.notification.create({
        data: {
          userId: property.userId,
          type: status === 'completed' ? 'PROPERTY_PROGRESS_COMPLETED' : 'PROGRESS_UPDATE',
          title: status === 'completed' ? 'Ολοκλήρωση Βήματος' : 'Ενημέρωση Προόδου',
          message: status === 'completed' 
            ? `Το βήμα "${stageName}" για το ακίνητό σας "${property.title}" ολοκληρώθηκε επιτυχώς.`
            : `Το στάδιο ${stageType} ενημερώθηκε σε ${status}`,
          propertyId: propertyId,
          isRead: false,
          metadata: {
            stage: stageType,
            stageName: stageName,
            propertyTitle: property.title,
            status: status,
            recipient: 'seller'
          }
        }
      });

      console.log('✅ Seller notification created for progress update:', {
        stage: stageType,
        status: status,
        sellerId: property.userId,
        propertyTitle: property.title
      });
    }

    console.log('Property updated successfully:', {
      propertyId: updatedProperty.id,
      status: updatedProperty.progress?.[`${stageType}Status`]
    });

    return NextResponse.json(updatedProperty);
  } catch (error) {
    console.error('Error updating property progress:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}