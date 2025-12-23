import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'properties');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      cb(error as Error, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.originalname}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// GET /api/admin/listings - Get all listings (admin only)
router.get('/', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const listings = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/listings/:id - Update listing (admin only)
router.put('/:id', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;

    const property = await prisma.property.update({
      where: { id: req.params.id },
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

    res.json(property);
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/listings/:id/approve - Approve listing (admin only)
router.put('/:id/approve', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: {
        status: 'approved',
        isVerified: true
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Το ακίνητο εγκρίθηκε επιτυχώς',
      property
    });
  } catch (error) {
    console.error('Error approving property:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/listings/:id/reject - Reject listing (admin only)
router.put('/:id/reject', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: {
        status: 'rejected',
        isVerified: false
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Το ακίνητο απορρίφθηκε',
      property
    });
  } catch (error) {
    console.error('Error rejecting property:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/listings/:id/complete - Complete listing changes (admin only)
router.put('/:id/complete', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;

    const property = await prisma.property.update({
      where: { id: req.params.id },
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
        floor: data.floor,
        parkingSpaces: data.parkingSpaces,
        garden: data.garden,
        multipleFloors: data.multipleFloors,
        commercialType: data.commercialType,
        rooms: data.rooms,
        plotCategory: data.plotCategory,
        plotOwnershipType: data.plotOwnershipType,
        heatingType: data.heatingType,
        heatingSystem: data.heatingSystem,
        windows: data.windows,
        windowsType: data.windowsType,
        flooring: data.flooring,
        energyClass: data.energyClass,
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
        storageType: data.storageType,
        elevatorType: data.elevatorType,
        fireproofDoor: data.fireproofDoor,
        state: data.state,
        city: data.city,
        neighborhood: data.neighborhood,
        street: data.street,
        number: data.number,
        postalCode: data.postalCode,
        coordinates: data.coordinates,
        price: data.price,
        pricePerSquareMeter: data.pricePerSquareMeter,
        negotiable: data.negotiable,
        additionalPriceNotes: data.additionalPriceNotes,
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

    res.json(property);
  } catch (error) {
    console.error('Error completing property changes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/listings/:id/remove - Remove listing (admin only)
router.put('/:id/remove', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { user: true }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const updatedProperty = await prisma.property.update({
      where: { id: req.params.id },
      data: {
        status: 'unavailable',
        removalRequested: false
      },
      include: { user: true }
    });

    // Δημιουργούμε ειδοποίηση για τον ιδιοκτήτη
    await prisma.notification.create({
      data: {
        title: 'Ακίνητο Αφαιρέθηκε',
        message: `Το ακίνητο "${property.title}" αφαιρέθηκε από την πλατφόρμα από τον διαχειριστή.`,
        type: 'property_removed',
        userId: property.userId,
        propertyId: property.id
      }
    });

    res.json(updatedProperty);
  } catch (error) {
    console.error('Error removing property:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/listings/:id/toggle-ownership - Toggle property ownership visibility (admin only)
router.put('/:id/toggle-ownership', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { action } = req.body;

    if (!action || !['remove', 'restore'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { user: true }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const newStatus = action === 'remove' ? 'unavailable' : 'approved';

    const updatedProperty = await prisma.property.update({
      where: { id: req.params.id },
      data: {
        status: newStatus
      },
      include: { user: true }
    });

    // Δημιουργούμε ειδοποίηση για τον ιδιοκτήτη
    await prisma.notification.create({
      data: {
        userId: property.user.id,
        title: action === 'remove' ? 'Αφαίρεση Ιδιοκτησίας' : 'Επαναφορά Ιδιοκτησίας',
        message: action === 'remove'
          ? 'Το ακίνητό σας έχει αφαιρεθεί από τη δημόσια προβολή από τον διαχειριστή.'
          : 'Το ακίνητό σας έχει επαναφερθεί στη δημόσια προβολή από τον διαχειριστή.',
        type: 'OWNERSHIP_CHANGE',
        propertyId: property.id
      }
    });

    res.json(updatedProperty);
  } catch (error) {
    console.error('Error toggling property ownership:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/listings/:id/toggle-removal-request - Toggle removal request (admin only)
router.put('/:id/toggle-removal-request', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { action } = req.body;

    if (!action || !['approve', 'cancel'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { user: true }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const updatedProperty = await prisma.property.update({
      where: { id: req.params.id },
      data: {
        removalRequested: action === 'approve' ? true : false,
        status: action === 'approve' ? 'unavailable' : 'approved'
      },
      include: { user: true }
    });

    // Δημιουργούμε ειδοποίηση για τον ιδιοκτήτη
    await prisma.notification.create({
      data: {
        title: action === 'approve' ? 'Αίτηση Αφαίρεσης Εγκρίθηκε' : 'Αίτηση Αφαίρεσης Ακυρώθηκε',
        message: action === 'approve'
          ? `Η αίτηση αφαίρεσης για το ακίνητο "${property.title}" εγκρίθηκε από τον διαχειριστή. Το ακίνητο έχει αφαιρεθεί από την πλατφόρμα.`
          : `Η αίτηση αφαίρεσης για το ακίνητο "${property.title}" ακυρώθηκε από τον διαχειριστή. Το ακίνητο παραμένει διαθέσιμο στην πλατφόρμα.`,
        type: action === 'approve' ? 'removal_approved' : 'removal_cancelled',
        userId: property.userId,
        propertyId: property.id
      }
    });

    res.json(updatedProperty);
  } catch (error) {
    console.error('Error toggling removal request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/listings/:id/unavailable - Mark listing as unavailable (admin only)
router.put('/:id/unavailable', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: {
        status: 'unavailable'
      },
      include: {
        user: true
      }
    });

    // Create notification for the seller
    await prisma.notification.create({
      data: {
        userId: property.user.id,
        title: 'Ακίνητο μη διαθέσιμο',
        message: 'Το ακίνητό σας έχει χαρακτηριστεί ως μη διαθέσιμο από τον διαχειριστή.',
        type: 'STATUS_CHANGE',
        propertyId: property.id
      }
    });

    res.json(property);
  } catch (error) {
    console.error('Error marking property as unavailable:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/listings/:id/request-info - Request additional info (admin only)
router.put('/:id/request-info', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;

    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: {
        status: 'info_requested'
      },
      include: {
        user: true
      }
    });

    // Create notification for the seller
    await prisma.notification.create({
      data: {
        userId: property.user.id,
        title: 'Αίτημα για επιπλέον πληροφορίες',
        type: 'INFO_REQUEST',
        message: message || 'Ο διαχειριστής ζήτησε επιπλέον πληροφορίες για το ακίνητό σας.',
        propertyId: property.id
      }
    });

    res.json(property);
  } catch (error) {
    console.error('Error requesting additional info:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/listings/:id/images - Upload images (admin only)
router.post('/:id/images', validateJwtToken, requireRole('ADMIN'), upload.array('images', 10), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const imageUrls = files.map(file => `/uploads/properties/${file.filename}`);

    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: {
        images: {
          push: imageUrls
        }
      }
    });

    res.json(property);
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/listings/:id/progress - Update property progress (admin only)
router.put('/:id/progress', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { stage, status, message } = req.body;
    const propertyId = req.params.id;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        user: true,
        progress: true
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

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
    if (property.userId) {
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
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;














