import { apiClient } from '@/lib/api/client';

export interface TransactionProgress {
  id: string;
  status: string;
  comment: string | null;
  created_at: string;
  created_by_name: string;
}

export const transactionApi = {
  getProgress: async (transactionId: string): Promise<TransactionProgress[]> => {
    const response = await apiClient.get(`/transactions/${transactionId}/progress/`);
    return response.data;
  },

  updateProgress: async (transactionId: string, data: { status: string; comment?: string }): Promise<TransactionProgress> => {
    const response = await apiClient.post(`/transactions/${transactionId}/progress/`, data);
    return response.data;
  }
}; 