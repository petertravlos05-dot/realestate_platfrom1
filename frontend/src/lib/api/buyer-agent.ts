import { apiClient } from '@/lib/api/client';

export interface BuyerAgentRelationship {
  id: string;
  buyerId: string;
  agentId: string;
  propertyId: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface CreateBuyerAgentRequest {
  buyerId: string;
  agentId: string;
  propertyId: string;
}

export interface VerifyOtpRequest {
  relationshipId: string;
  otp: string;
}

export const buyerAgentApi = {
  create: async (data: CreateBuyerAgentRequest): Promise<BuyerAgentRelationship> => {
    const response = await apiClient.post('/buyer-agent/connect', data);
    return response.data.connection;
  },

  verifyOtp: async (data: VerifyOtpRequest): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/buyer-agent/verify-otp', data);
    return response.data;
  },

  getByBuyerId: async (buyerId: string): Promise<BuyerAgentRelationship[]> => {
    console.log('[DEBUG] buyerAgentApi.getByBuyerId - Starting with buyerId:', buyerId);
    try {
      const response = await apiClient.get(`/buyer-agent/buyer/${buyerId}`);
      console.log('[DEBUG] buyerAgentApi.getByBuyerId - API response:', response);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] buyerAgentApi.getByBuyerId - Error:', error);
      throw error;
    }
  },

  getByAgentId: async (agentId: string): Promise<BuyerAgentRelationship[]> => {
    const response = await apiClient.get(`/buyer-agent/agent/${agentId}`);
    return response.data;
  },

  updateStatus: async (id: string, status: 'confirmed' | 'rejected'): Promise<{ success: boolean }> => {
    const response = await apiClient.put(`/buyer-agent/${id}/status`, { status });
    return response.data;
  }
}; 