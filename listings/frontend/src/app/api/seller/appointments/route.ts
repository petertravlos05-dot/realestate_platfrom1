import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  try {
    // Πρώτα δοκιμάζουμε να πάρουμε το session από next-auth
    let session = await getServerSession(authOptions);
    let userId;
    let userRole;

    if (session?.user?.id) {
      userId = session.user.id;
      userRole = session.user.role;
    } else {
      // Αν δεν υπάρχει session, δοκιμάζουμε να πάρουμε το JWT token
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' }, { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Agapao_ton_stivo05') as { userId: string; role: string };
        userId = decoded.userId;
        userRole = decoded.role;
      } catch (error) {
        return NextResponse.json({ error: 'Μη έγκυρο token' }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' }, { status: 401 });
    }

    // Βρες όλα τα ακίνητα του seller
    const properties = await prisma.property.findMany({
      where: { userId: userId },
      select: { id: true, title: true, price: true, city: true }
    });
    const propertyIds = properties.map(p => p.id);
    console.log('propertyIds:', propertyIds);

    // --- ΝΕΟ: πάρε τα query params ---
    const { searchParams } = new URL(req.url);
    const buyerId = searchParams.get('buyerId');
    const propertyId = searchParams.get('propertyId');

    // --- ΝΕΟ: φτιάξε where object ---
    let where: any = { propertyId: { in: propertyIds } };
    if (buyerId) where.buyerId = buyerId;
    if (propertyId) where.propertyId = propertyId;

    // Βρες όλα τα ViewingRequests για αυτά τα ακίνητα (με φίλτρο αν υπάρχουν params)
    const viewingRequests = await prisma.viewingRequest.findMany({
      where,
      include: {
        property: true,
        buyer: true,
      },
      orderBy: { date: 'desc' }
    });
    console.log('viewingRequests:', viewingRequests);
    return NextResponse.json({ appointments: viewingRequests });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 