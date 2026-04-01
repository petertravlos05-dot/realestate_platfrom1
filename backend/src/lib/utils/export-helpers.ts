/**
 * GDPR DSAR Export Helpers (v2 with pagination)
 * Collects all user data for GDPR-compliant export with size limits and pagination
 */

import { prisma } from '../prisma';

// Default limits (can be overridden via env or request params)
const MAX_MESSAGES_EXPORT = parseInt(process.env.MAX_MESSAGES_EXPORT || '1000', 10);
const MAX_AUDIT_EVENTS_EXPORT = parseInt(process.env.MAX_AUDIT_EVENTS_EXPORT || '500', 10);
const MAX_TRANSACTIONS_EXPORT = parseInt(process.env.MAX_TRANSACTIONS_EXPORT || '500', 10);
const MAX_LEADS_EXPORT = parseInt(process.env.MAX_LEADS_EXPORT || '500', 10);
const MAX_DEAL_MESSAGES_EXPORT = parseInt(process.env.MAX_DEAL_MESSAGES_EXPORT || '1000', 10);
const MAX_EXPORT_BYTES = parseInt(process.env.MAX_EXPORT_BYTES || '2000000', 10); // 2MB default
const MAX_EXPORT_TIME_MS = parseInt(process.env.MAX_EXPORT_TIME_MS || '2000', 10); // 2 seconds default

export interface ExportCursor {
  messages?: string | null;
  auditEvents?: string | null;
  leads?: string | null;
  transactions?: string | null;
  dealMessages?: string | null;
}

export interface ExportLimits {
  messages?: number;
  auditEvents?: number;
  leads?: number;
  transactions?: number;
  dealMessages?: number;
}

export interface ExportResult {
  data: any;
  nextCursor: ExportCursor | null;
  hasMore: {
    messages: boolean;
    auditEvents: boolean;
    leads: boolean;
    transactions: boolean;
    dealMessages: boolean;
  };
}

/**
 * Parse cursor string to object
 */
function parseCursor(cursorStr: string | null | undefined): { id: string; createdAt: Date } | null {
  if (!cursorStr) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursorStr, 'base64').toString());
    return {
      id: parsed.id,
      createdAt: new Date(parsed.createdAt),
    };
  } catch {
    return null;
  }
}

/**
 * Create cursor string from object
 */
function createCursor(id: string, createdAt: Date): string {
  return Buffer.from(JSON.stringify({ id, createdAt: createdAt.toISOString() })).toString('base64');
}

/**
 * Collect all user data for GDPR export (v2 with pagination)
 */
export async function collectUserDataForExport(
  userId: string,
  cursor?: ExportCursor | null,
  limits?: ExportLimits
): Promise<ExportResult> {
  try {
    // 1. User profile (exclude password, secrets, internal flags)
    const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      role: true,
      phone: true,
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
      userType: true,
      createdAt: true,
      updatedAt: true,
      // Explicitly exclude: password
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // 2. Consent history
  const consents = await prisma.userConsent.findMany({
    where: { userId },
    orderBy: { acceptedAt: 'desc' },
  });

  // 3. Properties owned/managed by user
  const properties = await prisma.property.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      shortDescription: true,
      fullDescription: true,
      propertyType: true,
      condition: true,
      yearBuilt: true,
      renovationYear: true,
      area: true,
      bedrooms: true,
      bathrooms: true,
      floor: true,
      parkingSpaces: true,
      garden: true,
      multipleFloors: true,
      commercialType: true,
      rooms: true,
      plotCategory: true,
      plotOwnershipType: true,
      heatingType: true,
      heatingSystem: true,
      windows: true,
      windowsType: true,
      flooring: true,
      energyClass: true,
      elevator: true,
      furnished: true,
      securityDoor: true,
      alarm: true,
      disabledAccess: true,
      soundproofing: true,
      thermalInsulation: true,
      pool: true,
      balconyArea: true,
      hasBalcony: true,
      plotArea: true,
      buildingCoefficient: true,
      coverageRatio: true,
      facadeLength: true,
      sides: true,
      buildableArea: true,
      buildingPermit: true,
      roadAccess: true,
      terrain: true,
      shape: true,
      suitability: true,
      storageType: true,
      elevatorType: true,
      fireproofDoor: true,
      state: true,
      city: true,
      neighborhood: true,
      street: true,
      number: true,
      postalCode: true,
      coordinates: true,
      price: true,
      pricePerSquareMeter: true,
      negotiable: true,
      additionalPriceNotes: true,
      status: true,
      isVerified: true,
      isReserved: true,
      isSold: true,
      removalRequested: true,
      images: true,
      keywords: true,
      amenities: true,
      createdAt: true,
      updatedAt: true,
      uploadMethod: true,
      lawyerInfo: true,
      assignmentType: true,
      assignmentDocument: true,
      lawyerName: true,
      lawyerEmail: true,
      lawyerPhone: true,
      lawyerTaxId: true,
      visitSettings: true,
      // Explicitly exclude: userId (already known)
    },
  });

  // 4. Leads (where user is buyer/agent) - with pagination
  const leadsLimit = limits?.leads ?? MAX_LEADS_EXPORT;
  const leadsCursor = parseCursor(cursor?.leads);
  
  const buyerLeadsWhere: any = { buyerId: userId };
  if (leadsCursor) {
    buyerLeadsWhere.OR = [
      { createdAt: { lt: leadsCursor.createdAt } },
      { createdAt: leadsCursor.createdAt, id: { lt: leadsCursor.id } },
    ];
  }
  
  const buyerLeads = await prisma.propertyLead.findMany({
    where: buyerLeadsWhere,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: leadsLimit + 1, // +1 to check if there are more
    select: {
      id: true,
      propertyId: true,
      agentId: true,
      status: true,
      notes: true,
      interestCancelled: true,
      createdAt: true,
      updatedAt: true,
      transactionId: true,
    },
  });

  const agentLeadsWhere: any = { agentId: userId };
  if (leadsCursor) {
    agentLeadsWhere.OR = [
      { createdAt: { lt: leadsCursor.createdAt } },
      { createdAt: leadsCursor.createdAt, id: { lt: leadsCursor.id } },
    ];
  }
  
  const agentLeads = await prisma.propertyLead.findMany({
    where: agentLeadsWhere,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: leadsLimit + 1,
    select: {
      id: true,
      propertyId: true,
      buyerId: true,
      status: true,
      notes: true,
      interestCancelled: true,
      createdAt: true,
      updatedAt: true,
      transactionId: true,
    },
  });
  
  // Check if there are more leads
  const hasMoreLeads = buyerLeads.length > leadsLimit || agentLeads.length > leadsLimit;
  const actualBuyerLeads = buyerLeads.slice(0, leadsLimit);
  const actualAgentLeads = agentLeads.slice(0, leadsLimit);
  
  // Get last lead for cursor (if any leads exist)
  const allLeads = [...actualBuyerLeads, ...actualAgentLeads];
  const lastLead = allLeads.length > 0
    ? allLeads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))[0]
    : null;

  // 5. Viewing requests (appointments)
  const buyerViewings = await prisma.viewingRequest.findMany({
    where: { buyerId: userId },
    select: {
      id: true,
      propertyId: true,
      agentId: true,
      date: true,
      time: true,
      endTime: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const agentViewings = await prisma.viewingRequest.findMany({
    where: { agentId: userId },
    select: {
      id: true,
      propertyId: true,
      buyerId: true,
      date: true,
      time: true,
      endTime: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 6. Messages authored by user - with pagination
  const messagesLimit = limits?.messages ?? MAX_MESSAGES_EXPORT;
  const messagesCursor = parseCursor(cursor?.messages);
  
  const messagesWhere: any = { userId };
  if (messagesCursor) {
    messagesWhere.OR = [
      { createdAt: { lt: messagesCursor.createdAt } },
      { createdAt: messagesCursor.createdAt, id: { lt: messagesCursor.id } },
    ];
  }
  
  const messages = await prisma.message.findMany({
    where: messagesWhere,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: messagesLimit + 1, // +1 to check if there are more
    select: {
      id: true,
      content: true,
      createdAt: true,
      propertyId: true,
    },
  });
  
  // Check if there are more messages
  const hasMoreMessages = messages.length > messagesLimit;
  const actualMessages = messages.slice(0, messagesLimit);
  const lastMessage = actualMessages.length > 0 ? actualMessages[actualMessages.length - 1] : null;

  // 7. Support tickets and messages
  const supportTickets = await prisma.supportTicket.findMany({
    where: {
      OR: [
        { userId },
        { createdBy: userId },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      category: true,
      selectedRole: true,
      createdAt: true,
      updatedAt: true,
      propertyId: true,
      transactionId: true,
    },
  });

  const supportMessages = await prisma.supportMessage.findMany({
    where: {
      ticketId: { in: supportTickets.map(t => t.id) },
      userId,
    },
    select: {
      id: true,
      content: true,
      isFromAdmin: true,
      createdAt: true,
      ticketId: true,
    },
  });

  // 8. Transactions where user participates - with pagination
  const transactionsLimit = limits?.transactions ?? MAX_TRANSACTIONS_EXPORT;
  const transactionsCursor = parseCursor(cursor?.transactions);
  
  const transactionsWhere: any = {
    OR: [
      { buyerId: userId },
      { agentId: userId },
      { sellerId: userId },
    ],
  };
  
  if (transactionsCursor) {
    transactionsWhere.AND = [
      {
        OR: [
          { createdAt: { lt: transactionsCursor.createdAt } },
          { createdAt: transactionsCursor.createdAt, id: { lt: transactionsCursor.id } },
        ],
      },
    ];
  }
  
  const allTransactions = await prisma.transaction.findMany({
    where: transactionsWhere,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: transactionsLimit + 1, // +1 to check if there are more
    select: {
      id: true,
      propertyId: true,
      buyerId: true,
      agentId: true,
      sellerId: true,
      status: true,
      stage: true,
      interestCancelled: true,
      createdAt: true,
      updatedAt: true,
      leadId: true,
    },
  });
  
  // Check if there are more transactions
  const hasMoreTransactions = allTransactions.length > transactionsLimit;
  const transactions = allTransactions.slice(0, transactionsLimit);
  const lastTransaction = transactions.length > 0 ? transactions[transactions.length - 1] : null;

  // 9. Payment references (Stripe customerId, subscriptionId - NO card data)
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      id: true,
      planId: true,
      status: true,
      billingCycle: true,
      stripeSubscriptionId: true,
      stripeCustomerId: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      createdAt: true,
      updatedAt: true,
      plan: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          priceQuarterly: true,
          maxProperties: true,
          benefits: true,
        },
      },
    },
  });

  // 10. Minimal audit log entries (event type + timestamp only; no IP, no metadata) - with pagination
  // Note: Audit logs might be in files/logs, not DB
  // For now, return empty array - if audit logs are in DB, implement pagination here
  const auditEventsLimit = limits?.auditEvents ?? MAX_AUDIT_EVENTS_EXPORT;
  const auditEventsCursor = parseCursor(cursor?.auditEvents);
  
  // TODO: If audit logs are in DB, query them here with pagination
  const auditEvents: Array<{ eventType: string; timestamp: string }> = [];
  const hasMoreAuditEvents = false;
  // Since audit events are not in DB yet, lastAuditEvent is always null
  // Type assertion needed because TypeScript can't infer the type when it's always null
  const lastAuditEvent = null as { id: string; createdAt: Date } | null;

  // 11. Favorites
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    select: {
      id: true,
      propertyId: true,
      createdAt: true,
    },
  });

  // 12. Inquiries
  const inquiries = await prisma.inquiry.findMany({
    where: { userId },
    select: {
      id: true,
      message: true,
      propertyId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 13. Buyer-Agent connections
  const buyerConnections = await prisma.buyerAgentConnection.findMany({
    where: { buyerId: userId },
    select: {
      id: true,
      agentId: true,
      propertyId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const agentConnections = await prisma.buyerAgentConnection.findMany({
    where: { agentId: userId },
    select: {
      id: true,
      buyerId: true,
      propertyId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 14. Notifications
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 500, // Cap notifications
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      isRead: true,
      createdAt: true,
      updatedAt: true,
      propertyId: true,
    },
  });

  // 15. Deal Rooms (where user is participant)
  const dealRooms = await prisma.dealRoom.findMany({
    where: {
      participants: {
        some: {
          userId,
          removedAt: null,
        },
      },
    },
    select: {
      id: true,
      propertyId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      participants: {
        where: { removedAt: null },
        select: {
          userId: true,
          role: true,
          // Get user's displayName only if it's a professional (public info)
          user: {
            select: {
              id: true,
              role: true,
              // Only include professional displayName if user is LAWYER/NOTARY
              professionalProfile: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Map deal rooms with participant summary (minimal PII)
  const dealRoomsWithSummary = dealRooms.map((dealRoom) => {
    const userParticipant = dealRoom.participants.find((p) => p.userId === userId);
    return {
      dealRoomId: dealRoom.id,
      propertyId: dealRoom.propertyId,
      status: dealRoom.status,
      createdAt: dealRoom.createdAt,
      updatedAt: dealRoom.updatedAt,
      participantRole: userParticipant?.role || null,
      participants: dealRoom.participants.map((p) => {
        // Only include minimal info: userId, role, and displayName only for professionals
        const participantData: any = {
          userId: p.userId,
          role: p.role,
        };
        
        // Only include displayName if it's a professional (public info)
        if (p.user?.role === 'LAWYER' || p.user?.role === 'NOTARY') {
          if (p.user.professionalProfile?.displayName) {
            participantData.displayName = p.user.professionalProfile.displayName;
          }
        }
        
        return participantData;
      }),
    };
  });

  // 16. Deal Threads (where user is member)
  const dealThreads = await prisma.dealThread.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    select: {
      id: true,
      dealRoomId: true,
      type: true,
      title: true,
      createdAt: true,
    },
  });

  // 17. Deal Messages (from threads user is member of) - with pagination
  const dealMessagesLimit = limits?.dealMessages ?? MAX_DEAL_MESSAGES_EXPORT;
  const dealMessagesCursor = parseCursor(cursor?.dealMessages);
  
  const dealMessagesWhere: any = {
    thread: {
      members: {
        some: { userId },
      },
    },
  };
  
  if (dealMessagesCursor) {
    dealMessagesWhere.OR = [
      { createdAt: { lt: dealMessagesCursor.createdAt } },
      { createdAt: dealMessagesCursor.createdAt, id: { lt: dealMessagesCursor.id } },
    ];
  }
  
  const dealMessages = await prisma.dealMessage.findMany({
    where: dealMessagesWhere,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: dealMessagesLimit + 1,
    select: {
      id: true,
      threadId: true,
      senderId: true,
      body: true,
      createdAt: true,
    },
  });
  
  const hasMoreDealMessages = dealMessages.length > dealMessagesLimit;
  const actualDealMessages = dealMessages.slice(0, dealMessagesLimit);
  const lastDealMessage = actualDealMessages.length > 0 ? actualDealMessages[actualDealMessages.length - 1] : null;

  // 18. Deal Documents (metadata only, no s3Key)
  const dealDocuments = await prisma.dealDocument.findMany({
    where: {
      dealRoom: {
        participants: {
          some: {
            userId,
            removedAt: null,
          },
        },
      },
    },
    select: {
      id: true,
      dealRoomId: true,
      category: true,
      status: true,
      requestedFromRole: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      visibility: true,
      requestedById: true,
      uploadedById: true,
      reviewById: true,
      reviewNote: true,
      createdAt: true,
      updatedAt: true,
      // Explicitly exclude: s3Key
    },
  });

  // 19. Deal Appointments
  const dealAppointments = await prisma.dealAppointment.findMany({
    where: {
      dealRoom: {
        participants: {
          some: {
            userId,
            removedAt: null,
          },
        },
      },
      OR: [
        { bookedById: userId },
        {
          professional: {
            userId,
          },
        },
      ],
    },
    select: {
      id: true,
      dealRoomId: true,
      professionalId: true,
      bookedById: true,
      startAt: true,
      endAt: true,
      type: true,
      status: true,
      location: true,
      meetingLink: true,
      note: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 20. Professional Requests (if user is professional OR requester)
  const professionalRequests = await prisma.professionalRequest.findMany({
    where: {
      OR: [
        {
          professional: {
            userId,
          },
        },
        { requestedById: userId },
      ],
    },
    select: {
      id: true,
      dealRoomId: true,
      professionalId: true,
      requestedById: true,
      type: true,
      status: true,
      respondedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Build next cursor
  const nextCursor: ExportCursor | null = (
    hasMoreMessages || hasMoreLeads || hasMoreTransactions || hasMoreAuditEvents || hasMoreDealMessages
  ) ? {
    messages: hasMoreMessages && lastMessage ? createCursor(lastMessage.id, lastMessage.createdAt) : (cursor?.messages || null),
    auditEvents: (hasMoreAuditEvents && lastAuditEvent !== null) ? createCursor(lastAuditEvent.id, lastAuditEvent.createdAt) : (cursor?.auditEvents || null),
    leads: hasMoreLeads && lastLead ? createCursor(lastLead.id, lastLead.createdAt) : (cursor?.leads || null),
    transactions: hasMoreTransactions && lastTransaction ? createCursor(lastTransaction.id, lastTransaction.createdAt) : (cursor?.transactions || null),
    dealMessages: hasMoreDealMessages && lastDealMessage ? createCursor(lastDealMessage.id, lastDealMessage.createdAt) : (cursor?.dealMessages || null),
  } : null;

  return {
    data: {
      profile: user,
      consents: consents.map(c => ({
        id: c.id,
        consentType: c.consentType,
        version: c.version,
        acceptedAt: c.acceptedAt,
        // Exclude: ip, userAgent (privacy)
      })),
      properties,
      leads: {
        asBuyer: actualBuyerLeads,
        asAgent: actualAgentLeads,
      },
      appointments: {
        asBuyer: buyerViewings,
        asAgent: agentViewings,
      },
      messages: actualMessages.map(m => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        propertyId: m.propertyId,
      })),
      supportTickets: supportTickets.map(t => ({
        ...t,
        messages: supportMessages.filter(m => m.ticketId === t.id),
      })),
      transactions,
      payments: subscription ? {
        subscription: {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          stripeCustomerId: subscription.stripeCustomerId,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
        },
      } : null,
      auditEvents,
      favorites,
      inquiries,
      connections: {
        asBuyer: buyerConnections,
        asAgent: agentConnections,
      },
      notifications,
      // Deal Room data
      dealRooms: dealRoomsWithSummary,
      dealThreads: dealThreads.map(t => ({
        threadId: t.id,
        dealRoomId: t.dealRoomId,
        type: t.type,
        title: t.title,
        createdAt: t.createdAt,
      })),
      dealMessages: actualDealMessages.map(m => ({
        messageId: m.id,
        threadId: m.threadId,
        senderUserId: m.senderId,
        body: m.body,
        createdAt: m.createdAt,
      })),
      dealDocuments: dealDocuments.map(d => ({
        docId: d.id,
        dealRoomId: d.dealRoomId,
        category: d.category,
        status: d.status,
        requestedFromRole: d.requestedFromRole,
        fileName: d.fileName,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        visibility: d.visibility,
        requestedById: d.requestedById,
        uploadedById: d.uploadedById,
        reviewById: d.reviewById,
        reviewNote: d.reviewNote,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        // Explicitly exclude: s3Key
      })),
      dealAppointments: dealAppointments.map(a => ({
        appointmentId: a.id,
        dealRoomId: a.dealRoomId,
        professionalId: a.professionalId,
        buyerId: a.bookedById,
        startAt: a.startAt,
        endAt: a.endAt,
        type: a.type,
        status: a.status,
        location: a.location,
        meetingLink: a.meetingLink,
        note: a.note,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      professionalRequests: professionalRequests.map(r => ({
        requestId: r.id,
        dealRoomId: r.dealRoomId,
        professionalId: r.professionalId,
        requestedById: r.requestedById,
        type: r.type,
        status: r.status,
        respondedAt: r.respondedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    },
    nextCursor,
    hasMore: {
      messages: hasMoreMessages,
      auditEvents: hasMoreAuditEvents,
      leads: hasMoreLeads,
      transactions: hasMoreTransactions,
      dealMessages: hasMoreDealMessages,
    },
  };
  } catch (error) {
    console.error('[EXPORT] Error collecting user data:', error);
    throw error;
  }
}

