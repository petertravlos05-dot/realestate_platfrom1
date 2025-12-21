import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaInfoCircle, FaClock, FaCalendarPlus, FaCalendarCheck, FaUserClock, FaCheck, FaExclamationTriangle, FaPlus, FaEdit, FaRegCalendarAlt, FaShieldAlt, FaUsers } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Create a simple toast hook
const useToast = () => {
  return {
    showToast: (type: 'success' | 'error', message: string) => {
      console.log(`${type}: ${message}`);
    }
  };
};

// Create a simple auth context
const useAuth = () => {
  return {
    user: null,
    isLoading: false
  };
};

const schema = z.object({
  presenceType: z.enum(['platform_only', 'seller_and_platform']),
  schedulingType: z.enum(['seller_availability', 'buyer_proposal']),
  availability: z.object({
    days: z.array(z.string()),
    timeSlots: z.array(z.string())
  }).optional()
}).refine(
  (data) =>
    data.schedulingType !== 'seller_availability' ||
    (data.availability &&
      Array.isArray(data.availability.days) &&
      data.availability.days.length > 0 &&
      Array.isArray(data.availability.timeSlots) &&
      data.availability.timeSlots.length > 0),
  {
    message: 'Πρέπει να επιλέξετε τουλάχιστον μία ημέρα και μία ώρα!',
    path: ['availability']
  }
);

type FormData = z.infer<typeof schema>;

export type VisitSchedulingSettings = {
  presenceType: 'platform_only' | 'seller_and_platform';
  schedulingType: 'seller_availability' | 'buyer_proposal';
  availability?: {
    days: string[];
    timeSlots: string[];
  };
};

interface VisitSchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  onSave: (settings: VisitSchedulingSettings) => Promise<void>;
  initialSettings?: VisitSchedulingSettings;
}

const VisitSchedulingModal: React.FC<VisitSchedulingModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  onSave,
  initialSettings
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const isManualSubmit = useRef(false);
  const hasInitialized = useRef(false);
  const initialSettingsRef = useRef(initialSettings);

  const [formSettings, setFormSettings] = useState<VisitSchedulingSettings>(() => {
    console.log('Initializing formSettings with:', initialSettings);
    return initialSettings ? JSON.parse(JSON.stringify(initialSettings)) : {
      presenceType: 'platform_only',
      schedulingType: 'seller_availability',
      availability: { days: [], timeSlots: [] }
    };
  });

  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      console.log('Modal opened, initializing settings');
      const newSettings = initialSettings ? JSON.parse(JSON.stringify(initialSettings)) : {
        presenceType: 'platform_only',
        schedulingType: 'seller_availability',
        availability: { days: [], timeSlots: [] }
      };
      console.log('Setting new settings:', newSettings);
      setFormSettings(newSettings);
      initialSettingsRef.current = initialSettings;
      hasInitialized.current = true;
    }
    if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen, initialSettings]);

  useEffect(() => {
    if (!isEditing) {
      setHasSubmitted(false);
    }
  }, [isEditing]);

  const presenceType = formSettings.presenceType;
  const schedulingType = formSettings.schedulingType;

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Ελέγχουμε αν έχουν γίνει πραγματικές αλλαγές
    const hasChanges = JSON.stringify(formSettings) !== JSON.stringify(initialSettings);
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formSettings);
      setIsEditing(false);
      showToast('success', 'Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς');
    } catch (error) {
      showToast('error', 'Σφάλμα κατά την αποθήκευση των ρυθμίσεων');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePresenceTypeChange = (type: 'platform_only' | 'seller_and_platform') => {
    console.log('Changing presence type to:', type);
    if (!isEditing) {
      setIsEditing(true);
    }
    setFormSettings(prev => {
      const newSettings = { ...prev, presenceType: type };
      console.log('New settings:', newSettings);
      return newSettings;
    });
  };

  useEffect(() => {
    console.log('formSettings updated:', formSettings);
  }, [formSettings]);

  const handleSchedulingTypeChange = (type: 'seller_availability' | 'buyer_proposal') => {
    if (!isEditing) {
      setIsEditing(true);
    }
    setFormSettings(prev => {
      const newSettings = { ...prev, schedulingType: type };
      if (type === 'buyer_proposal') {
        newSettings.availability = { days: [], timeSlots: [] };
      }
      return newSettings;
    });
  };

  const handleDayToggle = (day: string) => {
    if (!isEditing) {
      setIsEditing(true);
    }
    setFormSettings(prev => {
      const days = prev.availability?.days || [];
      const newDays = days.includes(day)
        ? days.filter((d) => d !== day)
        : [...days, day];
      return {
        ...prev,
        availability: { ...prev.availability, days: newDays, timeSlots: prev.availability?.timeSlots || [] }
      };
    });
  };

  const handleTimeSlotToggle = (slot: string) => {
    if (!isEditing) {
      setIsEditing(true);
    }
    setFormSettings(prev => {
      const slots = prev.availability?.timeSlots || [];
      const newSlots = slots.includes(slot)
        ? slots.filter((s) => s !== slot)
        : [...slots, slot];
      return {
        ...prev,
        availability: { ...prev.availability, days: prev.availability?.days || [], timeSlots: newSlots }
      };
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-5xl max-h-[90vh] bg-gradient-to-br from-white to-green-50/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 flex flex-col overflow-hidden"
        >
          {/* Enhanced Header */}
          <div className="flex items-center justify-between p-6 border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 shrink-0">
            <div className="flex items-center space-x-3">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
              >
                <FaCalendarCheck className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                  {isEditing ? 'Επεξεργασία Ρυθμίσεων' : 'Ρυθμίσεις Ραντεβού'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Διαχειριστείτε τις ρυθμίσεις επισκέψεων για το ακίνητό σας
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-xl transition-all duration-200"
            >
              <FaTimes className="w-5 h-5" />
            </motion.button>
          </div>

          {!isEditing ? (
            <div className="overflow-y-auto p-6 space-y-6 flex-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 space-y-8"
              >
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <FaUserClock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Τύπος Παρακολούθησης</h3>
                      <p className="text-gray-600">
                        {formSettings.presenceType === 'platform_only' 
                          ? 'Μόνο Εκπρόσωπος Πλατφόρμας' 
                          : 'Πωλητής και Εκπρόσωπος Πλατφόρμας'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <FaCalendarCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Τρόπος Προγραμματισμού</h3>
                      <p className="text-gray-600">
                        {formSettings.schedulingType === 'seller_availability' 
                          ? 'Προγραμματισμός από Πωλητή' 
                          : 'Πρόταση από Αγοραστή'}
                      </p>
                    </div>
                  </div>

                  {/* Εμφάνιση διαθεσιμότητας αν υπάρχουν τιμές, ανεξάρτητα από το schedulingType */}
                  {initialSettings?.availability &&
                    initialSettings.availability.days &&
                    initialSettings.availability.days.length > 0 &&
                    initialSettings.availability.timeSlots &&
                    initialSettings.availability.timeSlots.length > 0 && (
                    <div className="space-y-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                          <FaClock className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Διαθεσιμότητα</h3>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-start md:space-x-8 gap-6">
                        <div className="flex-1">
                          <div className="flex items-center mb-3">
                            <FaRegCalendarAlt className="w-4 h-4 text-green-500 mr-2" />
                            <h4 className="font-semibold text-gray-700">Ημέρες:</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {initialSettings.availability.days.map((day) => {
                              const greekDays: Record<string, string> = {
                                Monday: 'Δευτέρα',
                                Tuesday: 'Τρίτη',
                                Wednesday: 'Τετάρτη',
                                Thursday: 'Πέμπτη',
                                Friday: 'Παρασκευή',
                                Saturday: 'Σάββατο',
                                Sunday: 'Κυριακή',
                              };
                              return (
                                <span key={day} className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full text-sm font-semibold shadow-sm border border-green-200">
                                  {greekDays[day] || day}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center mb-3">
                            <FaClock className="w-4 h-4 text-emerald-500 mr-2" />
                            <h4 className="font-semibold text-gray-700">Ώρες:</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {initialSettings.availability.timeSlots.map((time) => (
                              <span key={time} className="px-4 py-2 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 rounded-full text-sm font-semibold shadow-sm border border-emerald-200">
                                {time}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-6">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <FaEdit className="w-4 h-4" />
                      <span>Επεξεργασία</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            <form 
              id="visit-scheduling-form" 
              onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                isManualSubmit.current = true;
                handleFormSubmit();
              }}
              className="overflow-y-auto p-6 space-y-6 flex-1"
            >
              {/* Enhanced Info Message */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 text-sm text-green-800"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaInfoCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold mb-2 text-green-900">Σημαντικές πληροφορίες:</p>
                    <ul className="list-disc list-inside space-y-1 text-green-700">
                      <li>Μπορείτε να αλλάξετε τις ρυθμίσεις οποιαδήποτε στιγμή</li>
                      <li>Θα πρέπει να επιβεβαιώνετε κάθε ραντεβού που κλείνεται</li>
                      <li>Έχετε τη δυνατότητα να αλλάξετε ή να ακυρώσετε το ραντεβού</li>
                      <li>Οι αλλαγές ισχύουν για μελλοντικά ραντεβού</li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* Enhanced Presence Type Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    Ποιος θα παρευρίσκεται στις επισκέψεις;
                  </h3>
                  <FaInfoCircle
                    className="w-5 h-5 text-green-400 cursor-help"
                    data-tooltip-id="presence-type-tooltip"
                  />
                </div>
                <Tooltip
                  id="presence-type-tooltip"
                  place="top"
                  content="Οι επισκέψεις μπορούν να γίνονται είτε μόνο με εκπρόσωπο της πλατφόρμας είτε με την παρουσία σας"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePresenceTypeChange('platform_only')}
                    className={`p-6 rounded-2xl border-2 transition-all duration-200 ${
                      presenceType === 'platform_only'
                        ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        presenceType === 'platform_only' 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                          : 'bg-gray-100'
                      }`}>
                        <FaShieldAlt className={`w-6 h-6 ${
                          presenceType === 'platform_only' ? 'text-white' : 'text-gray-400'
                        }`} />
                      </div>
                      <span className="text-base font-semibold text-center">Μόνο Εκπρόσωπος Πλατφόρμας</span>
                      <p className="text-sm text-gray-600 text-center">
                        Οι επισκέψεις γίνονται μόνο με εκπρόσωπο της πλατφόρμας
                      </p>
                    </div>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePresenceTypeChange('seller_and_platform')}
                    className={`p-6 rounded-2xl border-2 transition-all duration-200 ${
                      presenceType === 'seller_and_platform'
                        ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        presenceType === 'seller_and_platform' 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                          : 'bg-gray-100'
                      }`}>
                        <FaUsers className={`w-6 h-6 ${
                          presenceType === 'seller_and_platform' ? 'text-white' : 'text-gray-400'
                        }`} />
                      </div>
                      <span className="text-base font-semibold text-center">Και εγώ (πωλητής)</span>
                      <p className="text-sm text-gray-600 text-center">
                        Οι επισκέψεις γίνονται με την παρουσία σας και του εκπροσώπου
                      </p>
                    </div>
                  </motion.button>
                </div>
              </motion.div>

              {/* Enhanced Scheduling Type Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    Πώς θέλετε να προγραμματίζονται τα ραντεβού;
                  </h3>
                  <FaInfoCircle
                    className="w-5 h-5 text-green-400 cursor-help"
                    data-tooltip-id="scheduling-type-tooltip"
                  />
                </div>
                <Tooltip
                  id="scheduling-type-tooltip"
                  place="top"
                  content="Μπορείτε είτε να δηλώσετε τις διαθεσιμότητές σας είτε να εγκρίνετε τις προτάσεις των ενδιαφερομένων"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSchedulingTypeChange('seller_availability')}
                    className={`p-6 rounded-2xl border-2 transition-all duration-200 ${
                      schedulingType === 'seller_availability'
                        ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        schedulingType === 'seller_availability' 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                          : 'bg-gray-100'
                      }`}>
                        <FaCalendarCheck className={`w-6 h-6 ${
                          schedulingType === 'seller_availability' ? 'text-white' : 'text-gray-400'
                        }`} />
                      </div>
                      <span className="text-base font-semibold text-center">Προγραμματίζω τις διαθέσιμες μου ημέρες</span>
                      <p className="text-sm text-gray-600 text-center">
                        Ορίζετε τις ημέρες και ώρες που είστε διαθέσιμος
                      </p>
                    </div>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSchedulingTypeChange('buyer_proposal')}
                    className={`p-6 rounded-2xl border-2 transition-all duration-200 ${
                      schedulingType === 'buyer_proposal'
                        ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        schedulingType === 'buyer_proposal' 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                          : 'bg-gray-100'
                      }`}>
                        <FaCalendarPlus className={`w-6 h-6 ${
                          schedulingType === 'buyer_proposal' ? 'text-white' : 'text-gray-400'
                        }`} />
                      </div>
                      <span className="text-base font-semibold text-center">Εγκρίνω προτάσεις</span>
                      <p className="text-sm text-gray-600 text-center">
                        Εγκρίνετε κάθε πρόταση ραντεβού ξεχωριστά
                      </p>
                    </div>
                  </motion.button>
                </div>
              </motion.div>

              {/* Enhanced Availability Input */}
              {typeof schedulingType === 'string' && schedulingType === 'seller_availability' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">
                      Ποιες ημέρες θέλετε να προγραμματίζονται οι επισκέψεις;
                    </h3>
                    <FaInfoCircle
                      className="w-5 h-5 text-green-400 cursor-help"
                      data-tooltip-id="availability-tooltip"
                    />
                  </div>
                  <Tooltip
                    id="availability-tooltip"
                    place="top"
                    content="Επιλέξτε τις ημέρες που είστε διαθέσιμοι για επισκέψεις"
                  />
                  <div className="grid grid-cols-7 gap-3">
                    {[
                      { key: 'Monday', label: 'Δευ' },
                      { key: 'Tuesday', label: 'Τρι' },
                      { key: 'Wednesday', label: 'Τετ' },
                      { key: 'Thursday', label: 'Πεμ' },
                      { key: 'Friday', label: 'Παρ' },
                      { key: 'Saturday', label: 'Σαβ' },
                      { key: 'Sunday', label: 'Κυρ' }
                    ].map(({ key, label }) => (
                      <motion.button
                        key={key}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDayToggle(key)}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 font-semibold ${
                          formSettings.availability?.days?.includes(key)
                            ? 'border-green-500 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                            : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                        }`}
                      >
                        {label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Enhanced Time Slot Input */}
              {typeof schedulingType === 'string' && schedulingType === 'seller_availability' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">
                      Ποιες ώρες θέλετε να προγραμματίζονται οι επισκέψεις;
                    </h3>
                    <FaInfoCircle
                      className="w-5 h-5 text-green-400 cursor-help"
                      data-tooltip-id="time-slot-tooltip"
                    />
                  </div>
                  <Tooltip
                    id="time-slot-tooltip"
                    place="top"
                    content="Επιλέξτε τις ώρες που είστε διαθέσιμοι για επισκέψεις"
                  />
                  <div className="grid grid-cols-4 gap-3">
                    {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((slot) => (
                      <motion.button
                        key={slot}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleTimeSlotToggle(slot)}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 font-semibold ${
                          formSettings.availability?.timeSlots?.includes(slot)
                            ? 'border-green-500 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                            : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                        }`}
                      >
                        {slot}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Enhanced Sticky Action Buttons */}
              <div className="sticky bottom-0 left-0 w-full bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200 p-6 flex justify-end z-10 backdrop-blur-sm">
                <div className="flex space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormSettings(initialSettings ? JSON.parse(JSON.stringify(initialSettings)) : {
                        presenceType: 'platform_only',
                        schedulingType: 'seller_availability',
                        availability: { days: [], timeSlots: [] }
                      });
                      onClose();
                    }}
                    className="px-6 py-3 text-base border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-semibold"
                  >
                    Ακύρωση
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={isSubmitting || !isEditing}
                    className="px-8 py-3 text-base bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2" />
                        <span>Αποθήκευση...</span>
                      </>
                    ) : (
                      <>
                        <FaCheck className="w-4 h-4 mr-1" />
                        <span>Αποθήκευση</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VisitSchedulingModal;