'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { DealAppointment } from '@/lib/api/dealAppointments';
import { DealRoom } from '@/lib/api/deals';
import { confirmAppointment, cancelAppointment } from '@/lib/api/dealAppointments';
import { toast } from 'react-hot-toast';

interface AppointmentsWidgetProps {
  appointments: DealAppointment[];
  deals: DealRoom[];
  loading?: boolean;
  onRefresh?: () => void;
}

export default function AppointmentsWidget({ appointments, deals, loading, onRefresh }: AppointmentsWidgetProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'pending'>('upcoming');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const now = new Date();
  const upcoming = appointments.filter(apt => {
    const start = new Date(apt.startAt);
    return start >= now && apt.status === 'CONFIRMED';
  }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const pending = appointments.filter(apt => apt.status === 'REQUESTED');

  const getDealForAppointment = (appointment: DealAppointment): DealRoom | undefined => {
    return deals.find(d => d.id === appointment.dealRoomId);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: date.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const handleConfirm = async (appointmentId: string) => {
    if (processingId) return;
    setProcessingId(appointmentId);
    try {
      await confirmAppointment(appointmentId);
      toast.success('Το ραντεβού επιβεβαιώθηκε');
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || 'Αποτυχία επιβεβαίωσης ραντεβού');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    if (processingId) return;
    if (!confirm('Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτό το ραντεβού;')) return;
    setProcessingId(appointmentId);
    try {
      await cancelAppointment(appointmentId);
      toast.success('Το ραντεβού ακυρώθηκε');
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || 'Αποτυχία ακύρωσης ραντεβού');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <FaSpinner className="animate-spin text-2xl text-blue-600" />
        </div>
      </div>
    );
  }

  const displayAppointments = activeTab === 'upcoming' ? upcoming : pending;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              activeTab === 'upcoming'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Επερχόμενα ({upcoming.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              activeTab === 'pending'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Σε αναμονή ({pending.length})
          </button>
        </div>
      </div>

      <div className="p-6">
        {displayAppointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FaCalendarAlt className="text-4xl mx-auto mb-2 text-gray-300" />
            <p>Δεν υπάρχουν {activeTab === 'upcoming' ? 'επερχόμενα' : 'αιτήματα'} ραντεβού</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayAppointments.map((appointment) => {
              const deal = getDealForAppointment(appointment);
              const { date, time } = formatDateTime(appointment.startAt);
              const isProcessing = processingId === appointment.id;

              return (
                <div
                  key={appointment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FaCalendarAlt className="text-blue-600" />
                        <h4 className="font-semibold text-gray-900">
                          {deal?.property?.title || 'Άγνωστο ακίνητο'}
                        </h4>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <FaClock className="text-gray-400" />
                          <span>{date} στις {time}</span>
                        </div>
                        {deal?.property && (
                          <div className="flex items-center gap-2">
                            <FaMapMarkerAlt className="text-gray-400" />
                            <span>{deal.property.city}, {deal.property.state}</span>
                          </div>
                        )}
                        {appointment.note && (
                          <p className="mt-2 text-gray-500 italic">Σημείωση: {appointment.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {activeTab === 'pending' && (
                        <>
                          <button
                            onClick={() => handleConfirm(appointment.id)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                          >
                            {isProcessing ? (
                              <FaSpinner className="animate-spin" />
                            ) : (
                              <FaCheckCircle />
                            )}
                            Επιβεβαίωση
                          </button>
                          <button
                            onClick={() => handleCancel(appointment.id)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                          >
                            {isProcessing ? (
                              <FaSpinner className="animate-spin" />
                            ) : (
                              <FaTimesCircle />
                            )}
                            Απόρριψη
                          </button>
                        </>
                      )}
                      <Link
                        href={`/deals/${appointment.dealRoomId}?tab=appointments`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm text-center"
                      >
                        Λεπτομέρειες
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

