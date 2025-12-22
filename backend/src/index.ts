import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { prisma } from './lib/prisma';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Normalize origin (remove trailing slash)
    const normalizedOrigin = origin.replace(/\/$/, '');

    const allowedOrigins = process.env.FRONTEND_URL 
      ? [process.env.FRONTEND_URL.replace(/\/$/, '')] // Remove trailing slash from FRONTEND_URL
      : process.env.NODE_ENV === 'production'
      ? [] // In production, require FRONTEND_URL
      : ['http://localhost:3000', 'http://localhost:3001']; // Development defaults

    // If no specific origins set in production, allow all (for debugging - change in production)
    if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
      console.warn('⚠️ WARNING: FRONTEND_URL not set! Allowing all origins. Set FRONTEND_URL in production!');
      return callback(null, true);
    }

    // Check if origin is allowed (compare normalized versions)
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin} (normalized: ${normalizedOrigin}). Allowed origins: ${allowedOrigins.join(', ') || 'ALL (FRONTEND_URL not set)'}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Stripe webhook must use raw body parser (before JSON parser)
import stripeRoutes, { stripeWebhookHandler } from './routes/stripe';
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for uploaded images)
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
import authRoutes from './routes/auth';
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
import adminListingsRoutes from './routes/admin-listings';
import adminMessagesRoutes from './routes/admin-messages';
import adminSellersRoutes from './routes/admin-sellers';
import adminOtherRoutes from './routes/admin-other';

app.use('/api/auth', authRoutes);
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
app.use('/api/user', userRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin/users', usersRoutes); // Admin users routes
app.use('/api/viewing-requests', viewingRequestsRoutes);
app.use('/api/admin/listings', adminListingsRoutes);
app.use('/api/admin/messages', adminMessagesRoutes);
app.use('/api/admin/sellers', adminSellersRoutes);
app.use('/api/admin', adminOtherRoutes); // Admin companies, register, logs, send-message, notifications

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing Prisma connection...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;

