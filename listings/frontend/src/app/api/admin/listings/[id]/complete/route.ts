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

    // Update property with all the latest changes
    const property = await prisma.property.update({
      where: { id: params.id },
      data: {
        // Βασικά στοιχεία
        title: data.title,
        shortDescription: data.shortDescription,
        fullDescription: data.fullDescription,
        propertyType: data.propertyType,
        condition: data.condition,
        yearBuilt: data.yearBuilt,
        renovationYear: data.renovationYear,

        // Βασικά χαρακτηριστικά
        area: data.area,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        floor: data.floor,
        parkingSpaces: data.parkingSpaces,
        garden: data.garden,
        multipleFloors: data.multipleFloors,

        // Εμπορικά χαρακτηριστικά
        commercialType: data.commercialType,
        rooms: data.rooms,

        // Χαρακτηριστικά οικοπέδου
        plotCategory: data.plotCategory,
        plotOwnershipType: data.plotOwnershipType,

        // Χαρακτηριστικά
        heatingType: data.heatingType,
        heatingSystem: data.heatingSystem,
        windows: data.windows,
        windowsType: data.windowsType,
        flooring: data.flooring,
        energyClass: data.energyClass,

        // Επιπλέον χαρακτηριστικά
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

        // Χαρακτηριστικά οικοπέδου
        plotArea: data.plotArea,
        buildingCoefficient: data.buildingCoefficient,
        coverageRatio: data.coverageRatio,
        facadeLength: data.facadeLength,
        sides: data.sides,
        buildableArea: data.buildableArea,
        buildingPermit: data.buildingPermit,
        roadAccess: data.roadAccess,
        terrain: data.terrain,
        shape: data.shape,
        suitability: data.suitability,

        // Εμπορικά χαρακτηριστικά
        storageType: data.storageType,
        elevatorType: data.elevatorType,
        fireproofDoor: data.fireproofDoor,

        // Τοποθεσία
        state: data.state,
        city: data.city,
        neighborhood: data.neighborhood,
        street: data.street,
        number: data.number,
        postalCode: data.postalCode,
        coordinates: data.coordinates,

        // Τιμή
        price: data.price,
        pricePerSquareMeter: data.pricePerSquareMeter,
        negotiable: data.negotiable,
        additionalPriceNotes: data.additionalPriceNotes,

        // Συστημικά πεδία
        images: data.images,
        keywords: data.keywords,
        status: data.status || 'approved'
      }
    });

    // Δημιουργούμε ειδοποίηση για τον ιδιοκτήτη
    await prisma.notification.create({
      data: {
        userId: property.userId,
        title: 'Ολοκλήρωση επεξεργασίας ακινήτου',
        message: 'Οι αλλαγές στο ακίνητό σας έχουν ολοκληρωθεί και εγκρίθηκαν.',
        type: 'STATUS_CHANGE',
        propertyId: property.id
      }
    });

    return NextResponse.json(property);
  } catch (error) {
    console.error('Error completing property changes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 