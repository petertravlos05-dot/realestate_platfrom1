import { Router } from 'express';
import { Request, Response } from 'express';
import { Property } from '../../models/Property';
import { body, param, validationResult } from 'express-validator';
import { Appointment } from '../../models/Appointment';
import { Notification } from '../../models/Notification';

export const router = Router();

// Add the new interface
interface VisitSchedulingSettings {
  presenceType: 'platform_only' | 'seller_and_platform';
  schedulingType?: 'seller_availability' | 'buyer_proposal';
  availability?: {
    [day: string]: {
      start: string;
      end: string;
    }[];
  };
}

// Add the new endpoint
router.put('/:propertyId/visit-settings', [
  param('propertyId').isMongoId(),
  body('presenceType').isIn(['platform_only', 'seller_and_platform']),
  body('schedulingType').optional().isIn(['seller_availability', 'buyer_proposal']),
  body('availability').optional().isObject()
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const { propertyId } = req.params;
    const { presenceType, schedulingType, availability } = req.body;

    // LOG τα δεδομένα που λαμβάνει το backend
    console.log('API PUT /visit-settings:', {
      propertyId,
      presenceType,
      schedulingType,
      availability
    });

    // Update property settings
    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ error: 'Το ακίνητο δεν βρέθηκε' });
      return;
    }

    property.visitSettings = {
      presenceType,
      schedulingType,
      availability: schedulingType === 'seller_availability' ? availability : undefined,
      updatedAt: new Date()
    };

    await property.save();

    res.json({ message: 'Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς' });
  } catch (error) {
    console.error('Error saving visit settings:', error);
    res.status(500).json({ error: 'Σφάλμα κατά την αποθήκευση των ρυθμίσεων' });
  }
});

// Add GET endpoint for appointment settings
router.get('/:propertyId/appointment-settings', [
  param('propertyId').isMongoId()
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const { propertyId } = req.params;
    const property = await Property.findById(propertyId);
    
    if (!property) {
      res.status(404).json({ error: 'Το ακίνητο δεν βρέθηκε' });
      return;
    }

    res.json(property.visitSettings || {
      presenceType: 'platform_only',
      schedulingType: 'buyer_proposal'
    });
  } catch (error) {
    console.error('Error fetching appointment settings:', error);
    res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση των ρυθμίσεων' });
  }
});

// Add POST endpoint for creating appointments
router.post('/:propertyId/appointments', [
  param('propertyId').isMongoId(),
  body('buyerId').isMongoId(),
  body('date').isISO8601(),
  body('time').isString(),
  body('submittedByBuyer').isBoolean()
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const { propertyId } = req.params;
    const { buyerId, date, time, submittedByBuyer } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ error: 'Το ακίνητο δεν βρέθηκε' });
      return;
    }

    // Check if the property has visit settings
    if (!property.visitSettings) {
      res.status(400).json({ error: 'Το ακίνητο δεν έχει ρυθμίσεις ραντεβού' });
      return;
    }

    // Create appointment
    const appointment = new Appointment({
      propertyId,
      buyerId,
      date,
      time,
      status: property.visitSettings.presenceType === 'platform_only' ? 'accepted' : 'pending',
      submittedByBuyer,
      createdAt: new Date()
    });

    await appointment.save();

    // Create notification for seller if needed
    if (property.visitSettings.presenceType === 'seller_and_platform') {
      await Notification.create({
        userId: property.userId,
        type: 'appointment_request',
        message: `Νέα αίτηση ραντεβού για το ακίνητο ${property.title}`,
        data: {
          appointmentId: appointment._id,
          propertyId,
          buyerId
        },
        isRead: false
      });
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Σφάλμα κατά τη δημιουργία του ραντεβού' });
  }
});

export const propertiesRouter = router; 