import { prisma } from '../prisma';

function listingTypeFromAmenities(amenities: unknown): 'rent' | 'sale' | 'unknown' {
  if (!amenities || typeof amenities !== 'object') return 'unknown';
  const a = amenities as Record<string, unknown>;
  const lt = String(a.listingType ?? a.transactionType ?? '').toLowerCase();
  if (lt === 'rent') return 'rent';
  if (lt === 'sale' || lt === '') return 'sale';
  return 'unknown';
}

function transactionBucket(
  interestCancelled: boolean,
  stage: string | null
): 'open' | 'cancelled' | 'pending' | 'completed' {
  if (interestCancelled || stage === 'CANCELLED') return 'cancelled';
  if (stage === 'COMPLETED') return 'completed';
  if (!stage || stage === 'PENDING' || stage === 'MEETING_SCHEDULED') return 'pending';
  return 'open';
}

async function buildBuyerInsightsBlock(userId: string) {
  const [leads, favorites, views, connections, transactions, inquiries] = await Promise.all([
    prisma.propertyLead.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        property: { select: { id: true, title: true, city: true, propertyType: true, amenities: true } },
        agent: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.favorite.findMany({
      where: { userId },
      include: { property: { select: { id: true, title: true, propertyType: true, amenities: true } } },
      take: 300,
    }),
    prisma.propertyView.findMany({
      where: { buyerId: userId },
      select: { propertyId: true },
    }),
    prisma.buyerAgentConnection.findMany({
      where: { buyerId: userId },
      include: {
        property: { select: { id: true, title: true } },
        agent: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.transaction.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        property: { select: { id: true, title: true } },
        agent: { select: { id: true, name: true } },
      },
    }),
    prisma.inquiry.count({ where: { userId } }),
  ]);

  const distinctViewedProperties = new Set(views.map((v) => v.propertyId)).size;
  const distinctLeadProperties = new Set(leads.map((l) => l.propertyId)).size;

  const propertyTypeCounts: Record<string, number> = {};
  const rentVsSale = { rent: 0, sale: 0, unknown: 0 };

  const bumpType = (p: { propertyType?: string | null; amenities?: unknown } | null) => {
    const pt = (p?.propertyType || 'UNKNOWN').toString();
    propertyTypeCounts[pt] = (propertyTypeCounts[pt] || 0) + 1;
    const lt = listingTypeFromAmenities(p?.amenities);
    if (lt === 'rent') rentVsSale.rent += 1;
    else if (lt === 'sale') rentVsSale.sale += 1;
    else rentVsSale.unknown += 1;
  };

  for (const l of leads) {
    if (l.property) bumpType(l.property);
  }
  for (const f of favorites) {
    if (f.property) bumpType(f.property);
  }

  const txList = transactions.map((t) => {
    const bucket = transactionBucket(t.interestCancelled, t.stage);
    return {
      id: t.id,
      bucket,
      stage: t.stage,
      interestCancelled: t.interestCancelled,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      property: t.property ? { id: t.property.id, title: t.property.title } : null,
      agent: t.agent ? { id: t.agent.id, name: t.agent.name } : null,
    };
  });

  const counts = {
    open: txList.filter((x) => x.bucket === 'open').length,
    cancelled: txList.filter((x) => x.bucket === 'cancelled').length,
    pending: txList.filter((x) => x.bucket === 'pending').length,
    completed: txList.filter((x) => x.bucket === 'completed').length,
  };

  const connConfirmed = connections.filter((c) => c.status === 'CONFIRMED').length;

  return {
    propertyLeadsTotal: leads.length,
    distinctPropertiesWithLeads: distinctLeadProperties,
    favoritesCount: favorites.length,
    inquiriesCount: inquiries,
    distinctPropertiesViewed: distinctViewedProperties,
    agentConnectionsTotal: connections.length,
    agentConnectionsConfirmed: connConfirmed,
    agentConnectionsList: connections.map((c) => ({
      id: c.id,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      property: c.property,
      agent: c.agent,
    })),
    leadsList: leads.map((l) => ({
      id: l.id,
      status: l.status,
      interestCancelled: l.interestCancelled,
      createdAt: l.createdAt.toISOString(),
      property: l.property
        ? {
            id: l.property.id,
            title: l.property.title,
            city: l.property.city,
            propertyType: l.property.propertyType,
            listingType: listingTypeFromAmenities(l.property.amenities),
          }
        : null,
      agent: l.agent,
    })),
    transactionsList: txList,
    transactionCounts: counts,
    inferredSearchProfile: {
      propertyTypeCounts,
      rentVsSaleFromInterestedProperties: rentVsSale,
      note:
        'Συγκεντρωτικά από leads & αγαπημένα (όχι αποθηκευμένα φίλτρα χρήστη στον server). Ο ίδιος λογαριασμός μπορεί να έχει και δραστηριότητα πωλητή/μεσίτη.',
    },
  };
}

async function buildSellerInsightsBlock(userId: string) {
  const properties = await prisma.property.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      isSold: true,
      removalRequested: true,
      amenities: true,
      createdAt: true,
    },
  });

  let soldSale = 0;
  let soldRent = 0;
  let removed = 0;

  for (const p of properties) {
    const lt = listingTypeFromAmenities(p.amenities);
    if (p.removalRequested || p.status === 'unavailable') removed += 1;
    if (p.isSold) {
      if (lt === 'rent') soldRent += 1;
      else soldSale += 1;
    }
  }

  return {
    propertiesTotal: properties.length,
    soldAsSaleCount: soldSale,
    soldOrRentedAsRentCount: soldRent,
    removedOrRemovalRequestedCount: removed,
    properties: properties.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      isSold: p.isSold,
      removalRequested: p.removalRequested,
      listingType: listingTypeFromAmenities(p.amenities),
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

async function buildAgentInsightsBlock(
  userId: string,
  payoutIban: string | null
) {
  const [referralsAsReferrer, connectionsAsAgent, transactionsAsAgent, leadsAsAgent, pointsRows] =
    await Promise.all([
      prisma.referral.findMany({
        where: { referrerId: userId, referredId: { not: userId } },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { referred: { select: { id: true, name: true, email: true } } },
      }),
      prisma.buyerAgentConnection.findMany({
        where: { agentId: userId },
        select: { id: true, status: true, createdAt: true, propertyId: true, buyerId: true },
      }),
      prisma.transaction.findMany({
        where: { agentId: userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          property: { select: { id: true, title: true } },
          buyer: { select: { id: true, name: true } },
        },
      }),
      prisma.propertyLead.findMany({
        where: { agentId: userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          property: { select: { id: true, title: true } },
          buyer: { select: { id: true, name: true } },
        },
      }),
      prisma.referralPoints.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { referral: { select: { referrerId: true, referredId: true } } },
      }),
    ]);

  const connTotal = connectionsAsAgent.length;
  const connConfirmed = connectionsAsAgent.filter((c) => c.status === 'CONFIRMED').length;
  const connectionSuccessPct = connTotal > 0 ? Math.round((connConfirmed / connTotal) * 1000) / 10 : null;

  const regCount = referralsAsReferrer.length;
  const registrationSuccessNote =
    'Ποσοστό επιτυχίας referral: εγγραφές μέσω κωδικού / συνολικές αποστολές link δεν καταγράφονται πλήρως· εμφανίζονται οι εγγραφές που έχουν δημιουργηθεί ως referrals.';

  const txList = transactionsAsAgent.map((t) => {
    const bucket = transactionBucket(t.interestCancelled, t.stage);
    return {
      id: t.id,
      bucket,
      stage: t.stage,
      interestCancelled: t.interestCancelled,
      createdAt: t.createdAt.toISOString(),
      property: t.property,
      buyer: t.buyer,
    };
  });

  const completedAsAgent = txList.filter((x) => x.bucket === 'completed').length;

  const pointsFromReferrals = pointsRows.filter(
    (p) => p.referral?.referrerId === userId && p.referral.referredId !== userId
  );
  const pointsSum = pointsFromReferrals.reduce((s, p) => s + p.points, 0);

  return {
    referralRegistrationsCount: regCount,
    referralRegistrationsSuccessNote: registrationSuccessNote,
    buyerAgentConnectionsTotal: connTotal,
    buyerAgentConnectionsConfirmed: connConfirmed,
    buyerAgentConnectionSuccessPercent: connectionSuccessPct,
    propertyLeadsAsAgentCount: leadsAsAgent.length,
    leadsAsAgentSample: leadsAsAgent.slice(0, 20).map((l) => ({
      id: l.id,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
      property: l.property,
      buyer: l.buyer,
    })),
    transactionsAsAgentList: txList,
    transactionCounts: {
      open: txList.filter((x) => x.bucket === 'open').length,
      cancelled: txList.filter((x) => x.bucket === 'cancelled').length,
      pending: txList.filter((x) => x.bucket === 'pending').length,
      completed: txList.filter((x) => x.bucket === 'completed').length,
    },
    completedDealsWhileAgentCount: completedAsAgent,
    referralPointsTotal: pointsSum,
    referralPointsRecent: pointsFromReferrals.slice(0, 30).map((p) => ({
      id: p.id,
      points: p.points,
      reason: p.reason,
      createdAt: p.createdAt.toISOString(),
      propertyId: p.propertyId,
    })),
    commissionsNote:
      'Δεν υπάρχει ξεχωριστό πίνακας προμηθειών· τα referral points χρησιμοποιούνται ως ένδειξη. Αναμενόμενες vs εισπραχθείσες σε € θα οριστούν όταν συνδεθεί το οικονομικό μοντέλο.',
    payoutIban,
  };
}

/**
 * Πάντα επιστρέφει buyer + seller + agent blocks: ο ίδιος χρήστης μπορεί να έχει δραστηριότητα
 * σε πολλούς ρόλους παρά το πεδίο `user.role` (π.χ. εγγραφή ως αγοραστής αλλά και καταχωρήσεις ως πωλητής).
 */
export async function buildAdminUserInsights(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      payoutIban: true,
      createdAt: true,
      userType: true,
      country: true,
      taxId: true,
      companyName: true,
      companyTitle: true,
      companyTaxId: true,
      companyDou: true,
      companyPhone: true,
      companyEmail: true,
      companyHeadquarters: true,
      companyWebsite: true,
      companyWorkingHours: true,
      contactPersonName: true,
      contactPersonEmail: true,
      contactPersonPhone: true,
      companyLogo: true,
      licenseNumber: true,
      businessAddress: true,
    },
  });

  if (!user) {
    return null;
  }

  const roleUpper = (user.role || '').toUpperCase();
  const companyLogoPresent = !!(user.companyLogo && String(user.companyLogo).trim());

  const [buyer, seller, agent] = await Promise.all([
    buildBuyerInsightsBlock(userId),
    buildSellerInsightsBlock(userId),
    buildAgentInsightsBlock(userId, user.payoutIban),
  ]);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleUpper,
      phone: user.phone,
      payoutIban: user.payoutIban,
      createdAt: user.createdAt.toISOString(),
      userType: user.userType,
      country: user.country,
      taxId: user.taxId,
      companyName: user.companyName,
      companyTitle: user.companyTitle,
      companyTaxId: user.companyTaxId,
      companyDou: user.companyDou,
      companyPhone: user.companyPhone,
      companyEmail: user.companyEmail,
      companyHeadquarters: user.companyHeadquarters,
      companyWebsite: user.companyWebsite,
      companyWorkingHours: user.companyWorkingHours,
      contactPersonName: user.contactPersonName,
      contactPersonEmail: user.contactPersonEmail,
      contactPersonPhone: user.contactPersonPhone,
      licenseNumber: user.licenseNumber,
      businessAddress: user.businessAddress,
      companyLogoPresent,
    },
    buyer,
    seller,
    agent,
  };
}
