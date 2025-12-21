'use client';

import React, { useState } from 'react';
import { FaCalendarAlt, FaClock, FaTimes } from 'react-icons/fa';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface TimeSlot {
  start: string;
  end: string;
}

interface PropertyAvailabilityEditorProps {
  property: {
    id: string;
    title: string;
  };
  onClose: () => void;
  onSave: (availability: TimeSlot[]) => void;
}

export default function PropertyAvailabilityEditor({
  property,
  onClose,
  onSave,
}: PropertyAvailabilityEditorProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const handleAddTimeSlot = () => {
    if (startTime && endTime) {
      setTimeSlots([...timeSlots, { start: startTime, end: endTime }]);
      setStartTime('');
      setEndTime('');
    }
  };

  const handleRemoveTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (selectedDate && timeSlots.length > 0) {
      onSave(timeSlots);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Διαχείριση Διαθεσιμότητας
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <FaTimes className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ημερομηνία
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                min={format(new Date(), 'yyyy-MM-dd')}
              />
              <FaCalendarAlt className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Χρονικά Διαστήματα
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Έναρξη</label>
                <div className="relative">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <FaClock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Λήξη</label>
                <div className="relative">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <FaClock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
            <button
              onClick={handleAddTimeSlot}
              className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Προσθήκη Διαστήματος
            </button>
          </div>

          {timeSlots.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Προγραμματισμένα Διαστήματα
              </h3>
              <div className="space-y-2">
                {timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <span className="text-sm text-gray-900">
                      {slot.start} - {slot.end}
                    </span>
                    <button
                      onClick={() => handleRemoveTimeSlot(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FaTimes className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Ακύρωση
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedDate || timeSlots.length === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Αποθήκευση
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 