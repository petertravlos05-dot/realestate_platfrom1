import { apiClient } from './client';

export interface SharePropertyRequest {
  propertyId: string;
  agentId: string;
}

export interface SharePropertyResponse {
  success: boolean;
  shareUrl?: string;
  error?: string;
}

export const shareApi = {
  shareProperty: async (data: SharePropertyRequest): Promise<SharePropertyResponse> => {
    const response = await apiClient.post('/share/property', data);
    return response.data;
  },
}; 