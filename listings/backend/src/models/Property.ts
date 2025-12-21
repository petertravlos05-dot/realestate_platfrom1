import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  userId: { type: String, required: true },
  visitSettings: {
    presenceType: { type: String, enum: ['platform_only', 'seller_and_platform'] },
    schedulingType: { type: String, enum: ['seller_availability', 'buyer_proposal'] },
    availability: { type: Object },
    updatedAt: { type: Date }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Property = mongoose.model('Property', propertySchema); 