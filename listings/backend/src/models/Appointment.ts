import { Document, Schema, model, Types } from 'mongoose';

export interface IAppointment extends Document {
  propertyId: Types.ObjectId;
  buyerId: Types.ObjectId;
  date: Date;
  time: string;
  status: string;
  submittedByBuyer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema({
  propertyId: {
    type: Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'PENDING'
  },
  submittedByBuyer: {
    type: Boolean,
    required: true
  }
}, {
  timestamps: true
});

export const Appointment = model<IAppointment>('Appointment', appointmentSchema); 