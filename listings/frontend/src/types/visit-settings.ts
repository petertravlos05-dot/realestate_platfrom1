export interface VisitSettings {
  availability: {
    days: string[];
    timeSlots: string[];
  };
  instructions?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
  };
} 