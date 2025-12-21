import { apiClient } from '@/lib/api/client';

export interface Property {
  id: string;
  title: string;
  description: string;
  price: string;
  location: string;
  type: 'APARTMENT' | 'HOUSE' | 'LAND' | 'COMMERCIAL';
  status: 'ACTIVE' | 'PENDING' | 'SOLD' | 'RENTED';
  bedrooms?: number;
  bathrooms?: number;
  area: number;
  features: string[];
  images: string[];
  views: number;
  inquiries: number;
  sellerName: string;
  createdAt: string;
  updatedAt: string;
}

// Παραδείγματα ακινήτων για development
export const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Μοντέρνο Διαμέρισμα στο Κέντρο',
    description: 'Πλήρως ανακαινισμένο διαμέρισμα με μοντέρνες ανέσεις και εκπληκτική θέα στην πόλη.',
    price: '250.000€',
    location: 'Κέντρο, Αθήνα',
    type: 'APARTMENT',
    status: 'ACTIVE',
    bedrooms: 2,
    bathrooms: 1,
    area: 85,
    features: ['Ανακαινισμένο', 'Θέα στην πόλη', 'Κεντρική θέρμανση', 'Ασανσέρ', 'Πόρτα ασφαλείας'],
    images: [
      'https://example.com/apartment1.jpg',
      'https://example.com/apartment1-2.jpg'
    ],
    views: 150,
    inquiries: 12,
    sellerName: 'Γιώργος Παπαδόπουλος',
    createdAt: '2024-03-15T10:00:00Z',
    updatedAt: '2024-03-15T10:00:00Z'
  },
  {
    id: '2',
    title: 'Πολυτελής Μονοκατοικία στα Βόρεια Προάστια',
    description: 'Εντυπωσιακή μονοκατοικία με ιδιωτικό κήπο και πισίνα σε προνομιούχα περιοχή.',
    price: '850.000€',
    location: 'Κηφισιά, Αθήνα',
    type: 'HOUSE',
    status: 'ACTIVE',
    bedrooms: 4,
    bathrooms: 3,
    area: 280,
    features: ['Πισίνα', 'Κήπος', 'Τζάκι', 'Smart home', 'Ηλιακός θερμοσίφωνας', 'Διπλό γκαράζ'],
    images: [
      'https://example.com/house1.jpg',
      'https://example.com/house1-2.jpg'
    ],
    views: 320,
    inquiries: 25,
    sellerName: 'Μαρία Κωνσταντίνου',
    createdAt: '2024-03-10T14:30:00Z',
    updatedAt: '2024-03-14T09:15:00Z'
  }
];

export interface CreatePropertyRequest {
  title: string;
  description: string;
  price: string;
  location: string;
  type: Property['type'];
  bedrooms?: number;
  bathrooms?: number;
  area: number;
  features: string[];
  images: string[];
}

export interface UpdatePropertyRequest {
  title?: string;
  description?: string;
  price?: string;
  location?: string;
  type?: Property['type'];
  status?: Property['status'];
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  features?: string[];
  images?: string[];
}

export interface PropertyResponse {
  success: boolean;
  property: Property;
}

export const propertiesApi = {
  getAll: async (): Promise<Property[]> => {
    const response = await apiClient.get('/properties');
    return response.data;
  },

  getById: async (id: string): Promise<Property> => {
    const response = await apiClient.get(`/properties/${id}`);
    return response.data;
  },

  create: async (data: CreatePropertyRequest): Promise<PropertyResponse> => {
    const response = await apiClient.post('/properties', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePropertyRequest): Promise<PropertyResponse> => {
    const response = await apiClient.put(`/properties/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/properties/${id}`);
    return response.data;
  },

  incrementViews: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/properties/${id}/views`);
    return response.data;
  },

  addInquiry: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/properties/${id}/inquiries`);
    return response.data;
  }
}; 