'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarAlt, FaTimes } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface PropertyAvailabilityModalProps {
  propertyId: string;
  initialDates: Date[];
  onSave: (dates: Date[]) => void;
  onClose: () => void;
}

export default function PropertyAvailabilityModal({
  propertyId,
  initialDates,
  onSave,
  onClose
}: PropertyAvailabilityModalProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>(initialDates);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const handleDateSelect = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);

    if (start && end) {
      const newDates: Date[] = [];
      let currentDate = new Date(start);
      
      while (currentDate <= end) {
        newDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setSelectedDates([...selectedDates, ...newDates]);
      setStartDate(null);
      setEndDate(null);
    }
  };

  const handleRemoveDate = (dateToRemove: Date) => {
    setSelectedDates(selectedDates.filter(date => 
      date.getTime() !== dateToRemove.getTime()
    ));
  };

  const handleSave = () => {
    onSave(selectedDates);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                <FaCalendarAlt className="mr-2" />
                Διαχείριση Διαθεσιμότητας
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Επιλέξτε Περίοδο
              </h3>
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={handleDateSelect}
                inline
                minDate={new Date()}
                className="w-full"
              />
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Επιλεγμένες Ημερομηνίες
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {selectedDates.map((date, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-blue-50 text-blue-700 px-3 py-2 rounded-lg"
                  >
                    <span>{date.toLocaleDateString('el-GR')}</span>
                    <button
                      onClick={() => handleRemoveDate(date)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Ακύρωση
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Αποθήκευση
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 