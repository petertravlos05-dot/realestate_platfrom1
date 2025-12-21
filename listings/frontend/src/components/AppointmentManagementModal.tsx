import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FaCalendar, FaClock, FaCheck, FaTimes, FaUserTie, FaPhone, FaEnvelope } from 'react-icons/fa';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiClient } from '@/lib/api/client';

interface Appointment {
  id: string;
  date: Date;
  status: 'pending' | 'completed' | 'cancelled';
}

interface VisitSettings {
  presenceType: 'platform_only' | 'seller_and_platform';
  schedulingType: 'seller_availability' | 'buyer_proposal';
  availability?: {
    days: string[];
    timeSlots: string[];
  };
}

interface AppointmentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  existingAppointment?: Appointment;
  onAppointmentUpdate: (status: string, lawyerInfo?: any) => Promise<void>;
  sellerInfo?: {
    name: string;
    phone: string;
    email: string;
  };
}

export default function AppointmentManagementModal({
  isOpen,
  onClose,
  propertyId,
  existingAppointment,
  onAppointmentUpdate,
  sellerInfo
}: AppointmentManagementModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [showLawyerForm, setShowLawyerForm] = useState(false);
  const [bookingMethod, setBookingMethod] = useState<'platform' | 'direct' | null>(null);
  const [lawyerInfo, setLawyerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [customTime, setCustomTime] = useState('');
  const [customComment, setCustomComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visitSettings, setVisitSettings] = useState<VisitSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string, time: string } | null>(null);
  const { data: session } = useSession();
  const [lastAppointment, setLastAppointment] = useState<any>(null);
  const { addNotification } = useNotifications();
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  useEffect(() => {
    console.log('AppointmentManagementModal - useEffect', { isOpen, propertyId });
    if (isOpen) {
      fetchVisitSettings();
    }
    setSelectedSlot(null);
  }, [isOpen, propertyId]);

  useEffect(() => {
    const fetchLastAppointment = async () => {
      if (!session?.user?.id || !propertyId) return;

      try {
        const response = await fetch(`/api/seller/appointments?buyerId=${session.user.id}&propertyId=${propertyId}`);
        const data = await response.json();
        
        if (response.ok && data.appointments && data.appointments.length > 0) {
          // Βρες το πιο πρόσφατα ΚΑΤΑΧΩΡΗΜΕΝΟ ραντεβού (createdAt)
          const lastApp = data.appointments.reduce((latest: any, current: any) => {
            return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
          });
          setLastAppointment(lastApp);
        } else {
          setLastAppointment(null);
        }
      } catch (err) {
        console.error('Error fetching last appointment:', err);
        setLastAppointment(null);
      }
    };

    // Κάνε fetch κάθε φορά που ανοίγει το modal και υπάρχει session/user
    if (isOpen && session?.user?.id && propertyId) {
      fetchLastAppointment();
    }
  }, [isOpen, session, propertyId]);

  const fetchVisitSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch(`/api/seller/properties/${propertyId}/visit-settings`);
      const data = await res.json();
      setVisitSettings(data);
      console.log('AppointmentManagementModal - Λήψη visitSettings:', data);
    } catch (err) {
      console.error('AppointmentManagementModal - fetch error', err);
      setVisitSettings(null);
    } finally {
      setLoadingSettings(false);
    }
  };

  // Βοηθητική συνάρτηση για να βρεις την επόμενη ημερομηνία για μια ημέρα και ώρα
  function getNextDateForDayAndTime(day: string, time: string): Date {
    // Μετατροπή day σε αριθμό (0=Κυριακή, 1=Δευτέρα, ...)
    const daysMap: Record<string, number> = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 0,
      'Δευ': 1,
      'Τρι': 2,
      'Τετ': 3,
      'Πεμ': 4,
      'Παρ': 5,
      'Σαβ': 6,
      'Κυρ': 0
    };
    const now = new Date();
    const targetDay = daysMap[day];
    let result = new Date(now);
    result.setHours(Number(time.split(':')[0]), Number(time.split(':')[1]), 0, 0);
    // Βρες πόσες μέρες μέχρι το επόμενο targetDay
    let diff = (targetDay - now.getDay() + 7) % 7;
    if (diff === 0 && result < now) diff = 7; // αν είναι σήμερα αλλά η ώρα πέρασε, πήγαινε στην επόμενη βδομάδα
    result.setDate(now.getDate() + diff);
    return result;
  }

  // Δημιουργία slots από τα visitSettings
  let availableSlots: { date: Date; available: boolean }[] = [];
  if (visitSettings && visitSettings.schedulingType === 'seller_availability' && visitSettings.availability) {
    availableSlots = visitSettings.availability.days.flatMap(day =>
      visitSettings.availability!.timeSlots.map(time => ({
        date: getNextDateForDayAndTime(day, time),
        available: true
      }))
    );
    // Ταξινόμηση κατά ημερομηνία
    availableSlots.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  const handleAppointmentComplete = async (result: 'proceed' | 'not_interested' | 'new_appointment' | 'no_show') => {
    if (result === 'proceed') {
      setShowCompletionDialog(false);
      setShowLawyerForm(true);
    } else {
      await onAppointmentUpdate(result);
      onClose();
    }
  };

  const handleLawyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAppointmentUpdate('proceed', lawyerInfo);
    onClose();
  };

  const formatDate = (date: Date) => {
    return format(date, "d MMMM yyyy, HH:mm", { locale: el });
  };

  // Helper function για label και χρώμα status ραντεβού
  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return { label: 'Σε αναμονή', color: 'text-yellow-600' };
      case 'ACCEPTED':
      case 'APPROVED':
        return { label: 'Εγκρίθηκε', color: 'text-green-600' };
      case 'REJECTED':
      case 'CANCELLED':
        return { label: 'Ακυρώθηκε', color: 'text-red-600' };
      default:
        return { label: status, color: 'text-gray-600' };
    }
  };

  if (showLawyerForm) {
    return (
      <Dialog open={isOpen} onClose={() => {}} className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen p-4">
          <Transition.Child
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <FaUserTie className="mr-2" />
              Στοιχεία Δικηγόρου
            </h2>
            <form onSubmit={handleLawyerSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ονοματεπώνυμο</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={lawyerInfo.name}
                  onChange={(e) => setLawyerInfo({...lawyerInfo, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Τηλέφωνο</label>
                <input
                  type="tel"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={lawyerInfo.phone}
                  onChange={(e) => setLawyerInfo({...lawyerInfo, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={lawyerInfo.email}
                  onChange={(e) => setLawyerInfo({...lawyerInfo, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Διεύθυνση Γραφείου</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={lawyerInfo.address}
                  onChange={(e) => setLawyerInfo({...lawyerInfo, address: e.target.value})}
                />
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Υποβολή
                </button>
                <button
                  type="button"
                  onClick={() => setShowLawyerForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Ακύρωση
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </Dialog>
    );
  }

  if (showCompletionDialog) {
    return (
      <Dialog open={isOpen} onClose={() => {}} className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen p-4">
          <Transition.Child
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            <h2 className="text-2xl font-bold mb-6">Αποτέλεσμα Ραντεβού</h2>
            <div className="space-y-3">
              <button
                onClick={() => handleAppointmentComplete('proceed')}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
              >
                Προχωρώ με το ακίνητο
              </button>
              <button
                onClick={() => handleAppointmentComplete('not_interested')}
                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700"
              >
                Δεν ενδιαφέρομαι
              </button>
              <button
                onClick={() => handleAppointmentComplete('new_appointment')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
              >
                Θέλω νέο ραντεβού
              </button>
              <button
                onClick={() => handleAppointmentComplete('no_show')}
                className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700"
              >
                Δεν έγινε το ραντεβού
              </button>
            </div>
          </motion.div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Transition.Child
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
          >
            <FaTimes className="w-4 h-4 text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-800">
            <FaCalendar className="mr-3 text-blue-600" />
            Διαχείριση Ραντεβού
          </h2>

          {/* Εμφάνιση μόνο πληροφοριών ραντεβού αν είναι σε αναμονή */}
          {lastAppointment && lastAppointment.status?.toLowerCase() === 'pending' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  <FaClock className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ραντεβού σε Αναμονή</h3>
                  <p className="text-gray-700 mb-3">
                    Έχετε ήδη ένα ραντεβού σε αναμονή για τις {formatDate(new Date(lastAppointment.date))}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Το ραντεβού σας αναμένει έγκριση από τον πωλητή. Θα ενημερωθείτε μόλις λάβετε απάντηση.
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 border border-yellow-100">
                    <h4 className="font-medium text-gray-900 mb-2">Επικοινωνία με πωλητή:</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center">
                        <FaPhone className="mr-2 text-gray-400" />
                        {sellerInfo?.phone || 'Δεν διαθέσιμο'}
                      </div>
                      <div className="flex items-center">
                        <FaEnvelope className="mr-2 text-gray-400" />
                        {sellerInfo?.email || 'Δεν διαθέσιμο'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-yellow-200">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowCancelConfirmation(true)}
                    disabled={isSubmitting}
                    className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 disabled:bg-gray-300 transition-all duration-200 flex items-center justify-center"
                  >
                    <FaTimes className="mr-2" />
                    Ακύρωση Ραντεβού
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-all duration-200"
                  >
                    Κλείσιμο
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Εμφάνιση πληροφοριών εγκεκριμένου ραντεβού */}
          {lastAppointment && lastAppointment.status?.toLowerCase() === 'accepted' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  <FaCheck className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ραντεβού Εγκεκριμένο</h3>
                  <p className="text-gray-700 mb-3">
                    Το ραντεβού σας για τις {formatDate(new Date(lastAppointment.date))} έχει εγκριθεί από τον πωλητή.
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Παρακαλώ εμφανιστείτε στην ώρα που συμφωνήσατε. Θα λάβετε υπενθύμιση την ημέρα του ραντεβού.
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 border border-green-100">
                    <h4 className="font-medium text-gray-900 mb-2">Λεπτομέρειες Ραντεβού:</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <FaCalendar className="mr-2 text-gray-400" />
                        Ημερομηνία: {new Date(lastAppointment.date).toLocaleDateString('el-GR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center">
                        <FaClock className="mr-2 text-gray-400" />
                        Ώρα: {new Date(lastAppointment.date).toLocaleTimeString('el-GR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-green-100 mt-3">
                    <h4 className="font-medium text-gray-900 mb-2">Επικοινωνία με πωλητή:</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center">
                        <FaPhone className="mr-2 text-gray-400" />
                        {sellerInfo?.phone || 'Δεν διαθέσιμο'}
                      </div>
                      <div className="flex items-center">
                        <FaEnvelope className="mr-2 text-gray-400" />
                        {sellerInfo?.email || 'Δεν διαθέσιμο'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-green-200">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowCancelConfirmation(true)}
                    disabled={isSubmitting}
                    className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 disabled:bg-gray-300 transition-all duration-200 flex items-center justify-center"
                  >
                    <FaTimes className="mr-2" />
                    Ακύρωση Ραντεβού
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-all duration-200"
                  >
                    Κλείσιμο
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Εμφάνιση μήνυματος για απορριφθέν ή ακυρωμένο ραντεβού */}
          {lastAppointment && (lastAppointment.status?.toLowerCase() === 'rejected' || lastAppointment.status?.toLowerCase() === 'cancelled') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  <FaTimes className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Ραντεβού Ακυρώθηκε
                  </h3>
                  <p className="text-gray-700 mb-3">
                    Το ραντεβού σας για τις {formatDate(new Date(lastAppointment.date))} ακυρώθηκε.
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Μπορείτε να κλείσετε νέο ραντεβού επιλέγοντας από τις διαθέσιμες ημερομηνίες παρακάτω ή να προτείνετε δική σας ημερομηνία.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Εμφάνιση κανονικών επιλογών αν δεν υπάρχει ραντεβού σε αναμονή ή εγκεκριμένο */}
          {(!lastAppointment || (lastAppointment.status?.toLowerCase() !== 'pending' && lastAppointment.status?.toLowerCase() !== 'accepted')) && !existingAppointment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    <FaCalendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 leading-relaxed mb-6">
                      Σας δίνεται η δυνατότητα να κλείσετε ραντεβού για την επίσκεψη του ακινήτου μέσω της πλατφόρμας μας ή να επικοινωνήσετε απευθείας με τον πωλητή. Επιλέξτε τον τρόπο που προτιμάτε:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setBookingMethod('platform')}
                        className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center text-center ${
                          bookingMethod === 'platform'
                            ? 'border-blue-600 bg-white shadow-md'
                            : 'border-gray-200 bg-white/50 hover:border-blue-300'
                        }`}
                      >
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                          <FaCalendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">Κλείσιμο μέσω πλατφόρμας</h3>
                        <p className="text-sm text-gray-600">Επιλέξτε από διαθέσιμες ημερομηνίες ή προτείνετε δική σας</p>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setBookingMethod('direct')}
                        className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center text-center ${
                          bookingMethod === 'direct'
                            ? 'border-blue-600 bg-white shadow-md'
                            : 'border-gray-200 bg-white/50 hover:border-blue-300'
                        }`}
                      >
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                          <FaUserTie className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">Απευθείας επικοινωνία</h3>
                        <p className="text-sm text-gray-600">Επικοινωνήστε απευθείας με τον πωλητή</p>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>

              {bookingMethod === 'direct' && sellerInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6"
                >
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                    <FaUserTie className="w-5 h-5 text-green-600 mr-2" />
                    Στοιχεία Επικοινωνίας Πωλητή
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Όνομα:</span>
                      <span className="font-medium text-gray-900">{sellerInfo.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Τηλέφωνο:</span>
                      <a
                        href={`tel:${sellerInfo.phone}`}
                        className="font-medium text-blue-600 hover:text-blue-700 flex items-center"
                      >
                        {sellerInfo.phone}
                      </a>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Email:</span>
                      <a
                        href={`mailto:${sellerInfo.email}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {sellerInfo.email}
                      </a>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      Μπορείτε να επικοινωνήσετε με τον πωλητή οποιαδήποτε στιγμή για να κανονίσετε το ραντεβού σας.
                    </p>
                  </div>
                </motion.div>
              )}

              {bookingMethod === 'platform' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {loadingSettings ? (
                    <div className="text-center py-8 text-gray-500">Φόρτωση διαθεσιμότητας...</div>
                  ) : visitSettings && visitSettings.schedulingType === 'seller_availability' && availableSlots.length > 0 ? (
                    !showCustomDatePicker ? (
                      <div>
                        <p className="text-lg mb-4 text-gray-700 font-medium">Διαθέσιμες Ημερομηνίες:</p>
                        <div className="space-y-3 mb-6">
                          {availableSlots.map((slot, index) => {
                            const isSelected = selectedDate && slot.date.getTime() === selectedDate.getTime();
                            return (
                              <motion.button
                                key={index}
                                whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                                whileTap={{ scale: 0.98 }}
                                initial={false}
                                animate={isSelected ? {
                                  scale: 1.02,
                                  backgroundColor: "rgb(219 234 254)",
                                  borderColor: "rgb(37 99 235)"
                                } : {
                                  scale: 1,
                                  backgroundColor: "white",
                                  borderColor: "rgb(229 231 235)"
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                onClick={() => setSelectedDate(slot.date)}
                                className={`w-full p-4 rounded-xl border flex items-center justify-between transition-colors duration-200 relative overflow-hidden
                                  ${isSelected ? 'border-blue-600 bg-blue-100 font-bold text-blue-900 shadow-md' : 'border-gray-200 hover:border-blue-400 bg-white'}
                                `}
                              >
                                <div className="flex items-center text-gray-700">
                                  <FaClock className={`mr-3 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                  <span className="font-medium">{formatDate(slot.date)}</span>
                                </div>
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center ml-3"
                                  >
                                    <FaCheck className="text-white text-sm" />
                                  </motion.div>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                        {selectedDate && (
                          <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                            whileTap={{ scale: 0.98 }}
                            onClick={async () => {
                              if (!session?.user?.id) {
                                alert('Πρέπει να είστε συνδεδεμένος ως αγοραστής!');
                                return;
                              }
                              setIsSubmitting(true);
                              try {
                                const { data } = await apiClient.post('/viewing-requests', {
                                  propertyId,
                                  buyerId: session.user.id,
                                  date: selectedDate,
                                  time: selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                });
                                if (data.success) {
                                  onAppointmentUpdate && onAppointmentUpdate('scheduled', data.viewingRequest);
                                  onClose();
                                } else {
                                  alert('Σφάλμα κατά την αποθήκευση του ραντεβού!');
                                }
                              } catch (e) {
                                alert('Σφάλμα δικτύου!');
                              }
                              setIsSubmitting(false);
                            }}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 flex items-center justify-center shadow-md mb-4"
                          >
                            <FaCheck className="mr-2" />
                            Υποβολή
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowCustomDatePicker(true)}
                          className="w-full bg-gray-50 text-gray-800 py-3 rounded-xl hover:bg-gray-100 flex items-center justify-center border border-gray-200"
                        >
                          <FaCalendar className="mr-2" />
                          Πρόταση δική μου
                        </motion.button>
                      </div>
                    ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4"
                        >
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Ημερομηνία
                            </label>
                            <DatePicker
                              selected={customDate}
                              onChange={(date) => setCustomDate(date)}
                              showTimeSelect
                              timeFormat="HH:mm"
                              timeIntervals={30}
                              dateFormat="d MMMM yyyy, HH:mm"
                              locale={el}
                              minDate={new Date()}
                              className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              placeholderText="Επιλέξτε ημερομηνία και ώρα"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Σχόλιο (προαιρετικό)
                            </label>
                            <textarea
                              value={customComment}
                              onChange={(e) => setCustomComment(e.target.value)}
                              className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              rows={3}
                              placeholder="Προσθέστε σχόλιο για το ραντεβού..."
                            />
                          </div>
                          <div className="flex space-x-4 pt-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setShowCustomDatePicker(false)}
                              className="flex-1 bg-gray-50 text-gray-800 py-3 rounded-xl hover:bg-gray-100 border border-gray-200"
                            >
                              Πίσω
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={async () => {
                                if (customDate) {
                                  setIsSubmitting(true);

                                  await onAppointmentUpdate('custom_date', {
                                    date: customDate,
                                    comment: customComment
                                  });
                                  setIsSubmitting(false);
                                  onClose();
                                }
                              }}
                              disabled={!customDate || isSubmitting}
                              className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 shadow-md relative"
                            >
                              {isSubmitting ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                  className="absolute inset-0 flex items-center justify-center"
                                >
                                  <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent" />
                                </motion.div>
                              ) : (
                                'Υποβολή'
                              )}
                            </motion.button>
                          </div>
                        </motion.div>
                    )
                  ) : (
                    !showCustomDatePicker ? (
                    <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-4">
                      <span>Δεν έχουν οριστεί διαθέσιμες ημέρες και ώρες από τον πωλητή. Μπορείτε να προτείνετε εσείς ημερομηνία και ώρα για το ραντεβού σας.</span>
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCustomDatePicker(true)}
                        className="w-full bg-gray-50 text-gray-800 py-3 rounded-xl hover:bg-gray-100 flex items-center justify-center border border-gray-200 max-w-xs mx-auto"
                      >
                        <FaCalendar className="mr-2" />
                        Πρόταση δική μου
                      </motion.button>
                    </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ημερομηνία
                          </label>
                          <DatePicker
                            selected={customDate}
                            onChange={(date) => setCustomDate(date)}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={30}
                            dateFormat="d MMMM yyyy, HH:mm"
                            locale={el}
                            minDate={new Date()}
                            className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            placeholderText="Επιλέξτε ημερομηνία και ώρα"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Σχόλιο (προαιρετικό)
                          </label>
                          <textarea
                            value={customComment}
                            onChange={(e) => setCustomComment(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            rows={3}
                            placeholder="Προσθέστε σχόλιο για το ραντεβού..."
                          />
                        </div>
                        <div className="flex space-x-4 pt-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowCustomDatePicker(false)}
                            className="flex-1 bg-gray-50 text-gray-800 py-3 rounded-xl hover:bg-gray-100 border border-gray-200"
                          >
                            Πίσω
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={async () => {
                              if (customDate) {
                                setIsSubmitting(true);

                                await onAppointmentUpdate('custom_date', {
                                  date: customDate,
                                  comment: customComment
                                });
                                setIsSubmitting(false);
                                onClose();
                              }
                            }}
                            disabled={!customDate || isSubmitting}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 shadow-md relative"
                          >
                            {isSubmitting ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="absolute inset-0 flex items-center justify-center"
                              >
                                <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent" />
                              </motion.div>
                            ) : (
                              'Υποβολή'
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    )
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Custom Confirmation Modal */}
      {showCancelConfirmation && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaTimes className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold mb-4 text-gray-900">Επιβεβαίωση Ακύρωσης</h2>
              <p className="mb-6 text-gray-600">
                Είστε σίγουρος ότι θέλετε να ακυρώσετε το ραντεβού;
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      // Καλεί το ίδιο API endpoint που χρησιμοποιεί το seller dashboard
                      const response = await fetch(`/api/seller/appointments/${lastAppointment.id}/status`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ status: 'REJECTED' }),
                      });

                      if (!response.ok) {
                        throw new Error('Failed to cancel appointment');
                      }

                      const data = await response.json();
                      console.log('Cancel appointment response:', data);

                      // Ενημέρωση του state μέσω του onAppointmentUpdate
                      await onAppointmentUpdate('cancelled');
                      setShowCancelConfirmation(false);
                      onClose();
                    } catch (error) {
                      console.error('Error cancelling appointment:', error);
                      alert('Σφάλμα κατά την ακύρωση του ραντεβού');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 disabled:bg-gray-300 transition-all duration-200 font-medium"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Ακύρωση...
                    </div>
                  ) : (
                    'Ναι, ακύρωση'
                  )}
                </button>
                <button
                  onClick={() => setShowCancelConfirmation(false)}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-all duration-200 font-medium"
                >
                  Άκυρο
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </Dialog>
  );
} 