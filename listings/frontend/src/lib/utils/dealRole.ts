import { DealRoom } from '@/lib/api/deals';

/**
 * Determines the user's role in a deal room based on property ownership and participants
 * 
 * Rules:
 * - If current user is the agent (agentId matches userId), role is AGENT
 * - If current user is the owner of the property (sellerId matches userId), role is SELLER
 * - If current user is the buyer (buyerId matches userId), role is BUYER
 * - Otherwise, check participants
 * 
 * @param deal - The deal room object
 * @param userId - The current user's ID (can be string, null, or undefined)
 * @returns 'SELLER' | 'BUYER' | 'AGENT' | null if user is not a participant
 */
export function getUserRoleInDeal(deal: DealRoom, userId: string | null | undefined): 'SELLER' | 'BUYER' | 'AGENT' | null {
  if (!userId || !deal) return null;

  // Check if user is the agent
  if (deal.agentId === userId) {
    return 'AGENT';
  }

  // Check if user is the seller (property owner)
  // The sellerId in deal room corresponds to the property owner
  if (deal.sellerId === userId) {
    return 'SELLER';
  }

  // Fallback: user owns the property (sellerId may be null for legacy deals)
  const property = deal.property as { userId?: string } | undefined;
  if (property?.userId === userId) {
    return 'SELLER';
  }

  // Check if user is the buyer
  if (deal.buyerId === userId) {
    return 'BUYER';
  }

  // Fallback: check participants if sellerId/buyerId/agentId are not available
  const participant = deal.participants?.find((p) => p.userId === userId);
  if (participant) {
    if (participant.role === 'AGENT') {
      return 'AGENT';
    }
    if (participant.role === 'SELLER') {
      return 'SELLER';
    }
    if (participant.role === 'BUYER') {
      return 'BUYER';
    }
  }

  // If user is not found in participants, return null
  return null;
}

/**
 * Helper to check if current user is seller
 */
export function isSeller(deal: DealRoom, userId: string | null | undefined): boolean {
  return getUserRoleInDeal(deal, userId) === 'SELLER';
}

/**
 * Helper to check if current user is buyer
 */
export function isBuyer(deal: DealRoom, userId: string | null | undefined): boolean {
  return getUserRoleInDeal(deal, userId) === 'BUYER';
}

/**
 * Helper to check if current user is agent
 */
export function isAgent(deal: DealRoom, userId: string | null | undefined): boolean {
  return getUserRoleInDeal(deal, userId) === 'AGENT';
}

/**
 * Helper to check if current user is lawyer
 */
export function isLawyer(deal: DealRoom, userId: string | null | undefined): boolean {
  if (!userId || !deal) return false;
  
  // Check participants for LAWYER role
  const participant = deal.participants?.find((p) => p.userId === userId);
  if (participant && participant.role === 'LAWYER') {
    return true;
  }
  
  // Also check if user has an accepted lawyer request
  const lawyerRequest = deal.requests?.find(
    (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.professional?.user?.id === userId
  );
  
  return !!lawyerRequest;
}

/**
 * Helper to check if current user is engineer
 */
export function isEngineer(deal: DealRoom, userId: string | null | undefined): boolean {
  if (!userId || !deal) return false;

  const participant = deal.participants?.find((p) => p.userId === userId);
  if (participant && participant.role === 'ENGINEER') {
    return true;
  }

  const engineerRequest = deal.requests?.find(
    (r) =>
      r.status === 'ACCEPTED' &&
      r.type === 'ENGINEER' &&
      r.professional?.user?.id === userId
  );

  return !!engineerRequest;
}

/**
 * Helper to check if current user is notary
 * If user has accepted ENGINEER request, do NOT treat as notary (engineer takes precedence)
 */
export function isNotary(deal: DealRoom, userId: string | null | undefined): boolean {
  if (!userId || !deal) return false;

  // If user is the engineer (accepted ENGINEER request), never treat as notary
  const engineerRequest = deal.requests?.find(
    (r) => r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.professional?.user?.id === userId
  );
  if (engineerRequest) return false;

  const participant = deal.participants?.find((p) => p.userId === userId);
  if (participant && participant.role === 'NOTARY') {
    return true;
  }

  const notaryRequest = deal.requests?.find(
    (r) => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.professional?.user?.id === userId
  );

  return !!notaryRequest;
}
