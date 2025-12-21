import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    const property = await prisma.property.update({
      where: { id: params.id },
      data: {
        title: data.title,
        shortDescription: data.shortDescription,
        fullDescription: data.fullDescription,
        propertyType: data.propertyType,
        condition: data.condition,
        yearBuilt: data.yearBuilt,
        renovationYear: data.renovationYear,
        area: data.area,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        price: data.price,
        energyClass: data.energyClass,
        heatingType: data.heatingType,
        heatingSystem: data.heatingSystem,
        windows: data.windows,
        windowsType: data.windowsType,
        flooring: data.flooring,
        elevator: data.elevator,
        furnished: data.furnished,
        securityDoor: data.securityDoor,
        alarm: data.alarm,
        disabledAccess: data.disabledAccess,
        soundproofing: data.soundproofing,
        thermalInsulation: data.thermalInsulation,
        pool: data.pool,
        balconyArea: data.balconyArea,
        hasBalcony: data.hasBalcony,
        state: data.state,
        city: data.city,
        street: data.street,
        number: data.number,
        status: data.status
      },
      include: {
        user: true
      }
    });

    // Βρες το base URL από το request headers
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/revalidate?path=/properties/${params.id}`, {
      method: 'POST'
    });

    return NextResponse.json(property);
  } catch (error) {
    console.error('Error updating property:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 