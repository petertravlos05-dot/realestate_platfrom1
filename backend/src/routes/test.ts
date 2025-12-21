import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/test - Basic test endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Test endpoint is working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/test - Test POST endpoint
router.post('/', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Test POST endpoint is working',
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test POST endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/test/db - Test database connection
router.get('/db', async (req: Request, res: Response) => {
  try {
    // Test Prisma connection
    await prisma.$connect();
    
    // Simple query to test database
    const userCount = await prisma.user.count();
    
    res.json({
      success: true,
      message: 'Database connection successful',
      userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing database:', error);
    res.status(500).json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;





