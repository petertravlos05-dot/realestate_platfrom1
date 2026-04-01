/** Σύνοψη επαγγελματιών deal room για admin (συναλλαγή ↔ propertyId + buyerId). */

export type AdminParticipantBrief = {
  name: string;
  email: string;
  phone?: string;
};

export type AdminDealRoomParticipants = {
  buyerLawyer: AdminParticipantBrief | null;
  sellerLawyer: AdminParticipantBrief | null;
  engineers: AdminParticipantBrief[];
  notaries: AdminParticipantBrief[];
};

function toBrief(u: {
  name: string;
  email: string;
  phone: string | null;
} | null | undefined): AdminParticipantBrief | null {
  if (!u) return null;
  return { name: u.name, email: u.email, phone: u.phone ?? undefined };
}

type DealRoomForSummary = {
  buyerId: string;
  sellerId: string | null;
  participants: Array<{
    userId: string;
    role: string;
    user: { name: string; email: string; phone: string | null };
  }>;
  requests: Array<{
    type: string;
    status: string;
    requestedById: string;
    professional: {
      userId: string;
      user: { name: string; email: string; phone: string | null };
    };
  }>;
};

export function summarizeDealRoomForAdmin(dealRoom: DealRoomForSummary): AdminDealRoomParticipants {
  const accepted = dealRoom.requests.filter((r) => r.status === 'ACCEPTED');
  const sellerId = dealRoom.sellerId;

  const buyerLawyerReq = accepted.find(
    (r) => r.type === 'LAWYER' && r.requestedById === dealRoom.buyerId
  );
  const sellerLawyerReq = sellerId
    ? accepted.find((r) => r.type === 'LAWYER' && r.requestedById === sellerId)
    : undefined;

  const buyerLawyerUserId = buyerLawyerReq?.professional?.userId ?? null;
  const sellerLawyerUserId = sellerLawyerReq?.professional?.userId ?? null;

  let buyerLawyer = toBrief(buyerLawyerReq?.professional?.user);
  let sellerLawyer = toBrief(sellerLawyerReq?.professional?.user);

  const lawyerParticipants = dealRoom.participants.filter((p) => p.role === 'LAWYER');
  for (const p of lawyerParticipants) {
    if (!buyerLawyer && p.userId !== sellerLawyerUserId) {
      buyerLawyer = toBrief(p.user);
    } else if (!sellerLawyer && p.userId !== buyerLawyerUserId) {
      sellerLawyer = toBrief(p.user);
    }
  }

  const engineerByUserId = new Map<string, AdminParticipantBrief>();
  for (const p of dealRoom.participants) {
    if (p.role === 'ENGINEER') {
      const b = toBrief(p.user);
      if (b) engineerByUserId.set(p.userId, b);
    }
  }
  for (const r of accepted) {
    if (r.type === 'ENGINEER') {
      const uid = r.professional.userId;
      const b = toBrief(r.professional.user);
      if (b) engineerByUserId.set(uid, b);
    }
  }

  const notaryByUserId = new Map<string, AdminParticipantBrief>();
  for (const p of dealRoom.participants) {
    if (p.role === 'NOTARY') {
      const b = toBrief(p.user);
      if (b) notaryByUserId.set(p.userId, b);
    }
  }
  for (const r of accepted) {
    if (r.type === 'NOTARY') {
      const uid = r.professional.userId;
      const b = toBrief(r.professional.user);
      if (b) notaryByUserId.set(uid, b);
    }
  }

  return {
    buyerLawyer,
    sellerLawyer,
    engineers: [...engineerByUserId.values()],
    notaries: [...notaryByUserId.values()],
  };
}
