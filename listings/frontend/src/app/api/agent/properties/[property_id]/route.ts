import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export async function GET(
  request: Request,
  { params }: { params: { property_id: string } }
) {
  try {
    // 1. Προσπάθησε να πάρεις session (web)
    let session = await getServerSession(authOptions);
    let userId = session?.user?.id;
    let userRole = session?.user?.role;

    // 2. Αν δεν υπάρχει session, δοκίμασε JWT token (mobile)
    if (!session?.user) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Agapao_ton_stivo05') as { userId: string; role: string };
          userId = decoded.userId;
          userRole = decoded.role;
        } catch (err) {
          return NextResponse.json(
            { error: 'Μη έγκυρο JWT token' },
            { status: 401 }
          );
        }
      }
    }

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Μη εξουσιοδοτημένη πρόσβαση' },
        { status: 401 }
      );
    }

    // Έλεγχος αν ο χρήστης είναι agent
    /* if (userRole !== UserRole.AGENT) {
      return NextResponse.json(
        { error: 'Μη εξουσιοδοτημένη πρόσβαση - Απαιτείται ρόλος AGENT' },
        { status: 403 }
      );
    } */

    const property = await prisma.property.findUnique({
      where: { id: params.property_id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        stats: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Το ακίνητο δεν βρέθηκε' },
        { status: 404 }
      );
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση του ακινήτου' },
      { status: 500 }
    );
  }
} 