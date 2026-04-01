'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaCheckCircle, FaTimes, FaSpinner, FaList, FaCalendar, FaCog, FaChevronLeft, FaChevronRight, FaChevronDown, FaTrashAlt, FaExclamationTriangle } from 'react-icons/fa';
import { confirmAppointment, rejectAppointment } from '@/lib/api/dealAppointments';
import { DealRoom } from '@/lib/api/deals';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface Appointment {
  id: string;
  dealRoomId: string;
  startAt: string;
  endAt: string;
  type: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED';
  note?: string;
  location?: string;
  bookedBy?: {
    name: string;
  };
}

interface AppointmentsTabProps {
  appointments: Appointment[];
  deals: DealRoom[];
  loading?: boolean;
  onRefresh: () => void;
}

export default function AppointmentsTab({ appointments, deals, loading, onRefresh }: AppointmentsTabProps) {
  const router = useRouter();
  const ARCHIVE_STORAGE_KEY = 'professional_dashboard_archived_appointments';
  const DELETED_ARCHIVE_STORAGE_KEY = 'professional_dashboard_deleted_archived_appointments';
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'REQUESTED' | 'CONFIRMED' | 'CANCELLED'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [collapsedSections, setCollapsedSections] = useState({
    pending: false,
    approved: false,
    completed: false,
    cancelled: false,
    archived: false,
  });
  const [archivedAppointmentKeys, setArchivedAppointmentKeys] = useState<string[]>([]);
  const [deletedArchivedAppointmentKeys, setDeletedArchivedAppointmentKeys] = useState<string[]>([]);
  const [archiveStateReady, setArchiveStateReady] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    mode: 'single' | 'all';
    appointment: Appointment | null;
  }>({
    open: false,
    mode: 'single',
    appointment: null,
  });
  const getArchiveKey = (appointment: Appointment) =>
    `${appointment.dealRoomId}__${appointment.startAt}__${appointment.endAt}__${appointment.type}`;

  useEffect(() => {
    try {
      const savedArchived = localStorage.getItem(ARCHIVE_STORAGE_KEY);
      if (savedArchived) {
        const parsedArchived = JSON.parse(savedArchived);
        if (Array.isArray(parsedArchived)) {
          setArchivedAppointmentKeys(parsedArchived.filter((id) => typeof id === 'string'));
        }
      }

      const savedDeletedArchived = localStorage.getItem(DELETED_ARCHIVE_STORAGE_KEY);
      if (savedDeletedArchived) {
        const parsedDeletedArchived = JSON.parse(savedDeletedArchived);
        if (Array.isArray(parsedDeletedArchived)) {
          setDeletedArchivedAppointmentKeys(parsedDeletedArchived.filter((id) => typeof id === 'string'));
        }
      }
    } catch {
      // ignore corrupted local storage values
    } finally {
      setArchiveStateReady(true);
    }
  }, [ARCHIVE_STORAGE_KEY, DELETED_ARCHIVE_STORAGE_KEY]);

  useEffect(() => {
    if (!archiveStateReady) return;
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archivedAppointmentKeys));
  }, [archivedAppointmentKeys, archiveStateReady, ARCHIVE_STORAGE_KEY]);

  useEffect(() => {
    if (!archiveStateReady) return;
    localStorage.setItem(DELETED_ARCHIVE_STORAGE_KEY, JSON.stringify(deletedArchivedAppointmentKeys));
  }, [deletedArchivedAppointmentKeys, archiveStateReady, DELETED_ARCHIVE_STORAGE_KEY]);

  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'all') return appointments;
    return appointments.filter(apt => apt.status === statusFilter);
  }, [appointments, statusFilter]);

  const requestedAppointments = useMemo(() => {
    return appointments.filter(apt => apt.status === 'REQUESTED');
  }, [appointments]);

  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getAppointmentVisualStatus = (appointment: Appointment): 'pending' | 'cancelled' | 'completed' | 'upcoming' | 'approved' => {
    if (appointment.status === 'REQUESTED') return 'pending';
    if (appointment.status === 'CANCELLED') return 'cancelled';

    const start = new Date(appointment.startAt);
    const now = new Date();
    if (start < now) return 'completed';

    const upcomingThreshold = new Date(now);
    upcomingThreshold.setDate(upcomingThreshold.getDate() + 7);
    if (start <= upcomingThreshold) return 'upcoming';

    return 'approved';
  };

  const calendarAppointments = useMemo(() => {
    return statusFilter === 'all'
      ? appointments
      : appointments.filter((apt) => apt.status === statusFilter);
  }, [appointments, statusFilter]);

  const calendarStatsByDate = useMemo(() => {
    const byDate = new Map<
      string,
      { pending: number; completed: number; approved: number; upcoming: number; cancelled: number }
    >();

    calendarAppointments.forEach((appointment) => {
      const start = new Date(appointment.startAt);
      if (Number.isNaN(start.getTime())) return;
      const key = formatDateKey(start);
      if (!byDate.has(key)) {
        byDate.set(key, { pending: 0, completed: 0, approved: 0, upcoming: 0, cancelled: 0 });
      }
      const status = getAppointmentVisualStatus(appointment);
      byDate.get(key)![status] += 1;
    });

    return byDate;
  }, [calendarAppointments]);

  const selectedDateAppointments = useMemo(() => {
    const key = formatDateKey(selectedDate);
    return calendarAppointments
      .filter((appointment) => {
        const start = new Date(appointment.startAt);
        return !Number.isNaN(start.getTime()) && formatDateKey(start) === key;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [calendarAppointments, selectedDate]);

  const monthGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const cells: Array<Date | null> = [];

    for (let i = 0; i < startPadding; i += 1) cells.push(null);
    for (let day = 1; day <= totalDays; day += 1) cells.push(new Date(year, month, day));

    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth]);

  const formatMonthTitle = (date: Date) =>
    date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });

  const toStatusLabel = (status: ReturnType<typeof getAppointmentVisualStatus>) => {
    const labels = {
      pending: 'Σε αναμονή',
      completed: 'Ολοκληρωμένο',
      approved: 'Εγκεκριμένο',
      upcoming: 'Επερχόμενο',
      cancelled: 'Ακυρωμένο',
    };
    return labels[status];
  };

  const getListCategory = (appointment: Appointment): 'pending' | 'approved' | 'completed' | 'cancelled' => {
    const visual = getAppointmentVisualStatus(appointment);
    if (visual === 'pending') return 'pending';
    if (visual === 'cancelled') return 'cancelled';
    if (visual === 'completed') return 'completed';
    return 'approved'; // upcoming + approved are grouped as approved in list sections
  };

  const archivedAppointments = useMemo(
    () => appointments.filter((appointment) => isArchived(appointment) && !isDeletedArchived(appointment)),
    [appointments, archivedAppointmentKeys, deletedArchivedAppointmentKeys]
  );

  const nonArchivedAppointments = useMemo(
    () => appointments.filter((appointment) => !isArchived(appointment) && !isDeletedArchived(appointment)),
    [appointments, archivedAppointmentKeys, deletedArchivedAppointmentKeys]
  );

  const filteredNonArchivedAppointments = useMemo(() => {
    if (statusFilter === 'all') return nonArchivedAppointments;
    return nonArchivedAppointments.filter((appointment) => appointment.status === statusFilter);
  }, [nonArchivedAppointments, statusFilter]);

  function isArchived(appointment: Appointment) {
    return archivedAppointmentKeys.includes(getArchiveKey(appointment));
  }
  function isDeletedArchived(appointment: Appointment) {
    return deletedArchivedAppointmentKeys.includes(getArchiveKey(appointment));
  }
  const archiveAppointment = (appointment: Appointment) => {
    const key = getArchiveKey(appointment);
    setArchivedAppointmentKeys((prev) => {
      const next = prev.includes(key) ? prev : [...prev, key];
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };
  const unarchiveAppointment = (appointment: Appointment) => {
    const key = getArchiveKey(appointment);
    setArchivedAppointmentKeys((prev) => {
      const next = prev.filter((id) => id !== key);
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };
  const deleteArchivedAppointment = (appointment: Appointment) => {
    const key = getArchiveKey(appointment);
    setArchivedAppointmentKeys((prev) => {
      const next = prev.filter((id) => id !== key);
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setDeletedArchivedAppointmentKeys((prev) => {
      const next = prev.includes(key) ? prev : [...prev, key];
      localStorage.setItem(DELETED_ARCHIVE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };
  const deleteAllArchivedAppointments = () => {
    if (archivedAppointments.length === 0) return;
    const keysToDelete = archivedAppointments.map((appointment) => getArchiveKey(appointment));
    setArchivedAppointmentKeys((prev) => {
      const next = prev.filter((id) => !keysToDelete.includes(id));
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setDeletedArchivedAppointmentKeys((prev) => {
      const merged = Array.from(new Set([...prev, ...keysToDelete]));
      localStorage.setItem(DELETED_ARCHIVE_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  };
  const openDeleteOneConfirm = (appointment: Appointment) => {
    setDeleteConfirm({
      open: true,
      mode: 'single',
      appointment,
    });
  };
  const openDeleteAllConfirm = () => {
    setDeleteConfirm({
      open: true,
      mode: 'all',
      appointment: null,
    });
  };
  const closeDeleteConfirm = () => {
    setDeleteConfirm((prev) => ({ ...prev, open: false, appointment: null }));
  };
  const confirmDeleteArchived = () => {
    if (deleteConfirm.mode === 'single' && deleteConfirm.appointment) {
      deleteArchivedAppointment(deleteConfirm.appointment);
      toast.success('Το αρχειοθετημένο ραντεβού διαγράφηκε');
    } else if (deleteConfirm.mode === 'all') {
      deleteAllArchivedAppointments();
      toast.success('Όλα τα αρχειοθετημένα ραντεβού διαγράφηκαν');
    }
    closeDeleteConfirm();
  };

  const handleConfirm = async (appointmentId: string) => {
    if (processingId) return;
    setProcessingId(appointmentId);
    try {
      await confirmAppointment(appointmentId);
      toast.success('Το ραντεβού επιβεβαιώθηκε');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Αποτυχία επιβεβαίωσης');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (appointmentId: string) => {
    if (processingId) return;
    if (!confirm('Είστε σίγουροι ότι θέλετε να απορρίψετε αυτό το ραντεβού;')) return;
    setProcessingId(appointmentId);
    try {
      await rejectAppointment(appointmentId);
      toast.success('Το ραντεβού απορρίφθηκε');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Αποτυχία απόρριψης');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <FaSpinner className="animate-spin text-3xl text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ραντεβού</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredAppointments.length} {filteredAppointments.length === 1 ? 'ραντεβού' : 'ραντεβού'} συνολικά
            </p>
          </div>
          
          <div className="flex gap-3">
            {/* View mode toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FaList className="inline mr-2" />
                Λίστα
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FaCalendar className="inline mr-2" />
                Ημερολόγιο
              </button>
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">Όλα</option>
              <option value="REQUESTED">Σε αναμονή ({requestedAppointments.length})</option>
              <option value="CONFIRMED">Επιβεβαιωμένα</option>
              <option value="CANCELLED">Ακυρωμένα</option>
            </select>
          </div>
        </div>

        {/* Appointments list */}
        {viewMode === 'list' && (
          <>
            {filteredNonArchivedAppointments.length === 0 && archivedAppointments.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-10 text-center">
                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
                  <FaCalendarAlt className="text-2xl text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Δεν υπάρχουν ραντεβού</h3>
                <p className="text-slate-600 mb-6">
                  {statusFilter === 'REQUESTED' 
                    ? 'Δεν υπάρχουν αιτήματα σε αναμονή'
                    : 'Δεν υπάρχουν ραντεβού με αυτό το φίλτρο'}
                </p>
                {statusFilter === 'all' && (
                  <button
                    onClick={() => router.push('/professional/dashboard?tab=pricing&section=meetings')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                  >
                    <FaCog />
                    Ρύθμισε Διαθεσιμότητα
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const grouped = {
                    pending: filteredNonArchivedAppointments.filter((a) => getListCategory(a) === 'pending'),
                    approved: filteredNonArchivedAppointments.filter((a) => getListCategory(a) === 'approved'),
                    completed: filteredNonArchivedAppointments.filter((a) => getListCategory(a) === 'completed'),
                    cancelled: filteredNonArchivedAppointments.filter((a) => getListCategory(a) === 'cancelled'),
                    archived: archivedAppointments,
                  };

                  const sections: Array<{ key: keyof typeof grouped; title: string }> = [
                    { key: 'pending', title: 'Σε αναμονή' },
                    { key: 'approved', title: 'Εγκεκριμένα' },
                    { key: 'completed', title: 'Ολοκληρωμένα' },
                    { key: 'cancelled', title: 'Ακυρωμένα' },
                    { key: 'archived', title: 'Αρχειοθετημένα' },
                  ];

                  return sections.map((section) => {
                    const items = grouped[section.key];
                    if (items.length === 0) return null;
                    const isCollapsed = collapsedSections[section.key];

                    return (
                      <div key={section.key} className="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedSections((prev) => ({
                              ...prev,
                              [section.key]: !prev[section.key],
                            }))
                          }
                          className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
                        >
                          <span className="font-semibold text-gray-900">
                            {section.title} ({items.length})
                          </span>
                          <FaChevronDown
                            className={`text-gray-500 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                          />
                        </button>

                        {!isCollapsed && (
                          <div className="p-4 space-y-4">
                            {section.key === 'archived' && (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={openDeleteAllConfirm}
                                  className="px-3 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm"
                                >
                                  Διαγραφή όλων
                                </button>
                              </div>
                            )}
                            {items.map((appointment) => {
                              const deal = deals.find(d => d.id === appointment.dealRoomId);
                              const startDate = new Date(appointment.startAt);
                              const endDate = new Date(appointment.endAt);
                              const isProcessing = processingId === appointment.id;
                              const visual = getAppointmentVisualStatus(appointment);

                              return (
                                <div
                                  key={appointment.id}
                                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                                >
                                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                          {deal?.property?.title || 'Άγνωστο ακίνητο'}
                                        </h3>
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                          appointment.type === 'ONLINE'
                                            ? 'bg-slate-100 text-slate-700'
                                            : 'bg-teal-50 text-teal-700'
                                        }`}>
                                          {appointment.type === 'ONLINE' ? 'Online' : 'Από κοντά'}
                                        </span>
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                          visual === 'pending'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : visual === 'cancelled'
                                            ? 'bg-red-100 text-red-800'
                                            : visual === 'completed'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : visual === 'upcoming'
                                            ? 'bg-teal-100 text-teal-800'
                                            : 'bg-cyan-100 text-cyan-800'
                                        }`}>
                                          {toStatusLabel(visual)}
                                        </span>
                                      </div>

                                      <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                          <FaCalendarAlt className="text-gray-400" />
                                          <span>
                                            {startDate.toLocaleDateString('el-GR', {
                                              weekday: 'long',
                                              day: 'numeric',
                                              month: 'long',
                                              year: 'numeric',
                                            })}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <FaClock className="text-gray-400" />
                                          <span>
                                            {startDate.toLocaleTimeString('el-GR', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })} - {endDate.toLocaleTimeString('el-GR', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </span>
                                        </div>
                                        {appointment.location && (
                                          <div className="flex items-center gap-2">
                                            <FaMapMarkerAlt className="text-gray-400" />
                                            <span>{appointment.location}</span>
                                          </div>
                                        )}
                                        {appointment.note && (
                                          <div className="mt-3 p-3 bg-gray-50 rounded">
                                            <p className="text-sm text-gray-700">{appointment.note}</p>
                                          </div>
                                        )}
                                      </div>

                                      <div className="mt-4 text-sm text-gray-500">
                                        <p>
                                          <span className="font-medium">Αγοραστής:</span>{' '}
                                          {appointment.bookedBy?.name || 'Άγνωστος'}
                                        </p>
                                        {deal?.property?.city && (
                                          <p>
                                            <span className="font-medium">Τοποθεσία:</span> {deal.property.city}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-2 lg:ml-4">
                                      {appointment.status === 'REQUESTED' && (
                                        <>
                                          <button
                                            onClick={() => handleConfirm(appointment.id)}
                                            disabled={isProcessing}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            {isProcessing ? (
                                              <FaSpinner className="animate-spin" />
                                            ) : (
                                              <FaCheckCircle />
                                            )}
                                            Επιβεβαίωση
                                          </button>
                                          <button
                                            onClick={() => handleReject(appointment.id)}
                                            disabled={isProcessing}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            {isProcessing ? (
                                              <FaSpinner className="animate-spin" />
                                            ) : (
                                              <FaTimes />
                                            )}
                                            Απόρριψη
                                          </button>
                                        </>
                                      )}
                                      {(section.key === 'completed' || section.key === 'cancelled') && (
                                        <button
                                          type="button"
                                          onClick={() => archiveAppointment(appointment)}
                                          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm text-center"
                                        >
                                          Αρχειοθέτηση
                                        </button>
                                      )}
                                      {section.key === 'archived' && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => unarchiveAppointment(appointment)}
                                            className="px-4 py-2 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors text-sm text-center"
                                          >
                                            Επαναφορά
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => openDeleteOneConfirm(appointment)}
                                            className="px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm text-center"
                                          >
                                            Διαγραφή
                                          </button>
                                        </>
                                      )}
                                      <Link
                                        href={`/deals/${appointment.dealRoomId}?tab=appointments`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm text-center"
                                      >
                                        Προβολή Deal Room
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </>
        )}

        {viewMode === 'calendar' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 border border-slate-200 rounded-xl p-4 sm:p-5 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center"
                  aria-label="Προηγούμενος μήνας"
                >
                  <FaChevronLeft />
                </button>
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 capitalize">
                  {formatMonthTitle(calendarMonth)}
                </h3>
                <button
                  onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center"
                  aria-label="Επόμενος μήνας"
                >
                  <FaChevronRight />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-500 py-1.5">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthGrid.map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} className="aspect-square" />;

                  const key = formatDateKey(date);
                  const stats = calendarStatsByDate.get(key);
                  const isSelected = formatDateKey(selectedDate) === key;
                  const isToday = formatDateKey(new Date()) === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(date)}
                      className={`aspect-square rounded-lg border text-sm transition-colors p-1 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : isToday
                          ? 'border-slate-300 bg-white text-slate-900'
                          : 'border-transparent bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <span className="font-medium">{date.getDate()}</span>
                        {stats && (
                          <div className="mt-1 flex items-center gap-0.5 flex-wrap justify-center">
                            {stats.pending > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Σε αναμονή" />}
                            {stats.upcoming > 0 && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" title="Επερχόμενο" />}
                            {stats.approved > 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" title="Εγκεκριμένο" />}
                            {stats.completed > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Ολοκληρωμένο" />}
                            {stats.cancelled > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Ακυρωμένο" />}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">Σε αναμονή</span>
                <span className="px-2 py-1 rounded-full border border-teal-200 bg-teal-50 text-teal-700">Επερχόμενο</span>
                <span className="px-2 py-1 rounded-full border border-cyan-200 bg-cyan-50 text-cyan-700">Εγκεκριμένο</span>
                <span className="px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">Ολοκληρωμένο</span>
                <span className="px-2 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700">Ακυρωμένο</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-white">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">
                {selectedDate.toLocaleDateString('el-GR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h4>

              {selectedDateAppointments.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <FaCalendarAlt className="text-slate-300 text-xl mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Δεν υπάρχουν ραντεβού για την επιλεγμένη ημέρα.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateAppointments.map((appointment) => {
                    const start = new Date(appointment.startAt);
                    const end = new Date(appointment.endAt);
                    const deal = deals.find((d) => d.id === appointment.dealRoomId);
                    const visualStatus = getAppointmentVisualStatus(appointment);
                    return (
                      <Link
                        key={appointment.id}
                        href={`/deals/${appointment.dealRoomId}?tab=appointments`}
                        className="block rounded-lg border border-slate-200 p-3 hover:border-teal-300 hover:bg-slate-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-slate-900 truncate">{deal?.property?.title || 'Deal Room'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {start.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {end.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <span
                          className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                            visualStatus === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : visualStatus === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : visualStatus === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : visualStatus === 'upcoming'
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                          }`}
                        >
                          {toStatusLabel(visualStatus)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <FaExclamationTriangle className="text-red-600 text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">
                  {deleteConfirm.mode === 'all'
                    ? 'Διαγραφή όλων των αρχειοθετημένων'
                    : 'Διαγραφή αρχειοθετημένου ραντεβού'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {deleteConfirm.mode === 'all'
                    ? `Θα διαγραφούν οριστικά ${archivedAppointments.length} αρχειοθετημένα ραντεβού. Η ενέργεια δεν αναιρείται.`
                    : 'Το ραντεβού θα διαγραφεί οριστικά από τα αρχειοθετημένα. Η ενέργεια δεν αναιρείται.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors text-sm font-medium"
              >
                Ακύρωση
              </button>
              <button
                type="button"
                onClick={confirmDeleteArchived}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm font-medium"
              >
                <FaTrashAlt className="text-xs" />
                {deleteConfirm.mode === 'all' ? 'Διαγραφή όλων' : 'Διαγραφή'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
