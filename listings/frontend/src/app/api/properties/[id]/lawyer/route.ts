import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const propertyId = params.id;
  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        lawyerName: true,
        lawyerEmail: true,
        lawyerPhone: true,
        lawyerTaxId: true,
      },
    });
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }
    return NextResponse.json(property);
  } catch (error) {
    return NextResponse.json({ error: 'Σφάλμα κατά την ανάκτηση των στοιχείων δικηγόρου.' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const propertyId = params.id;
  try {
    const body = await request.json();
    const { name, email, phone, taxId } = body;
    if (!name || !email || !phone) {
      return NextResponse.json({ error: 'Όλα τα πεδία είναι υποχρεωτικά εκτός από το ΑΦΜ.' }, { status: 400 });
    }

    // Ενημέρωση του property με lawyerInfo
    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: {
        lawyerName: name,
        lawyerEmail: email,
        lawyerPhone: phone,
        lawyerTaxId: taxId || null,
      },
    });

    return NextResponse.json({ success: true, property: updated });
  } catch (error) {
    console.error('Error saving lawyer info:', error);
    return NextResponse.json({ error: 'Σφάλμα κατά την αποθήκευση των στοιχείων δικηγόρου.' }, { status: 500 });
  }
} 