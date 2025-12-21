import { Router, Request, Response } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Mock locations data (matching frontend)
const mockLocations = [
  'Αθήνα',
  'Αθήνα, Κολωνάκι',
  'Αθήνα, Παγκράτι',
  'Αθήνα, Γλυφάδα',
  'Θεσσαλονίκη',
  'Θεσσαλονίκη, Καλαμαριά',
  'Θεσσαλονίκη, Τούμπα',
  'Πάτρα',
  'Ηράκλειο',
  'Λάρισα',
  'Βόλος',
  'Ιωάννινα',
  'Χανιά',
  'Καβάλα',
  'Λαμία'
];

// GET /api/locations - Get location suggestions (autocomplete)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query.q as string)?.toLowerCase() || '';

    if (query.length < 3) {
      return res.json({ suggestions: [] });
    }

    const suggestions = mockLocations.filter(location =>
      location.toLowerCase().includes(query)
    );

    res.json({ suggestions });
  } catch (error) {
    console.error('Error fetching location suggestions:', error);
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});

export default router;

