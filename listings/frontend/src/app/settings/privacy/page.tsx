'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaShieldAlt, FaDownload, FaTrash, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import { apiClient, fetchFromBackend } from '@/lib/api/client';
import { toast } from 'react-hot-toast';

interface Consent {
  id: string;
  consentType: string;
  version: string;
  acceptedAt: string;
}

interface ConsentStatus {
  current: boolean;
  latestVersion: string;
}

interface ConsentsResponse {
  consents: Consent[];
  status: Record<string, ConsentStatus>;
  currentVersions: Record<string, string>;
}

export default function PrivacyCenter() {
  const { data: session } = useSession();
  const router = useRouter();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [consentStatus, setConsentStatus] = useState<Record<string, ConsentStatus>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (session) {
      fetchConsents();
    }
  }, [session]);

  const fetchConsents = async () => {
    try {
      setLoading(true);
      const response = await fetchFromBackend('/user/consents', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch consents');
      }

      const data: ConsentsResponse = await response.json();
      setConsents(data.consents || []);
      setConsentStatus(data.status || {});
    } catch (error) {
      console.error('Error fetching consents:', error);
      toast.error('Σφάλμα κατά τη φόρτωση του ιστορικού συναίνεσης');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      const userId = session?.user?.id || 'user';
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      let part = 1;
      let cursor: any = null;
      const downloadedParts: string[] = [];

      // Download all parts
      while (true) {
        const requestBody: any = {};
        if (cursor) {
          requestBody.cursor = cursor;
        }

        const response = await fetchFromBackend('/user/export', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'X-Export-Part': part.toString(),
          },
        });

        if (response.status === 501) {
          const data = await response.json();
          if (data.error === 'NOT_IMPLEMENTED') {
            toast.error('Η λειτουργία εξαγωγής δεδομένων δεν είναι ακόμα διαθέσιμη');
            return;
          }
        }

        if (response.status === 429) {
          const data = await response.json();
          toast.error(`Πολλά αιτήματα. Δοκιμάστε ξανά σε ${Math.ceil(data.retryAfterSeconds / 60)} λεπτά.`);
          return;
        }

        if (response.status === 413) {
          const errorData = await response.json();
          toast.error(`Το export είναι πολύ μεγάλο. Χρησιμοποιήστε pagination με μικρότερα limits.`);
          console.error('Export too large:', errorData);
          return;
        }

        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.error === 'ACCOUNT_DELETED') {
            // Account deleted - force logout
            await signOut({ redirect: false });
            router.push('/login?message=account_deleted');
            return;
          }
          throw new Error(errorData.message || 'Export failed');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Export failed');
        }

        // Get export data
        const exportData = await response.json();
        
        // Generate filename
        const filename = exportData.isPartial
          ? `gdpr-export-${userId}-${date}-part-${part}.json`
          : `gdpr-export-${userId}-${date}.json`;

        // Create blob and download
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        downloadedParts.push(filename);

        // Check if there are more parts
        if (exportData.nextCursor && exportData.isPartial) {
          cursor = exportData.nextCursor;
          part++;
          // Show progress
          toast.loading(`Κατέβασμα μέρους ${part}...`, { id: 'export-progress' });
        } else {
          // All parts downloaded
          break;
        }
      }

      // Success message
      toast.dismiss('export-progress');
      if (downloadedParts.length > 1) {
        toast.success(`Η εξαγωγή ολοκληρώθηκε! Κατέβηκαν ${downloadedParts.length} αρχεία.`);
      } else {
        toast.success('Η εξαγωγή των δεδομένων ολοκληρώθηκε επιτυχώς');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Σφάλμα κατά την εξαγωγή των δεδομένων';
      toast.error(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setDeletePassword('');
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setDeletePassword('');
  };

  const handleDelete = async () => {
    if (!deletePassword) {
      toast.error('Παρακαλώ εισάγετε τον κωδικό σας');
      return;
    }

    try {
      setDeleting(true);
      const response = await fetchFromBackend('/user/delete', {
        method: 'POST',
        body: JSON.stringify({ password: deletePassword }),
      });

      if (response.status === 501) {
        const data = await response.json();
        if (data.error === 'NOT_IMPLEMENTED') {
          toast.error('Η λειτουργία διαγραφής λογαριασμού δεν είναι ακόμα διαθέσιμη');
          return;
        }
      }

      if (response.status === 401) {
        const data = await response.json();
        if (data.error === 'INVALID_PASSWORD') {
          toast.error('Λανθασμένος κωδικός. Παρακαλώ δοκιμάστε ξανά.');
          return;
        }
      }

      if (response.status === 409) {
        const data = await response.json();
        if (data.error === 'ALREADY_DELETED') {
          toast.error('Ο λογαριασμός έχει ήδη διαγραφεί');
          await signOut({ redirect: false });
          router.push('/login?message=account_already_deleted');
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Delete failed');
      }

      // Success - logout and redirect
      await signOut({ redirect: false });
      
      // Clear any local storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      
      toast.success('Ο λογαριασμός σας διαγράφηκε επιτυχώς');
      router.push('/login?message=account_deleted');
    } catch (error) {
      console.error('Error deleting account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Σφάλμα κατά τη διαγραφή του λογαριασμού';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeletePassword('');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConsentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      TERMS: 'Όροι Χρήσης',
      PRIVACY: 'Πολιτική Απορρήτου',
      MARKETING: 'Μάρκετινγκ',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FaShieldAlt className="text-blue-600 text-2xl" />
            <h1 className="text-3xl font-bold text-gray-900">Κέντρο Απορρήτου</h1>
          </div>
          <p className="text-gray-600 mt-2">
            Διαχειριστείτε τα δεδομένα σας και τις προτιμήσεις απορρήτου
          </p>
        </div>

        {/* Consent History */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Ιστορικό Συναίνεσης</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-2">Φόρτωση...</p>
            </div>
          ) : consents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaClock className="mx-auto text-4xl mb-2 opacity-50" />
              <p>Δεν βρέθηκε ιστορικό συναίνεσης</p>
            </div>
          ) : (
            <div className="space-y-4">
              {consents.map((consent) => {
                const status = consentStatus[consent.consentType];
                const isCurrent = status?.current && status?.latestVersion === consent.version;
                
                return (
                  <div
                    key={consent.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {getConsentTypeLabel(consent.consentType)}
                          </h3>
                          {isCurrent ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              <FaCheckCircle className="text-xs" />
                              Τρέχουσα έκδοση
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                              <FaTimesCircle className="text-xs" />
                              Παλιότερη έκδοση
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          Έκδοση: <span className="font-mono">{consent.version}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Αποδεκτή: {formatDate(consent.acceptedAt)}
                        </p>
                        {status && !isCurrent && (
                          <p className="text-xs text-orange-600 mt-1">
                            Τρέχουσα έκδοση: {status.latestVersion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Data Export */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Εξαγωγή Δεδομένων</h2>
          <p className="text-gray-600 mb-4">
            Κατεβάστε ένα αντίγραφο όλων των δεδομένων που έχουμε αποθηκεύσει για εσάς.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaDownload />
            {exporting ? 'Εξαγωγή...' : 'Κατέβασμα των Δεδομένων μου'}
          </button>
        </div>

        {/* Account Deletion */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-l-4 border-red-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Διαγραφή Λογαριασμού</h2>
          <p className="text-gray-600 mb-4">
            Η διαγραφή του λογαριασμού σας είναι μόνιμη και δεν μπορεί να αναιρεθεί. 
            Όλα τα δεδομένα σας θα διαγραφούν οριστικά.
          </p>
          
          {!showDeleteConfirm ? (
            <button
              onClick={handleDeleteClick}
              disabled={deleting}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FaTrash />
              Διαγραφή του Λογαριασμού μου
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="delete-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Εισάγετε τον κωδικό σας για επιβεβαίωση:
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Κωδικός πρόσβασης"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  disabled={deleting}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting || !deletePassword}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaTrash />
                  {deleting ? 'Διαγραφή...' : 'Επιβεβαίωση Διαγραφής'}
                </button>
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Ακύρωση
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

