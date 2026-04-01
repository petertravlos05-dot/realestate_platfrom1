/**
 * Professional Onboarding API Client
 * Handles professional profile creation/updates and role management
 */

import { fetchFromBackend } from './client';

export interface ProfessionalProfileResponse {
  exists: boolean;
  profile: {
    id: string;
    type: 'LAWYER' | 'NOTARY' | 'ENGINEER';
    displayName: string;
    officeName?: string;
    city?: string;
    bio?: string;
    areaTags: string[];
    languages: string[];
    services?: Record<string, any>;
    verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
    availability?: {
      timezone: string;
      weeklyRules: Array<{
        weekday: number;
        start: string;
        end: string;
      }>;
      meetingTypes: string[];
    };
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface CreateProfessionalProfilePayload {
  type: 'LAWYER' | 'NOTARY' | 'ENGINEER';
  displayName: string;
  officeName?: string;
  phone?: string;
  city: string;
  areaTags?: string[];
  address?: string;
  bio?: string;
  languages?: string[];
  services?: Record<string, any>;
  registryNumber?: string;
  /** Δικηγορικός σύλλογος, παράρτημα ΤΕΕ, κ.λπ. */
  registryBody?: string;
  availability?: {
    timezone?: string;
    weeklyRules?: Array<{
      weekday: number;
      start: string;
      end: string;
    }>;
    meetingTypes?: ('ONLINE' | 'IN_PERSON')[];
  };
}

export interface CreateProfessionalProfileResponse {
  ok: boolean;
  role: 'LAWYER' | 'NOTARY' | 'ENGINEER';
  profileId: string;
  profile: {
    id: string;
    type: 'LAWYER' | 'NOTARY' | 'ENGINEER';
    displayName: string;
    verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  };
}

/**
 * Get current user's professional profile
 */
export async function getMyProfessionalProfile(): Promise<ProfessionalProfileResponse> {
  const response = await fetchFromBackend('/professionals/me', {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch professional profile' }));
    throw new Error(error.error || 'Failed to fetch professional profile');
  }

  return response.json();
}

/**
 * Create or update professional profile and set role
 */
export async function createOrUpdateProfessionalProfile(
  payload: CreateProfessionalProfilePayload
): Promise<CreateProfessionalProfileResponse> {
  const response = await fetchFromBackend('/professionals/me', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create/update professional profile' }));
    throw new Error(error.error || 'Failed to create/update professional profile');
  }

  return response.json();
}

