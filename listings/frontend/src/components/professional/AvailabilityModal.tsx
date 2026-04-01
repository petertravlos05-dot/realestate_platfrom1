'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaTrash, FaSave, FaSpinner, FaClock, FaCalendarAlt } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { setAvailability } from '@/lib/api/professionals';
import { getMyProfessionalProfile } from '@/lib/api/professionalsOnboarding';

interface TimeSlot {
  start: string;
  end: string;
}

interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

const WEEKDAYS = [
  { id: 0, label: 'Κυριακή', short: 'Κυρ' },
  { id: 1, label: 'Δευτέρα', short: 'Δευ' },
  { id: 2, label: 'Τρίτη', short: 'Τρί' },
  { id: 3, label: 'Τετάρτη', short: 'Τετ' },
  { id: 4, label: 'Πέμπτη', short: 'Πέμ' },
  { id: 5, label: 'Παρασκευή', short: 'Παρ' },
  { id: 6, label: 'Σάββατο', short: 'Σάβ' },
];

export default function AvailabilityModal({ isOpen, onClose, onSave }: AvailabilityModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState('Europe/Athens');
  const [meetingTypes, setMeetingTypes] = useState<string[]>(['ONLINE', 'IN_PERSON']);
  const [days, setDays] = useState<Record<number, DayAvailability>>(() => {
    const initial: Record<number, DayAvailability> = {};
    WEEKDAYS.forEach(day => {
      initial[day.id] = {
        enabled: day.id >= 1 && day.id <= 5, // Monday-Friday enabled by default
        slots: day.id >= 1 && day.id <= 5 ? [{ start: '09:00', end: '17:00' }] : [],
      };
    });
    return initial;
  });

  useEffect(() => {
    if (isOpen) {
      loadAvailability();
    }
  }, [isOpen]);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const profile = await getMyProfessionalProfile();
      if (profile.exists && profile.profile?.availability) {
        const avail = profile.profile.availability;
        setTimezone(avail.timezone || 'Europe/Athens');
        setMeetingTypes(avail.meetingTypes || ['ONLINE', 'IN_PERSON']);

        // Parse weeklyRules
        if (avail.weeklyRules && Array.isArray(avail.weeklyRules)) {
          const newDays: Record<number, DayAvailability> = {};
          WEEKDAYS.forEach(day => {
            newDays[day.id] = {
              enabled: false,
              slots: [],
            };
          });

          avail.weeklyRules.forEach((rule: any) => {
            if (rule.weekday >= 0 && rule.weekday <= 6) {
              if (!newDays[rule.weekday]) {
                newDays[rule.weekday] = { enabled: true, slots: [] };
              }
              newDays[rule.weekday].enabled = true;
              if (rule.start && rule.end) {
                newDays[rule.weekday].slots.push({
                  start: rule.start,
                  end: rule.end,
                });
              }
            }
          });

          setDays(newDays);
        }
      }
    } catch (err: any) {
      console.error('Error loading availability:', err);
      toast.error('Αποτυχία φόρτωσης διαθεσιμότητας');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (dayId: number) => {
    setDays(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        enabled: !prev[dayId].enabled,
        slots: !prev[dayId].enabled && prev[dayId].slots.length === 0
          ? [{ start: '09:00', end: '17:00' }]
          : prev[dayId].slots,
      },
    }));
  };

  const handleAddSlot = (dayId: number) => {
    setDays(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        slots: [...prev[dayId].slots, { start: '09:00', end: '17:00' }],
      },
    }));
  };

  const handleRemoveSlot = (dayId: number, slotIndex: number) => {
    setDays(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        slots: prev[dayId].slots.filter((_, idx) => idx !== slotIndex),
      },
    }));
  };

  const handleUpdateSlot = (dayId: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    setDays(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        slots: prev[dayId].slots.map((slot, idx) =>
          idx === slotIndex ? { ...slot, [field]: value } : slot
        ),
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Build weeklyRules array
      const weeklyRules: Array<{ weekday: number; start: string; end: string }> = [];
      Object.entries(days).forEach(([dayIdStr, dayData]) => {
        if (dayData.enabled && dayData.slots.length > 0) {
          dayData.slots.forEach(slot => {
            if (slot.start && slot.end && slot.start < slot.end) {
              weeklyRules.push({
                weekday: parseInt(dayIdStr),
                start: slot.start,
                end: slot.end,
              });
            }
          });
        }
      });

      await setAvailability({
        timezone,
        weeklyRules,
        meetingTypes,
        exceptions: [],
      });

      toast.success('Η διαθεσιμότητα ενημερώθηκε επιτυχώς');
      onSave?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving availability:', err);
      toast.error(err.message || 'Αποτυχία αποθήκευσης διαθεσιμότητας');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Διαχείριση Διαθεσιμότητας</h2>
              <p className="text-sm text-gray-600 mt-1">
                Ορίστε τις ώρες που είστε διαθέσιμος για ραντεβού
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaTimes className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <FaSpinner className="animate-spin text-3xl text-blue-600" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ζώνη Ώρας
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Europe/Athens">Europe/Athens (EET/EEST)</option>
                  </select>
                </div>

                {/* Meeting Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Τύποι Συνάντησης
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={meetingTypes.includes('ONLINE')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMeetingTypes([...meetingTypes, 'ONLINE']);
                          } else {
                            setMeetingTypes(meetingTypes.filter(t => t !== 'ONLINE'));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Online</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={meetingTypes.includes('IN_PERSON')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMeetingTypes([...meetingTypes, 'IN_PERSON']);
                          } else {
                            setMeetingTypes(meetingTypes.filter(t => t !== 'IN_PERSON'));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Από Κοντά</span>
                    </label>
                  </div>
                </div>

                {/* Weekly Schedule */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Εβδομαδιαίο Πρόγραμμα
                  </label>
                  <div className="space-y-4">
                    {WEEKDAYS.map((weekday) => {
                      const dayData = days[weekday.id];
                      return (
                        <div
                          key={weekday.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={dayData.enabled}
                                onChange={() => handleToggleDay(weekday.id)}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="font-medium text-gray-900">{weekday.label}</span>
                            </label>
                            {dayData.enabled && (
                              <button
                                onClick={() => handleAddSlot(weekday.id)}
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                <FaPlus className="text-xs" />
                                Προσθήκη Ώρας
                              </button>
                            )}
                          </div>

                          {dayData.enabled && (
                            <div className="ml-8 space-y-3">
                              {dayData.slots.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">
                                  Δεν υπάρχουν ώρες διαθεσιμότητας
                                </p>
                              ) : (
                                dayData.slots.map((slot, slotIndex) => (
                                  <div
                                    key={slotIndex}
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2 flex-1">
                                      <FaClock className="text-gray-400" />
                                      <input
                                        type="time"
                                        value={slot.start}
                                        onChange={(e) =>
                                          handleUpdateSlot(weekday.id, slotIndex, 'start', e.target.value)
                                        }
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                      <span className="text-gray-500">έως</span>
                                      <input
                                        type="time"
                                        value={slot.end}
                                        onChange={(e) =>
                                          handleUpdateSlot(weekday.id, slotIndex, 'end', e.target.value)
                                        }
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    </div>
                                    {dayData.slots.length > 1 && (
                                      <button
                                        onClick={() => handleRemoveSlot(weekday.id, slotIndex)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                        <FaTrash className="text-sm" />
                                      </button>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Ακύρωση
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                <>
                  <FaSave />
                  Αποθήκευση
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
