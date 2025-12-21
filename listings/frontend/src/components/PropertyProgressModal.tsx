import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { FaCheck, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

interface PropertyProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  propertyType: 'plot' | 'apartment' | 'house' | 'commercial' | 'villa';
}

interface PropertyProgress {
  id: string;
  basicInfo: {
    status: 'completed' | 'pending';
    completedAt?: string;
  };
  legalDocuments: {
    status: 'completed' | 'pending' | 'in_progress' | 'lawyer_pending';
    documents: Document[];
    uploadMethod?: 'self' | 'lawyer';
    lawyerInfo?: LawyerInfo;
  };
  platformReview: {
    status: 'completed' | 'pending' | 'rejected';
    reviewedAt?: string;
    adminComment?: string;
  };
  platformAssignment: {
    status: 'completed' | 'pending';
    type: 'platform' | 'self' | null;
    document?: {
      id: string;
      type: 'assignment' | 'contract';
      fileUrl?: string;
      uploadedAt?: string;
    };
  };
  listing: {
    status: 'completed' | 'pending';
    publishedAt?: string;
  };
}

interface Document {
  id: string;
  type: string;
  fileUrl?: string;
  uploadedAt?: string;
}

interface LawyerInfo {
  name: string;
  email: string;
  phone: string;
  taxId?: string;
}

const PropertyProgressModal: React.FC<PropertyProgressModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
  propertyType
}) => {
  const [progress, setProgress] = useState<PropertyProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchProgress();
    }
  }, [isOpen, propertyId]);

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/progress`);
      if (!response.ok) throw new Error('Failed to fetch progress');
      const data = await response.json();
      setProgress(data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FaCheck className="text-green-500" />;
      case 'pending':
        return <FaExclamationTriangle className="text-yellow-500" />;
      case 'rejected':
        return <FaTimes className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStageStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl">
          <div className="p-6">
            <Dialog.Title className="text-2xl font-bold mb-4">
              Πρόοδος Ακινήτου: {propertyTitle}
            </Dialog.Title>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : progress ? (
              <div className="space-y-6">
                {/* Basic Info Stage */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Βασικές Πληροφορίες</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStageStatusColor(progress.basicInfo.status)}`}>
                      {progress.basicInfo.status === 'completed' ? 'Ολοκληρώθηκε' : 'Σε Εκκρεμότητα'}
                    </span>
                  </div>
                  {progress.basicInfo.completedAt && (
                    <p className="text-sm text-gray-600">
                      Ολοκληρώθηκε: {format(new Date(progress.basicInfo.completedAt), 'PPP', { locale: el })}
                    </p>
                  )}
                </div>

                {/* Legal Documents Stage */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Νομικά Έγγραφα</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStageStatusColor(progress.legalDocuments.status)}`}>
                      {progress.legalDocuments.status === 'completed' ? 'Ολοκληρώθηκε' : 
                       progress.legalDocuments.status === 'in_progress' ? 'Σε Εξέλιξη' :
                       progress.legalDocuments.status === 'lawyer_pending' ? 'Σε Εκκρεμότητα από Δικηγόρο' : 'Σε Εκκρεμότητα'}
                    </span>
                  </div>
                  {progress.legalDocuments.documents.length > 0 && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium mb-2">Ανεβασμένα Έγγραφα:</h4>
                      <ul className="space-y-1">
                        {progress.legalDocuments.documents.map((doc) => (
                          <li key={doc.id} className="text-sm text-gray-600">
                            {doc.type} - {doc.uploadedAt && format(new Date(doc.uploadedAt), 'PPP', { locale: el })}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Platform Review Stage */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Έλεγχος Πλατφόρμας</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStageStatusColor(progress.platformReview.status)}`}>
                      {progress.platformReview.status === 'completed' ? 'Ολοκληρώθηκε' :
                       progress.platformReview.status === 'rejected' ? 'Απορρίφθηκε' : 'Σε Εκκρεμότητα'}
                    </span>
                  </div>
                  {progress.platformReview.reviewedAt && (
                    <p className="text-sm text-gray-600">
                      Ελέγχθηκε: {format(new Date(progress.platformReview.reviewedAt), 'PPP', { locale: el })}
                    </p>
                  )}
                  {progress.platformReview.adminComment && (
                    <p className="text-sm text-gray-600 mt-2">
                      Σχόλιο: {progress.platformReview.adminComment}
                    </p>
                  )}
                </div>

                {/* Platform Assignment Stage */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Ανάθεση Πλατφόρμας</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStageStatusColor(progress.platformAssignment.status)}`}>
                      {progress.platformAssignment.status === 'completed' ? 'Ολοκληρώθηκε' : 'Σε Εκκρεμότητα'}
                    </span>
                  </div>
                  {progress.platformAssignment.document && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        Τύπος: {progress.platformAssignment.document.type === 'assignment' ? 'Ανάθεση' : 'Συμβόλαιο'}
                      </p>
                      {progress.platformAssignment.document.uploadedAt && (
                        <p className="text-sm text-gray-600">
                          Ανέβηκε: {format(new Date(progress.platformAssignment.document.uploadedAt), 'PPP', { locale: el })}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Listing Stage */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Δημοσίευση</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStageStatusColor(progress.listing.status)}`}>
                      {progress.listing.status === 'completed' ? 'Ολοκληρώθηκε' : 'Σε Εκκρεμότητα'}
                    </span>
                  </div>
                  {progress.listing.publishedAt && (
                    <p className="text-sm text-gray-600">
                      Δημοσιεύθηκε: {format(new Date(progress.listing.publishedAt), 'PPP', { locale: el })}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Δεν βρέθηκαν πληροφορίες προόδου
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-6 w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Κλείσιμο
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default PropertyProgressModal; 