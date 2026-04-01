'use client';

import React, { useMemo, useState } from 'react';
import { FaTimes, FaExternalLinkAlt, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import CalendarWidget from '@/components/professional/CalendarWidget';
import type { DealAppointment } from '@/lib/api/dealAppointments';

export type AdminProfessionalJoinListItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  createdAt: string;
  professionalProfile: {
    id: string;
    type: string;
    displayName: string;
    city: string | null;
    verificationStatus: string;
  } | null;
};

export type AdminProfessionalDetail = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone: string | null;
    createdAt: string;
    registeredViaProfessionalJoin: boolean;
  };
  profile: {
    id: string;
    type: string;
    displayName: string;
    officeName: string | null;
    phone: string | null;
    city: string | null;
    address: string | null;
    areaTags: string[];
    bio: string | null;
    languages: string[];
    services: Record<string, unknown>;
    registryNumber: string;
    /** Δικηγορικός σύλλογος / παράρτημα ΤΕΕ — από φόρμα εγγραφής (services.registryBody) */
    registryBody?: string;
    publicProfile: Record<string, unknown>;
    verificationStatus: string;
    verifiedAt: string | null;
    availability: {
      timezone: string;
      weeklyRules: unknown;
      exceptions: unknown;
      meetingTypes: string[];
    } | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  dealRoomStats: {
    totalParticipated: number;
    active: number;
    pendingDraft: number;
    cancelled: number;
    completedOrClosed: number;
  };
  dealRooms: Array<{
    id: string;
    status: string;
    property: { id: string; title: string; city: string | null } | null;
    participantRole: string | null;
  }>;
  requestStats: {
    total: number;
    requested: number;
    accepted: number;
    declined: number;
    cancelled: number;
    acceptancePercent: number | null;
  };
  appointments: Array<{
    id: string;
    dealRoomId: string;
    startAt: string;
    endAt: string;
    type: string;
    status: string;
    location: string | null;
    meetingLink: string | null;
    note: string | null;
    purposeLabel: string;
    formatLabel: string;
    property: { id: string; title: string; city: string | null } | null;
    bookedBy: { id: string; name: string; email: string } | null;
  }>;
};

const ROLE_LABELS: Record<string, string> = {
  LAWYER: 'Δικηγόρος',
  NOTARY: 'Συμβολαιογράφος',
  ENGINEER: 'Μηχανικός',
  ACCOUNTANT: 'Λογιστής',
};

/** Κατάσταση deal room όπως την βλέπει ο admin (δίπλα στον τίτλο) */
const VERIFICATION_LABELS: Record<string, { badge: string; className: string }> = {
  PENDING: {
    badge: 'Εκκρεμεί · μη επαληθευμένος',
    className: 'bg-amber-50 text-amber-900 ring-amber-200',
  },
  VERIFIED: {
    badge: 'Επαληθευμένος',
    className: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  },
  REJECTED: {
    badge: 'Απορρίφθηκε',
    className: 'bg-red-50 text-red-900 ring-red-200',
  },
};

const DEAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Σε αναμονή',
  ACTIVE: 'Ενεργό',
  CLOSED: 'Κλειστό',
  CANCELLED: 'Ακυρωμένο',
  COMPLETED: 'Ολοκληρωμένο',
  CLOSED_PROPERTY_SOLD: 'Κλειστό (πώληση ακινήτου)',
};

function dealRoomStatusBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
    case 'DRAFT':
      return 'bg-amber-100 text-amber-800 ring-amber-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 ring-red-200';
    case 'COMPLETED':
    case 'CLOSED':
    case 'CLOSED_PROPERTY_SOLD':
      return 'bg-slate-100 text-slate-800 ring-slate-200';
    default:
      return 'bg-gray-100 text-gray-700 ring-gray-200';
  }
}

function publicProfileString(pub: Record<string, unknown> | undefined, key: string): string {
  const v = pub?.[key];
  if (v == null) return '';
  return String(v).trim();
}

function registryBodyColumnLabel(type: string): string {
  if (type === 'LAWYER') return 'Δικηγορικός Σύλλογος';
  if (type === 'ENGINEER') return 'Παράρτημα / περιφέρεια ΤΕΕ';
  if (type === 'NOTARY') return 'Συμβολαιογραφικός Σύλλογος';
  return 'Φορέας μητρώου';
}

function registryAmKindByType(type: string): string {
  if (type === 'LAWYER') return 'Α.Μ. Δικηγορικού Συλλόγου';
  if (type === 'ENGINEER') return 'Α.Μ. ΤΕΕ (Τεχνικό Επιμελητήριο Ελλάδας)';
  if (type === 'NOTARY') return 'Α.Μ. Συμβολαιογραφικού Συλλόγου';
  return 'Αριθμός μητρώου';
}

function resolveRegistryBody(profile: {
  registryBody?: string;
  services?: Record<string, unknown>;
}): string {
  const top = profile.registryBody?.trim();
  if (top) return top;
  const s = profile.services?.registryBody;
  if (typeof s === 'string' && s.trim()) return s.trim();
  return '';
}

function normalizeExternalHref(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  listItem: AdminProfessionalJoinListItem | null;
  detail: AdminProfessionalDetail | null;
  loading: boolean;
  /** Καλείται μετά από επιτυχή αλλαγή verificationStatus ώστε να ανανεωθεί το detail / η λίστα */
  onVerificationChanged?: () => void | Promise<void>;
}

export default function AdminProfessionalDetailModal({
  isOpen,
  onClose,
  listItem,
  detail,
  loading,
  onVerificationChanged,
}: Props) {
  const [verificationSaving, setVerificationSaving] = useState(false);
  const calendarAppointments: DealAppointment[] = useMemo(() => {
    if (!detail?.appointments?.length) return [];
    const professionalId =
      detail.profile?.id ?? listItem?.professionalProfile?.id ?? '';
    return detail.appointments.map((a) => ({
      id: a.id,
      dealRoomId: a.dealRoomId,
      professionalId,
      startAt: a.startAt,
      endAt: a.endAt,
      type: `${a.formatLabel} — ${a.purposeLabel}`,
      status:
        a.status === 'REQUESTED' || a.status === 'CONFIRMED' || a.status === 'CANCELLED'
          ? a.status
          : 'CONFIRMED',
      location: a.location ?? undefined,
      meetingLink: a.meetingLink ?? undefined,
      note: a.note ?? undefined,
      createdAt: a.startAt,
    }));
  }, [detail, listItem]);

  const registryBodyResolved = detail?.profile ? resolveRegistryBody(detail.profile) : '';

  const userIdForVerification = listItem?.id ?? detail?.user?.id ?? null;

  const setVerificationStatus = async (verificationStatus: 'VERIFIED' | 'PENDING') => {
    if (!userIdForVerification) return;
    setVerificationSaving(true);
    try {
      await apiClient.patch(`/admin/professionals/${userIdForVerification}/verification`, {
        verificationStatus,
      });
      toast.success(
        verificationStatus === 'VERIFIED'
          ? 'Ο επαγγελματίας σημειώθηκε ως επαληθευμένος.'
          : 'Η κατάσταση επαλήθευσης ορίστηκε σε εκκρεμότητα.'
      );
      await onVerificationChanged?.();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Αποτυχία ενημέρωσης κατάστασης επαλήθευσης.';
      toast.error(msg);
    } finally {
      setVerificationSaving(false);
    }
  };

  if (!isOpen) return null;

  const u = listItem || detail?.user;
  const vStatus = detail?.profile?.verificationStatus ?? '';
  const vMeta = VERIFICATION_LABELS[vStatus] ?? {
    badge: vStatus || '—',
    className: 'bg-gray-50 text-gray-800 ring-gray-200',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <button
          type="button"
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-label="Κλείσιμο"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
          <div className="flex items-start justify-between gap-4 p-4 border-b border-gray-200 shrink-0">
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Επαγγελματίας (εγγραφή πύλης)</h2>
                {u && (
                  <p className="text-sm text-gray-600 mt-1">
                    {u.name} · {u.email} · {ROLE_LABELS[u.role] || u.role}
                    {u.phone ? ` · ${u.phone}` : ''}
                  </p>
                )}
              </div>
              {!loading && detail?.profile && (
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${vMeta.className}`}
                  >
                    Επαλήθευση: {vMeta.badge}
                  </span>
                  {detail.profile.verificationStatus === 'VERIFIED' ? (
                    <button
                      type="button"
                      disabled={verificationSaving}
                      onClick={() => setVerificationStatus('PENDING')}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      {verificationSaving ? <FaSpinner className="h-3 w-3 animate-spin" /> : null}
                      Αλλαγή σε μη επαληθευμένο (εκκρεμεί)
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={verificationSaving}
                      onClick={() => setVerificationStatus('VERIFIED')}
                      className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
                    >
                      {verificationSaving ? <FaSpinner className="h-3 w-3 animate-spin" /> : null}
                      Επαλήθευση επαγγελματία
                    </button>
                  )}
                </div>
              )}
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-6">
            {loading && (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
              </div>
            )}

            {!loading && detail && (
              <>
                <section>
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-3">Deal rooms</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-sm">
                    <Stat label="Συμμετοχές (σύνολο)" value={detail.dealRoomStats.totalParticipated} />
                    <Stat label="Ενεργά" value={detail.dealRoomStats.active} />
                    <Stat label="Σε αναμονή (draft)" value={detail.dealRoomStats.pendingDraft} />
                    <Stat label="Ακυρωμένα" value={detail.dealRoomStats.cancelled} />
                    <Stat label="Ολοκληρωμένα / κλειστά" value={detail.dealRoomStats.completedOrClosed} />
                  </div>
                  {detail.dealRooms.length > 0 && (
                    <ul className="mt-3 max-h-64 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100 text-xs">
                      {detail.dealRooms.map((d) => (
                        <li
                          key={d.id}
                          className="px-3 py-2.5 flex flex-wrap items-center gap-2 gap-y-2 bg-white"
                        >
                          <span className="min-w-0 flex-1 basis-[min(100%,12rem)] font-medium text-gray-900 truncate">
                            {d.property?.title || d.id}
                          </span>
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${dealRoomStatusBadgeClass(d.status)}`}
                          >
                            {DEAL_STATUS_LABELS[d.status] || d.status}
                          </span>
                          {d.participantRole ? (
                            <span className="shrink-0 text-[11px] text-gray-500">
                              Ρόλος: {d.participantRole}
                            </span>
                          ) : null}
                          <a
                            href={`/deals/${d.id}?from=admin`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
                          >
                            <FaExternalLinkAlt className="h-3 w-3 opacity-90" aria-hidden />
                            Άνοιγμα deal room
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-3">Αιτήματα συμμετοχής σε deal</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-sm">
                    <Stat label="Σύνολο" value={detail.requestStats.total} />
                    <Stat label="Εκκρεμή" value={detail.requestStats.requested} />
                    <Stat label="Αποδεκτά" value={detail.requestStats.accepted} />
                    <Stat label="Απορριφθέντα" value={detail.requestStats.declined} />
                    <Stat label="Ακυρωμένα" value={detail.requestStats.cancelled} />
                    <Stat
                      label="% αποδοχής*"
                      value={
                        detail.requestStats.acceptancePercent != null
                          ? `${detail.requestStats.acceptancePercent}%`
                          : '—'
                      }
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    *% αποδοχής = αποδεκτά / (αποδεκτά + απορριφθέντα), όταν υπάρχουν αποφάσεις.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-3">Προφίλ επαγγελματία</h3>
                  {!detail.profile ? (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                      Δεν έχει ολοκληρωθεί ακόμα το ProfessionalProfile (π.χ. μετά την πρώτη εγγραφή).
                    </p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <p>
                          <span className="text-gray-500">Τύπος:</span> {ROLE_LABELS[detail.profile.type] || detail.profile.type}
                        </p>
                        <p>
                          <span className="text-gray-500">Εμφανιζόμενο όνομα:</span> {detail.profile.displayName}
                        </p>
                        <p>
                          <span className="text-gray-500">Γραφείο:</span> {detail.profile.officeName || '—'}
                        </p>
                        <p>
                          <span className="text-gray-500">Πόλη:</span> {detail.profile.city || '—'}
                        </p>
                        <p>
                          <span className="text-gray-500">Τηλ. προφίλ:</span> {detail.profile.phone || '—'}
                        </p>
                        <p className="sm:col-span-2">
                          <span className="text-gray-500">Διεύθυνση:</span> {detail.profile.address || '—'}
                        </p>
                        <p className="sm:col-span-2">
                          <span className="text-gray-500">Περιοχές (tags):</span>{' '}
                          {detail.profile.areaTags?.length ? detail.profile.areaTags.join(', ') : '—'}
                        </p>
                        <p className="sm:col-span-2">
                          <span className="text-gray-500">Γλώσσες:</span>{' '}
                          {detail.profile.languages?.length ? detail.profile.languages.join(', ') : '—'}
                        </p>
                        <div className="sm:col-span-2 rounded-lg border border-gray-100 bg-slate-50/90 p-4 space-y-2">
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                            Επαγγελματικό μητρώο
                          </p>
                          <p className="text-gray-800">
                            <span className="text-gray-500">{registryAmKindByType(detail.profile.type)}:</span>{' '}
                            {detail.profile.registryNumber?.trim() ? (
                              <span className="font-medium">{detail.profile.registryNumber.trim()}</span>
                            ) : (
                              '—'
                            )}
                          </p>
                          <p className="text-gray-800">
                            <span className="text-gray-500">
                              {registryBodyColumnLabel(detail.profile.type)}:
                            </span>{' '}
                            {registryBodyResolved ? (
                              <span className="font-medium">{registryBodyResolved}</span>
                            ) : (
                              '—'
                            )}
                          </p>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Στην εγγραφή επαγγελματία ζητείται ο παραπάνω τύπος Α.Μ.· ο σύλλογος ή το παράρτημα ΤΕΕ
                            καταχωρείται στο επόμενο πεδίο όταν το συμπληρώσει ο χρήστης.
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">Βιογραφικό</p>
                        <p className="text-gray-800 whitespace-pre-wrap rounded-md border border-gray-100 bg-gray-50 p-3 min-h-[3rem]">
                          {detail.profile.bio?.trim() ? detail.profile.bio : '—'}
                        </p>
                      </div>

                      {(() => {
                        const pub = detail.profile.publicProfile || {};
                        const website = publicProfileString(pub, 'website');
                        const linkedin = publicProfileString(pub, 'linkedin');
                        const avatarDataUrl = publicProfileString(pub, 'avatarDataUrl');
                        const hasAvatar = avatarDataUrl.length > 0;
                        const canPreviewAvatar =
                          hasAvatar &&
                          (avatarDataUrl.startsWith('data:image/') || /^https?:\/\//i.test(avatarDataUrl));

                        return (
                          <div className="border-t border-gray-100 pt-4 mt-4 space-y-4">
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Δημόσιο προφίλ</p>
                            <div className="space-y-4 text-sm">
                              <div>
                                <p className="text-xs text-gray-500 mb-2">Φωτογραφία (avatar)</p>
                                {canPreviewAvatar ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={avatarDataUrl}
                                    alt=""
                                    className="w-28 h-28 rounded-xl object-cover border border-gray-200 bg-gray-50 shadow-sm"
                                  />
                                ) : hasAvatar ? (
                                  <p className="text-xs text-gray-500 max-w-prose">
                                    Έχει αποθηκευτεί τιμή (δεν προεπισκοπείται)· μήκος {avatarDataUrl.length}{' '}
                                    χαρακτήρες.
                                  </p>
                                ) : (
                                  <p className="text-gray-400">—</p>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Ιστότοπος</p>
                                {website ? (
                                  <a
                                    href={normalizeExternalHref(website)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-teal-700 hover:underline break-all"
                                  >
                                    {website}
                                  </a>
                                ) : (
                                  <p className="text-gray-400">—</p>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">LinkedIn</p>
                                {linkedin ? (
                                  <a
                                    href={normalizeExternalHref(linkedin)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-teal-700 hover:underline break-all"
                                  >
                                    {linkedin}
                                  </a>
                                ) : (
                                  <p className="text-gray-400">—</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {detail.profile.services && Object.keys(detail.profile.services).filter((k) => k !== 'publicProfile').length > 0 && (
                        <div>
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">Υπόλοιπα services (τιμολόγηση κ.λπ.)</p>
                          <pre className="text-xs bg-slate-50 border rounded-md p-3 overflow-x-auto max-h-40">
                            {JSON.stringify(
                              Object.fromEntries(
                                Object.entries(detail.profile.services).filter(([k]) => k !== 'publicProfile')
                              ),
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      )}
                      {detail.profile.availability && (
                        <div>
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">Διαθεσιμότητα</p>
                          <p className="text-xs text-gray-700">
                            Ζώνη: {detail.profile.availability.timezone} · Τύποι συναντήσεων:{' '}
                            {(detail.profile.availability.meetingTypes || []).join(', ') || '—'}
                          </p>
                          <pre className="text-xs mt-1 bg-slate-50 border rounded-md p-2 max-h-32 overflow-auto">
                            {JSON.stringify(detail.profile.availability.weeklyRules, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-3">Ραντεβού (ημερολόγιο)</h3>
                  <CalendarWidget appointments={calendarAppointments} showDayAppointments />
                  {detail.appointments.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-64 overflow-y-auto border rounded-md divide-y text-xs">
                      {detail.appointments.map((a) => (
                        <div key={a.id} className="p-3 bg-white">
                          <div className="font-medium text-gray-900">
                            {new Date(a.startAt).toLocaleString('el-GR', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}{' '}
                            — {new Date(a.endAt).toLocaleTimeString('el-GR', { timeStyle: 'short' })}
                          </div>
                          <div className="text-gray-600 mt-1">
                            <span className="font-medium">Τρόπος:</span> {a.formatLabel} ·{' '}
                            <span className="font-medium">Σκοπός:</span> {a.purposeLabel}
                          </div>
                          <div className="text-gray-500 mt-0.5">
                            Κατάσταση: {a.status} · Ακίνητο: {a.property?.title || '—'} · Κράτηση από:{' '}
                            {a.bookedBy?.name || '—'}
                          </div>
                          {a.note && a.note !== 'AVAILABLE_SLOT' && (
                            <p className="text-gray-600 mt-1 italic">Σημείωση: {a.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {!loading && !detail && (
              <p className="text-gray-600 text-center py-8">Δεν φορτώθηκαν λεπτομέρειες.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
