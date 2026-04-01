/**
 * Professionals API Client
 * Handles professional profile, availability, and search
 */

import { fetchFromBackend } from './client';

export interface ProfessionalProfile {
  professionalId: string;
  userId: string;
  type: 'LAWYER' | 'NOTARY' | 'ENGINEER';
  displayName: string;
  officeName?: string;
  phone?: string;
  city?: string;
  address?: string;
  areaTags?: string[];
  languages?: string[];
  services?: Record<string, any>;
  verifiedAt?: string;
  meetingTypes?: string[];
  weeklyRules?: Array<{ weekday: number; start: string; end: string }>;
  timezone?: string;
  bio?: string;
}

export interface ProfessionalRequest {
  id: string;
  dealRoomId: string;
  professionalId: string;
  type: 'LAWYER' | 'NOTARY' | 'ENGINEER';
  status: 'REQUESTED' | 'ACCEPTED' | 'DECLINED';
  message?: string;
  createdAt: string;
  dealRoom?: {
    id: string;
    property: {
      id: string;
      title: string;
      street: string;
      number: string;
      city: string;
      state: string;
      price: number;
      images: string[];
    };
    participants: Array<{
      id: string;
      userId: string;
      role: string;
      user: {
        id: string;
        name: string;
        email: string;
      };
    }>;
  };
  requestedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface RegisterProfessionalPayload {
  type: 'LAWYER' | 'NOTARY' | 'ENGINEER';
  displayName: string;
  officeName?: string;
  phone?: string;
  city?: string;
  areaTags?: string[];
  address?: string;
  bio?: string;
  languages?: string[];
  services?: any;
}

export interface AvailabilityPayload {
  weeklyRules: any;
  exceptions?: any[];
  meetingTypes?: string[];
  timezone?: string;
}

/**
 * Register or update professional profile
 */
export async function registerProfessional(
  payload: RegisterProfessionalPayload
): Promise<{ id: string; type: string; displayName: string; verificationStatus: string }> {
  const response = await fetchFromBackend('/professionals/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to register professional' }));
    throw new Error(error.error || 'Failed to register professional');
  }

  return response.json();
}

/**
 * Set professional availability
 */
export async function setAvailability(payload: AvailabilityPayload): Promise<any> {
  const response = await fetchFromBackend('/professionals/availability', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update availability' }));
    throw new Error(error.error || 'Failed to update availability');
  }

  return response.json();
}

/**
 * Get professional availability by professional ID
 */
export async function getProfessionalAvailability(professionalId: string): Promise<{
  weeklyRules?: Array<{ weekday: number; start: string; end: string }>;
  meetingTypes?: string[];
  timezone?: string;
} | null> {
  try {
    const response = await fetchFromBackend(`/professionals/${professionalId}/availability`);
    if (!response.ok) {
      if (response.status === 404) {
        return null; // No availability set
      }
      const error = await response.json().catch(() => ({ error: 'Failed to fetch availability' }));
      throw new Error(error.error || 'Failed to fetch availability');
    }
    const data = await response.json();
    return {
      weeklyRules: data.weeklyRules || [],
      meetingTypes: data.meetingTypes || [],
      timezone: data.timezone || 'Europe/Athens',
    };
  } catch (error: any) {
    console.error('Error fetching professional availability:', error);
    return null; // Return null on error, allow custom selection
  }
}

/**
 * Get public professional profile details by professional ID
 */
export async function getProfessionalPublicProfile(
  professionalId: string
): Promise<ProfessionalProfile> {
  const response = await fetchFromBackend(`/professionals/public/${professionalId}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch public professional profile' }));
    throw new Error(error.error || 'Failed to fetch public professional profile');
  }
  return response.json();
}

/**
 * Search verified professionals
 */
export async function searchProfessionals(params: {
  type: 'LAWYER' | 'NOTARY' | 'ENGINEER';
  area?: string;
  propertyId?: string;
}): Promise<{ professionals: ProfessionalProfile[] }> {
  const queryParams = new URLSearchParams();
  queryParams.append('type', params.type);
  if (params.area) queryParams.append('area', params.area);
  if (params.propertyId) queryParams.append('propertyId', params.propertyId);

  const response = await fetchFromBackend(`/professionals/search?${queryParams.toString()}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to search professionals' }));
    const error: any = new Error(errorData.error || 'Failed to search professionals');
    error.status = response.status;
    if (errorData.retryAfterSeconds) {
      error.retryAfterSeconds = errorData.retryAfterSeconds;
    }
    throw error;
  }

  return response.json();
}

/**
 * Get incoming professional requests for current user
 */
export async function getMyRequests(): Promise<{ requests: ProfessionalRequest[] }> {
  const response = await fetchFromBackend('/professionals/me/requests');

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Professional profile not found');
    }
    const error = await response.json().catch(() => ({ error: 'Failed to fetch requests' }));
    throw new Error(error.error || 'Failed to fetch requests');
  }

  return response.json();
}

/**
 * Request a professional for a deal
 */
export async function requestProfessional(
  dealId: string,
  professionalId: string,
  message?: string
): Promise<ProfessionalRequest> {
  const response = await fetchFromBackend(`/deals/${dealId}/requests`, {
    method: 'POST',
    body: JSON.stringify({ professionalId, message }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to request professional' }));
    throw new Error(error.error || 'Failed to request professional');
  }

  return response.json();
}

/**
 * Accept a professional request
 */
export async function acceptProfessionalRequest(
  dealId: string,
  requestId: string
): Promise<ProfessionalRequest> {
  const response = await fetchFromBackend(`/deals/${dealId}/requests/${requestId}/accept`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to accept request' }));
    throw new Error(error.error || 'Failed to accept request');
  }

  return response.json();
}

/**
 * Decline a professional request
 */
export async function declineProfessionalRequest(
  dealId: string,
  requestId: string
): Promise<ProfessionalRequest> {
  const response = await fetchFromBackend(`/deals/${dealId}/requests/${requestId}/decline`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to decline request' }));
    throw new Error(error.error || 'Failed to decline request');
  }

  return response.json();
}

/**
 * Cancel a professional request (buyer only)
 */
export async function cancelProfessionalRequest(
  dealId: string,
  requestId: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetchFromBackend(`/deals/${dealId}/requests/${requestId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to cancel request' }));
    throw new Error(error.error || 'Failed to cancel request');
  }

  return response.json();
}

/**
 * Get all appointments for current professional
 */
export async function getMyAppointments(): Promise<{ appointments: any[] }> {
  const response = await fetchFromBackend('/professionals/me/appointments');

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Professional profile not found');
    }
    const error = await response.json().catch(() => ({ error: 'Failed to fetch appointments' }));
    throw new Error(error.error || 'Failed to fetch appointments');
  }

  return response.json();
}

/**
 * Update professional pricing
 */
export async function updatePricing(payload: {
  hourlyRate?: number;
  consultationFee?: number;
  onlineFee?: number;
  inPersonFee?: number;
}): Promise<{ id: string; pricing: any }> {
  const response = await fetchFromBackend('/professionals/me/pricing', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update pricing' }));
    throw new Error(error.error || 'Failed to update pricing');
  }

  return response.json();
}

