import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function PUT(request: Request) {
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
        return NextResponse.json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' }, { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Agapao_ton_stivo05') as { userId: string };
        userId = decoded.userId;
      } catch (error) {
        return NextResponse.json({ error: 'Μη έγκυρο token' }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' }, { status: 401 });
    }

    const { role } = await request.json();

    // Ενημέρωση του ρόλου στη βάση δεδομένων
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role.toUpperCase() }
    });

    // Δημιουργία νέου JWT token
    const newToken = jwt.sign(
      { 
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role 
      },
      process.env.JWT_SECRET || 'Agapao_ton_stivo05',
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      token: newToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: 'Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.' },
      { status: 500 }
    );
  }
} 