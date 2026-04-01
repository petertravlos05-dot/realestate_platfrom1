'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MapPin, CheckCircle, Lock, XCircle } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { fetchFromBackend } from '@/lib/api/client';
import { getPropertyImageUrl } from '@/lib/utils/propertyImageUrl';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function resolveImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${BACKEND_URL.replace(/\/$/, '')}${url}`;
  return url;
}

interface PropertyConnectPremiumCardProps {
  agentId: string;
  propertyId: string;
  agentName: string;
  agentImage?: string | null;
  propertyTitle: string;
  propertyImage: string;
  propertyLocation: string;
  propertyPrice: number;
  agentEmail: string;
  agentPhone: string;
  agentCompany?: string;
  onClose?: () => void;
  isModal?: boolean;
}

const VALUE_ITEMS = [
  'Δείτε ακριβή τοποθεσία & έγγραφα',
  'Κλείστε ραντεβού επίσκεψης',
  'Υποβάλετε προσφορά',
  'Πρόσβαση στο ψηφιακό Deal Room',
];

export function PropertyConnectPremiumCard({
  agentId,
  propertyId,
  agentName,
  agentImage,
  propertyTitle,
  propertyImage,
  propertyLocation,
  propertyPrice,
  agentEmail,
  agentPhone,
  agentCompany,
  onClose,
  isModal = false,
}: PropertyConnectPremiumCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { addNotification, fetchNotifications } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const isAuthenticated = !!session?.user;

  const handlePrimaryAction = async () => {
    if (!isAuthenticated) {
      const currentUrl = window.location.href;
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const propertyResponse = await fetch(`/api/properties/${propertyId}`);
      if (propertyResponse.ok) {
        const propertyData = await propertyResponse.json();
        const prop = propertyData.property || propertyData;
        if (prop?.userId === session?.user?.id) {
          setError({ code: 'PROPERTY_OWNER', message: 'Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς' });
          return;
        }
      }

      const response = await fetchFromBackend('/buyer-agent/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, propertyId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'PROPERTY_ALREADY_VIEWED') {
          setError({ code: 'PROPERTY_ALREADY_VIEWED', message: data.message });
        } else if (data.error?.includes('Δεν μπορείτε να εκδηλώσετε ενδιαφέρον')) {
          setError({ code: 'PROPERTY_OWNER', message: data.error });
        } else {
          setError(data.message || 'Παρουσιάστηκε σφάλμα κατά τη σύνδεση');
        }
        return;
      }

      addNotification({
        type: 'success',
        title: 'Επιτυχής Σύνδεση',
        message: `Συνδεθήκατε επιτυχώς με τον μεσίτη ${agentName} για το ακίνητο "${propertyTitle}".`,
        propertyId,
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

      onClose?.();
      router.refresh();
      router.push('/deals');
    } catch (err) {
      console.error('Error connecting with agent:', err);
      setError('Παρουσιάστηκε σφάλμα κατά τη σύνδεση με τον μεσίτη');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    } else {
      router.push(`/properties/${propertyId}`);
    }
  };

  const isPropertyViewedError = typeof error === 'object' && error?.code === 'PROPERTY_ALREADY_VIEWED';
  const isPropertyOwnerError = typeof error === 'object' && error?.code === 'PROPERTY_OWNER';

  if (isPropertyViewedError || isPropertyOwnerError) {
    return (
      <div className="max-w-xl w-full mx-auto bg-white rounded-3xl shadow-2xl py-12 px-8 text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${isPropertyOwnerError ? 'bg-red-100' : 'bg-amber-100'}`}>
          {isPropertyOwnerError ? (
            <XCircle className="w-10 h-10 text-red-600" />
          ) : (
            <Lock className="w-10 h-10 text-amber-600" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isPropertyOwnerError ? 'Αυτό είναι το δικό σας ακίνητο' : 'Δεν μπορείτε να συνδεθείτε με μεσίτη'}
        </h2>
        <p className="text-gray-600 mb-8">{error.message}</p>
        <div className="space-y-3">
          {isPropertyOwnerError ? (
            <>
              <button
                onClick={() => router.push('/deals')}
                className="w-full py-3 px-6 rounded-xl font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Πίσω στις Συναλλαγές
              </button>
              <button
                onClick={() => router.push('/properties')}
                className="w-full py-3 px-6 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Αναζήτηση Ακινήτων
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/deals')}
              className="w-full py-3 px-6 rounded-xl font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              Πίσω στις Συναλλαγές
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl w-full mx-auto bg-white rounded-3xl shadow-2xl py-12 px-8">
      {/* A. Agent Identity Welcome */}
      <div className="text-center mb-8">
        <span className="inline-block px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-100 mb-6">
          🔗 ΣΥΝΔΕΣΗ Agent
        </span>
          <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-white shadow-lg overflow-hidden flex items-center justify-center">
            {agentImage ? (
              <img src={resolveImageUrl(agentImage)} alt={agentName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-indigo-400">{agentName.charAt(0)}</span>
            )}
          </div>
        </div>
        <p className="text-gray-600">
          Καλώς ήρθατε! Ο/Η <span className="font-semibold text-gray-900">{agentName}</span> σας προτείνει:
        </p>
      </div>

      {/* B. Property Recommendation Box */}
      <div className="rounded-xl bg-gray-50 border border-gray-100 p-6 flex gap-6 items-center mb-8">
        <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-white shadow-md bg-gray-100">
          <img
            src={getPropertyImageUrl(propertyImage) || '/images/property-placeholder.jpg'}
            alt={propertyTitle}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 truncate">{propertyTitle}</h3>
          <div className="flex items-center text-gray-600 mt-1 gap-1">
            <MapPin className="w-4 h-4 flex-shrink-0 text-gray-500" />
            <span className="truncate">{propertyLocation}</span>
          </div>
          <p className="text-emerald-600 font-bold text-lg mt-2">{propertyPrice.toLocaleString('el-GR')} €</p>
        </div>
      </div>

      {/* C. Value Proposition */}
      <div className="text-center mb-8">
        <h4 className="text-base font-semibold text-gray-900 mb-4">
          Συνδεθείτε για να ξεκλειδώσετε το ακίνητο:
        </h4>
        <ul className="space-y-3 text-left">
          {VALUE_ITEMS.map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-gray-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* D. Action Buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Σύνδεση...
            </>
          ) : isAuthenticated ? (
            <>
              <Lock className="w-5 h-5" />
              Επιβεβαίωση Σύνδεσης
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              Σύνδεση / Εγγραφή (Δωρεάν)
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors border border-gray-200"
        >
          <XCircle className="w-5 h-5" />
          Ακύρωση
        </button>
      </div>
    </div>
  );
}
