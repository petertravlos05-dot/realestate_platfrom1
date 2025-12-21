import { apiClient } from './client';

export interface Appointment {
  id: string;
  propertyId: string;
  propertyTitle: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
}

export interface CreateAppointmentRequest {
  propertyId: string;
  clientId: string;
  date: string;
  time: string;
  notes?: string;
}

export interface UpdateAppointmentRequest {
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
}

export interface AppointmentResponse {
  success: boolean;
  appointment?: Appointment;
  error?: string;
}

export const appointmentsApi = {
  getAll: async (): Promise<Appointment[]> => {
    const response = await apiClient.get('/appointments');
    return response.data;
  },

  getById: async (id: string): Promise<Appointment> => {
    const response = await apiClient.get(`/appointments/${id}`);
    return response.data;
  },

  create: async (data: CreateAppointmentRequest): Promise<AppointmentResponse> => {
    const response = await apiClient.post('/appointments', data);
    return response.data;
  },

  update: async (id: string, data: UpdateAppointmentRequest): Promise<AppointmentResponse> => {
    const response = await apiClient.put(`/appointments/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/appointments/${id}`);
    return response.data;
  },
}; 