import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Property, PropertyProgress, Notification } from '@prisma/client';
import jwt from 'jsonwebtoken';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('=== GET Progress API Call START ===', {
    propertyId: params.id,
    timestamp: new Date().toISOString()
  });

  try {
    // Πρώτα δοκιμάζουμε να πάρουμε το session από next-auth
    const session = await getServerSession(authOptions);
    let userId;

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      // Αν δεν υπάρχει session, δοκιμάζουμε να πάρουμε το JWT token
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ Unauthorized access attempt - No token');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Agapao_ton_stivo05') as { userId: string };
        userId = decoded.userId;
      } catch (error) {
        console.log('❌ Invalid token:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    if (!userId) {
      console.log('❌ Unauthorized access attempt - No user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        progress: {
          include: {
            notifications: true
          }
        }
      }
    });

    if (!property) {
      console.log('❌ Property not found:', params.id);
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    console.log('✅ Progress fetched successfully:', {
      propertyId: property.id,
      progress: property.progress
    });

    return NextResponse.json(property.progress);
  } catch (error) {
    console.error('❌ Error fetching property progress:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('=== PUT Progress API Call START ===', {
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

    type StageType = 'legalDocuments' | 'platformReview' | 'platformAssignment' | 'listing';
    const stageType = stage as StageType;

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        progress: {
          upsert: {
            create: {
              [`${stageType}Status`]: status
            },
            update: {
              [`${stageType}Status`]: status
            }
          }
        }
      },
      include: {
        progress: true
      }
    });

    console.log('✅ Property updated successfully:', {
      propertyId: updatedProperty.id,
      status: updatedProperty.progress?.[`${stageType}Status`]
    });

    // Δημιουργία ειδοποίησης στον seller για κάθε ενημέρωση προόδου
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        user: true
      }
    });

    if (property?.userId) {
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

    return NextResponse.json(updatedProperty);
  } catch (error) {
    console.error('❌ Error updating property progress:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 