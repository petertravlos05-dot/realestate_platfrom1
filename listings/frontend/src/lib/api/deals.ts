/**
 * Deal Room API Client
 * Handles all deal room related API calls
 */

import { apiClient, fetchFromBackend } from './client';

export interface DealRoom {
  id: string;
  propertyId: string;
  buyerId: string;
  sellerId?: string;
  agentId?: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED' | 'COMPLETED' | 'CLOSED_PROPERTY_SOLD';
  buyerSigningConfirmed?: boolean;
  sellerSigningConfirmed?: boolean;
  engineerApprovedSellerDocumentsAt?: string | null;
  lawyerApprovedSellerDocumentsAt?: string | null;
  lawyerApprovedBasicDocumentsAt?: string | null;
  buyerCompletedDepositStepAt?: string | null;
  buyerLawyerCompletedBuyerFolderAt?: string | null;
  notaryApprovedDocumentsAt?: string | null;
  buyerSkippedViewingAt?: string | null;
  buyerConfirmedInterestAt?: string | null;
  rentSigningProposal?: { startAt: string; endAt: string; buyerId: string; formattedDate?: string; formattedTime?: string } | null;
  rentSigningMetadata?: { landlordNotifiedTenantGovGrAt?: string } | null;
  rentCompletionMetadata?: {
    sellerMyAadeDeclarationNumber?: string;
    buyerMyAadeConfirmedAt?: string;
    sellerCompletionConfirmedAt?: string;
    buyerCompletionConfirmedAt?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  propertySoldToAnother?: boolean; // True when property was sold/rented to someone else
  /** Another active deal on the same property has completed buyer deposit (step 5); this room is on hold */
  blockedByPriorDeposit?: boolean;
  priorDepositDealRoomId?: string | null;
  priorDepositBuyerName?: string | null;
  restoreRequest?: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_RESTORED';
    requestedAt?: string;
    respondedAt?: string;
    buyerId?: string;
  } | null;
  property?: {
    id: string;
    title: string;
    street: string;
    number: string;
    city: string;
    state: string;
    price: number;
    images: string[];
    propertyType?: string;
    userId?: string; // For seller role when sellerId is null
  };
  participants?: Array<{
    id: string;
    userId: string;
    role: 'BUYER' | 'SELLER' | 'AGENT' | 'LAWYER' | 'NOTARY' | 'ENGINEER' | 'ADMIN';
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role?: string;
      country?: string;
      professionalProfile?: {
        id: string;
        displayName: string;
        type: 'LAWYER' | 'NOTARY' | 'ENGINEER';
        city?: string;
      };
    };
  }>;
  requests?: Array<{
    id: string;
    professionalId: string;
    type: 'LAWYER' | 'NOTARY' | 'ENGINEER';
    status: 'REQUESTED' | 'ACCEPTED' | 'DECLINED';
    message?: string;
    createdAt: string;
    requestedById?: string;
    professional?: {
      id: string;
      displayName: string;
      user: {
        id: string;
        name: string;
        email: string;
      };
    };
    requestedBy?: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  threads?: Array<{
    id: string;
    type: 'GROUP' | 'DIRECT';
    title?: string;
    members?: Array<{ userId: string }>;
    _count?: { messages: number };
  }>;
  documents?: Array<{
    id: string;
    category: string;
    status: string;
    requestedFromRole?: 'BUYER' | 'SELLER';
    requestedById?: string;
    uploadedById?: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    createdAt: string;
    updatedAt: string;
    reviewNote?: string;
  }>;
  appointments?: Array<{
    id: string;
    professionalId: string;
    bookedById?: string;
    startAt: string;
    endAt: string;
    type: string;
    status: string;
    location?: string;
    meetingLink?: string;
    /** Π.χ. AVAILABLE_SLOT για διαθέσιμα slots ημερολογίου */
    note?: string | null;
    professional?: {
      user: {
        id: string;
        name: string;
      };
    };
  }>;
  offers?: Array<{
    id: string;
    dealRoomId: string;
    offeredBy: string;
    role: 'BUYER' | 'SELLER';
    amount: number | string;
    message?: string | null;
    status: string;
    createdAt: string;
    user?: {
      id: string;
      name: string;
    };
  }>;
}

export interface CreateDealResponse {
  dealRoomId: string;
  status: string;
  propertyId: string;
  buyerId: string;
  isNew: boolean;
}

export interface DealListResponse {
  items: DealRoom[];
  nextCursor?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create or get existing deal room
 */
export async function createDeal(propertyId: string): Promise<CreateDealResponse> {
  const response = await fetchFromBackend('/deals', {
    method: 'POST',
    body: JSON.stringify({ propertyId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create deal room' }));
    throw new Error(error.error || 'Failed to create deal room');
  }

  return response.json();
}

/**
 * List user's deal rooms (paginated)
 */
export async function listDeals(params?: {
  cursor?: string;
  limit?: number;
  status?: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
}): Promise<DealListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.cursor) queryParams.append('cursor', params.cursor);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);

  const queryString = queryParams.toString();
  const url = `/deals${queryString ? `?${queryString}` : ''}`;

  const response = await fetchFromBackend(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch deals' }));
    throw new Error(error.error || 'Failed to fetch deals');
  }

  const data = await response.json();
  
  // Extract buyerId from participants if not present in response
  // Backend returns deals but buyerId might not be in the deal object, only in participants
  if (data.items) {
    data.items = data.items.map((deal: any) => {
      // If buyerId is missing, extract it from participants
      if (!deal.buyerId && deal.participants) {
        const buyerParticipant = deal.participants.find((p: any) => p.role === 'BUYER');
        if (buyerParticipant) {
          deal.buyerId = buyerParticipant.userId;
        }
      }
      return deal;
    });
  }
  
  return data;
}

/**
 * Get deal room details
 */
export async function getDeal(dealId: string): Promise<DealRoom> {
  const response = await fetchFromBackend(`/deals/${dealId}`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Access denied. You are not a participant in this deal room.');
    }
    if (response.status === 404) {
      throw new Error('Deal room not found');
    }
    const error = await response.json().catch(() => ({ error: 'Failed to fetch deal room' }));
    throw new Error(error.error || 'Failed to fetch deal room');
  }

  return response.json();
}

/**
 * Get appointments for multiple deals in one request (reduces rate limit pressure)
 */
export async function listDealAppointmentsBatch(
  dealIds: string[]
): Promise<Record<string, any[]>> {
  if (dealIds.length === 0) return {};
  const response = await fetchFromBackend(
    `/deals/appointments/batch?dealIds=${dealIds.join(',')}`
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch appointments' }));
    throw new Error(error.error || 'Failed to fetch appointments');
  }
  const data = await response.json();
  return data.appointmentsByDeal || {};
}

/**
 * Hide deal room from user's list (soft hide - user won't see it in deals list)
 */
export async function hideDeal(dealId: string): Promise<{ success: boolean }> {
  const response = await fetchFromBackend(`/deals/${dealId}/hide`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to hide deal room' }));
    throw new Error(error.error || 'Failed to hide deal room');
  }

  return response.json();
}

/**
 * Request professional (buyer only)
 */
export async function requestProfessional(
  dealId: string,
  professionalId: string,
  message?: string
): Promise<any> {
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
 * Accept professional request (professional only)
 */
export async function acceptProfessionalRequest(
  dealId: string,
  requestId: string
): Promise<any> {
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
 * Decline professional request (professional only)
 */
export async function declineProfessionalRequest(
  dealId: string,
  requestId: string
): Promise<any> {
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
 * Submit myAADE declaration number (rent deals, seller only)
 */
export async function submitRentMyAadeDeclaration(
  dealId: string,
  declarationNumber: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetchFromBackend(`/deals/${dealId}/rent-myade-declaration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ declarationNumber }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to submit declaration number' }));
    throw new Error(error.error || 'Failed to submit declaration number');
  }

  return response.json();
}

/**
 * Confirm tenant accepted in myAADE (rent deals, buyer only)
 */
export async function confirmRentBuyerMyAade(dealId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetchFromBackend(`/deals/${dealId}/rent-completion/confirm-myade`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to confirm myAADE' }));
    throw new Error(error.error || 'Failed to confirm myAADE');
  }

  return response.json();
}

/**
 * Buyer marks Actions tab step 5 (deposit / continue) complete — persisted server-side for refresh.
 */
export async function completeBuyerDepositStep(dealId: string): Promise<{
  success: boolean;
  message: string;
  completedAt?: string;
}> {
  const response = await fetchFromBackend(`/deals/${dealId}/buyer/complete-deposit-step`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to complete deposit step' }));
    throw new Error(error.error || 'Failed to complete deposit step');
  }

  return response.json();
}

/**
 * Confirm deal completion (rent deals, seller or buyer)
 */
export async function confirmRentCompletion(
  dealId: string,
  role: 'SELLER' | 'BUYER'
): Promise<{ success: boolean; message: string; dealClosed?: boolean }> {
  const response = await fetchFromBackend(`/deals/${dealId}/rent-completion/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to confirm completion' }));
    throw new Error(error.error || 'Failed to confirm completion');
  }

  return response.json();
}

/**
 * Notify tenant that landlord uploaded document to gov.gr (rent deals, seller only)
 */
export async function notifyRentTenant(dealId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetchFromBackend(`/deals/${dealId}/rent-signing/notify-tenant`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to notify tenant' }));
    throw new Error(error.error || 'Failed to notify tenant');
  }

  return response.json();
}


