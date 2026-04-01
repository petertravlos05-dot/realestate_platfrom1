'use client';

import { useState, useMemo } from 'react';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt } from 'react-icons/fa';
import { DealAppointment } from '@/lib/api/dealAppointments';

interface CalendarWidgetProps {
  appointments: DealAppointment[];
  loading?: boolean;
  onDateClick?: (date: Date) => void;
  showDayAppointments?: boolean;
}

export default function CalendarWidget({
  appointments,
  loading,
  onDateClick,
  showDayAppointments = true,
}: CalendarWidgetProps) {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const toLocalDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, DealAppointment[]>();
    appointments.forEach(apt => {
      const dateKey = toLocalDateKey(new Date(apt.startAt));
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(apt);
    });
    return map;
  }, [appointments]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'week') {
        const dayStep = direction === 'prev' ? -7 : 7;
        newDate.setDate(newDate.getDate() + dayStep);
      } else {
        if (direction === 'prev') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else {
          newDate.setMonth(newDate.getMonth() + 1);
        }
      }
      return newDate;
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });

  const getStartOfWeek = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - day);
    return start;
  };

  const weekDates = useMemo(() => {
    const start = getStartOfWeek(currentDate);
    return Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date(start);
      date.setDate(start.getDate() + idx);
      return date;
    });
  }, [currentDate]);

  const periodTitle =
    viewMode === 'week'
      ? `Εβδομάδα ${weekDates[0].toLocaleDateString('el-GR', {
          day: 'numeric',
          month: 'short',
        })} - ${weekDates[6].toLocaleDateString('el-GR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`
      : monthName;

  const getAppointmentsForDate = (day: number): DealAppointment[] => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointmentsByDate.get(dateKey) || [];
  };

  const handleDateClick = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
    onDateClick?.(date);
  };

  const selectedDateAppointments = useMemo(() => {
    const key = toLocalDateKey(selectedDate);
    return (appointmentsByDate.get(key) || []).slice().sort((a, b) => {
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });
  }, [appointmentsByDate, selectedDate]);

  const weekDays = ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'];

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <FaCalendarAlt className="animate-pulse text-4xl text-slate-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Ημερολόγιο</h3>
          <div className="inline-flex gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
            <button
              onClick={() => setViewMode('month')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'month' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Μήνας
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'week' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Εβδομάδα
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigatePeriod('prev')}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <FaChevronLeft className="text-slate-600 text-sm" />
          </button>
          <h4 className="text-sm font-medium text-slate-900 capitalize">{periodTitle}</h4>
          <button
            onClick={() => navigatePeriod('next')}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <FaChevronRight className="text-slate-600 text-sm" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {viewMode === 'month' ? (
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map(day => (
              <div key={day} className="text-center text-[11px] font-medium text-slate-500 py-1.5">
                {day}
              </div>
            ))}
            {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const apts = getAppointmentsForDate(day);
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
              
              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`aspect-square border border-slate-200 rounded-md p-0.5 hover:bg-slate-100 transition-colors ${
                    toLocalDateKey(selectedDate) === toLocalDateKey(new Date(year, month, day))
                      ? 'bg-teal-50 border-teal-300'
                      : isToday
                      ? 'bg-slate-50'
                      : ''
                  }`}
                >
                  <div className="text-sm font-medium text-slate-900">{day}</div>
                  {apts.length > 0 && (
                    <div className="flex justify-center mt-1">
                      <div className="w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                      {apts.length > 1 && (
                        <span className="text-xs text-slate-500 ml-1">+{apts.length - 1}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {weekDates.map((date) => {
              const dateKey = toLocalDateKey(date);
              const dayAppointments = (appointmentsByDate.get(dateKey) || []).slice().sort((a, b) => {
                return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
              });
              const isSelected = toLocalDateKey(selectedDate) === dateKey;
              const isToday = toLocalDateKey(new Date()) === dateKey;

              return (
                <button
                  key={dateKey}
                  onClick={() => {
                    setSelectedDate(date);
                    onDateClick?.(date);
                  }}
                  className={`w-full border rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'border-teal-300 bg-teal-50'
                      : isToday
                      ? 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {date.toLocaleDateString('el-GR', { weekday: 'long' })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {date.toLocaleDateString('el-GR', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    {dayAppointments.length > 0 ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-teal-100 text-teal-800">
                        {dayAppointments.length} {dayAppointments.length === 1 ? 'ραντεβού' : 'ραντεβού'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600">
                        Χωρίς ραντεβού
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {showDayAppointments && (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <h5 className="text-xs font-semibold text-slate-900 mb-2">
              Ραντεβού ημέρας: {selectedDate.toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h5>

            {selectedDateAppointments.length === 0 ? (
              <p className="text-xs text-slate-500">Δεν υπάρχουν ραντεβού για την επιλεγμένη ημερομηνία.</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {selectedDateAppointments.map((apt) => {
                  const start = new Date(apt.startAt);
                  const end = new Date(apt.endAt);
                  return (
                    <div key={apt.id} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                      <div className="text-xs font-medium text-slate-800">
                        {start.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {end.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[11px] text-slate-500">{apt.type || 'Ραντεβού'}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

