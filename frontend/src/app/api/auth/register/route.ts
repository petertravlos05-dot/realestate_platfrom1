import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '../../../../lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      email, 
      password, 
      name,
      role,
      phone,
      companyName,
      licenseNumber,
      businessAddress,
      confirmPassword,
      ...rest
    } = body;

    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία' },
        { status: 400 }
      );
    }

    // Validate password match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Οι κωδικοί δεν ταιριάζουν' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { 
          error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες',
          details: {
            password: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες'
          }
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Υπάρχει ήδη λογαριασμός με αυτό το email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user with only the fields that exist in the schema
    const userData: any = {
      email,
      password: hashedPassword,
      name,
      role: role.toUpperCase(),
    };

    // Add optional fields only if they exist in the request
    if (phone) userData.phone = phone;
    if (companyName) userData.companyName = companyName;
    if (licenseNumber) userData.licenseNumber = licenseNumber;
    if (businessAddress) userData.businessAddress = businessAddress;

    // Validate role-specific requirements
    if (role.toUpperCase() === 'SELLER' && !phone) {
      return NextResponse.json(
        { error: 'Το τηλέφωνο είναι υποχρεωτικό για τους πωλητές' },
        { status: 400 }
      );
    }

    if (role.toUpperCase() === 'AGENT' && (!licenseNumber || !phone)) {
      return NextResponse.json(
        { error: 'Ο αριθμός άδειας και το τηλέφωνο είναι υποχρεωτικά για τους μεσίτες' },
        { status: 400 }
      );
    }

    // Create user
    const user = await prisma.user.create({
      data: userData
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Η εγγραφή ολοκληρώθηκε με επιτυχία'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την εγγραφή. Παρακαλώ δοκιμάστε ξανά.' },
      { status: 500 }
    );
  }
} 