import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { name, email, password, adminKey } = await req.json();

    // Έλεγχος για κενά πεδία
    if (!name || !email || !password || !adminKey) {
      return NextResponse.json(
        { message: 'Όλα τα πεδία είναι υποχρεωτικά' },
        { status: 400 }
      );
    }

    // Έλεγχος του admin key
    if (adminKey !== process.env.NEXT_PUBLIC_ADMIN_KEY) {
      return NextResponse.json(
        { message: 'Μη έγκυρο κλειδί διαχειριστή' },
        { status: 401 }
      );
    }

    // Έλεγχος αν υπάρχει ήδη χρήστης με το ίδιο email
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Υπάρχει ήδη χρήστης με αυτό το email' },
        { status: 400 }
      );
    }

    // Κρυπτογράφηση κωδικού
    const hashedPassword = await hash(password, 12);

    // Δημιουργία admin χρήστη
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'admin'
      }
    });

    // Αφαίρεση του κωδικού από την απάντηση
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { message: 'Επιτυχής εγγραφή διαχειριστή', user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in admin registration:', error);
    return NextResponse.json(
      { message: 'Σφάλμα κατά την εγγραφή' },
      { status: 500 }
    );
  }
} 