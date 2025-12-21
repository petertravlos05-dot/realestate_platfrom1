import { Router, Request, Response } from 'express';
import { hash, compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { validateJwtToken, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      name,
      role,
      phone,
      companyName,
      companyTitle,
      companyTaxId,
      companyDou,
      companyPhone,
      companyEmail,
      companyHeadquarters,
      companyWebsite,
      companyWorkingHours,
      contactPersonName,
      contactPersonEmail,
      contactPersonPhone,
      companyLogo,
      licenseNumber,
      businessAddress,
      userType,
      confirmPassword,
    } = req.body;

    // Validate required fields
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        error: 'Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία'
      });
    }

    // Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        error: 'Οι κωδικοί δεν ταιριάζουν'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Update existing user with new password
      const hashedPassword = await hash(password, 12);
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword }
      });
      const { password: _, ...userWithoutPassword } = updatedUser;
      return res.json({
        user: userWithoutPassword,
        message: 'Η εγγραφή ολοκληρώθηκε με επιτυχία'
      });
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const userData = {
      email,
      password: hashedPassword,
      name,
      role: role.toUpperCase(),
      ...(phone && { phone }),
      ...(companyName && { companyName }),
      ...(companyTitle && { companyTitle }),
      ...(companyTaxId && { companyTaxId }),
      ...(companyDou && { companyDou }),
      ...(companyPhone && { companyPhone }),
      ...(companyEmail && { companyEmail }),
      ...(companyHeadquarters && { companyHeadquarters }),
      ...(companyWebsite && { companyWebsite }),
      ...(companyWorkingHours && { companyWorkingHours }),
      ...(contactPersonName && { contactPersonName }),
      ...(contactPersonEmail && { contactPersonEmail }),
      ...(contactPersonPhone && { contactPersonPhone }),
      ...(companyLogo && { companyLogo }),
      ...(licenseNumber && { licenseNumber }),
      ...(businessAddress && { businessAddress }),
      ...(userType && { userType: userType.toUpperCase() })
    };

    // Validate role-specific requirements
    if (role.toUpperCase() === 'SELLER' && !phone) {
      return res.status(400).json({
        error: 'Το τηλέφωνο είναι υποχρεωτικό για τους πωλητές'
      });
    }

    if (role.toUpperCase() === 'AGENT' && (!licenseNumber || !phone)) {
      return res.status(400).json({
        error: 'Ο αριθμός άδειας και το τηλέφωνο είναι υποχρεωτικά για τους μεσίτες'
      });
    }

    // Validate company-specific requirements
    if (userType && userType.toUpperCase() === 'COMPANY') {
      if (!companyName || !companyTaxId || !companyDou || !companyPhone || 
          !companyEmail || !companyHeadquarters || !companyWorkingHours ||
          !contactPersonName || !contactPersonEmail || !contactPersonPhone) {
        return res.status(400).json({
          error: 'Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία εταιρείας'
        });
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: userData
    });

    // Check for matching leads
    const matchingLeads = await prisma.propertyLead.findMany({
      where: {
        buyer: {
          name: name,
          email: email,
          phone: phone
        }
      },
      include: {
        property: true
      }
    });

    // Update leads with new user ID
    if (matchingLeads.length > 0) {
      for (const lead of matchingLeads) {
        await prisma.propertyLead.update({
          where: { id: lead.id },
          data: { buyerId: user.id }
        });
      }
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      message: 'Η εγγραφή ολοκληρώθηκε με επιτυχία'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την εγγραφή. Παρακαλώ δοκιμάστε ξανά.'
    });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email και password είναι υποχρεωτικά'
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Λανθασμένο email ή κωδικός'
      });
    }

    // Check password
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Λανθασμένο email ή κωδικός'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'Agapao_ton_stivo05',
      { expiresIn: '7d' }
    );

    // Return user data and token
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        companyName: user.companyName,
        licenseNumber: user.licenseNumber,
        businessAddress: user.businessAddress,
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.'
    });
  }
});

// Update role endpoint
router.put('/update-role', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { role } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
    }

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role.toUpperCase() }
    });

    // Create new JWT token
    const newToken = jwt.sign(
      {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      },
      process.env.JWT_SECRET || 'Agapao_ton_stivo05',
      { expiresIn: '24h' }
    );

    res.json({
      token: newToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      error: 'Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.'
    });
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        phone: true,
        companyName: true,
        licenseNumber: true,
        businessAddress: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'Failed to fetch user profile'
    });
  }
});

// GET /api/auth/check-email - Check if email exists
router.get('/check-email', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({
        error: 'Email parameter is required'
      });
    }

    // Check if user exists with this email
    const user = await prisma.user.findUnique({
      where: { email: email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.json({
      exists: !!user,
      user: user
    });
  } catch (error) {
    console.error('Error checking user email:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;

