'use client';

import { useState, useEffect } from 'react';
import { DealRoom } from '@/lib/api/deals';
import { FaCalendarAlt, FaClock, FaCheckCircle, FaTimes, FaSpinner, FaInfoCircle, FaUser, FaChevronLeft, FaChevronRight, FaArrowRight } from 'react-icons/fa';
import { format, isSameDay, isToday, isPast, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { el } from 'date-fns/locale';
import { fetchFromBackend } from '@/lib/api/client';
import { cancelAppointment, notifyDealSigningAppointmentsChanged } from '@/lib/api/dealAppointments';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import DealConfirmDialog from './ui/DealConfirmDialog';

interface SellerSigningAppointmentModalProps {
  deal: DealRoom;
  onClose: () => void;
  onSuccess: () => void;
}

interface DealAppointmentType {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  type?: string;
  note?: string;
  bookedById?: string;
  sellerApprovedAt?: string | null;
  bookedBy?: { id: string; name: string };
}

export default function SellerSigningAppointmentModal({ deal, onClose, onSuccess }: SellerSigningAppointmentModalProps) {
  useCurrentUser(); // for auth context
  const dealBuyerId = deal.buyerId || deal.participants?.find(p => p.role === 'BUYER')?.userId;
  const dealSellerId = deal.sellerId || deal.participants?.find(p => p.role === 'SELLER')?.userId;
  const notaryRequest = deal.requests?.find(r => r.status === 'ACCEPTED' && r.type === 'NOTARY');
  const notaryProfessionalId = notaryRequest?.professionalId || (notaryRequest as any)?.professional?.id;

  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [dealAppointments, setDealAppointments] = useState<DealAppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [withdrawingOwnId, setWithdrawingOwnId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<
    null | { kind: 'withdraw' | 'rejectBuyer'; appointmentId: string }
  >(null);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isSigningSlot = (a: DealAppointmentType) =>
    a.type === 'IN_PERSON' && a.note !== 'AVAILABLE_SLOT';

  const confirmedAppointment = dealAppointments.find(
    (a) => a.status === 'CONFIRMED' && a.type === 'IN_PERSON' && a.note !== 'AVAILABLE_SLOT'
  );
  const buyerProposals = dealAppointments.filter(
    (a) => a.status === 'REQUESTED' && a.bookedById === dealBuyerId && isSigningSlot(a)
  );
  const sellerApprovedProposal = buyerProposals.find((a) => a.sellerApprovedAt);
  /** Προτάσεις υπογραφής που έστειλε ο πωλητής — περιμένουν αγοραστή + συμβολαιογράφο */
  const sellerOwnPendingProposals = dealAppointments.filter(
    (a) =>
      a.status === 'REQUESTED' &&
      dealSellerId &&
      a.bookedById === dealSellerId &&
      isSigningSlot(a)
  );

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [availRes, apptsRes] = await Promise.all([
          fetchFromBackend(`/deals/${deal.id}/notary/availability`),
          fetchFromBackend(`/deals/${deal.id}/appointments`),
        ]);
        if (availRes.ok) {
          const d = await availRes.json();
          setAvailableSlots(d.slots || []);
        }
        if (apptsRes.ok) {
          const d = await apptsRes.json();
          setDealAppointments(d.appointments || []);
        }
      } catch (e) {
        console.error(e);
        toast.error('Σφάλμα φόρτωσης');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [deal.id]);

  const handleApproveBuyerProposal = async (appointmentId: string) => {
    setIsApproving(appointmentId);
    try {
      const res = await fetchFromBackend(`/deals/${deal.id}/appointments/${appointmentId}/seller-approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Σφάλμα');
      }
      toast.success('Η πρόταση εγκρίθηκε. Ο συμβολαιογράφος θα την επιβεβαιώσει.');
      notifyDealSigningAppointmentsChanged(deal.id);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα');
    } finally {
      setIsApproving(null);
    }
  };

  const reloadDealAppointments = async () => {
    try {
      const apptsRes = await fetchFromBackend(`/deals/${deal.id}/appointments`);
      if (apptsRes.ok) {
        const d = await apptsRes.json();
        setDealAppointments(d.appointments || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const executeWithdrawOwnProposal = async (appointmentId: string) => {
    setWithdrawingOwnId(appointmentId);
    try {
      await cancelAppointment(appointmentId);
      toast.success('Η πρόταση αποσύρθηκε.');
      notifyDealSigningAppointmentsChanged(deal.id);
      await reloadDealAppointments();
      setConfirmDialog(null);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα');
    } finally {
      setWithdrawingOwnId(null);
    }
  };

  const executeRejectBuyerProposal = async (appointmentId: string) => {
    setIsRejecting(appointmentId);
    try {
      const res = await fetchFromBackend(`/deals/${deal.id}/appointments/${appointmentId}/seller-reject`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Σφάλμα');
      }
      toast.success('Η πρόταση απορρίφθηκε.');
      notifyDealSigningAppointmentsChanged(deal.id);
      setConfirmDialog(null);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα');
    } finally {
      setIsRejecting(null);
    }
  };

  const confirmDialogLoading =
    confirmDialog?.kind === 'withdraw'
      ? withdrawingOwnId === confirmDialog.appointmentId
      : confirmDialog?.kind === 'rejectBuyer'
        ? isRejecting === confirmDialog.appointmentId
        : false;

  const handleSelectSlot = async (slot: any) => {
    if (!notaryProfessionalId) {
      toast.error('Δεν βρέθηκε συμβολαιογράφος');
      return;
    }
    setIsRequesting(true);
    try {
      const startAt = typeof slot.startAt === 'string' ? slot.startAt : new Date(slot.startAt).toISOString();
      const endAt = typeof slot.endAt === 'string' ? slot.endAt : new Date(slot.endAt).toISOString();
      const res = await fetchFromBackend(`/deals/${deal.id}/appointments/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: notaryProfessionalId,
          startAt,
          endAt,
          type: 'IN_PERSON',
          location: 'Γραφείο Συμβολαιογράφου',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Σφάλμα');
      }
      toast.success('Η πρόταση στάλθηκε. Περιμένετε την αποδοχή από τον αγοραστή και τον συμβολαιογράφο.');
      notifyDealSigningAppointmentsChanged(deal.id);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleProposeCustom = async () => {
    if (!customDate || !customStartTime || !customEndTime || !notaryProfessionalId) {
      toast.error('Επιλέξτε ημερομηνία και ώρες έναρξης/λήξης');
      return;
    }
    const [sh, sm] = customStartTime.split(':').map(Number);
    const [eh, em] = customEndTime.split(':').map(Number);
    const start = new Date(customDate);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(customDate);
    end.setHours(eh, em, 0, 0);
    if (start >= end) {
      toast.error('Η ώρα λήξης πρέπει να είναι μετά την έναρξη');
      return;
    }
    if (start < new Date()) {
      toast.error('Η ημερομηνία πρέπει να είναι στο μέλλον');
      return;
    }
    setIsRequesting(true);
    try {
      const res = await fetchFromBackend(`/deals/${deal.id}/appointments/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: notaryProfessionalId,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          type: 'IN_PERSON',
          location: 'Γραφείο Συμβολαιογράφου',
          note: 'Πρόταση από πωλητή',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Σφάλμα');
      }
      toast.success('Η πρόταση στάλθηκε. Περιμένετε την αποδοχή από τον αγοραστή και τον συμβολαιογράφο.');
      notifyDealSigningAppointmentsChanged(deal.id);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα');
    } finally {
      setIsRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <FaCalendarAlt className="text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Κανονίστε Υπογραφή Συμβολαίων</h2>
                <p className="text-sm text-emerald-100">Δείτε προτάσεις, διαθέσιμες ώρες και προτείνετε ημερομηνία</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg" aria-label="Κλείσιμο">
              <FaTimes className="text-xl" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Info */}
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
              <div className="flex gap-3">
                <FaInfoCircle className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Συμφωνία και των τριών</p>
                  <p>Για να κανονιστεί το ραντεβού υπογραφής πρέπει να συμφωνήσουν <strong>αγοραστής</strong>, <strong>πωλητής</strong> και <strong>συμβολαιογράφος</strong>.</p>
                </div>
              </div>
            </div>

            {/* Confirmed */}
            {confirmedAppointment && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <FaCheckCircle className="text-green-600 text-2xl" />
                  <h3 className="font-bold text-green-900 text-lg">Επιβεβαιωμένο Ραντεβού</h3>
                </div>
                <p className="text-green-800">
                  {format(new Date(confirmedAppointment.startAt), "EEEE, d MMMM yyyy 'στις' HH:mm", { locale: el })}
                </p>
              </div>
            )}

            {/* Seller approved - αναμονή για συμβολαιογράφο */}
            {!confirmedAppointment && sellerApprovedProposal && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <FaCheckCircle className="text-amber-600 text-2xl" />
                  <h3 className="font-bold text-amber-900 text-lg">Έχετε εγκρίνει αυτή την ημερομηνία</h3>
                </div>
                <p className="text-amber-900 font-semibold mb-2">
                  {format(new Date(sellerApprovedProposal.startAt), "EEEE, d MMMM yyyy 'στις' HH:mm", { locale: el })}
                </p>
                <p className="text-amber-800 text-sm flex items-center gap-2">
                  <FaClock className="flex-shrink-0" />
                  Αναμονή για έγκριση από συμβολαιογράφο
                </p>
                <p className="text-amber-700 text-xs mt-2">
                  Αν ο συμβολαιογράφος απορρίψει την πρόταση, θα μπορείτε ξανά να επιλέξετε ή να προτείνετε ημερομηνία.
                </p>
              </div>
            )}

            {/* Δικές σας προτάσεις υπογραφής — εμφανίζονται κάθε φορά που ανοίγετε το modal */}
            {!confirmedAppointment && sellerOwnPendingProposals.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <FaClock className="text-amber-700 text-2xl flex-shrink-0" />
                  <h3 className="font-bold text-amber-950 text-lg">Η πρότασή σας βρίσκεται σε αναμονή</h3>
                </div>
                <p className="text-amber-900 text-sm mb-4">
                  Για να επιβεβαιωθεί το ραντεβού υπογραφής, πρέπει να συμφωνήσουν και οι τρεις πλευρές. Η πρότασή σας περιμένει έγκριση από τον{' '}
                  <strong>αγοραστή</strong> και τον <strong>συμβολαιογράφο</strong>.
                </p>
                <ul className="space-y-3">
                  {sellerOwnPendingProposals.map((apt) => (
                    <li
                      key={apt.id}
                      className="rounded-lg border border-amber-200 bg-white/80 px-4 py-3 text-amber-950 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold">
                          {format(new Date(apt.startAt), "EEEE, d MMMM yyyy 'στις' HH:mm", { locale: el })}
                        </p>
                        <p className="text-xs text-amber-800 mt-1">
                          Έως {format(new Date(apt.endAt), 'HH:mm', { locale: el })}
                          {apt.note ? ` · ${apt.note}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmDialog({ kind: 'withdraw', appointmentId: apt.id })}
                        disabled={!!withdrawingOwnId || !!confirmDialog}
                        className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold border-2 border-red-200 bg-red-50 text-red-800 hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <FaTimes />
                        Απόσυρση πρότασης
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!confirmedAppointment && !sellerApprovedProposal && (
              <>
                {/* Buyer proposals */}
                {buyerProposals.length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <FaUser className="text-blue-600" />
                      Προτάσεις από τον αγοραστή <span className="text-sm font-normal text-gray-600">({buyerProposals.length})</span>
                    </h4>
                    <div className="space-y-3">
                      {buyerProposals.map((apt) => (
                        <div key={apt.id} className="flex items-center justify-between p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {format(new Date(apt.startAt), "EEEE, d MMMM yyyy 'στις' HH:mm", { locale: el })}
                            </p>
                            {apt.sellerApprovedAt && (
                              <span className="text-xs text-green-700 font-medium">✓ Εγκρίθηκε από εσάς</span>
                            )}
                          </div>
                          {!apt.sellerApprovedAt && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleApproveBuyerProposal(apt.id)}
                                disabled={!!isApproving || !!confirmDialog}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                              >
                                {isApproving === apt.id ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                                Έγκριση
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDialog({ kind: 'rejectBuyer', appointmentId: apt.id })}
                                disabled={!!isRejecting || !!confirmDialog}
                                className="px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg font-semibold hover:bg-red-200 disabled:opacity-50 flex items-center gap-2"
                              >
                                <FaTimes />
                                Απόρριψη
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!confirmedAppointment && !sellerApprovedProposal && sellerOwnPendingProposals.length === 0 && (
              <>
                {/* Notary slots */}
                {availableSlots.length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <FaCalendarAlt className="text-emerald-600" />
                      Διαθέσιμες ώρες από τον συμβολαιογράφο
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                      {availableSlots.map((slot: any, idx: number) => {
                        const d = new Date(slot.startAt);
                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectSlot(slot)}
                            disabled={isRequesting}
                            className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 text-left transition-all disabled:opacity-50"
                          >
                            <p className="font-semibold text-gray-900">
                              {format(d, 'd MMM yyyy', { locale: el })}
                            </p>
                            <p className="text-sm text-gray-600">
                              {format(d, 'HH:mm', { locale: el })} - {format(new Date(slot.endAt), 'HH:mm', { locale: el })}
                            </p>
                            <p className="text-xs text-emerald-600 mt-1">Επιλέξτε</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom proposal - ίδιο με buyer step 9 */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FaInfoCircle className="text-gray-600" />
                    Προσφέρετε Δική σας Ημερομηνία
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Ημερομηνία <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-emerald-500 transition-all text-left flex justify-between"
                      >
                        <span className="text-gray-900 font-medium">
                          {customDate ? format(customDate, 'EEEE, d MMMM yyyy', { locale: el }) : 'Επιλέξτε ημερομηνία'}
                        </span>
                        <FaCalendarAlt className="text-gray-500" />
                      </button>
                      {showDatePicker && (
                        <div className="mt-3 bg-white border-2 border-gray-200 rounded-xl p-4 shadow-lg">
                          <div className="flex justify-between mb-4">
                            <button type="button" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                              <FaChevronLeft className="text-gray-600" />
                            </button>
                            <h4 className="text-lg font-semibold text-gray-900">{format(calendarMonth, 'MMMM yyyy', { locale: el })}</h4>
                            <button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                              <FaChevronRight className="text-gray-600" />
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'].map((day, idx) => (
                              <div key={idx} className="text-center text-xs font-semibold text-gray-600 py-2">{day}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {eachDayOfInterval({
                              start: startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 }),
                              end: endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 }),
                            }).map((day) => {
                              const isPastDay = isPast(day) && !isToday(day);
                              const sel = customDate && isSameDay(day, customDate);
                              const isTodayDate = isToday(day);
                              const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                              return (
                                <button
                                  key={day.toISOString()}
                                  type="button"
                                  onClick={() => {
                                    if (!isPastDay) {
                                      setCustomDate(new Date(day));
                                      setShowDatePicker(false);
                                    }
                                  }}
                                  disabled={isPastDay}
                                  className={`aspect-square p-2 rounded-lg text-sm font-medium transition-all ${
                                    isPastDay ? 'text-gray-300 cursor-not-allowed opacity-50' : 'hover:bg-emerald-50 cursor-pointer'
                                  } ${sel ? 'bg-emerald-600 text-white hover:bg-emerald-700' : isTodayDate && !isPastDay ? 'bg-emerald-100 text-emerald-700 font-bold' : !isCurrentMonth ? 'text-gray-400 opacity-50' : 'text-gray-700'}`}
                                >
                                  {format(day, 'd')}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Γρήγορες επιλογές:</p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  setCustomDate(today);
                                  setCalendarMonth(today);
                                  setShowDatePicker(false);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              >
                                Σήμερα
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const tomorrow = new Date();
                                  tomorrow.setDate(tomorrow.getDate() + 1);
                                  tomorrow.setHours(0, 0, 0, 0);
                                  setCustomDate(tomorrow);
                                  setCalendarMonth(tomorrow);
                                  setShowDatePicker(false);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
                              >
                                Αύριο
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {customDate && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Ώρα <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((time) => {
                            const [hours, minutes] = time.split(':').map(Number);
                            const slotDate = new Date(customDate);
                            slotDate.setHours(hours, minutes, 0, 0);
                            const isPastSlot = slotDate < new Date();
                            const isSelected = customStartTime === time;
                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={() => {
                                  if (!isPastSlot) {
                                    setCustomStartTime(time);
                                    const endHour = hours + 1;
                                    setCustomEndTime(`${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
                                  }
                                }}
                                disabled={isPastSlot}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                  isPastSlot ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : isSelected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-emerald-500 hover:bg-emerald-50'
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Ή εισάγετε προσαρμοσμένη ώρα:</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Ώρα Έναρξης</label>
                              <input
                                type="time"
                                value={customStartTime}
                                onChange={(e) => setCustomStartTime(e.target.value)}
                                className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Ώρα Λήξης</label>
                              <input
                                type="time"
                                value={customEndTime}
                                onChange={(e) => setCustomEndTime(e.target.value)}
                                className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={handleProposeCustom}
                      disabled={isRequesting || !customDate || !customStartTime || !customEndTime}
                      className="w-full px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isRequesting ? <><FaSpinner className="animate-spin" /><span>Αποστέλλεται...</span></> : <><FaArrowRight /><span>Στείλετε Πρόταση</span></>}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>

    <DealConfirmDialog
      open={!!confirmDialog}
      title={
        confirmDialog?.kind === 'rejectBuyer'
          ? 'Απόρριψη πρότασης αγοραστή'
          : 'Απόσυρση πρότασης υπογραφής'
      }
      message={
        confirmDialog?.kind === 'rejectBuyer'
          ? 'Να απορριφθεί αυτή η προτεινόμενη ημερομηνία από τον αγοραστή; Θα μπορεί να στείλει νέα πρόταση αργότερα.'
          : 'Να αποσυρθεί αυτή η πρόταση υπογραφής; Θα μπορείτε να στείλετε νέα ημερομηνία αργότερα.'
      }
      confirmLabel={confirmDialog?.kind === 'rejectBuyer' ? 'Απόρριψη' : 'Απόσυρση'}
      cancelLabel="Άκυρο"
      confirmVariant="danger"
      isLoading={confirmDialogLoading}
      onCancel={() => !confirmDialogLoading && setConfirmDialog(null)}
      onConfirm={() => {
        if (!confirmDialog || confirmDialogLoading) return;
        if (confirmDialog.kind === 'withdraw') {
          void executeWithdrawOwnProposal(confirmDialog.appointmentId);
        } else {
          void executeRejectBuyerProposal(confirmDialog.appointmentId);
        }
      }}
    />
    </>
  );
}
