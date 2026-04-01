/**
 * Deal Appointments API Client
 * Handles appointment requests, confirmations, and cancellations
 */

import { fetchFromBackend } from './client';

/** Tabs/modals listen to refresh signing rows after changes */
export function notifyDealSigningAppointmentsChanged(dealId: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('dealSigningAppointmentsChanged', { detail: { dealId } })
  );
}

export interface DealAppointment {
  id: string;
  dealRoomId: string;
  professionalId: string;
  startAt: string;
  endAt: string;
  type: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED';
  location?: string;
  meetingLink?: string;
  note?: string;
  createdAt: string;
  professional?: {
    user: {
      id: string;
      name: string;
    };
  };
}

/**
 * List appointments in a deal room
 */
export async function listAppointments(dealId: string): Promise<DealAppointment[]> {
  const response = await fetchFromBackend(`/deals/${dealId}/appointments`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Access denied. You are not a participant in this deal room.');
    }
    const error = await response.json().catch(() => ({ error: 'Failed to fetch appointments' }));
    throw new Error(error.error || 'Failed to fetch appointments');
  }

  const data = await response.json();
  // Backend returns { appointments: [...] }, so extract the array
  return Array.isArray(data.appointments) ? data.appointments : (Array.isArray(data) ? data : []);
}

/**
 * Request appointment (buyer only)
 */
export async function requestAppointment(
  dealId: string,
  payload: {
    professionalId: string;
    startAt: string; // ISO 8601 datetime
    endAt: string; // ISO 8601 datetime
    type: string;
    note?: string;
    location?: string;
  }
): Promise<DealAppointment> {
  const response = await fetchFromBackend(`/deals/${dealId}/appointments/request`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to request appointment' }));
    throw new Error(error.error || 'Failed to request appointment');
  }

  return response.json();
}

/**
 * Confirm appointment (professional only)
 */
export async function confirmAppointment(appointmentId: string): Promise<DealAppointment> {
  const response = await fetchFromBackend(`/appointments/${appointmentId}/confirm`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to confirm appointment' }));
    throw new Error(error.error || 'Failed to confirm appointment');
  }

  return response.json();
}

/**
 * Reject appointment (professional only)
 */
export async function rejectAppointment(appointmentId: string): Promise<DealAppointment> {
  const response = await fetchFromBackend(`/appointments/${appointmentId}/reject`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to reject appointment' }));
    throw new Error(error.error || 'Failed to reject appointment');
  }

  return response.json();
}

/**
 * Cancel appointment (any participant)
 */
export async function cancelAppointment(appointmentId: string): Promise<DealAppointment> {
  const response = await fetchFromBackend(`/appointments/${appointmentId}/cancel`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to cancel appointment' }));
    throw new Error(error.error || 'Failed to cancel appointment');
  }

  return response.json();
}


