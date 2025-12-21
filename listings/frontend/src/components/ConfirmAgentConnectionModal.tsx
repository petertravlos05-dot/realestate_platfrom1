'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaMapMarkerAlt, FaHome } from 'react-icons/fa';
import { useNotifications } from '@/contexts/NotificationContext';
import { fetchFromBackend } from '@/lib/api/client';

interface ConfirmAgentConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  propertyId: string;
  agentName: string;
  propertyTitle: string;
  propertyImage: string;
  propertyLocation: string;
  propertyPrice: number;
  agentEmail: string;
  agentPhone: string;
  agentCompany?: string;
}

export function ConfirmAgentConnectionModal({
  isOpen,
  onClose,
  agentId,
  propertyId,
  agentName,
  propertyTitle,
  propertyImage,
  propertyLocation,
  propertyPrice,
  agentEmail,
  agentPhone,
  agentCompany,
}: ConfirmAgentConnectionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const { addNotification, fetchNotifications } = useNotifications();

  const handleConnect = async () => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Έλεγχος αν ο χρήστης είναι ο ιδιοκτήτης του ακινήτου
      const propertyResponse = await fetch(`/api/properties/${propertyId}`);
      if (propertyResponse.ok) {
        const propertyData = await propertyResponse.json();
        if (propertyData.userId === session.user.id) {
          setError({
            code: 'PROPERTY_OWNER',
            message: 'Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς'
          } as any);
          return;
        }
      }

      const response = await fetchFromBackend('/buyer-agent/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          propertyId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'PROPERTY_ALREADY_VIEWED') {
          setError({
            code: 'PROPERTY_ALREADY_VIEWED',
            message: data.message
          } as any);
        } else if (data.error && data.error.includes('Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς')) {
          setError({
            code: 'PROPERTY_OWNER',
            message: data.error
          } as any);
        } else {
          setError(data.message || 'Παρουσιάστηκε σφάλμα κατά τη σύνδεση με τον μεσίτη');
        }
        return;
      }

      addNotification({
        type: 'success',
        title: 'Επιτυχής Σύνδεση',
        message: `Συνδεθήκατε επιτυχώς με τον μεσίτη ${agentName} για το ακίνητο "${propertyTitle}".`,
        propertyId: propertyId,
      });

      await fetchNotifications();

      const newProgress = JSON.parse(localStorage.getItem('newProgressNotifications') || '[]');
      if (!newProgress.includes(propertyId)) {
        newProgress.push(propertyId);
        localStorage.setItem('newProgressNotifications', JSON.stringify(newProgress));
      }
      const newAppointments = JSON.parse(localStorage.getItem('newAppointmentNotifications') || '[]');
      if (!newAppointments.includes(propertyId)) {
        newAppointments.push(propertyId);
        localStorage.setItem('newAppointmentNotifications', JSON.stringify(newAppointments));
      }

      onClose();
      router.refresh();
      router.push('/dashboard/buyer');
    } catch (error) {
      console.error('Error connecting with agent:', error);
      setError('Παρουσιάστηκε σφάλμα κατά τη σύνδεση με τον μεσίτη');
    } finally {
      setIsLoading(false);
    }
  };

  const isPropertyViewedError = typeof error === 'object' && error?.code === 'PROPERTY_ALREADY_VIEWED';
  const isPropertyOwnerError = typeof error === 'object' && error?.code === 'PROPERTY_OWNER';

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)' }}>
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="relative mx-auto max-w-md w-full rounded-3xl bg-white p-0 shadow-2xl border border-blue-100">
          {(isPropertyViewedError || isPropertyOwnerError) ? (
            <div className="flex flex-col items-center text-center p-8">
              <div className="mb-4">
                <span className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
                  isPropertyOwnerError ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  {isPropertyOwnerError ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-red-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-blue-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-3A2.25 2.25 0 008.25 5.25V9m10.5 0v10.125c0 1.012-.838 1.875-1.875 1.875H7.125A1.875 1.875 0 015.25 19.125V9m13.5 0H5.25m13.5 0a2.25 2.25 0 012.25 2.25v7.125c0 1.012-.838 1.875-1.875 1.875H7.125A1.875 1.875 0 015.25 19.125V11.25A2.25 2.25 0 017.5 9h9a2.25 2.25 0 012.25 2.25V9z" />
                    </svg>
                  )}
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {isPropertyOwnerError ? 'Αυτό είναι το δικό σας ακίνητο' : 'Δεν μπορείτε να συνδεθείτε με μεσίτη'}
              </h2>
              <p className="text-gray-700 mb-6">{error.message}</p>
              <div className="space-y-3">
                {isPropertyOwnerError ? (
                  <>
                    <button
                      onClick={() => { onClose(); router.push('/dashboard/seller'); }}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Πίσω στον Πίνακα Ελέγχου μου
                    </button>
                    <button
                      onClick={() => { onClose(); router.push('/properties'); }}
                      className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Αναζήτηση Άλλων Ακινήτων
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { onClose(); router.push('/dashboard/buyer'); }}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Πίσω στον Πίνακα Ελέγχου μου
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col w-full mx-auto">
              {/* Εικόνα ακινήτου */}
              <div className="w-full flex justify-center -mt-12 mb-4">
                <img
                  src={propertyImage || '/images/property-placeholder.jpg'}
                  alt={propertyTitle}
                  className="object-cover w-40 h-40 rounded-2xl shadow-lg border-4 border-white bg-gray-100"
                  style={{ marginTop: '-2rem' }}
                />
              </div>
              {/* Card: Στοιχεία ακινήτου */}
              <div className="bg-blue-50 rounded-xl p-5 mb-4 shadow-sm flex flex-col items-center">
                <h2 className="text-2xl font-bold mb-2 text-blue-900">{propertyTitle}</h2>
                <div className="flex items-center text-blue-700 mb-1"><FaMapMarkerAlt className="mr-2" />{propertyLocation}</div>
                <div className="flex items-center text-blue-700"><span className="font-semibold mr-2">Τιμή:</span> {propertyPrice.toLocaleString()} €</div>
              </div>
              {/* Card: Στοιχεία agent */}
              <div className="bg-white rounded-xl p-5 mb-4 shadow flex flex-col items-center border border-blue-100">
                <div className="flex items-center mb-2"><FaUser className="mr-2 text-blue-600 text-lg" /><span className="font-semibold text-lg text-blue-900">{agentName}</span></div>
                {agentCompany && <div className="flex items-center text-gray-600 mb-1"><FaBuilding className="mr-2" />{agentCompany}</div>}
                <div className="flex items-center text-gray-600 mb-1"><FaEnvelope className="mr-2" />{agentEmail}</div>
                <div className="flex items-center text-gray-600"><FaPhone className="mr-2" />{agentPhone}</div>
              </div>
              {/* Κουμπιά */}
              <div className="flex flex-col gap-4 mt-4 mb-2">
                <button
                  type="button"
                  className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 text-lg font-semibold text-white shadow-md hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 flex items-center justify-center"
                  onClick={handleConnect}
                  disabled={isLoading}
                >
                  {isLoading ? 'Σύνδεση...' : 'Σύνδεση'}
                </button>
                <button
                  type="button"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Ακύρωση
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
} 