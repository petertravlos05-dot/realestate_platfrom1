import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateJwtToken } from '@/middleware';

export async function POST(request: NextRequest) {
  try {
    console.log('=== API: Stage completion notification endpoint called ===');
    
    // Έλεγχος authentication
    let isAuthorized = false;
    let userRole: string | undefined;

    // Πρώτα δοκιμάζουμε το JWT token (για το mobile app)
    const jwtUser = await validateJwtToken(request as any);
    if (jwtUser) {
      isAuthorized = jwtUser.role === 'admin';
      userRole = jwtUser.role;
    } else {
      // Αν δεν υπάρχει JWT token, δοκιμάζουμε το session (για web)
      const session = await getServerSession(authOptions);
      if (session?.user) {
        isAuthorized = session.user.role === 'admin';
        userRole = session.user.role;
      }
    }

    console.log('=== API: Authentication check ===', {
      isAuthorized,
      userRole,
      hasJwtUser: !!jwtUser,
      hasSession: !jwtUser
    });
    
    if (!isAuthorized) {
      console.log('=== API: Unauthorized access ===');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId, stage, sellerId, message } = await request.json();

    if (!propertyId || !stage || !sellerId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Βρίσκουμε τον seller με βάση το email ή ID
    let seller;
    console.log('=== API: Looking for seller ===', { sellerId });
    
    if (sellerId.includes('@')) {
      // Αν είναι email
      console.log('=== API: Searching by email ===', { email: sellerId });
      seller = await prisma.user.findUnique({
        where: { email: sellerId }
      });
    } else {
      // Αν είναι ID
      console.log('=== API: Searching by ID ===', { id: sellerId });
      seller = await prisma.user.findUnique({
        where: { id: sellerId }
      });
    }

    console.log('=== API: Seller search result ===', {
      found: !!seller,
      seller: seller ? {
        id: seller.id,
        email: seller.email,
        name: seller.name,
        role: seller.role
      } : null
    });

    if (!seller) {
      console.log('=== API: Seller not found ===');
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    console.log('=== Creating stage completion notification ===', {
      propertyId,
      stage,
      sellerId: seller.id,
      message
    });

    // Δημιουργία ειδοποίησης για τον seller
    const notification = await prisma.notification.create({
      data: {
        title: 'Ολοκλήρωση Σταδίου',
        message: message,
        type: 'STAGE_UPDATE',
        userId: seller.id,
        propertyId: propertyId,
        metadata: {
          stage: stage,
          shouldOpenModal: true,
          modalType: 'propertyProgress'
        }
      }
    });

    console.log('=== Stage completion notification created ===', {
      notificationId: notification.id,
      notification: notification
    });

    return NextResponse.json({ 
      success: true, 
      notificationId: notification.id 
    });

  } catch (error) {
    console.error('Error sending stage completion notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 