import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// S3 Client (if using AWS S3)
let s3Client: S3Client | null = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
}

// Helper function to upload files
async function uploadFiles(files: Express.Multer.File[]): Promise<string[]> {
  const photoUrls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      if (s3Client && process.env.AWS_S3_BUCKET) {
        // Upload to S3
        const fileName = `properties/${Date.now()}_${i}_${file.originalname}`;
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype
        }));
        const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
        photoUrls.push(fileUrl);
      } else {
        // Upload to local storage
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'properties');
        await fs.mkdir(uploadsDir, { recursive: true });
        
        const timestamp = Date.now();
        const fileName = `${timestamp}_${i}_${file.originalname}`;
        const filePath = path.join(uploadsDir, fileName);
        
        await fs.writeFile(filePath, file.buffer);
        
        const fileUrl = `/uploads/properties/${fileName}`;
        photoUrls.push(fileUrl);
      }
    } catch (uploadError) {
      console.error('Error uploading photo:', uploadError);
      // Fallback to placeholder
      photoUrls.push(`https://source.unsplash.com/random/800x600?house,property&sig=${i}`);
    }
  }

  return photoUrls;
}

// GET /api/properties - Get all properties
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    // Base query for all properties
    const baseQuery: Prisma.PropertyFindManyArgs = {
      where: {
        OR: [
          // Available properties
          { status: { not: 'unavailable' } },
          // Unavailable properties with special permissions
          {
            AND: [
              { status: 'unavailable' },
              {
              OR: [
              // 1. User is the owner
              { userId: userId },
              // 2. User is admin
              { user: { role: 'admin' } },
              // 3. User is interested buyer
              {
              favorites: {
              some: {
              userId: userId
              }
              }
              },
              // 4. User is agent with connection
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

    // If no user, return only available and approved properties
    const query = !userId ? {
      ...baseQuery,
      where: {
        { status: { not: 'unavailable' } }
      }
    } : baseQuery;

    const properties = await prisma.property.findMany(query);

    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση των ακινήτων' });
  }
});

// POST /api/properties - Create property
router.post('/', optionalAuth, upload.array('photos'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Πρέπει να συνδεθείτε για να καταχωρίσετε ακίνητο'
      });
    }

    // Parse form data
    const {
      propertyType,
      basicDetails,
      features,
      amenities,
      location,
      pricing,
      description
    } = req.body;

    // Parse JSON strings if they are strings
    const basicDetailsParsed = typeof basicDetails === 'string' ? JSON.parse(basicDetails) : basicDetails;
    const featuresParsed = typeof features === 'string' ? JSON.parse(features) : features;
    const amenitiesParsed = typeof amenities === 'string' ? JSON.parse(amenities) : amenities;
    const locationParsed = typeof location === 'string' ? JSON.parse(location) : location;
    const pricingParsed = typeof pricing === 'string' ? JSON.parse(pricing) : pricing;
    const descriptionParsed = typeof description === 'string' ? JSON.parse(description) : description;

    // Validate required fields
    if (!propertyType || !basicDetailsParsed || !locationParsed || !pricingParsed || !descriptionParsed) {
      return res.status(400).json({
        error: 'Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία'
      });
    }

    // Convert numeric values
    const numericPrice = parseFloat(pricingParsed.price);
    const numericArea = parseFloat(basicDetailsParsed.area);
    const numericPricePerSqm = pricingParsed.pricePerSquareMeter ? parseFloat(pricingParsed.pricePerSquareMeter) : null;
    const numericBalconyArea = featuresParsed.balconyArea ? parseFloat(featuresParsed.balconyArea) : null;
    const numericPlotArea = featuresParsed.plotArea ? parseFloat(featuresParsed.plotArea) : null;
    const numericBuildingCoefficient = featuresParsed.buildingCoefficient ? parseFloat(featuresParsed.buildingCoefficient) : null;
    const numericCoverageRatio = featuresParsed.coverageRatio ? parseFloat(featuresParsed.coverageRatio) : null;
    const numericFacadeLength = featuresParsed.facadeLength ? parseFloat(featuresParsed.facadeLength) : null;
    const numericBuildableArea = featuresParsed.buildableArea ? parseFloat(featuresParsed.buildableArea) : null;

    if (isNaN(numericPrice) || isNaN(numericArea)) {
      return res.status(400).json({
        error: 'Η τιμή και το εμβαδόν πρέπει να είναι αριθμοί'
      });
    }

    // Upload photos
    const files = req.files as Express.Multer.File[];
    const photoUrls = files && files.length > 0 ? await uploadFiles(files) : [];

    // Prepare property data
    const propertyData = {
      // Βασικά στοιχεία
      title: descriptionParsed.title,
      shortDescription: descriptionParsed.shortDescription,
      fullDescription: descriptionParsed.fullDescription || '',
      propertyType: propertyType,
      condition: basicDetailsParsed.condition,
      yearBuilt: basicDetailsParsed.yearBuilt ? parseInt(basicDetailsParsed.yearBuilt) : null,
      renovationYear: basicDetailsParsed.renovationYear ? parseInt(basicDetailsParsed.renovationYear) : null,

      // Βασικά χαρακτηριστικά
      area: numericArea,
      bedrooms: basicDetailsParsed.bedrooms ? parseInt(basicDetailsParsed.bedrooms) : null,
      bathrooms: basicDetailsParsed.bathrooms ? parseInt(basicDetailsParsed.bathrooms) : null,
      floor: basicDetailsParsed.floor,
      parkingSpaces: basicDetailsParsed.parkingSpaces ? parseInt(basicDetailsParsed.parkingSpaces) : null,
      garden: basicDetailsParsed.garden || false,
      multipleFloors: basicDetailsParsed.multipleFloors || false,

      // Εμπορικά χαρακτηριστικά
      commercialType: basicDetailsParsed.commercialType,
      rooms: basicDetailsParsed.rooms ? parseInt(basicDetailsParsed.rooms) : null,

      // Χαρακτηριστικά οικοπέδου
      plotCategory: basicDetailsParsed.plotCategory,
      plotOwnershipType: basicDetailsParsed.plotOwnershipType,

      // Χαρακτηριστικά
      heatingType: featuresParsed.heatingType,
      heatingSystem: featuresParsed.heatingSystem,
      windows: featuresParsed.windows,
      windowsType: featuresParsed.windowsType,
      flooring: featuresParsed.flooring,
      energyClass: featuresParsed.energyClass,

      // Επιπλέον χαρακτηριστικά
      elevator: featuresParsed.elevator || false,
      furnished: featuresParsed.furnished || false,
      securityDoor: featuresParsed.securityDoor || false,
      alarm: featuresParsed.alarm || false,
      disabledAccess: featuresParsed.disabledAccess || false,
      soundproofing: featuresParsed.soundproofing || false,
      thermalInsulation: featuresParsed.thermalInsulation || false,
      pool: featuresParsed.pool,
      balconyArea: numericBalconyArea,
      hasBalcony: featuresParsed.hasBalcony || false,

      // Χαρακτηριστικά οικοπέδου
      plotArea: numericPlotArea,
      buildingCoefficient: numericBuildingCoefficient,
      coverageRatio: numericCoverageRatio,
      facadeLength: numericFacadeLength,
      sides: featuresParsed.sides ? parseInt(featuresParsed.sides) : null,
      buildableArea: numericBuildableArea,
      buildingPermit: featuresParsed.buildingPermit || false,
      roadAccess: featuresParsed.roadAccess,
      terrain: featuresParsed.terrain,
      shape: featuresParsed.shape,
      suitability: featuresParsed.suitability,

      // Εμπορικά χαρακτηριστικά
      storageType: featuresParsed.storageType,
      elevatorType: featuresParsed.elevatorType,
      fireproofDoor: featuresParsed.fireproofDoor || false,

      // Τοποθεσία
      state: locationParsed.state,
      city: locationParsed.city,
      neighborhood: locationParsed.neighborhood,
      street: locationParsed.street,
      number: locationParsed.number,
      postalCode: locationParsed.postalCode,
      coordinates: locationParsed.coordinates,

      // Τιμή
      price: numericPrice,
      pricePerSquareMeter: numericPricePerSqm,
      negotiable: pricingParsed.negotiable || false,
      additionalPriceNotes: pricingParsed.additionalNotes,

      // Συστημικά πεδία
      images: photoUrls,
      keywords: descriptionParsed.keywords || [],
      amenities: amenitiesParsed,
      status: 'PENDING',
      isVerified: false,
      isReserved: false,
      isSold: false,
      userId: userId,
    };

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

    res.json({
      success: true,
      message: 'Το ακίνητο καταχωρήθηκε με επιτυχία',
      property
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την καταχώριση του ακινήτου'
    });
  }
});

// GET /api/properties/:id - Get single property
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        user: true,
        favorites: {
          include: {
            user: {
              select: {
                id: true
              }
            }
          }
        },
        connections: {
          include: {
            agent: {
              select: {
                id: true,
                buyerConnections: {
                  include: {
                    buyer: {
                      select: {
                        id: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Check permissions for unavailable properties
    if (property.status === 'unavailable') {
      if (!userId) {
        return res.status(404).json({ error: 'Property not found' });
      }

      const canView =
        property.user.id === userId ||
        userRole === 'ADMIN' ||
        property.favorites.some(favorite => favorite.user.id === userId) ||
        property.connections.some(conn =>
          conn.agent.id === userId ||
          conn.agent.buyerConnections.some(bc => bc.buyer.id === userId)
        );

      if (!canView) {
        return res.status(404).json({ error: 'Property not found' });
      }
    }

    res.json({ property });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/properties/:id - Update property
router.patch('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const property = await prisma.property.update({
      where: { id },
      data: body,
    });

    res.json({ property });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/properties/:id - Delete property
router.delete('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.property.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/properties/interest - Express interest in property
router.post('/interest', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { propertyId } = req.body;

    // Check if interest already exists
    const existingInterest = await prisma.transaction.findFirst({
      where: {
        propertyId,
        buyerId: userId,
        status: 'INTERESTED'
      }
    });

    if (existingInterest) {
      return res.status(400).json({
        error: 'Έχετε ήδη εκδηλώσει ενδιαφέρον για αυτό το ακίνητο'
      });
    }

    // Find property
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!property) {
      return res.status(404).json({
        error: 'Το ακίνητο δεν βρέθηκε'
      });
    }

    // Check if user is the owner
    if (property.user.id === userId) {
      return res.status(400).json({
        error: 'Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς'
      });
    }

    // Find available agent
    const agent = await prisma.user.findFirst({
      where: {
        role: 'AGENT'
      }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Δεν βρέθηκε διαθέσιμος μεσίτης'
      });
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        propertyId,
        buyerId: userId,
        agentId: agent.id,
        status: 'INTERESTED'
      }
    });

    // Update stats
    await prisma.propertyStats.upsert({
      where: { propertyId },
      create: {
        propertyId,
        interestedCount: 1
      },
      update: {
        interestedCount: {
          increment: 1
        }
      }
    });

    // Find all admins and create notifications
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    await Promise.all(
      admins.map(admin =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Νέο Ενδιαφέρον',
            message: `Νέο ενδιαφέρον για το ακίνητο ${property.title} από τον χρήστη ${user?.email || 'Unknown'}`,
            type: 'INTEREST'
          }
        })
      )
    );

    res.json(transaction);
  } catch (error) {
    console.error('Error expressing interest:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την εκδήλωση ενδιαφέροντος'
    });
  }
});

// POST /api/properties/:id/view - Record property view
router.post('/:id/view', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { userEmail } = req.query;

    let viewUserId = userId;

    // If userEmail provided, check if user exists
    if (userEmail && typeof userEmail === 'string') {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true }
      });

      if (user) {
        viewUserId = user.id;
      } else {
        return res.json({
          hasViewed: false,
          viewedAt: null
        });
      }
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Record view
    await prisma.propertyView.upsert({
      where: {
        propertyId_buyerId: {
          propertyId: id,
          buyerId: viewUserId
        }
      },
      create: {
        propertyId: id,
        buyerId: viewUserId
      },
      update: {
        viewedAt: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording property view:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/properties/:id/view - Check if property viewed
router.get('/:id/view', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { userEmail } = req.query;

    let viewUserId = userId;

    if (userEmail && typeof userEmail === 'string') {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true }
      });

      if (user) {
        viewUserId = user.id;
      } else {
        return res.json({
          hasViewed: false,
          viewedAt: null
        });
      }
    }

    const propertyView = await prisma.propertyView.findFirst({
      where: {
        propertyId: id,
        buyerId: viewUserId
      }
    });

    res.json({
      hasViewed: !!propertyView,
      viewedAt: propertyView?.viewedAt
    });
  } catch (error) {
    console.error('Error checking property view:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/properties/:id/favorite - Toggle favorite
router.post('/:id/favorite', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
    }

    const { id: propertyId } = req.params;

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return res.status(404).json({ error: 'Το ακίνητο δεν βρέθηκε' });
    }

    // Check if already favorite
    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        userId,
        propertyId
      }
    });

    if (existingFavorite) {
      // Remove from favorites
      await prisma.favorite.delete({
        where: { id: existingFavorite.id }
      });

      return res.json({
        message: 'Το ακίνητο αφαιρέθηκε από τα αγαπημένα',
        isFavorite: false
      });
    } else {
      // Add to favorites
      await prisma.favorite.create({
        data: {
          userId,
          propertyId
        }
      });

      return res.json({
        message: 'Το ακίνητο προστέθηκε στα αγαπημένα',
        isFavorite: true
      });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ενημέρωση των αγαπημένων'
    });
  }
});

// POST /api/properties/images - Upload images
router.post('/images', optionalAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    let fileUrl: string;

    if (s3Client && process.env.AWS_S3_BUCKET) {
      // Upload to S3
      const fileName = `properties/${Date.now()}_${file.originalname}`;
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype
      }));
      fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
    } else {
      // Upload to local storage
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'properties');
      await fs.mkdir(uploadsDir, { recursive: true });

      const fileName = `${Date.now()}_${file.originalname}`;
      const filePath = path.join(uploadsDir, fileName);
      await fs.writeFile(filePath, file.buffer);

      fileUrl = `/uploads/properties/${fileName}`;
    }

    res.json({ fileUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/properties/:id/availability - Get property availability
router.get('/:id/availability', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const propertyId = req.params.id;

    const availabilities = await prisma.propertyAvailability.findMany({
      where: {
        propertyId: propertyId,
        date: {
          gte: new Date(),
        },
        isAvailable: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    res.json(availabilities);
  } catch (error) {
    console.error('Error fetching availabilities:', error);
    res.status(500).json({ error: 'Failed to fetch availabilities' });
  }
});

// POST /api/properties/:id/availability - Create property availability (seller only)
router.post('/:id/availability', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const propertyId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify that the user is the property owner
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true },
    });

    if (!property || property.userId !== userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { date, startTime, endTime } = req.body;

    const availability = await prisma.propertyAvailability.create({
      data: {
        propertyId: propertyId,
        date: new Date(date),
        startTime,
        endTime,
        isAvailable: true,
      },
    });

    res.json(availability);
  } catch (error) {
    console.error('Error creating availability:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/properties/:id/availability - Delete property availability (seller only)
router.delete('/:id/availability', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const propertyId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify that the user is the property owner
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true },
    });

    if (!property || property.userId !== userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const availabilityId = req.query.availabilityId as string;

    if (!availabilityId) {
      return res.status(400).json({ error: 'Availability ID is required' });
    }

    await prisma.propertyAvailability.delete({
      where: { id: availabilityId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting availability:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/properties/:id/lawyer - Get lawyer info for property
router.get('/:id/lawyer', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const propertyId = req.params.id;

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
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    console.error('Error fetching lawyer info:', error);
    res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση των στοιχείων δικηγόρου.' });
  }
});

// POST /api/properties/:id/lawyer - Save lawyer info for property
router.post('/:id/lawyer', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const propertyId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify that the user is the property owner
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.userId !== userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, email, phone, taxId } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        error: 'Όλα τα πεδία είναι υποχρεωτικά εκτός από το ΑΦΜ.'
      });
    }

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: {
        lawyerName: name,
        lawyerEmail: email,
        lawyerPhone: phone,
        lawyerTaxId: taxId || null,
      },
    });

    res.json({ success: true, property: updated });
  } catch (error) {
    console.error('Error saving lawyer info:', error);
    res.status(500).json({ error: 'Σφάλμα κατά την αποθήκευση των στοιχείων δικηγόρου.' });
  }
});

// GET /api/properties/:id/progress/documents - Get property progress documents
router.get('/:id/progress/documents', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const propertyId = req.params.id;

    if (!s3Client || !process.env.AWS_S3_BUCKET) {
      return res.status(500).json({ error: 'S3 not configured' });
    }

    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: `${propertyId}/`,
    });

    const data = await s3Client.send(command);
    const documents = (data.Contents || [])
      .filter(obj => obj.Key && !obj.Key.endsWith('/'))
      .map(obj => {
        let type = '';
        if (obj.Key) {
          const match = obj.Key.match(/^[^/]+[\\/]([^/\\]+)[\\/]/) || obj.Key.match(/^[^/]+\/([^/]+)\//);
          if (match) {
            type = match[1];
          } else {
            const parts = obj.Key.split(/[\\/]/);
            if (parts.length > 1) type = parts[1];
          }
        }
        return {
          key: obj.Key,
          type,
          status: 'uploaded',
          uploadedAt: obj.LastModified,
          fileUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${obj.Key}`,
          size: obj.Size,
        };
      });

    res.json({ documents });
  } catch (error) {
    console.error('Error listing S3 objects:', error);
    res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση των εγγράφων από το S3' });
  }
});

// POST /api/properties/:id/progress/documents - Upload property progress document
router.post('/:id/progress/documents', optionalAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const propertyId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!s3Client || !process.env.AWS_S3_BUCKET) {
      return res.status(500).json({ error: 'S3 not configured' });
    }

    const file = req.file;
    const documentType = req.body.documentType;

    if (!file || !documentType) {
      return res.status(400).json({ error: 'Λείπει το αρχείο ή ο τύπος εγγράφου' });
    }

    const fileName = file.originalname;
    const s3Key = `${propertyId}/${documentType}/${Date.now()}_${fileName}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    res.json({ success: true, fileUrl });
  } catch (error) {
    console.error('Error uploading document to S3:', error);
    res.status(500).json({ error: 'Σφάλμα κατά το ανέβασμα στο S3' });
  }
});

// POST /api/properties/:id/request-removal - Request property removal (seller only)
router.post('/:id/request-removal', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        message: 'Δεν έχετε εξουσιοδότηση'
      });
    }

    const propertyId = req.params.id;

    // Ελέγχουμε αν το ακίνητο υπάρχει και αν ανήκει στον χρήστη
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        userId: userId
      },
      include: {
        leads: true,
        transactions: {
          where: {
            status: {
              not: 'COMPLETED'
            }
          }
        }
      }
    });

    if (!property) {
      return res.status(404).json({
        message: 'Το ακίνητο δεν βρέθηκε ή δεν έχετε δικαίωμα πρόσβασης'
      });
    }

    // Ενημερώνουμε το ακίνητο για να ζητήσει αφαίρεση
    await prisma.property.update({
      where: {
        id: propertyId
      },
      data: {
        removalRequested: true,
        updatedAt: new Date()
      }
    });

    // Βρίσκουμε όλους τους admins για να τους στείλουμε ειδοποίηση
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true
      }
    });

    // Δημιουργούμε ειδοποιήσεις για τους admins
    await Promise.all(
      admins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Αίτηση Αφαίρεσης Ακινητού',
            message: `Αίτηση αφαίρεσης ακινητού: ${property.title}`,
            type: 'REMOVAL_REQUEST',
            metadata: JSON.stringify({
              propertyId: propertyId,
              propertyTitle: property.title,
              sellerId: userId
            })
          }
        })
      )
    );

    res.json({
      message: 'Η αίτηση αφαίρεσης ακινητού στάλθηκε επιτυχώς'
    });
  } catch (error) {
    console.error('Σφάλμα κατά την αίτηση αφαίρεσης ακινητού:', error);
    res.status(500).json({
      message: 'Εσωτερικό σφάλμα διακομιστή'
    });
  }
});

// GET /api/properties/share/:id - Get property for sharing
router.get('/share/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!property) {
      return res.status(404).json({
        error: 'Το ακίνητο δεν βρέθηκε'
      });
    }

    res.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ανάκτηση του ακινήτου'
    });
  }
});

// POST /api/properties/share/:id - Share property with agent
router.post('/share/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Πρέπει να συνδεθείτε για να δημιουργήσετε σύνδεση'
      });
    }

    const { agentId } = req.body;

    // Check if the agent exists
    const agent = await prisma.user.findUnique({
      where: {
        id: agentId,
      },
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Ο χρήστης δεν βρέθηκε'
      });
    }

    // Check if connection already exists
    const existingConnection = await prisma.buyerAgentConnection.findFirst({
      where: {
        buyerId: userId,
        agentId: agentId,
        propertyId: req.params.id,
      },
    });

    if (existingConnection) {
      return res.status(400).json({
        error: 'Η σύνδεση υπάρχει ήδη'
      });
    }

    // Create connection
    const connection = await prisma.buyerAgentConnection.create({
      data: {
        buyerId: userId,
        agentId: agentId,
        propertyId: req.params.id,
        status: 'PENDING',
      },
    });

    res.json(connection);
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά τη δημιουργία της σύνδεσης'
    });
  }
});

// GET /api/properties/interested-buyers - Get interested buyers for seller's properties
router.get('/interested-buyers', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const userEmail = req.userEmail;

    if (!userId && !userEmail) {
      return res.status(401).json({
        error: 'Πρέπει να συνδεθείτε για να δείτε τους ενδιαφερόμενους'
      });
    }

    // Βρίσκουμε πρώτα όλα τα ακίνητα του seller
    let whereClause: any = {};

    if (userId) {
      whereClause.userId = userId;
    } else if (userEmail) {
      whereClause.user = { email: userEmail };
    }

    const properties = await prisma.property.findMany({
      where: whereClause,
      select: {
        id: true
      }
    });

    const propertyIds = properties.map((p: any) => p.id);

    // Βρίσκουμε όλους τους ενδιαφερόμενους για αυτά τα ακίνητα
    const interestedBuyers = await prisma.transaction.findMany({
      where: {
        propertyId: {
          in: propertyIds
        },
        status: 'INTERESTED'
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Μετατρέπουμε τα δεδομένα στη μορφή που θέλουμε
    const formattedBuyers = interestedBuyers.map((transaction: any) => ({
      id: transaction.buyer.id,
      name: transaction.buyer.name,
      email: transaction.buyer.email,
      phone: transaction.buyer.phone ?? '',
      propertyId: transaction.propertyId,
      createdAt: transaction.createdAt
    }));

    res.json(formattedBuyers);
  } catch (error) {
    console.error('Error fetching interested buyers:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ανάκτηση των ενδιαφερόμενων'
    });
  }
});

// GET /api/properties/interest-status/:property_id - Check interest status for a property
router.get('/interest-status/:property_id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Μη εξουσιοδοτημένη πρόσβαση'
      });
    }

    // Έλεγχος αν υπάρχει ήδη ενδιαφέρον
    const existingInterest = await prisma.transaction.findFirst({
      where: {
        propertyId: req.params.property_id,
        buyerId: userId,
        status: 'INTERESTED'
      }
    });

    res.json({
      hasExpressedInterest: !!existingInterest
    });
  } catch (error) {
    console.error('Error checking interest status:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά τον έλεγχο της κατάστασης ενδιαφέροντος'
    });
  }
});

// GET /api/properties/seller - Get seller's properties
router.get('/seller', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const userEmail = req.userEmail;

    if (!userId && !userEmail) {
      return res.status(401).json({
        error: 'Πρέπει να συνδεθείτε για να δείτε τα ακίνητά σας'
      });
    }

    let whereClause: any = {};

    if (userId) {
      whereClause.userId = userId;
    } else if (userEmail) {
      whereClause.user = { email: userEmail };
    }

    const properties = await prisma.property.findMany({
      where: whereClause,
      include: {
        stats: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(properties);
  } catch (error) {
    console.error('Error fetching seller properties:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ανάκτηση των ακινήτων'
    });
  }
});

// GET /api/properties/:id/progress - Get property progress
router.get('/:id/progress', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        progress: true
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property.progress);
  } catch (error) {
    console.error('Error fetching property progress:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/properties/:id/progress - Update property progress
router.put('/:id/progress', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { stage, status, message } = req.body;
    const propertyId = req.params.id;

    type StageType = 'legalDocuments' | 'platformReview' | 'platformAssignment' | 'listing';
    const stageType = stage as StageType;

    const updateData: any = {
      [`${stageType}Status`]: status
    };

    if (status === 'completed') {
      updateData[`${stageType}CompletedAt`] = new Date();
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        progress: {
          upsert: {
            create: {
              ...updateData
            },
            update: {
              ...updateData
            }
          }
        }
      },
      include: {
        progress: true
      }
    });

    // Δημιουργία ειδοποίησης στον seller
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        user: true
      }
    });

    if (property?.userId) {
      const stageNames = {
        legalDocuments: 'Νομικά Έγγραφα',
        platformReview: 'Έλεγχος Πλατφόρμας',
        platformAssignment: 'Ανάθεση Πλατφόρμας',
        listing: 'Δημοσίευση'
      };

      const stageName = stageNames[stageType] || stageType;

      await prisma.notification.create({
        data: {
          userId: property.userId,
          type: status === 'completed' ? 'PROPERTY_PROGRESS_COMPLETED' : 'PROGRESS_UPDATE',
          title: status === 'completed' ? 'Ολοκλήρωση Βήματος' : 'Ενημέρωση Προόδου',
          message: status === 'completed'
            ? `Το βήμα "${stageName}" για το ακίνητό σας "${property.title}" ολοκληρώθηκε επιτυχώς.`
            : `Το στάδιο ${stageType} ενημερώθηκε σε ${status}`,
          propertyId: propertyId,
          isRead: false,
          metadata: JSON.stringify({
            stage: stageType,
            stageName: stageName,
            propertyTitle: property.title,
            status: status,
            recipient: 'seller'
          })
        }
      });
    }

    res.json(updatedProperty);
  } catch (error) {
    console.error('Error updating property progress:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;



