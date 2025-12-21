export interface Appointment {
  id: string;
  propertyId: string;
  propertyTitle: string;
  buyer: {
    name: string;
    email: string;
    phone?: string;
  };
  date: string;
  time: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
} 