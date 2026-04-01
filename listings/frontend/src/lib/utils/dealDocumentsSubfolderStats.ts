/**
 * Σύνοψη «Συνολικά Έγγραφα» ανά υπο-φάκελο/υπο-tab — ίδια λογική με DocumentsTab.tsx
 * (δεδομένα από deal.documents, όπως στο overview).
 */

import { DealRoom } from '@/lib/api/deals';
import { isAgent, isBuyer, isEngineer, isLawyer, isNotary, isSeller } from '@/lib/utils/dealRole';

export type DealDocumentsSubfolderRow = {
  /** Ετικέτα υπο-tab / υπο-φακέλου */
  label: string;
  count: number;
};

type Doc = NonNullable<DealRoom['documents']>[number] & { reviewById?: string };

function mergeById(lists: Array<Doc[] | undefined | null>): Doc[] {
  const m = new Map<string, Doc>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const d of list) {
      if (d?.id) m.set(d.id, d);
    }
  }
  return [...m.values()];
}

function normalizeCategory(value?: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isHtkCategory(category?: string): boolean {
  const normalized = normalizeCategory(category);
  return normalized.startsWith('ητκ:') || normalized.includes('ηλεκτρονικη ταυτοτητα κτηριου') || normalized.includes('htk');
}

function getIsRent(deal: DealRoom): boolean {
  const a = (deal.property as { amenities?: unknown } | undefined)?.amenities;
  if (a && typeof a === 'object') {
    const o = a as Record<string, unknown>;
    if (o.listingType) return String(o.listingType).toLowerCase() === 'rent';
    if (o.transactionType) return String(o.transactionType).toLowerCase() === 'rent';
  }
  return false;
}

/** Αριθμός εγγράφων με πραγματικό αρχείο (ανέβηκαν / εγκρίθηκαν) */
function countWithFiles(docs: Doc[]): number {
  return docs.filter((d) => d.fileName && (d.status === 'UPLOADED' || d.status === 'APPROVED')).length;
}

/**
 * Επιστρέφει μία γραμμή ανά υπο-φάκελο όπου στο DocumentsTab υπάρχει «Συνολικά Έγγραφα».
 */
export function getDealDocumentsSubfolderStats(
  deal: DealRoom,
  userId: string | null | undefined
): DealDocumentsSubfolderRow[] {
  if (!userId) return [];

  const documents = (deal.documents ?? []) as Doc[];
  const isRent = getIsRent(deal);

  if (isAgent(deal, userId)) {
    const withFiles = countWithFiles(documents);
    return [{ label: 'Συνολικά έγγραφα (συναλλαγή)', count: withFiles }];
  }

  const sellerIdForDeal = deal.sellerId || deal.participants?.find((p) => p.role === 'SELLER')?.userId;

  const buyerLawyerRequest = deal.requests?.find(
    (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId
  );
  const buyerLawyerId = buyerLawyerRequest?.professional?.user?.id;

  const sellerLawyerRequest = deal.requests?.find(
    (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === sellerIdForDeal
  );
  const sellerLawyerParticipant = deal.participants?.find(
    (p) => p.role === 'LAWYER' && p.userId === sellerLawyerRequest?.professional?.user?.id
  );
  const sellerLawyerId = sellerLawyerParticipant?.userId || sellerLawyerRequest?.professional?.user?.id;

  const engineerUserIds = new Set<string>([
    ...(deal.participants?.filter((p) => p.role === 'ENGINEER').map((p) => p.userId) || []),
    ...(deal.requests
      ?.filter((r) => r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.professional?.user?.id)
      .map((r) => r.professional!.user.id) || []),
  ]);

  const notaryUserIds = new Set<string>([
    ...(deal.participants?.filter((p) => p.role === 'NOTARY').map((p) => p.userId) || []),
    ...(deal.requests
      ?.filter((r) => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.professional?.user?.id)
      .map((r) => r.professional!.user.id) || []),
  ]);

  const primarySellerSideEngineerUserId =
    deal.requests?.find(
      (r) =>
        r.status === 'ACCEPTED' &&
        r.type === 'ENGINEER' &&
        r.requestedById === sellerIdForDeal &&
        r.professional?.user?.id
    )?.professional?.user?.id ?? null;

  const buildEngineerHtkTotalDocsForUserId = (engineUserId: string): Doc[] =>
    mergeById([
      documents.filter(
        (d) => isHtkCategory(d.category) && d.reviewById === engineUserId && d.status === 'APPROVED'
      ),
      documents.filter(
        (d) => isHtkCategory(d.category) && d.uploadedById === engineUserId && d.status !== 'REQUESTED'
      ),
      documents.filter(
        (d) =>
          isHtkCategory(d.category) &&
          d.requestedFromRole === 'SELLER' &&
          d.requestedById === engineUserId &&
          !!d.uploadedById &&
          d.uploadedById !== engineUserId &&
          (d.status === 'UPLOADED' || d.status === 'APPROVED' || d.status === 'CHANGES_REQUESTED')
      ),
    ]);

  const sellerLawyerMirrorEngineerHtkTotals: Doc[] = (() => {
    if (primarySellerSideEngineerUserId) {
      return buildEngineerHtkTotalDocsForUserId(primarySellerSideEngineerUserId);
    }
    const map = new Map<string, Doc>();
    for (const eid of engineerUserIds) {
      for (const d of buildEngineerHtkTotalDocsForUserId(eid)) {
        map.set(d.id, d);
      }
    }
    return [...map.values()];
  })();

  const isSellerFolderRequesterWhenNoSellerLawyer = (requestedById: string | undefined | null) => {
    if (!requestedById) return false;
    return (
      (!!buyerLawyerId && requestedById === buyerLawyerId) ||
      engineerUserIds.has(requestedById) ||
      notaryUserIds.has(requestedById)
    );
  };

  const sellerFolderTotalMirrorForSellerLawyerView: Doc[] = sellerLawyerId
    ? mergeById([
        documents.filter(
          (d) =>
            !isHtkCategory(d.category) && d.reviewById === sellerLawyerId && d.status === 'APPROVED'
        ),
        documents.filter(
          (d) =>
            !isHtkCategory(d.category) && d.uploadedById === sellerLawyerId && d.status !== 'REQUESTED'
        ),
        documents.filter(
          (d) =>
            d.requestedById === sellerLawyerId &&
            d.requestedFromRole === 'SELLER' &&
            !isHtkCategory(d.category) &&
            !!d.uploadedById &&
            d.uploadedById !== sellerLawyerId &&
            (d.status === 'UPLOADED' || d.status === 'APPROVED')
        ),
      ])
    : mergeById([
        documents.filter(
          (d) =>
            d.requestedFromRole === 'SELLER' &&
            !isHtkCategory(d.category) &&
            (d.status === 'UPLOADED' || d.status === 'APPROVED') &&
            isSellerFolderRequesterWhenNoSellerLawyer(d.requestedById)
        ),
      ]);

  const showSellerSaleFolderTabs = isSeller(deal, userId) && !isRent;
  const slMirrorId = sellerLawyerId;

  const sellerFolderTotalForSeller: Doc[] =
    showSellerSaleFolderTabs && slMirrorId
      ? mergeById([
          documents.filter(
            (d) =>
              !isHtkCategory(d.category) && d.reviewById === slMirrorId && d.status === 'APPROVED'
          ),
          documents.filter(
            (d) =>
              !isHtkCategory(d.category) && d.uploadedById === slMirrorId && d.status !== 'REQUESTED'
          ),
          documents.filter((d) => {
            if (isHtkCategory(d.category)) return false;
            if (d.requestedFromRole !== 'SELLER') return false;
            if (d.status !== 'UPLOADED' && d.status !== 'APPROVED') return false;
            if (!d.uploadedById || d.uploadedById !== userId) return false;
            if (d.requestedById === slMirrorId) return true;
            return isSellerFolderRequesterWhenNoSellerLawyer(d.requestedById);
          }),
        ])
      : showSellerSaleFolderTabs
        ? mergeById([
            documents.filter(
              (d) =>
                d.requestedFromRole === 'SELLER' &&
                !isHtkCategory(d.category) &&
                (d.status === 'UPLOADED' || d.status === 'APPROVED') &&
                isSellerFolderRequesterWhenNoSellerLawyer(d.requestedById)
            ),
          ])
        : [];

  const sellerEngineerRequestForSellerView = deal.requests?.find(
    (r) => r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.requestedById === sellerIdForDeal
  );
  const engMirrorId = sellerEngineerRequestForSellerView?.professional?.user?.id;

  const sellerMirrorEngineerHtkApprovedByMeDocs =
    showSellerSaleFolderTabs && engMirrorId
      ? documents.filter((d) => d.reviewById === engMirrorId && d.status === 'APPROVED' && isHtkCategory(d.category))
      : [];

  const sellerMirrorEngineerHtkUploadedByMeDocs =
    showSellerSaleFolderTabs && engMirrorId
      ? documents.filter(
          (d) => d.uploadedById === engMirrorId && d.status !== 'REQUESTED' && isHtkCategory(d.category)
        )
      : [];

  const sellerMirrorEngineerHtkUploadedBySellerForEngRequest =
    showSellerSaleFolderTabs && engMirrorId
      ? documents.filter(
          (d) =>
            isHtkCategory(d.category) &&
            d.requestedFromRole === 'SELLER' &&
            d.requestedById === engMirrorId &&
            d.uploadedById === userId &&
            d.status !== 'REQUESTED' &&
            d.status !== 'CHANGES_REQUESTED'
        )
      : [];

  const sellerMirrorEngineerHtkTotalDocs: Doc[] =
    showSellerSaleFolderTabs && engMirrorId
      ? mergeById([
          sellerMirrorEngineerHtkApprovedByMeDocs,
          sellerMirrorEngineerHtkUploadedByMeDocs,
          sellerMirrorEngineerHtkUploadedBySellerForEngRequest,
        ])
      : [];

  const lawyerReq = deal.requests?.find(
    (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.professional?.user?.id === userId
  );
  const isBuyersLawyer = !!lawyerReq && lawyerReq.requestedById === deal.buyerId;
  const isSellersLawyer =
    !!lawyerReq && !!sellerIdForDeal && lawyerReq.requestedById === sellerIdForDeal;

  const isDealEngineer =
    isEngineer(deal, userId) ||
    !!deal.requests?.some(
      (r) => r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.professional?.user?.id === userId
    );

  // --- Notary (ίδια καθρέφτης λίστες με DocumentsTab) ---
  if (isNotary(deal, userId)) {
    const rows: DealDocumentsSubfolderRow[] = [];
    if (buyerLawyerId) {
      const notaryBuyerFolderTotalMirror = mergeById([
        documents.filter((d) => d.reviewById === buyerLawyerId && d.status === 'APPROVED'),
        documents.filter((d) => d.uploadedById === buyerLawyerId && d.status !== 'REQUESTED'),
        documents.filter(
          (d) =>
            d.requestedById === buyerLawyerId &&
            d.requestedFromRole === 'BUYER' &&
            d.status === 'UPLOADED' &&
            !!d.uploadedById &&
            d.uploadedById !== buyerLawyerId
        ),
      ]);
      rows.push({
        label: 'Φάκελος αγοραστή — Συνολικά έγγραφα',
        count: notaryBuyerFolderTotalMirror.length,
      });
    }
    rows.push({
      label: 'Φάκελος πωλητή — Συνολικά έγγραφα',
      count: sellerFolderTotalMirrorForSellerLawyerView.length,
    });
    rows.push({
      label: 'ΗΤΚ — Συνολικά έγγραφα',
      count: sellerLawyerMirrorEngineerHtkTotals.length,
    });
    return rows;
  }

  // --- Buyer's lawyer ---
  if (isLawyer(deal, userId) && isBuyersLawyer) {
    const buyerLawyerPendingApprovalFromBuyer = documents.filter(
      (d) =>
        d.requestedById === userId &&
        d.requestedFromRole === 'BUYER' &&
        d.status === 'UPLOADED' &&
        !!d.uploadedById &&
        d.uploadedById !== userId
    );
    const buyerLawyerUploadedDocs = documents.filter((d) => d.uploadedById === userId && d.status !== 'REQUESTED');
    const buyerLawyerApprovedDocs = documents.filter((d) => d.reviewById === userId && d.status === 'APPROVED');
    const buyerLawyerTotalDocs = mergeById([
      buyerLawyerApprovedDocs,
      buyerLawyerUploadedDocs,
      buyerLawyerPendingApprovalFromBuyer,
    ]);

    const sellerLawyerUploadedForBuyerLawyer = sellerLawyerId
      ? documents.filter(
          (d) => d.uploadedById === sellerLawyerId && d.status !== 'REQUESTED' && !isHtkCategory(d.category)
        )
      : [];
    const sellerLawyerApprovedForBuyerLawyer = sellerLawyerId
      ? documents.filter(
          (d) =>
            d.reviewById === sellerLawyerId && d.status === 'APPROVED' && !isHtkCategory(d.category)
        )
      : [];
    const sellerLawyerFulfilledForBuyerLawyerView = sellerLawyerId
      ? documents.filter(
          (d) =>
            d.requestedById === sellerLawyerId &&
            d.requestedFromRole === 'SELLER' &&
            !isHtkCategory(d.category) &&
            !!d.uploadedById &&
            d.uploadedById !== sellerLawyerId &&
            (d.status === 'UPLOADED' || d.status === 'APPROVED')
        )
      : [];
    const sellerFolderTotalForBuyerLawyer = mergeById([
      sellerLawyerUploadedForBuyerLawyer,
      sellerLawyerApprovedForBuyerLawyer,
      sellerLawyerFulfilledForBuyerLawyerView,
    ]);

    const engineerApprovedForLawyer = documents.filter(
      (d) => d.status === 'APPROVED' && !!d.reviewById && engineerUserIds.has(d.reviewById)
    );
    const lawyerOwnUploads = documents.filter(
      (d) => d.uploadedById === userId && d.status !== 'REQUESTED' && isHtkCategory(d.category)
    );
    const lawyerHtkTotalDocs = mergeById([engineerApprovedForLawyer, lawyerOwnUploads]);

    const sellerLawyerHtkUploadedByEngineer = documents.filter(
      (d) =>
        d.requestedById === userId &&
        d.requestedFromRole === 'SELLER' &&
        isHtkCategory(d.category) &&
        d.status !== 'REQUESTED' &&
        !!d.uploadedById &&
        engineerUserIds.has(d.uploadedById)
    );
    const sellerLawyerHtkApprovedBySellerLawyer = documents.filter(
      (d) => isHtkCategory(d.category) && d.reviewById === userId && d.status === 'APPROVED'
    );
    const buyerLawyerHtkTotalDocs = mergeById([
      lawyerHtkTotalDocs,
      sellerLawyerHtkUploadedByEngineer,
      sellerLawyerHtkApprovedBySellerLawyer,
    ]);

    return [
      { label: 'Φάκελος αγοραστή — Συνολικά έγγραφα', count: buyerLawyerTotalDocs.length },
      { label: 'Φάκελος πωλητή — Συνολικά έγγραφα', count: sellerFolderTotalForBuyerLawyer.length },
      { label: 'ΗΤΚ — Συνολικά έγγραφα', count: buyerLawyerHtkTotalDocs.length },
    ];
  }

  // --- Seller's lawyer ---
  if (isLawyer(deal, userId) && isSellersLawyer) {
    const buyerFolderUploadedByBuyerLawyer = buyerLawyerId
      ? documents.filter((d) => d.uploadedById === buyerLawyerId && d.status !== 'REQUESTED')
      : [];
    const buyerFolderApprovedByBuyerLawyerFromBuyer =
      buyerLawyerId && deal.buyerId
        ? documents.filter(
            (d) =>
              d.uploadedById === deal.buyerId && d.reviewById === buyerLawyerId && d.status === 'APPROVED'
          )
        : [];
    const buyerFolderSharedTotalDocs = mergeById([
      buyerFolderUploadedByBuyerLawyer,
      buyerFolderApprovedByBuyerLawyerFromBuyer,
    ]);

    const sellerLawyerUploadedDocs = documents.filter(
      (d) => d.uploadedById === userId && d.status !== 'REQUESTED' && !isHtkCategory(d.category)
    );
    const sellerLawyerApprovedDocs = documents.filter(
      (d) => d.reviewById === userId && d.status === 'APPROVED' && !isHtkCategory(d.category)
    );
    const sellerLawyerFulfilledByOthersForMyRequests = documents.filter(
      (d) =>
        d.requestedById === userId &&
        d.requestedFromRole === 'SELLER' &&
        !isHtkCategory(d.category) &&
        !!d.uploadedById &&
        d.uploadedById !== userId &&
        (d.status === 'UPLOADED' || d.status === 'APPROVED')
    );
    const sellerLawyerTotalDocs = mergeById([
      sellerLawyerApprovedDocs,
      sellerLawyerUploadedDocs,
      sellerLawyerFulfilledByOthersForMyRequests,
    ]);

    const engineerApprovedForLawyer = documents.filter(
      (d) => d.status === 'APPROVED' && !!d.reviewById && engineerUserIds.has(d.reviewById)
    );
    const lawyerOwnUploads = documents.filter(
      (d) => d.uploadedById === userId && d.status !== 'REQUESTED' && isHtkCategory(d.category)
    );
    const lawyerHtkTotalDocs = mergeById([engineerApprovedForLawyer, lawyerOwnUploads]);

    const sellerLawyerHtkUploadedByEngineer = documents.filter(
      (d) =>
        d.requestedById === userId &&
        d.requestedFromRole === 'SELLER' &&
        isHtkCategory(d.category) &&
        d.status !== 'REQUESTED' &&
        !!d.uploadedById &&
        engineerUserIds.has(d.uploadedById)
    );
    const sellerLawyerHtkApprovedBySellerLawyer = documents.filter(
      (d) => isHtkCategory(d.category) && d.reviewById === userId && d.status === 'APPROVED'
    );
    const sellerLawyerHtkTotalDocs = mergeById([
      lawyerHtkTotalDocs,
      sellerLawyerHtkUploadedByEngineer,
      sellerLawyerHtkApprovedBySellerLawyer,
    ]);

    return [
      { label: 'Φάκελος αγοραστή — Συνολικά έγγραφα', count: buyerFolderSharedTotalDocs.length },
      { label: 'Φάκελος πωλητή — Συνολικά έγγραφα', count: sellerLawyerTotalDocs.length },
      { label: 'ΗΤΚ — Συνολικά έγγραφα', count: sellerLawyerHtkTotalDocs.length },
    ];
  }

  // --- Engineer ---
  if (isDealEngineer) {
    const engineerSellerFulfilledBySellerDocs = documents.filter(
      (d) =>
        d.requestedById === userId &&
        d.requestedFromRole === 'SELLER' &&
        !isHtkCategory(d.category) &&
        !!d.uploadedById &&
        d.uploadedById !== userId &&
        (d.status === 'UPLOADED' || d.status === 'APPROVED')
    );
    const engineerSellerTotalDocs = mergeById([
      sellerFolderTotalMirrorForSellerLawyerView,
      engineerSellerFulfilledBySellerDocs,
    ]);
    const engineerHtkTotalDocs = userId ? buildEngineerHtkTotalDocsForUserId(userId) : [];
    return [
      { label: 'Φάκελος πωλητή — Συνολικά έγγραφα', count: engineerSellerTotalDocs.length },
      { label: 'ΗΤΚ — Συνολικά έγγραφα', count: engineerHtkTotalDocs.length },
    ];
  }

  // --- Buyer (αγορά) ---
  if (isBuyer(deal, userId) && !isRent) {
    if (buyerLawyerId) {
      const buyerUploadedByBuyerLawyerDocs = documents.filter(
        (d) => d.uploadedById === buyerLawyerId && d.status !== 'REQUESTED'
      );
      const buyerSelfUploadedForTotalDocs = documents.filter(
        (d) =>
          d.requestedFromRole === 'BUYER' &&
          d.requestedById === buyerLawyerId &&
          d.uploadedById === userId &&
          (d.status === 'UPLOADED' || d.status === 'APPROVED')
      );
      const buyerTotalFolderDocs = mergeById([
        buyerUploadedByBuyerLawyerDocs,
        buyerSelfUploadedForTotalDocs,
      ]);
      return [{ label: 'Φάκελος αγοραστή — Συνολικά έγγραφα', count: buyerTotalFolderDocs.length }];
    }
    const uploadedSide = documents.filter(
      (d) =>
        d.requestedFromRole === 'BUYER' &&
        (d.status === 'UPLOADED' || d.status === 'APPROVED' || d.status === 'CHANGES_REQUESTED')
    );
    return [{ label: 'Συνολικά έγγραφα (φάκελος σας)', count: uploadedSide.length }];
  }

  // --- Seller πώληση (χωρίς επαγγελματικό ρόλο παραπάνω) ---
  if (isSeller(deal, userId) && showSellerSaleFolderTabs) {
    const rows: DealDocumentsSubfolderRow[] = [
      { label: 'Φάκελος πωλητή — Συνολικά έγγραφα', count: sellerFolderTotalForSeller.length },
    ];
    if (engMirrorId) {
      rows.push({ label: 'ΗΤΚ — Συνολικά έγγραφα', count: sellerMirrorEngineerHtkTotalDocs.length });
    }
    return rows;
  }

  // --- Ενοικίαση: αγοραστής / πωλητής ---
  if (isRent && (isBuyer(deal, userId) || isSeller(deal, userId))) {
    const role: 'BUYER' | 'SELLER' = isBuyer(deal, userId) ? 'BUYER' : 'SELLER';
    const mine = documents.filter(
      (d) =>
        d.requestedFromRole === role &&
        (d.status === 'UPLOADED' || d.status === 'APPROVED' || d.status === 'CHANGES_REQUESTED')
    );
    const label =
      role === 'BUYER'
        ? 'Συνολικά έγγραφα (αγοραστής)'
        : 'Συνολικά έγγραφα (πωλητής / εκμισθωτής)';
    return [{ label, count: mine.length }];
  }

  // --- Fallback: όπως παλιά συνολικά deal (όλα τα slots) + ανεβασμένα ---
  const uploadedOrApproved = documents.filter(
    (d) => d.status === 'UPLOADED' || d.status === 'APPROVED'
  ).length;
  return [{ label: 'Συνολικά έγγραφα (συναλλαγή)', count: uploadedOrApproved }];
}
