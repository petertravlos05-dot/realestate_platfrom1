import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// Χρησιμοποιούμε ένα global instance του PrismaClient
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Request body:', body); // Προσθήκη logging

    const { 
      email, 
      password, 
      name,
      role,
      phone,
      companyName,
      companyTitle,
      companyTaxId,
      companyDou,
      companyPhone,
      companyEmail,
      companyHeadquarters,
      companyWebsite,
      companyWorkingHours,
      contactPersonName,
      contactPersonEmail,
      contactPersonPhone,
      companyLogo,
      licenseNumber,
      businessAddress,
      userType,
      confirmPassword,
      ...rest
    } = body;

    // Validate required fields
    if (!email || !password || !name || !role) {
      console.log('Missing required fields'); // Προσθήκη logging
      return NextResponse.json(
        { error: 'Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία' },
        { status: 400 }
      );
    }

    // Validate password match
    if (password !== confirmPassword) {
      console.log('Password validation failed:', {
        password,
        confirmPassword,
        match: password === confirmPassword
      });
      return NextResponse.json(
        { error: 'Οι κωδικοί δεν ταιριάζουν' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('Existing user found:', { id: existingUser.id, hasPassword: !!existingUser.password });
      // Ενημερώνουμε τον υπάρχοντα χρήστη με το νέο password
      const hashedPassword = await hash(password, 12);
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword }
      });
      const { password: _, ...userWithoutPassword } = updatedUser;
      return NextResponse.json({
        user: userWithoutPassword,
        message: 'Η εγγραφή ολοκληρώθηκε με επιτυχία'
      });
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user with only the fields that exist in the schema
    const userData = {
      email,
      password: hashedPassword,
      name,
      role: role.toUpperCase(),
      ...(phone && { phone }),
      ...(companyName && { companyName }),
      ...(companyTitle && { companyTitle }),
      ...(companyTaxId && { companyTaxId }),
      ...(companyDou && { companyDou }),
      ...(companyPhone && { companyPhone }),
      ...(companyEmail && { companyEmail }),
      ...(companyHeadquarters && { companyHeadquarters }),
      ...(companyWebsite && { companyWebsite }),
      ...(companyWorkingHours && { companyWorkingHours }),
      ...(contactPersonName && { contactPersonName }),
      ...(contactPersonEmail && { contactPersonEmail }),
      ...(contactPersonPhone && { contactPersonPhone }),
      ...(companyLogo && { companyLogo }),
      ...(licenseNumber && { licenseNumber }),
      ...(businessAddress && { businessAddress }),
      ...(userType && { userType: userType.toUpperCase() })
    };

    console.log('Creating user with data:', { ...userData, password: '[HIDDEN]' }); // Προσθήκη logging

    // Validate role-specific requirements
    if (role.toUpperCase() === 'SELLER' && !phone) {
      console.log('Missing phone for seller'); // Προσθήκη logging
      return NextResponse.json(
        { error: 'Το τηλέφωνο είναι υποχρεωτικό για τους πωλητές' },
        { status: 400 }
      );
    }

    // For individual users, validate basic fields
    if (userType && userType.toUpperCase() === 'INDIVIDUAL') {
      if (!name) {
        return NextResponse.json(
          { error: 'Το ονοματεπώνυμο είναι υποχρεωτικό' },
          { status: 400 }
        );
      }
      if (!email) {
        return NextResponse.json(
          { error: 'Το email είναι υποχρεωτικό' },
          { status: 400 }
        );
      }
      if (!phone) {
        return NextResponse.json(
          { error: 'Το τηλέφωνο είναι υποχρεωτικό' },
          { status: 400 }
        );
      }
    }

    // Validate company-specific requirements
    if (userType && userType.toUpperCase() === 'COMPANY') {
      if (!companyName) {
        return NextResponse.json(
          { error: 'Το όνομα εταιρείας είναι υποχρεωτικό για εταιρείες' },
          { status: 400 }
        );
      }
      if (!companyTaxId) {
        return NextResponse.json(
          { error: 'Ο ΑΦΜ εταιρείας είναι υποχρεωτικός για εταιρείες' },
          { status: 400 }
        );
      }
      if (!companyDou) {
        return NextResponse.json(
          { error: 'Η ΔΟΥ εταιρείας είναι υποχρεωτική για εταιρείες' },
          { status: 400 }
        );
      }
      if (!companyPhone) {
        return NextResponse.json(
          { error: 'Το τηλέφωνο εταιρείας είναι υποχρεωτικό για εταιρείες' },
          { status: 400 }
        );
      }
      if (!companyEmail) {
        return NextResponse.json(
          { error: 'Το email εταιρείας είναι υποχρεωτικό για εταιρείες' },
          { status: 400 }
        );
      }
      if (!companyHeadquarters) {
        return NextResponse.json(
          { error: 'Η έδρα εταιρείας είναι υποχρεωτική για εταιρείες' },
          { status: 400 }
        );
      }
      if (!companyWorkingHours) {
        return NextResponse.json(
          { error: 'Το ωράριο λειτουργίας είναι υποχρεωτικό για εταιρείες' },
          { status: 400 }
        );
      }
      if (!contactPersonName) {
        return NextResponse.json(
          { error: 'Το ονοματεπώνυμο υπευθύνου είναι υποχρεωτικό για εταιρείες' },
          { status: 400 }
        );
      }
      if (!contactPersonEmail) {
        return NextResponse.json(
          { error: 'Το email υπευθύνου είναι υποχρεωτικό για εταιρείες' },
          { status: 400 }
        );
      }
      if (!contactPersonPhone) {
        return NextResponse.json(
          { error: 'Το τηλέφωνο υπευθύνου είναι υποχρεωτικό για εταιρείες' },
          { status: 400 }
        );
      }
    }

    if (role.toUpperCase() === 'AGENT' && (!licenseNumber || !phone)) {
      console.log('Missing required fields for agent'); // Προσθήκη logging
      return NextResponse.json(
        { error: 'Ο αριθμός άδειας και το τηλέφωνο είναι υποχρεωτικά για τους μεσίτες' },
        { status: 400 }
      );
    }

    // Create user
    const user = await prisma.user.create({
      data: userData
    });

    // Έλεγχος αν υπάρχει lead με αυτά τα στοιχεία (name, email, phone)
    const matchingLeads = await prisma.propertyLead.findMany({
      where: {
        buyer: {
          name: name,
          email: email,
          phone: phone
        }
      },
      include: {
        property: true
      }
    });

    // Αν υπάρχουν leads, ενημέρωσε τα leads να δείχνουν στο νέο user (buyerId)
    if (matchingLeads.length > 0) {
      for (const lead of matchingLeads) {
        await prisma.propertyLead.update({
          where: { id: lead.id },
          data: { buyerId: user.id }
        });
      }
    }

    console.log('User created successfully:', { ...user, password: '[HIDDEN]' }); // Προσθήκη logging

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Η εγγραφή ολοκληρώθηκε με επιτυχία'
    });
  } catch (error) {
    console.error('Registration error:', error); // Βελτιωμένο error logging
    return NextResponse.json(
      { error: 'Σφάλμα κατά την εγγραφή. Παρακαλώ δοκιμάστε ξανά.' },
      { status: 500 }
    );
  }
} 