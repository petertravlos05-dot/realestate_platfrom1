import { Router, Request, Response } from 'express';
import { hash, compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { validateJwtToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { getJwtSecret } from '../lib/utils/jwt-secret';
import { strictRateLimit, loginRateLimit, mediumRateLimit } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validation';
import { registerSchema } from '../lib/validation/schemas';
import { auditLogger } from '../lib/utils/audit-logger';
import { setAuthCookie, clearAuthCookies } from '../lib/utils/cookie-helpers';
import { checkUserConsents, getCurrentConsentVersions } from '../lib/utils/consent-helpers';

const router = Router();

// Register endpoint
router.post('/register', strictRateLimit, validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    // req.body is now validated and sanitized by validateBody middleware
    const {
      email,
      password,
      name,
      role,
      phone,
      country,
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

    // Password match is validated by schema (registerSchema.refine)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    // Hash password (κοινό για νέο χρήστη ή ενημέρωση υπάρχοντος)
    const hashedPassword = await hash(password, 12);

    // Create user (userType ρητά για εμφάνιση στο admin tab «Εταιρείες»)
    const userData: Record<string, unknown> = {
      email,
      password: hashedPassword,
      name,
      role: role.toUpperCase(),
      ...(phone && { phone }),
      ...(country && { country }),
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
    };
    const normalizedUserType =
      userType !== undefined && userType !== null && String(userType).trim() !== ''
        ? String(userType).trim().toUpperCase()
        : '';
    if (normalizedUserType === 'COMPANY' || normalizedUserType === 'INDIVIDUAL') {
      userData.userType = normalizedUserType;
    }

    // Block professional roles from regular registration — only /professional/join (header or referer)
    const professionalRoles = ['LAWYER', 'NOTARY', 'ENGINEER', 'ACCOUNTANT'];
    const isProfessionalRegistration =
      req.headers['x-professional-registration'] === 'true' ||
      String(req.headers['referer'] || '').includes('/professional/join');

    if (professionalRoles.includes(role.toUpperCase())) {
      if (!isProfessionalRegistration) {
        return res.status(403).json({
          error: 'Οι επαγγελματίες μπορούν να εγγραφούν μόνο από τη σελίδα επαγγελματιών'
        });
      }
    }

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

    const joinFlag =
      isProfessionalRegistration && professionalRoles.includes(role.toUpperCase())
        ? { registeredViaProfessionalJoin: true as const }
        : {};

    let user;
    if (existingUser) {
      const { email: _omitEmail, ...updatePayload } = userData;
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: { ...updatePayload, ...joinFlag } as any,
      });
    } else {
      try {
        user = await prisma.user.create({
          data: { ...userData, ...joinFlag } as any,
        });
      } catch (createErr) {
        const msg = createErr instanceof Error ? createErr.message : String(createErr);
        if (
          joinFlag &&
          (msg.includes('registeredViaProfessionalJoin') ||
            msg.includes('does not exist') ||
            msg.toLowerCase().includes('column'))
        ) {
          user = await prisma.user.create({ data: userData as any });
        } else {
          throw createErr;
        }
      }
    }

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

    // Audit log: User registration
    auditLogger.loginSuccess(req as AuthRequest, user.id, user.email);

    res.json({
      user: userWithoutPassword,
      message: 'Η εγγραφή ολοκληρώθηκε με επιτυχία'
    });
  } catch (error) {
    console.error('Registration error:', error);
    auditLogger.apiError(req, error instanceof Error ? error : new Error('Unknown error'), '/register');
    res.status(500).json({
      error: 'Σφάλμα κατά την εγγραφή. Παρακαλώ δοκιμάστε ξανά.'
    });
  }
});

// Professional login endpoint - only allows professionals (LAWYER, NOTARY, ENGINEER, ACCOUNTANT)
// NOTE: Rate limit temporarily disabled for testing
router.post('/professional/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email και password είναι υποχρεωτικά'
      });
    }

    // Validate email format (basic check - must contain @)
    const emailStr = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!emailStr || emailStr.length === 0) {
      return res.status(400).json({
        error: 'Παρακαλώ εισάγετε το email σας'
      });
    }
    if (!emailStr.includes('@')) {
      return res.status(400).json({
        error: 'Παρακαλώ εισάγετε έγκυρη διεύθυνση email (π.χ. name@domain.com)'
      });
    }

    // Find user (case-insensitive - email may be stored with different casing)
    let user;
    try {
      user = await prisma.user.findFirst({
        where: {
          email: { equals: emailStr, mode: 'insensitive' }
        }
      });
    } catch (dbError) {
      console.error('Database error during professional login:', dbError);
      return res.status(500).json({
        error: 'Database error. Please try again later.'
      });
    }

    if (!user) {
      try {
        auditLogger.loginFailure(req, emailStr, 'User not found (professional login)');
      } catch (auditError) {
        console.error('Audit logging error (non-fatal):', auditError);
      }
      return res.status(401).json({
        error: 'Λανθασμένο email ή κωδικός'
      });
    }

    // Check if account is deleted
    if (user.isDeleted) {
      try {
        auditLogger.loginFailure(req, emailStr, 'Account deleted (professional login)');
      } catch (auditError) {
        console.error('Audit logging error (non-fatal):', auditError);
      }
      return res.status(403).json({
        error: 'ACCOUNT_DELETED',
        message: 'This account has been deleted and access is no longer available.'
      });
    }

    // Check password
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      try {
        auditLogger.loginFailure(req, emailStr, 'Invalid password (professional login)');
      } catch (auditError) {
        console.error('Audit logging error (non-fatal):', auditError);
      }
      return res.status(401).json({
        error: 'Λανθασμένο email ή κωδικός'
      });
    }

    // ONLY allow professionals - block non-professionals
    if (user.role !== 'LAWYER' && user.role !== 'NOTARY' && user.role !== 'ENGINEER' && user.role !== 'ACCOUNTANT') {
      try {
        auditLogger.loginFailure(req, emailStr, 'Non-professional account attempted login through professional endpoint');
      } catch (auditError) {
        console.error('Audit logging error (non-fatal):', auditError);
      }
      return res.status(403).json({
        error: 'NOT_PROFESSIONAL_ACCOUNT',
        message: 'Μόνο οι επαγγελματίες μπορούν να συνδεθούν από αυτή τη σελίδα.'
      });
    }

    // Check consent requirements
    const consentCheck = await checkUserConsents(user.id, ['TERMS', 'PRIVACY']);
    if (!consentCheck.hasAllConsents) {
      // User missing required consents - return 428 Precondition Required
      const currentVersions = getCurrentConsentVersions();
      // Convert to lowercase for API response (as per spec)
      const requiredLowercase = consentCheck.missingConsents.map(c => c.toLowerCase());
      return res.status(428).json({
        error: 'CONSENT_REQUIRED',
        required: requiredLowercase,
        versions: {
          terms: currentVersions.TERMS,
          privacy: currentVersions.PRIVACY,
        },
        message: 'Please accept the latest Terms of Service and Privacy Policy to continue.',
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    // Audit log: Successful professional login
    const authReq = req as AuthRequest;
    authReq.userId = user.id;
    authReq.userEmail = user.email;
    authReq.userRole = user.role;
    auditLogger.loginSuccess(authReq, user.id, user.email);

    // Set access token cookie (7 days = 604800 seconds)
    setAuthCookie(res, token, 7 * 24 * 60 * 60);

    // Return user data and token (for backward compatibility with Bearer token auth)
    // Frontend can use either cookie or Authorization header
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
      token // Keep token in response for backward compatibility
    });
  } catch (error) {
    console.error('Professional login error:', error);
    auditLogger.apiError(req, error instanceof Error ? error : new Error('Unknown error'), '/professional/login');
    res.status(500).json({
      error: 'Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.'
    });
  }
});

// Login endpoint
router.post('/login', loginRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email και password είναι υποχρεωτικά'
      });
    }

    // Validate email format (basic check)
    const loginEmailStr = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!loginEmailStr) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Find user (case-insensitive - email may be stored with different casing)
    let user;
    try {
      user = await prisma.user.findFirst({
        where: {
          email: { equals: loginEmailStr, mode: 'insensitive' }
        }
      });
    } catch (dbError) {
      console.error('Database error during login:', dbError);
      return res.status(500).json({
        error: 'Database error. Please try again later.'
      });
    }

    if (!user) {
      try {
        auditLogger.loginFailure(req, email, 'User not found');
      } catch (auditError) {
        console.error('Audit logging error (non-fatal):', auditError);
      }
      return res.status(401).json({
        error: 'Λανθασμένο email ή κωδικός'
      });
    }

    // Check if account is deleted
    if (user.isDeleted) {
      try {
        auditLogger.loginFailure(req, email, 'Account deleted');
      } catch (auditError) {
        console.error('Audit logging error (non-fatal):', auditError);
      }
      return res.status(403).json({
        error: 'ACCOUNT_DELETED',
        message: 'This account has been deleted and access is no longer available.'
      });
    }

    // Check password
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      try {
        auditLogger.loginFailure(req, email, 'Invalid password');
      } catch (auditError) {
        console.error('Audit logging error (non-fatal):', auditError);
      }
      return res.status(401).json({
        error: 'Λανθασμένο email ή κωδικός'
      });
    }

    // Block professionals from logging in through non-professional login endpoints
    // Professionals can only access the platform through /professional/join
    if (user.role === 'LAWYER' || user.role === 'NOTARY' || user.role === 'ENGINEER' || user.role === 'ACCOUNTANT') {
      try {
        auditLogger.loginFailure(req, email, 'Professional account attempted login through non-professional endpoint');
      } catch (auditError) {
        console.error('Audit logging error (non-fatal):', auditError);
      }
      return res.status(403).json({
        error: 'PROFESSIONAL_ACCOUNT',
        message: 'Οι επαγγελματίες δεν μπορούν να συνδεθούν από αυτή τη σελίδα. Χρησιμοποιήστε τον επαγγελματικό λογαριασμό σας.'
      });
    }

    // Check consent requirements
    const consentCheck = await checkUserConsents(user.id, ['TERMS', 'PRIVACY']);
    if (!consentCheck.hasAllConsents) {
      // User missing required consents - return 428 Precondition Required
      const currentVersions = getCurrentConsentVersions();
      // Convert to lowercase for API response (as per spec)
      const requiredLowercase = consentCheck.missingConsents.map(c => c.toLowerCase());
      return res.status(428).json({
        error: 'CONSENT_REQUIRED',
        required: requiredLowercase,
        versions: {
          terms: currentVersions.TERMS,
          privacy: currentVersions.PRIVACY,
        },
        message: 'Please accept the latest Terms of Service and Privacy Policy to continue.',
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    // Audit log: Successful login
    const authReq = req as AuthRequest;
    authReq.userId = user.id;
    authReq.userEmail = user.email;
    authReq.userRole = user.role;
    auditLogger.loginSuccess(authReq, user.id, user.email);

    // Set access token cookie (7 days = 604800 seconds)
    setAuthCookie(res, token, 7 * 24 * 60 * 60);

    // Return user data and token (for backward compatibility with Bearer token auth)
    // Frontend can use either cookie or Authorization header
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
      token // Keep token in response for backward compatibility
    });
  } catch (error) {
    console.error('Login error:', error);
    auditLogger.apiError(req, error instanceof Error ? error : new Error('Unknown error'), '/login');
    res.status(500).json({
      error: 'Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.'
    });
  }
});

// Update role endpoint
router.put('/update-role', mediumRateLimit, validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { role } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
    }

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    // Get current user to log old role
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role.toUpperCase() }
    });

    // Audit log: Role change
    auditLogger.roleChange(req, userId, currentUser?.role || 'UNKNOWN', updatedUser.role);

    // Create new JWT token
    const newToken = jwt.sign(
      {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    // Set access token cookie (24 hours = 86400 seconds)
    setAuthCookie(res, newToken, 24 * 60 * 60);

    res.json({
      token: newToken, // Keep token in response for backward compatibility
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Error updating role:', error);
    auditLogger.apiError(req, error instanceof Error ? error : new Error('Unknown error'), '/update-role');
    res.status(500).json({
      error: 'Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.'
    });
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', mediumRateLimit, validateJwtToken, async (req: AuthRequest, res: Response) => {
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

// POST /api/auth/change-password - Change password for authenticated user
router.post('/change-password', mediumRateLimit, validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body || {};

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'Τρέχων και νέος κωδικός απαιτούνται (νέος τουλάχιστον 6 χαρακτήρες)',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user || !user.password) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Ο τρέχων κωδικός δεν είναι σωστός' });
    }

    const hashedPassword = await hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Ο κωδικός άλλαξε επιτυχώς' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.',
    });
  }
});

// Logout endpoint
router.post('/logout', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    // Clear authentication cookies
    clearAuthCookies(res);

    // Audit log: Logout
    if (req.userId) {
      auditLogger.loginSuccess(req, req.userId, req.userEmail || 'unknown', 'logout');
    }

    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    auditLogger.apiError(req, error instanceof Error ? error : new Error('Unknown error'), '/logout');
    res.status(500).json({
      error: 'Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.'
    });
  }
});

export default router;

