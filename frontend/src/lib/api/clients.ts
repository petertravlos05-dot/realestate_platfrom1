import { apiClient } from './client';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'buyer' | 'seller';
  activeListings: number;
  lastContact: string;
  isVerified: boolean;
}

export interface AddClientRequest {
  name: string;
  email: string;
  phone: string;
  type: 'buyer' | 'seller';
}

export interface AddClientResponse {
  success: boolean;
  clientId?: string;
  error?: string;
}

export interface VerifyOtpRequest {
  clientId: string;
  otp: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  error?: string;
}

export const clientsApi = {
  // Get all clients
  getAll: async (): Promise<Client[]> => {
    const response = await apiClient.get('/clients');
    return response.data;
  },

  // Get a single client
  getById: async (id: string): Promise<Client> => {
    const response = await apiClient.get(`/clients/${id}`);
    return response.data;
  },

  // Add a new client
  add: async (data: AddClientRequest): Promise<AddClientResponse> => {
    const response = await apiClient.post('/clients', data);
    return response.data;
  },

  // Verify OTP for a client
  verifyOtp: async (data: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
    const response = await apiClient.post('/clients/verify-otp', data);
    return response.data;
  },

  // Update a client
  update: async (id: string, data: Partial<Client>): Promise<{ success: boolean }> => {
    const response = await apiClient.put(`/clients/${id}`, data);
    return response.data;
  },

  // Delete a client
  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/clients/${id}`);
    return response.data;
  },
}; 