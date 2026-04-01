import { prisma } from '../prisma';
import { DealStatus } from '@prisma/client';

const PROFESSIONAL_ROLES = ['LAWYER', 'NOTARY', 'ENGINEER', 'ACCOUNTANT'] as const;

export function inferAppointmentPurpose(note: string | null | undefined, type: string): string {
  const n = (note || '').toLowerCase();
  if (note === 'AVAILABLE_SLOT') return 'Διαθέσιμο slot';
  if (n.includes('υπογραφ') || n.includes('signing') || n.includes('συμβόλαι') || n.includes('contract signing')) {
    return 'Υπογραφή συμβολαίου / ολοκλήρωση';
  }
  if (n.includes('πρώτη') || n.includes('first meeting') || n.includes('γνωριμ') || n.includes('consultation')) {
    return 'Πρώτη συνάντηση / συνεννόηση';
  }
  if (type === 'ONLINE') return 'Διαδικτυακά';
  if (type === 'IN_PERSON') return 'Δια ζώσης';
  return 'Ραντεβού deal room';
}

export function meetingFormatLabel(type: string, location?: string | null, meetingLink?: string | null): string {
  if (type === 'ONLINE') {
    return meetingLink ? `Online — σύνδεσμος` : 'Online';
  }
  if (type === 'IN_PERSON') {
    return location ? `Δια ζώσης — ${location}` : 'Δια ζώσης';
  }
  return type || '—';
}

export async function listProfessionalsFromJoin() {
  return prisma.user.findMany({
    where: {
      isDeleted: false,
      role: { in: [...PROFESSIONAL_ROLES] },
      professionalProfile: { isNot: null },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      createdAt: true,
      professionalProfile: {
        select: {
          id: true,
          type: true,
          displayName: true,
          city: true,
          verificationStatus: true,
        },
      },
    },
  });
}

export async function buildAdminProfessionalDetail(userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
      role: { in: [...PROFESSIONAL_ROLES] },
      professionalProfile: { isNot: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      createdAt: true,
      professionalProfile: {
        select: {
          id: true,
          type: true,
          displayName: true,
          officeName: true,
          phone: true,
          city: true,
          address: true,
          areaTags: true,
          bio: true,
          languages: true,
          services: true,
          verificationStatus: true,
          verifiedAt: true,
          createdAt: true,
          updatedAt: true,
          availability: true,
        },
      },
    },
  });

  if (!user) return null;

  const profile = user.professionalProfile;

  const participants = await prisma.dealParticipant.findMany({
    where: { userId, removedAt: null },
    include: {
      dealRoom: {
        include: {
          property: { select: { id: true, title: true, city: true } },
        },
      },
    },
  });

  const dealRooms = participants.map((p) => p.dealRoom);
  const countBy = (statuses: DealStatus[]) =>
    dealRooms.filter((d) => statuses.includes(d.status)).length;

  const dealRoomStats = {
    totalParticipated: dealRooms.length,
    active: countBy(['ACTIVE']),
    pendingDraft: countBy(['DRAFT']),
    cancelled: countBy(['CANCELLED']),
    completedOrClosed: countBy(['COMPLETED', 'CLOSED', 'CLOSED_PROPERTY_SOLD']),
  };

  let requestStats = {
    total: 0,
    requested: 0,
    accepted: 0,
    declined: 0,
    cancelled: 0,
    acceptancePercent: null as number | null,
  };

  if (profile) {
    const grouped = await prisma.professionalRequest.groupBy({
      by: ['status'],
      where: { professionalId: profile.id },
      _count: { id: true },
    });
    for (const row of grouped) {
      const c = row._count.id;
      requestStats.total += c;
      if (row.status === 'REQUESTED') requestStats.requested += c;
      if (row.status === 'ACCEPTED') requestStats.accepted += c;
      if (row.status === 'DECLINED') requestStats.declined += c;
      if (row.status === 'CANCELLED') requestStats.cancelled += c;
    }
    const decided = requestStats.accepted + requestStats.declined;
    requestStats.acceptancePercent =
      decided > 0 ? Math.round((requestStats.accepted / decided) * 100) : null;
  }

  const appointments =
    profile != null
      ? await prisma.dealAppointment.findMany({
          where: {
            professionalId: profile.id,
            NOT: { note: 'AVAILABLE_SLOT' },
          },
          include: {
            dealRoom: {
              include: {
                property: { select: { id: true, title: true, city: true } },
              },
            },
            bookedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { startAt: 'asc' },
          take: 500,
        })
      : [];

  const appointmentsOut = appointments.map((a) => ({
    id: a.id,
    dealRoomId: a.dealRoomId,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    type: a.type,
    status: a.status,
    location: a.location,
    meetingLink: a.meetingLink,
    note: a.note,
    purposeLabel: inferAppointmentPurpose(a.note, a.type),
    formatLabel: meetingFormatLabel(a.type, a.location, a.meetingLink),
    property: a.dealRoom.property
      ? { id: a.dealRoom.property.id, title: a.dealRoom.property.title, city: a.dealRoom.property.city }
      : null,
    bookedBy: a.bookedBy,
  }));

  const services = (profile?.services as Record<string, unknown> | null) || {};
  const publicProfile =
    services && typeof services.publicProfile === 'object' && services.publicProfile !== null
      ? (services.publicProfile as Record<string, unknown>)
      : {};

  const registryNumber =
    (services.registryNumber as string) ||
    (typeof services.registryNumber === 'number' ? String(services.registryNumber) : '') ||
    '';

  const registryBodyRaw = services.registryBody;
  const registryBody =
    typeof registryBodyRaw === 'string'
      ? registryBodyRaw.trim()
      : registryBodyRaw != null
        ? String(registryBodyRaw).trim()
        : '';

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt.toISOString(),
      // Column may be omitted from query (pre-migration); tab lists users with professional profile.
      registeredViaProfessionalJoin: true,
    },
    profile: profile
      ? {
          id: profile.id,
          type: profile.type,
          displayName: profile.displayName,
          officeName: profile.officeName,
          phone: profile.phone,
          city: profile.city,
          address: profile.address,
          areaTags: profile.areaTags,
          bio: profile.bio,
          languages: profile.languages,
          services,
          registryNumber,
          registryBody,
          publicProfile,
          verificationStatus: profile.verificationStatus,
          verifiedAt: profile.verifiedAt?.toISOString() ?? null,
          availability: profile.availability
            ? {
                timezone: profile.availability.timezone,
                weeklyRules: profile.availability.weeklyRules,
                exceptions: profile.availability.exceptions,
                meetingTypes: profile.availability.meetingTypes,
              }
            : null,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        }
      : null,
    dealRoomStats,
    dealRooms: dealRooms.map((d) => ({
      id: d.id,
      status: d.status,
      property: d.property ? { id: d.property.id, title: d.property.title, city: d.property.city } : null,
      participantRole: participants.find((p) => p.dealRoomId === d.id)?.role ?? null,
    })),
    requestStats,
    appointments: appointmentsOut,
  };
}
