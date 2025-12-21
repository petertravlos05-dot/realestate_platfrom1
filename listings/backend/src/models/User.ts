import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'BUYER'
  },
  phone: String,
  companyName: String,
  licenseNumber: String,
  businessAddress: String
}, {
  timestamps: true
});

export const User = mongoose.model('User', userSchema); 