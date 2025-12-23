import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Μη εξουσιοδοτημένη πρόσβαση' },
        { status: 401 }
      );
    }

    // Δημιουργούμε το JWT token από το NextAuth session
    const token = jwt.sign(
      {
        userId: session.user.id,
        email: session.user.email,
        role: (session.user as any).role,
      },
      process.env.JWT_SECRET || 'Agapao_ton_stivo05',
      { expiresIn: '7d' }
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Προέκυψε κάποιο σφάλμα' },
      { status: 500 }
    );
  }
}







