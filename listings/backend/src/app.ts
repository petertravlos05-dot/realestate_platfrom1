import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { propertiesRouter } from './routes/seller/properties';
import { appointmentsRouter } from './routes/seller/appointments';
import { authRouter } from './routes/auth';

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3004',
    'http://192.168.1.6:3000',
    'http://192.168.1.6:3004'
  ],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/seller/properties', propertiesRouter);
app.use('/api/seller/appointments', appointmentsRouter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/realestate')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app; 