import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { VisitSettings } from '@/types/visit-settings';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest, { params }: { params: { property_id: string } }) {
  const propertyId = params.property_id.split('=')[1] || params.property_id;
  console.log('Updating visit settings for property:', propertyId);
  
  const data: VisitSettings = await req.json();
  console.log('Received visit settings data:', JSON.stringify(data, null, 2));

  try {
    // @ts-ignore
    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: { 
        visitSettings: data as any 
      }
    });
    
    console.log('Successfully updated property with visit settings:', {
      propertyId: updated.id,
      visitSettings: updated.visitSettings
    });

    return NextResponse.json({ propertyId, ...data });
  } catch (error) {
    console.error('Error updating visit settings:', error);
    return NextResponse.json({ error: 'Σφάλμα κατά την ενημέρωση των ρυθμίσεων' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { property_id: string } }) {
  const propertyId = params.property_id.split('=')[1] || params.property_id;
  console.log('Fetching visit settings for property:', propertyId);

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    console.log('Retrieved property data:', {
      propertyId: property?.id,
      visitSettings: property?.visitSettings
    });

    if (property?.visitSettings) {
      return NextResponse.json({ 
        propertyId, 
        ...(property.visitSettings as unknown as VisitSettings) 
      });
    }
    
    console.log('No visit settings found, returning default availability');
    return NextResponse.json({ propertyId, availability: { days: [], timeSlots: [] } });
  } catch (error) {
    console.error('Error fetching visit settings:', error);
    return NextResponse.json({ error: 'Σφάλμα κατά την ανάκτηση των ρυθμίσεων' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 