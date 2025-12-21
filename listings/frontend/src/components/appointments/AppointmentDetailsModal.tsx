import { motion } from 'framer-motion';
import { IoClose } from 'react-icons/io5';

interface Appointment {
  _id: string;
  propertyId: string;
  buyerId: string;
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'approved';
  submittedByBuyer: boolean;
  createdAt: string;
}

interface Property {
  _id: string;
  title: string;
  price: number;
  location: string;
  visitSettings?: {
    presenceType: 'platform_only' | 'seller_and_platform';
    schedulingType: 'seller_availability' | 'buyer_proposal';
    availability?: {
      days: string[];
      timeSlots: string[];
    };
  };
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface AppointmentDetailsModalProps {
  appointment: Appointment;
  property: Property;
  buyer: User;
  onClose: () => void;
  onStatusChange: (appointmentId: string, status: 'accepted' | 'rejected') => Promise<void>;
}

// Helper function για label και χρώμα status ραντεβού
const getStatusLabel = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return { label: 'Εκκρεμεί', color: 'text-yellow-600' };
    case 'ACCEPTED':
    case 'APPROVED':
      return { label: 'Εγκρίθηκε', color: 'text-green-600' };
    case 'REJECTED':
      return { label: 'Απορρίφθηκε', color: 'text-red-600' };
    default:
      return { label: status, color: 'text-gray-600' };
  }
};

export const AppointmentDetailsModal = ({
  appointment,
  property,
  buyer,
  onClose,
  onStatusChange
}: AppointmentDetailsModalProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white rounded-lg p-6 w-full max-w-2xl"
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">Λεπτομέρειες Ραντεβού</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <IoClose size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Στοιχεία Ακινήτου</h3>
            <p className="text-gray-600">{property.title}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Στοιχεία Αγοραστή</h3>
            <p className="text-gray-600">Όνομα: {buyer.name}</p>
            <p className="text-gray-600">Email: {buyer.email}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Πληροφορίες Ραντεβού</h3>
            <p className="text-gray-600">
              Ημερομηνία: {new Date(appointment.date).toLocaleDateString('el-GR')}
            </p>
            <p className="text-gray-600">Ώρα: {appointment.time}</p>
            <p className="text-gray-600">
              Κατάσταση:{' '}
              {(() => {
                const { label, color } = getStatusLabel(appointment.status);
                return (
                  <span className={`font-semibold ${color}`}>{label}</span>
                );
              })()}
            </p>
            <p className="text-gray-600">
              Υποβλήθηκε από:{' '}
              {appointment.submittedByBuyer ? 'Αγοραστή' : 'Πωλητή'}
            </p>
            <p className="text-gray-600">
              Δημιουργήθηκε:{' '}
              {new Date(appointment.createdAt).toLocaleString('el-GR')}
            </p>
          </div>

          {property.visitSettings && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Ρυθμίσεις Επισκέψης</h3>
              <p className="text-gray-600">
                Τύπος Παρουσίας:{' '}
                {property.visitSettings.presenceType === 'platform_only'
                  ? 'Μόνο Εκπρόσωπος Πλατφόρμας'
                  : 'Πωλητής και Εκπρόσωπος Πλατφόρμας'}
              </p>
              <p className="text-gray-600">
                Τύπος Προγραμματισμού:{' '}
                {property.visitSettings.schedulingType === 'seller_availability'
                  ? 'Δήλωση Διαθεσιμότητας'
                  : 'Επιβεβαίωση κατά περίπτωση'}
              </p>
              
              {property.visitSettings.schedulingType === 'seller_availability' && 
               property.visitSettings.availability && (
                <div className="mt-2">
                  <p className="text-gray-600 font-medium">Διαθέσιμες Ημέρες:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {property.visitSettings.availability.days.map((day) => (
                      <span
                        key={day}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                  
                  <p className="text-gray-600 font-medium mt-2">Διαθέσιμες Ώρες:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {property.visitSettings.availability.timeSlots.map((slot) => (
                      <span
                        key={slot}
                        className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Κουμπιά Έγκρισης/Απόρριψης για Εκκρεμή Ραντεβού */}
          {appointment.status.toLowerCase() === 'pending' && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold mb-4 text-center">Ενέργειες</h3>
              <div className="flex justify-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    await onStatusChange(appointment._id, 'accepted');
                    onClose();
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
                >
                  <span>✓</span>
                  <span>Έγκριση</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    await onStatusChange(appointment._id, 'rejected');
                    onClose();
                  }}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2"
                >
                  <span>✕</span>
                  <span>Απόρριψη</span>
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}; 