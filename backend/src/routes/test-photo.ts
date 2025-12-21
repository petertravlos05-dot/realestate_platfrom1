import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Configure multer for file uploads
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
    const fileName = `test_${timestamp}_${file.originalname}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

// POST /api/test-photo - Upload test photo
router.post('/', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo provided' });
    }

    // Generate URL for the saved file
    const fileUrl = `/uploads/properties/${req.file.filename}`;

    res.json({
      success: true,
      fileUrl,
      message: 'Photo uploaded successfully',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({
      error: 'Failed to upload photo',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/test-photo - List test photos
router.get('/', async (req: Request, res: Response) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'properties');
    
    try {
      const files = await fs.readdir(uploadsDir);
      const testFiles = files.filter(file => file.startsWith('test_'));
      
      const fileDetails = await Promise.all(
        testFiles.map(async (file) => {
          const filePath = path.join(uploadsDir, file);
          const stats = await fs.stat(filePath);
          return {
            filename: file,
            url: `/uploads/properties/${file}`,
            size: stats.size,
            createdAt: stats.birthtime
          };
        })
      );

      res.json({
        success: true,
        count: fileDetails.length,
        files: fileDetails
      });
    } catch (error) {
      // Directory doesn't exist or is empty
      res.json({
        success: true,
        count: 0,
        files: []
      });
    }
  } catch (error) {
    console.error('Error listing test photos:', error);
    res.status(500).json({
      error: 'Failed to list test photos',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/test-photo/:filename - Delete a test photo
router.delete('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Security check: only allow deletion of test files
    if (!filename.startsWith('test_')) {
      return res.status(400).json({ error: 'Can only delete test files' });
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', 'properties', filename);
    
    try {
      await fs.unlink(filePath);
      res.json({
        success: true,
        message: 'Photo deleted successfully',
        filename
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return res.status(404).json({ error: 'File not found' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({
      error: 'Failed to delete photo',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;





