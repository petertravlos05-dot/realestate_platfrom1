'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaTimes, FaShieldAlt, FaFileContract, FaEnvelope } from 'react-icons/fa';
import { fetchFromBackend } from '@/lib/api/client';
import { toast } from 'react-hot-toast';
import * as Sentry from '@sentry/nextjs';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  requiredConsents: string[];
  versions: {
    terms?: string;
    privacy?: string;
  };
  email: string;
  password: string;
}

export default function ConsentModal({
  isOpen,
  onClose,
  onAccept,
  requiredConsents,
  versions,
  email,
  password,
}: ConsentModalProps) {
  const [acceptedConsents, setAcceptedConsents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const handleConsentToggle = (consentType: string) => {
    const newAccepted = new Set(acceptedConsents);
    if (newAccepted.has(consentType)) {
      newAccepted.delete(consentType);
    } else {
      newAccepted.add(consentType);
    }
    setAcceptedConsents(newAccepted);
  };

  const handleAccept = async () => {
    // Check if all required consents are accepted
    const allAccepted = requiredConsents.every(c => acceptedConsents.has(c.toLowerCase()));
    
    if (!allAccepted) {
      toast.error('Παρακαλώ αποδεχτείτε όλους τους όρους για να συνεχίσετε');
      return;
    }

    setLoading(true);
    try {
      // Convert to backend format (uppercase)
      const consents = requiredConsents.map(type => ({
        type: type.toUpperCase(),
        version: versions[type.toLowerCase() as keyof typeof versions] || '',
      }));

      // Call accept-with-auth endpoint
      const response = await fetchFromBackend('/user/consents/accept-with-auth', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          consents,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept consents');
      }

      toast.success('Οι όροι αποδεχτήκαν επιτυχώς');
      onAccept();
    } catch (error) {
      console.error('Error accepting consents:', error);
      Sentry.captureException(error);
      toast.error(error instanceof Error ? error.message : 'Σφάλμα κατά την αποδοχή των όρων');
    } finally {
      setLoading(false);
    }
  };

  const getConsentLabel = (type: string) => {
    const labels: Record<string, string> = {
      terms: 'Όροι Χρήσης',
      privacy: 'Πολιτική Απορρήτου',
    };
    return labels[type.toLowerCase()] || type;
  };

  const getConsentLink = (type: string) => {
    // Placeholder links - replace with actual URLs
    const links: Record<string, string> = {
      terms: '/terms',
      privacy: '/privacy',
    };
    return links[type.toLowerCase()] || '#';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FaShieldAlt className="text-blue-600 text-2xl" />
                <h2 className="text-2xl font-bold text-gray-900">
                  Αποδοχή Όρων Χρήσης
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading}
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>

            {/* Message */}
            <p className="text-gray-600 mb-6">
              Για να συνεχίσετε, πρέπει να αποδεχτείτε τους τελευταίους όρους χρήσης και την πολιτική απορρήτου.
            </p>

            {/* Consent Checkboxes */}
            <div className="space-y-4 mb-6">
              {requiredConsents.map((consentType) => {
                const typeLower = consentType.toLowerCase();
                const isAccepted = acceptedConsents.has(typeLower);
                const version = versions[typeLower as keyof typeof versions];

                return (
                  <div
                    key={consentType}
                    className={`border-2 rounded-lg p-4 transition-colors ${
                      isAccepted
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAccepted}
                        onChange={() => handleConsentToggle(typeLower)}
                        className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={loading}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {typeLower === 'terms' ? (
                            <FaFileContract className="text-blue-600" />
                          ) : (
                            <FaShieldAlt className="text-blue-600" />
                          )}
                          <span className="font-semibold text-gray-900">
                            {getConsentLabel(consentType)}
                          </span>
                          {version && (
                            <span className="text-xs text-gray-500">
                              (Έκδοση: {version})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Έχετε διαβάσει και αποδέχεστε τους{' '}
                          <a
                            href={getConsentLink(typeLower)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {getConsentLabel(consentType)}
                          </a>
                        </p>
                      </div>
                      {isAccepted && (
                        <FaCheckCircle className="text-green-500 text-xl flex-shrink-0" />
                      )}
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Ακύρωση
              </button>
              <button
                onClick={handleAccept}
                disabled={loading || acceptedConsents.size !== requiredConsents.length}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Αποδοχή...
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    Αποδοχή και Συνέχεια
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


