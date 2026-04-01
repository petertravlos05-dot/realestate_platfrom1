import { DealRoom } from '@/lib/api/deals';

/**
 * Check if buyer is from Greece
 * Uses country field from user profile
 */
export function isBuyerFromGreece(deal: DealRoom): boolean {
  const buyerParticipant = deal.participants?.find((p) => p.role === 'BUYER');
  const buyerCountry = buyerParticipant?.user?.country;
  
  // Check if country is Greece (supports multiple formats)
  if (!buyerCountry) {
    // If country is not set, default to Greece (backward compatibility)
    return true;
  }
  
  const normalizedCountry = buyerCountry.trim().toLowerCase();
  
  // Check for various Greece representations
  return (
    normalizedCountry === 'gr' ||
    normalizedCountry === 'greece' ||
    normalizedCountry === 'ελλάδα' ||
    normalizedCountry === 'ελλαδα' ||
    normalizedCountry === 'hellas' ||
    normalizedCountry === 'gre'
  );
}

/**
 * Get buyer's country code or name
 */
export function getBuyerCountry(deal: DealRoom): string | undefined {
  const buyerParticipant = deal.participants?.find((p) => p.role === 'BUYER');
  return buyerParticipant?.user?.country;
}
