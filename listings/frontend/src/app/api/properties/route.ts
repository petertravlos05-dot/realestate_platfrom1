import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    // Διάβασε το Authorization header
    const authHeader = request.headers.get('authorization');
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'Agapao_ton_stivo05');
        userId = decoded.userId;
      } catch (err) {
        console.error('Invalid token:', err);
      }
    }

    // Αν δεν βρέθηκε userId από JWT, δοκίμασε getServerSession (για web)
    if (!userId) {
      const session = await getServerSession(authOptions);
      userId = session?.user?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Πρέπει να συνδεθείτε για να καταχωρίσετε ακίνητο' },
        { status: 401 }
      );
    }

    // Διαχείριση FormData
    const formData = await request.formData();
    
    // Ανάγνωση των JSON πεδίων
    const propertyType = formData.get('propertyType') as string;
    const basicDetails = JSON.parse(formData.get('basicDetails') as string);
    const features = JSON.parse(formData.get('features') as string);
    const amenities = JSON.parse(formData.get('amenities') as string);
    const location = JSON.parse(formData.get('location') as string);
    const pricing = JSON.parse(formData.get('pricing') as string);
    const description = JSON.parse(formData.get('description') as string);
    
    // Debug logs
    console.log('Raw form data:', Object.fromEntries(formData.entries()));
    console.log('Parsed data:', {
      propertyType,
      basicDetails,
      features,
      amenities,
      location,
      pricing,
      description
    });

    // Ανάγνωση των φωτογραφιών
    const photos = formData.getAll('photos') as File[];

    // Validate required fields
    if (!propertyType || !basicDetails || !location || !pricing || !description) {
      console.error('Missing required fields:', { propertyType, basicDetails, location, pricing, description });
      return NextResponse.json(
        { error: 'Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία' },
        { status: 400 }
      );
    }

    // Convert numeric values with better error handling
    const numericPrice = parseFloat(pricing.price);
    const numericArea = parseFloat(basicDetails.area);
    const numericPricePerSqm = pricing.pricePerSquareMeter ? parseFloat(pricing.pricePerSquareMeter) : null;
    const numericBalconyArea = features.balconyArea ? parseFloat(features.balconyArea) : null;
    const numericPlotArea = features.plotArea ? parseFloat(features.plotArea) : null;
    const numericBuildingCoefficient = features.buildingCoefficient ? parseFloat(features.buildingCoefficient) : null;
    const numericCoverageRatio = features.coverageRatio ? parseFloat(features.coverageRatio) : null;
    const numericFacadeLength = features.facadeLength ? parseFloat(features.facadeLength) : null;
    const numericBuildableArea = features.buildableArea ? parseFloat(features.buildableArea) : null;

    if (isNaN(numericPrice) || isNaN(numericArea)) {
      console.error('Invalid numeric values:', { price: pricing.price, area: basicDetails.area });
      return NextResponse.json(
        { error: 'Η τιμή και το εμβαδόν πρέπει να είναι αριθμοί' },
        { status: 400 }
      );
    }

    // Upload photos to local storage
    const photoUrls = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'properties');
        await mkdir(uploadsDir, { recursive: true });
        
        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `${timestamp}_${i}_${photo.name}`;
        const filePath = path.join(uploadsDir, fileName);
        
        // Convert file to buffer and save
        const arrayBuffer = await photo.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await writeFile(filePath, buffer);
        
        // Generate URL for the saved file
        const fileUrl = `/uploads/properties/${fileName}`;
        photoUrls.push(fileUrl);
      } catch (uploadError) {
        console.error('Error uploading photo:', uploadError);
        // Fallback to placeholder if local upload fails
        photoUrls.push(`https://source.unsplash.com/random/800x600?house,property&sig=${i}`);
      }
    }

    // Prepare property data
    const propertyData = {
      // Βασικά στοιχεία
      title: description.title,
      shortDescription: description.shortDescription,
      fullDescription: description.fullDescription || '',
      propertyType: propertyType,
      condition: basicDetails.condition,
      yearBuilt: basicDetails.yearBuilt ? parseInt(basicDetails.yearBuilt) : null,
      renovationYear: basicDetails.renovationYear ? parseInt(basicDetails.renovationYear) : null,

      // Βασικά χαρακτηριστικά
      area: numericArea,
      bedrooms: basicDetails.bedrooms ? parseInt(basicDetails.bedrooms) : null,
      bathrooms: basicDetails.bathrooms ? parseInt(basicDetails.bathrooms) : null,
      floor: basicDetails.floor,
      parkingSpaces: basicDetails.parkingSpaces ? parseInt(basicDetails.parkingSpaces) : null,
      garden: basicDetails.garden || false,
      multipleFloors: basicDetails.multipleFloors || false,

      // Εμπορικά χαρακτηριστικά
      commercialType: basicDetails.commercialType,
      rooms: basicDetails.rooms ? parseInt(basicDetails.rooms) : null,

      // Χαρακτηριστικά οικοπέδου
      plotCategory: basicDetails.plotCategory,
      plotOwnershipType: basicDetails.plotOwnershipType,

      // Χαρακτηριστικά
      heatingType: features.heatingType,
      heatingSystem: features.heatingSystem,
      windows: features.windows,
      windowsType: features.windowsType,
      flooring: features.flooring,
      energyClass: features.energyClass,

      // Επιπλέον χαρακτηριστικά
      elevator: features.elevator || false,
      furnished: features.furnished || false,
      securityDoor: features.securityDoor || false,
      alarm: features.alarm || false,
      disabledAccess: features.disabledAccess || false,
      soundproofing: features.soundproofing || false,
      thermalInsulation: features.thermalInsulation || false,
      pool: features.pool,
      balconyArea: numericBalconyArea,
      hasBalcony: features.hasBalcony || false,

      // Χαρακτηριστικά οικοπέδου
      plotArea: numericPlotArea,
      buildingCoefficient: numericBuildingCoefficient,
      coverageRatio: numericCoverageRatio,
      facadeLength: numericFacadeLength,
      sides: features.sides ? parseInt(features.sides) : null,
      buildableArea: numericBuildableArea,
      buildingPermit: features.buildingPermit || false,
      roadAccess: features.roadAccess,
      terrain: features.terrain,
      shape: features.shape,
      suitability: features.suitability,

      // Εμπορικά χαρακτηριστικά
      storageType: features.storageType,
      elevatorType: features.elevatorType,
      fireproofDoor: features.fireproofDoor || false,

      // Τοποθεσία
      state: location.state,
      city: location.city,
      neighborhood: location.neighborhood,
      street: location.street,
      number: location.number,
      postalCode: location.postalCode,
      coordinates: location.coordinates,

      // Τιμή
      price: numericPrice,
      pricePerSquareMeter: numericPricePerSqm,
      negotiable: pricing.negotiable || false,
      additionalPriceNotes: pricing.additionalNotes,

      // Συστημικά πεδία
      images: photoUrls,
      keywords: description.keywords || [],
      amenities: amenities,
      status: 'PENDING',
      isVerified: false,
      isReserved: false,
      isSold: false,
      userId: userId,
    };

    console.log('Final property data:', propertyData);
    console.log('Amenities data:', amenities);

    // Create property
    const property = await prisma.property.create({
      data: propertyData as any,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Το ακίνητο καταχωρήθηκε με επιτυχία',
      property
    });
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την καταχώριση του ακινήτου' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Βασικό query για όλα τα ακίνητα
    const baseQuery: Prisma.PropertyFindManyArgs = {
      where: {
        AND: [
          // Μόνο τα εγκεκριμένα ακίνητα
          { status: 'approved' },
          {
            OR: [
              // Διαθέσιμα ακίνητα
              { status: { not: 'unavailable' } },
              // Μη διαθέσιμα ακίνητα με ειδικά δικαιώματα
              {
                AND: [
                  { status: 'unavailable' },
                  {
                    OR: [
                      // 1. Ο χρήστης είναι ο ιδιοκτήτης
                      { userId: userId },
                      // 2. Ο χρήστης είναι admin
                      { user: { role: 'admin' } },
                      // 3. Ο χρήστης είναι ενδιαφερόμενος buyer
                      {
                        favorites: {
                          some: {
                            userId: userId
                          }
                        }
                      },
                      // 4. Ο χρήστης είναι agent με σύνδεση
                      {
                        connections: {
                          some: {
                            OR: [
                              { agent: { id: userId } },
                              {
                                agent: {
                                  buyerConnections: {
                                    some: {
                                      buyer: { id: userId }
                                    }
                                  }
                                }
                              }
                            ]
                          }
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        stats: true
      },
      orderBy: {
        createdAt: Prisma.SortOrder.desc
      }
    };

    // Αν δεν υπάρχει συνδεδεμένος χρήστης, επιστρέφουμε μόνο τα διαθέσιμα και εγκεκριμένα ακίνητα
    const query = !userId ? {
      ...baseQuery,
      where: {
        AND: [
          { status: 'approved' },
          { status: { not: 'unavailable' } }
        ]
      }
    } : baseQuery;

    const properties = await prisma.property.findMany(query);

    return NextResponse.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση των ακινήτων' },
      { status: 500 }
    );
  }
} 