import { NextResponse } from 'next/server';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Βρες τον χρήστη με το email
    const user = await User.findOne({ email: email.toUpperCase() });
    if (!user) {
      return NextResponse.json({ error: 'Λανθασμένα στοιχεία σύνδεσης' }, { status: 401 });
    }

    // Έλεγχος του password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Λανθασμένα στοιχεία σύνδεσης' }, { status: 401 });
    }

    // Δημιούργη το JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'Agapao_ton_stivo05',
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.' },
      { status: 500 }
    );
  }
} 