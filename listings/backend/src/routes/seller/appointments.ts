import { Router, Request, Response } from 'express';
import { Appointment } from '../../models/Appointment';
import { Property } from '../../models/Property';
import { User } from '../../models/User';
import { Notification } from '../../models/Notification';
import { body, param, validationResult } from 'express-validator';

interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
  };
}

export const router = Router();

// Get seller's appointments
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
      return;
    }

    // Get seller's properties
    const properties = await Property.find({ userId: req.user._id });
    const propertyIds = properties.map(p => p._id.toString());

    // Get appointments for these properties
    const appointments = await Appointment.find({
      propertyId: { $in: propertyIds }
    }).sort({ createdAt: -1 });

    // Get unique buyer IDs
    const buyerIds = [...new Set(appointments.map(a => a.buyerId.toString()))];

    // Get buyers and properties
    const [buyers, propertyMap] = await Promise.all([
      User.find({ _id: { $in: buyerIds } }),
      Property.find({ _id: { $in: propertyIds } }).then(properties => 
        properties.reduce((acc, p) => ({ ...acc, [p._id.toString()]: p }), {})
      )
    ]);

    // Create buyer map
    const buyerMap = buyers.reduce((acc, b) => ({ ...acc, [b._id.toString()]: b }), {});

    res.json({
      appointments,
      properties: propertyMap,
      users: buyerMap
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση των ραντεβού' });
  }
});

// Update appointment status
router.put('/:appointmentId/status', [
  param('appointmentId').isMongoId(),
  body('status').isIn(['accepted', 'rejected'])
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    if (!req.user) {
      res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
      return;
    }

    const { appointmentId } = req.params;
    const { status } = req.body;

    // Get appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      res.status(404).json({ error: 'Το ραντεβού δεν βρέθηκε' });
      return;
    }

    // Check if the property belongs to the seller
    const property = await Property.findOne({
      _id: appointment.propertyId,
      userId: req.user._id
    });

    if (!property) {
      res.status(403).json({ error: 'Δεν έχετε δικαίωμα να ενημερώσετε αυτό το ραντεβού' });
      return;
    }

    // Update appointment status
    appointment.status = status;
    await appointment.save();

    // Create notification for buyer
    await Notification.create({
      userId: appointment.buyerId,
      type: 'appointment_status_change',
      message: `Το ραντεβού σας για το ακίνητο ${property.title} ${status === 'accepted' ? 'έχει εγκριθεί' : 'έχει απορριφθεί'}`,
      data: {
        appointmentId: appointment._id,
        propertyId: property._id,
        status
      },
      isRead: false
    });

    res.json(appointment);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ error: 'Σφάλμα κατά την ενημέρωση της κατάστασης του ραντεβού' });
  }
});

export const appointmentsRouter = router; 