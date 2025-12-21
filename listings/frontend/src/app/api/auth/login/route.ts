import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Βρίσκουμε τον χρήστη
    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Λανθασμένο email ή κωδικός' },
        { status: 401 }
      );
    }

    // Ελέγχουμε τον κωδικό
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Λανθασμένο email ή κωδικός' },
        { status: 401 }
      );
    }

    // Δημιουργούμε το JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'Agapao_ton_stivo05',
      { expiresIn: '7d' }
    );

    // Επιστρέφουμε τα στοιχεία του χρήστη και το token
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        companyName: user.companyName,
        licenseNumber: user.licenseNumber,
        businessAddress: user.businessAddress,
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.' },
      { status: 500 }
    );
  }
} 