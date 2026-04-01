/**
 * Mirrors DocumentsTab "Συνολικά Έγγραφα" (μη-ΗΤΚ) under Φάκελος Πωλητή for delete authorization.
 */

export type DealDocLike = {
  id: string;
  dealRoomId: string;
  category: string;
  status: string;
  requestedFromRole: string | null;
  requestedById: string | null;
  uploadedById: string | null;
  reviewById: string | null;
};

export type SellerFolderDealContext = {
  dealRoomId: string;
  buyerId: string;
  sellerId: string | null;
  buyerLawyerId: string | null;
  sellerLawyerId: string | null;
  engineerUserIds: Set<string>;
  notaryUserIds: Set<string>;
  isRent: boolean;
};

function normalizeCategory(value?: string | null): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isHtkCategory(category?: string | null): boolean {
  const n = normalizeCategory(category);
  return n.startsWith('ητκ:') || n.includes('ηλεκτρονικη ταυτοτητα κτηριου') || n.includes('htk');
}

function isRentFromAmenities(amenities: unknown): boolean {
  if (!amenities || typeof amenities !== 'object') return false;
  const a = amenities as Record<string, unknown>;
  if (a.listingType && String(a.listingType).toLowerCase() === 'rent') return true;
  if (a.transactionType && String(a.transactionType).toLowerCase() === 'rent') return true;
  return false;
}

type RequestLike = {
  status: string;
  type: string;
  requestedById: string;
  professional?: { user?: { id: string } | null } | null;
};

type ParticipantLike = {
  userId: string;
  role: string;
};

export function buildSellerFolderDealContext(
  dealRoom: {
    id: string;
    buyerId: string;
    sellerId: string | null;
    property?: { userId?: string | null; amenities?: unknown } | null;
    requests?: RequestLike[];
    participants?: ParticipantLike[];
  }
): SellerFolderDealContext {
  const sellerId = dealRoom.sellerId ?? dealRoom.property?.userId ?? null;
  const buyerLawyerReq = dealRoom.requests?.find(
    (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === dealRoom.buyerId
  );
  const buyerLawyerId = buyerLawyerReq?.professional?.user?.id ?? null;

  const sellerLawyerReq = sellerId
    ? dealRoom.requests?.find(
        (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === sellerId
      )
    : undefined;
  const sellerLawyerFromRequest = sellerLawyerReq?.professional?.user?.id ?? null;
  const sellerLawyerParticipant = dealRoom.participants?.find(
    (p) => p.role === 'LAWYER' && p.userId === sellerLawyerFromRequest
  );
  const sellerLawyerId = sellerLawyerParticipant?.userId ?? sellerLawyerFromRequest;

  const engineerUserIds = new Set<string>();
  for (const p of dealRoom.participants || []) {
    if (p.role === 'ENGINEER') engineerUserIds.add(p.userId);
  }
  for (const r of dealRoom.requests || []) {
    if (r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.professional?.user?.id) {
      engineerUserIds.add(r.professional.user.id);
    }
  }

  const notaryUserIds = new Set<string>();
  for (const p of dealRoom.participants || []) {
    if (p.role === 'NOTARY') notaryUserIds.add(p.userId);
  }
  for (const r of dealRoom.requests || []) {
    if (r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.professional?.user?.id) {
      notaryUserIds.add(r.professional.user.id);
    }
  }

  return {
    dealRoomId: dealRoom.id,
    buyerId: dealRoom.buyerId,
    sellerId,
    buyerLawyerId,
    sellerLawyerId,
    engineerUserIds,
    notaryUserIds,
    isRent: isRentFromAmenities(dealRoom.property?.amenities),
  };
}

function isSellerFolderRequesterWhenNoSellerLawyer(
  requestedById: string | null | undefined,
  ctx: SellerFolderDealContext
): boolean {
  if (!requestedById) return false;
  if (ctx.buyerLawyerId && requestedById === ctx.buyerLawyerId) return true;
  if (ctx.engineerUserIds.has(requestedById)) return true;
  if (ctx.notaryUserIds.has(requestedById)) return true;
  return false;
}

function statusUploadedOrApproved(status: string): boolean {
  return status === 'UPLOADED' || status === 'APPROVED';
}

function statusNotRequested(status: string): boolean {
  return status !== 'REQUESTED';
}

/** Documents shown in seller lawyer's «Συνολικά Έγγραφα» (μη-ΗΤΚ). */
export function documentInSellerLawyerTotals(doc: DealDocLike, lawyerUserId: string): boolean {
  if (isHtkCategory(doc.category)) return false;
  if (doc.reviewById === lawyerUserId && doc.status === 'APPROVED') return true;
  if (doc.uploadedById === lawyerUserId && statusNotRequested(doc.status)) return true;
  if (
    doc.requestedById === lawyerUserId &&
    doc.requestedFromRole === 'SELLER' &&
    !isHtkCategory(doc.category) &&
    doc.uploadedById &&
    doc.uploadedById !== lawyerUserId &&
    (doc.status === 'UPLOADED' || doc.status === 'APPROVED')
  ) {
    return true;
  }
  return false;
}

/** Seller's «Συνολικά Έγγραφα» under Φάκελος πωλητή (sale). */
export function documentInSellerFolderTotalsForSeller(doc: DealDocLike, ctx: SellerFolderDealContext, sellerUserId: string): boolean {
  if (ctx.isRent) return false;
  if (isHtkCategory(doc.category)) return false;
  const sl = ctx.sellerLawyerId;

  if (sl) {
    if (doc.reviewById === sl && doc.status === 'APPROVED') return true;
    if (doc.uploadedById === sl && statusNotRequested(doc.status)) return true;
    if (
      doc.requestedFromRole === 'SELLER' &&
      (doc.status === 'UPLOADED' || doc.status === 'APPROVED') &&
      doc.uploadedById === sellerUserId
    ) {
      const rb = doc.requestedById;
      if (!rb) return false;
      if (rb === sl) return true;
      return isSellerFolderRequesterWhenNoSellerLawyer(rb, ctx);
    }
    return false;
  }

  if (doc.requestedFromRole !== 'SELLER') return false;
  if (!statusUploadedOrApproved(doc.status)) return false;
  return isSellerFolderRequesterWhenNoSellerLawyer(doc.requestedById, ctx);
}

/** Engineer's «Συνολικά» mirror + responses to engineer requests; only when no seller lawyer. */
export function documentInEngineerSellerTotalsWhenNoSellerLawyer(
  doc: DealDocLike,
  ctx: SellerFolderDealContext,
  engineerUserId: string
): boolean {
  if (ctx.sellerLawyerId) return false;
  if (isHtkCategory(doc.category)) return false;

  if (
    doc.requestedFromRole === 'SELLER' &&
    statusUploadedOrApproved(doc.status) &&
    isSellerFolderRequesterWhenNoSellerLawyer(doc.requestedById, ctx)
  ) {
    return true;
  }

  if (
    doc.requestedById === engineerUserId &&
    doc.requestedFromRole === 'SELLER' &&
    doc.uploadedById &&
    doc.uploadedById !== engineerUserId &&
    (doc.status === 'UPLOADED' || doc.status === 'APPROVED')
  ) {
    return true;
  }

  return false;
}

export type UserDealRole = string;

/**
 * Returns whether this user may permanently delete this document as a «Συνολικά Έγγραφα» removal.
 */
export function canRemoveSellerFolderTotalDocument(
  doc: DealDocLike,
  ctx: SellerFolderDealContext,
  userId: string,
  userRole: UserDealRole
): boolean {
  if (doc.dealRoomId !== ctx.dealRoomId) return false;

  const sellerUserId = ctx.sellerId;
  if (userRole === 'LAWYER' && ctx.sellerLawyerId && userId === ctx.sellerLawyerId) {
    return documentInSellerLawyerTotals(doc, userId);
  }

  if (userRole === 'SELLER' && sellerUserId && userId === sellerUserId) {
    // Μόνο όταν δεν υπάρχει δικηγόρος πωλητή· αλλιώς τη διαχείριση κάνει ο δικηγόρος.
    if (ctx.sellerLawyerId) return false;
    return documentInSellerFolderTotalsForSeller(doc, ctx, sellerUserId);
  }

  if (userRole === 'ENGINEER' && !ctx.sellerLawyerId) {
    return documentInEngineerSellerTotalsWhenNoSellerLawyer(doc, ctx, userId);
  }

  return false;
}

/** Ίδια συνθήκη με DocumentsTab `buildEngineerHtkTotalDocsForUserId` — «Συνολικά Έγγραφα» ΗΤΚ μηχανικού. */
export function documentInEngineerHtkTotalsForEngineer(doc: DealDocLike, engineerUserId: string): boolean {
  if (!isHtkCategory(doc.category)) return false;
  if (doc.reviewById === engineerUserId && doc.status === 'APPROVED') return true;
  if (doc.uploadedById === engineerUserId && doc.status !== 'REQUESTED') return true;
  if (
    doc.requestedFromRole === 'SELLER' &&
    doc.requestedById === engineerUserId &&
    !!doc.uploadedById &&
    doc.uploadedById !== engineerUserId &&
    (doc.status === 'UPLOADED' || doc.status === 'APPROVED' || doc.status === 'CHANGES_REQUESTED')
  ) {
    return true;
  }
  return false;
}

export function canEngineerRemoveHtkTotalDocument(
  doc: DealDocLike,
  userId: string,
  userRole: UserDealRole
): boolean {
  return userRole === 'ENGINEER' && documentInEngineerHtkTotalsForEngineer(doc, userId);
}
