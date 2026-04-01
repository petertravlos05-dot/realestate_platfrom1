// IMPORTANT: Import instrument.ts FIRST - this initializes Sentry before Express is imported
// This MUST be the first import to ensure Express is properly instrumented
import './instrument';

// Now import Express and other modules
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import helmet from 'helmet';
import { prisma } from './lib/prisma';
import { getJwtSecret } from './lib/utils/jwt-secret';
import { securityHeaders, getCorsOptions } from './middleware/security-headers';
import { requestIdMiddleware } from './middleware/request-id';
import { csrfProtection } from './middleware/csrf';
import { setRequestContext, Sentry } from './lib/sentry';

// Validate critical environment variables at startup
function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Required in all environments
  const requiredVars = [
    'JWT_SECRET',
    'DATABASE_URL',
  ];

  // Required only in production
  // Note: FRONTEND_URL or FRONTEND_ORIGIN must be set (checked separately)
  const productionRequiredVars: string[] = [];

  const missing: string[] = [];

  // Check required vars
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check production-only vars
  if (isProduction) {
    for (const varName of productionRequiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }
    
    // Check FRONTEND_URL or FRONTEND_ORIGIN (at least one must be set)
    const frontendOrigin = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL;
    if (!frontendOrigin) {
      missing.push('FRONTEND_ORIGIN or FRONTEND_URL');
    }
  }

  if (missing.length > 0) {
    console.error('❌ CRITICAL: Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease set these variables in your .env file or environment.');
    console.error('See .env.example for reference.\n');
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  try {
    getJwtSecret();
  } catch (error) {
    console.error('❌ CRITICAL: JWT_SECRET validation failed:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    console.warn('⚠️  WARNING: DATABASE_URL does not appear to be a PostgreSQL connection string.');
  }

  // Validate FRONTEND_URL or FRONTEND_ORIGIN in production
  const frontendOrigin = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL;
  if (isProduction && frontendOrigin) {
    const frontendUrls = frontendOrigin.split(',').map(url => url.trim());
    const invalidUrls = frontendUrls.filter(url => !url.startsWith('https://'));
    if (invalidUrls.length > 0) {
      console.warn('⚠️  WARNING: FRONTEND_ORIGIN/FRONTEND_URL should use HTTPS in production:');
      invalidUrls.forEach(url => console.warn(`   - ${url}`));
    }
  }

  // Warn about COOKIE_DOMAIN in production (recommended for cookie-based auth)
  if (isProduction && !process.env.COOKIE_DOMAIN) {
    console.warn('⚠️  WARNING: COOKIE_DOMAIN not set. Cookie-based auth may not work across subdomains.');
    console.warn('   Set COOKIE_DOMAIN=.yourdomain.com to enable cross-subdomain cookie sharing.');
  }

  // Warn about missing consent version configuration
  if (!process.env.TERMS_VERSION || !process.env.PRIVACY_VERSION) {
    console.warn('⚠️  WARNING: Consent versions not configured.');
    console.warn('   Set TERMS_VERSION and PRIVACY_VERSION environment variables.');
    console.warn('   Defaulting to: TERMS_VERSION=2026-01-01, PRIVACY_VERSION=2026-01-01');
  }

  // Warn about missing optional but recommended vars
  const recommendedVars = [
    { name: 'STRIPE_SECRET_KEY', description: 'Stripe payments will not work' },
    { name: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe webhooks will not work' },
    { name: 'AWS_ACCESS_KEY_ID', description: 'S3 file uploads will not work' },
    { 
      name: 'RATE_LIMIT_REDIS_URL', 
      description: process.env.RATE_LIMIT_REDIS_URL 
        ? 'Redis configured for distributed rate limiting' 
        : 'Using in-memory rate limiting (not suitable for production with multiple instances)' 
    },
  ];

  const missingRecommended: string[] = [];
  for (const { name, description } of recommendedVars) {
    if (!process.env[name]) {
      missingRecommended.push(`${name} (${description})`);
    }
  }

  if (missingRecommended.length > 0 && isProduction) {
    console.warn('⚠️  WARNING: Missing recommended environment variables:');
    missingRecommended.forEach(v => console.warn(`   - ${v}`));
    console.warn('');
  }

  console.log('✅ Environment validation passed');
}

// Run validation before starting server
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (Render.com runs behind reverse proxy)
app.set('trust proxy', 1);

// Security Headers Middleware (must be before other middleware)
// Use helmet for common security headers, but customize CSP
// Build CSP directives dynamically based on environment
const frontendOrigin = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || '';
const frontendDomains = frontendOrigin.split(',').map(url => url.trim()).filter(Boolean);

const s3Bucket = process.env.AWS_S3_BUCKET;
const s3Region = process.env.AWS_REGION || 'us-east-1';
const s3Domain = s3Bucket ? `https://${s3Bucket}.s3.${s3Region}.amazonaws.com` : null;

const sentryDsn = process.env.SENTRY_DSN_BACKEND || '';
const sentryDomain = sentryDsn.match(/https?:\/\/([^\/]+)/)?.[0] || null;

const stripeDomains = [
  'https://js.stripe.com',
  'https://hooks.stripe.com',
  'https://checkout.stripe.com',
];

const imgSrc: string[] = ["'self'", 'data:', 'blob:'];
if (s3Domain) imgSrc.push(s3Domain);
if (frontendDomains.length > 0) imgSrc.push(...frontendDomains);

const connectSrc: string[] = ["'self'"];
if (frontendDomains.length > 0) connectSrc.push(...frontendDomains);
if (sentryDomain) connectSrc.push(sentryDomain);
connectSrc.push(...stripeDomains);

const frameSrc: string[] = [];
if (stripeDomains.length > 0) frameSrc.push(...stripeDomains);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        scriptSrc: ["'self'"], // TODO: Remove 'unsafe-inline' and 'unsafe-eval' when possible
        styleSrc: ["'self'", "'unsafe-inline'"], // TODO: Replace with nonce-based CSP later
        imgSrc,
        fontSrc: ["'self'", 'data:'],
        connectSrc,
        frameSrc: frameSrc.length > 0 ? frameSrc : ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
      // HSTS is only enabled in production (HTTPS required)
      // Helmet automatically disables HSTS for non-HTTPS connections
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// Custom security headers (additional to helmet)
app.use(securityHeaders);

// Request ID middleware (must be early in the chain for correlation)
app.use(requestIdMiddleware);

// Sentry Express integration (must be before routes, after requestIdMiddleware)
if (process.env.SENTRY_ENABLE === 'true') {
  // Set request context for Sentry (after requestIdMiddleware sets requestId)
  app.use((req, res, next) => {
    setRequestContext(req);
    next();
  });
  
  // Express integration handles request tracking automatically via expressIntegration()
  // No need for manual requestHandler() in Sentry v10
}

// Cookie parser middleware (must be before CSRF and routes that use cookies)
app.use(cookieParser());

// CORS configuration (must be after security headers, before CSRF)
const corsOptions = getCorsOptions();
app.use(cors(corsOptions));

// CSRF protection middleware (must be after cookie parser and CORS, before routes)
// Note: CSRF only applies to state-changing requests; safe methods (GET, HEAD, OPTIONS) are exempt
app.use(csrfProtection);

// Stripe webhook must use raw body parser (before JSON parser)
// Must be registered BEFORE CSRF middleware to bypass CSRF protection
import stripeRoutes, { stripeWebhookHandler } from './routes/stripe';
import { webhookRateLimit } from './middleware/rateLimit';
app.post('/api/stripe/webhook', webhookRateLimit, express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (for uploaded images)
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Public health check (no auth, no DB calls, fast)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'backend',
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  });
});

// Routes
import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import propertiesRoutes from './routes/properties';
import sellerRoutes from './routes/seller';
import agentRoutes from './routes/agent';
import appointmentsRoutes from './routes/appointments';
import buyerAgentRoutes from './routes/buyer-agent';
import buyerRoutes from './routes/buyer';
import favoritesRoutes from './routes/favorites';
import debugRoutes from './routes/debug';
import notificationsRoutes from './routes/notifications';
import locationsRoutes from './routes/locations';
import referralsRoutes from './routes/referrals';
import subscriptionsRoutes from './routes/subscriptions';
import subscriptionPlansRoutes from './routes/subscription-plans';
import supportRoutes from './routes/support';
import testRoutes from './routes/test';
import testNotificationRoutes from './routes/test-notification';
import testPhotoRoutes from './routes/test-photo';
import transactionsRoutes from './routes/transactions';
import adminTransactionsRoutes from './routes/admin-transactions';
import userRoutes from './routes/user';
import usersRoutes from './routes/users';
import viewingRequestsRoutes from './routes/viewing-requests';
import consentsRoutes from './routes/consents';
import adminListingsRoutes from './routes/admin-listings';
import adminMessagesRoutes from './routes/admin-messages';
import adminSellersRoutes from './routes/admin-sellers';
import adminOtherRoutes from './routes/admin-other';
import adminRoutes from './routes/admin';
import adminProfessionalsRoutes from './routes/admin-professionals';
import dealsRoutes from './routes/deals';
import professionalsRoutes from './routes/professionals';
import dealChatRoutes from './routes/deal-chat';
import dealDocumentsRoutes from './routes/deal-documents';
import dealAppointmentsRoutes from './routes/deal-appointments';
import dealEventsRoutes from './routes/deal-events';
import professionalEventsRoutes from './routes/professional-events';
import generateDescriptionRoutes from './routes/generate-description';

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/agents', agentRoutes); // Alias for /api/agents routes
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/buyer-agent', buyerAgentRoutes);
app.use('/api/buyer', buyerRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/subscription-plans', subscriptionPlansRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/test', testRoutes);
app.use('/api/test-notification', testNotificationRoutes);
app.use('/api/test-photo', testPhotoRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/admin/transactions', adminTransactionsRoutes);
// Register /api/user/consents BEFORE /api/user to avoid route conflicts
app.use('/api/user/consents', consentsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin/users', usersRoutes); // Admin users routes
app.use('/api/admin/professionals', adminProfessionalsRoutes);
app.use('/api/viewing-requests', viewingRequestsRoutes);
app.use('/api/admin/listings', adminListingsRoutes);
app.use('/api/admin/messages', adminMessagesRoutes);
app.use('/api/admin/sellers', adminSellersRoutes);
app.use('/api/admin', adminOtherRoutes); // Admin companies, register, logs, send-message, notifications
app.use('/api/admin', adminRoutes); // Admin GDPR health endpoints

// Deal Room Routes (register after admin routes to avoid conflicts)
app.use('/api/deals', dealsRoutes);
app.use('/api/professionals', professionalsRoutes);
app.use('/api', dealChatRoutes); // Includes /api/deals/:dealId/threads and /api/threads/:threadId/messages
app.use('/api', dealDocumentsRoutes); // Includes /api/deals/:dealId/documents and /api/documents/:docId/*
app.use('/api', dealAppointmentsRoutes); // Includes /api/deals/:dealId/appointments and /api/appointments/:id/*
app.use('/api', dealEventsRoutes); // SSE: /api/deals/:dealId/events
app.use('/api/professionals', professionalEventsRoutes); // SSE: /api/professionals/me/events
app.use('/api/generate-description', generateDescriptionRoutes);

// Sentry error handler (must be before other error handlers, after routes)
// This must be registered after all controllers and before any other error middleware
if (process.env.SENTRY_ENABLE === 'true') {
  Sentry.setupExpressErrorHandler(app);
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  // Handle multer errors (file upload errors)
  if (err instanceof Error && (err.message.includes('File too large') || err.message.includes('Forbidden file extension') || err.message.includes('Invalid file type'))) {
    return res.status(400).json({
      error: err.message || 'File upload validation failed'
    });
  }
  
  // Handle multer LIMIT_FILE_SIZE error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large. Maximum size is 10MB'
    });
  }
  
  // Handle multer LIMIT_FILE_COUNT error
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Too many files. Maximum allowed files exceeded'
    });
  }
  
  // Use status from error if available, otherwise default to 500
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle port already in use error
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error('   Please stop the existing server or use a different port.');
    console.error(`   To find and kill the process: netstat -ano | findstr :${PORT}`);
    process.exit(1);
  } else {
    throw err;
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing Prisma connection...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;

