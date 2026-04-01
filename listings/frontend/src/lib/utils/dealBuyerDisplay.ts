import { DealRoom } from '@/lib/api/deals';

/** Display name for the buyer of this deal room (same property may have multiple deals). */
export function getDealBuyerDisplayName(deal: DealRoom): string | null {
  const buyerId = deal.buyerId;
  const participants = deal.participants;
  if (!participants?.length) return null;
  const buyerP = participants.find(
    (p) => p.role === 'BUYER' && (!buyerId || p.userId === buyerId)
  );
  const name = buyerP?.user?.name?.trim();
  return name || null;
}
