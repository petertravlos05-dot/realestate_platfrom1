'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheck, FaExclamationTriangle, FaTimes, FaFileUpload, FaDownload, FaComment, FaQuestionCircle, FaSave } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';
import { toast } from 'react-hot-toast';
import { FiCheck, FiClock, FiX } from 'react-icons/fi';

interface Document {
  id: string;
  name: string;
  type: 'title' | 'building_permit' | 'topographic' | 'energy_certificate' | 'coverage_diagram';
  status: 'pending' | 'approved' | 'rejected';
  fileUrl?: string;
  adminComment?: string;
  uploadedAt?: string;
  lastModified?: string;
}

interface LawyerInfo {
  name: string;
  email: string;
  phone: string;
  taxId?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

interface PropertyProgress {
  id: string;
  basicInfoStatus: 'completed' | 'pending';
  basicInfoCompletedAt?: string;
  legalDocumentsStatus: 'completed' | 'pending' | 'in_progress' | 'lawyer_pending';
  legalDocumentsCompletedAt?: string;
  platformReviewStatus: 'completed' | 'pending' | 'rejected';
  platformReviewCompletedAt?: string;
  platformReviewComment?: string;
  platformAssignmentStatus: 'completed' | 'pending';
  platformAssignmentCompletedAt?: string;
  listingStatus: 'completed' | 'pending';
  listingCompletedAt?: string;
  updatedAt: string;
  propertyId: string;
  notifications: Notification[];
  legalDocuments?: { documents?: Document[] };
}

interface PropertyProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  propertyType: 'plot' | 'apartment' | 'house' | 'commercial' | 'villa';
}

const documentTypes = {
  title: {
    name: 'Τίτλος Ιδιοκτησίας',
    description: 'Το έγγραφο που αποδεικνύει την ιδιοκτησία του ακινήτου',
    info: 'Απαραίτητο έγγραφο που εκδίδεται από το Κτηματολόγιο. Μπορείτε να το λάβετε από το Κτηματολόγιο της περιοχής σας ή από το gov.gr.',
    requiredFor: ['plot', 'apartment', 'house', 'commercial', 'villa']
  },
  building_permit: {
    name: 'Οικοδομική Άδεια',
    description: 'Η άδεια που επιτρέπει την κατασκευή του ακινήτου',
    info: 'Απαραίτητο έγγραφο που εκδίδεται από το Δήμο. Μπορείτε να το λάβετε από το Δημαρχείο της περιοχής σας.',
    requiredFor: ['apartment', 'house', 'commercial', 'villa']
  },
  topographic: {
    name: 'Τοπογραφικό Διάγραμμα',
    description: 'Το διάγραμμα που δείχνει τα όρια και τις διαστάσεις του οικοπέδου',
    info: 'Απαραίτητο έγγραφο που εκδίδεται από τοπογράφο. Μπορείτε να επικοινωνήσετε με τοπογράφο για την έκδοσή του.',
    requiredFor: ['plot', 'apartment', 'house', 'commercial', 'villa']
  },
  energy_certificate: {
    name: 'Ενεργειακό Πιστοποιητικό',
    description: 'Το πιστοποιητικό που δείχνει την ενεργειακή απόδοση του ακινήτου',
    info: 'Απαραίτητο για όλες τις αγοραπωλησίες. Εκδίδεται από ενεργειακό επιθεωρητή.',
    requiredFor: ['apartment', 'house', 'commercial', 'villa']
  },
  coverage_diagram: {
    name: 'Διάγραμμα Κάλυψης',
    description: 'Το διάγραμμα που δείχνει την κάλυψη του κτιρίου στο οικόπεδο',
    info: 'Απαιτείται για ακίνητα με κτίσμα. Παρέχεται μαζί με την οικοδομική άδεια.',
    requiredFor: ['apartment', 'house', 'commercial', 'villa']
  }
};

const PropertyProgressModal: React.FC<PropertyProgressModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
  propertyType
}) => {
  const [progress, setProgress] = useState<PropertyProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'self' | 'lawyer' | null>(null);
  const [lawyerInfo, setLawyerInfo] = useState<LawyerInfo>({
    name: '',
    email: '',
    phone: '',
    taxId: ''
  });
  const [assignmentType, setAssignmentType] = useState<'platform' | 'self' | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: File }>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isEditingLawyer, setIsEditingLawyer] = useState(false);
  const [lawyerSuccess, setLawyerSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProgress();
      fetchDocuments();
      setLawyerSuccess(false);
      setIsEditingLawyer(false);
      fetchLawyerInfo();
    }
  }, [isOpen, propertyId]);

  useEffect(() => {
    if (progress) {
      setUploadMethod(null);
      setAssignmentType(null);
    }
  }, [progress]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/progress`);
      if (!response.ok) throw new Error('Failed to fetch progress');
      const data = await response.json();
      console.log('Fetched progress data:', data);
      setProgress(data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/progress/documents`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchLawyerInfo = async () => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/lawyer`);
      if (!response.ok) throw new Error('Failed to fetch lawyer info');
      const data = await response.json();
      if (data.lawyerName || data.lawyerEmail || data.lawyerPhone || data.lawyerTaxId) {
        setLawyerInfo({
          name: data.lawyerName || '',
          email: data.lawyerEmail || '',
          phone: data.lawyerPhone || '',
          taxId: data.lawyerTaxId || ''
        });
      } else {
        setLawyerInfo({ name: '', email: '', phone: '', taxId: '' });
      }
    } catch (error) {
      setLawyerInfo({ name: '', email: '', phone: '', taxId: '' });
    }
  };

  const getStageStatusIcon = (status: string, stage: string) => {
    if (stage === 'basicInfo') return <FiCheck className="w-5 h-5 text-green-500" />;
    
    switch (status) {
      case 'completed':
        return <FiCheck className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <FiClock className="w-5 h-5 text-yellow-500" />;
      case 'in_progress':
        return <FiClock className="w-5 h-5 text-blue-500" />;
      case 'rejected':
        return <FiX className="w-5 h-5 text-red-500" />;
      default:
        return <FiClock className="w-5 h-5 text-gray-400" />;
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

  const handleDocumentUpload = async (documentType: string) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.jpg,.jpeg,.png';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Προσθήκη του αρχείου στο state
        setUploadedFiles(prev => ({
          ...prev,
          [documentType]: file
        }));
      };

      input.click();
    } catch (error) {
      console.error('Error in document upload:', error);
      toast.error('Σφάλμα κατά το ανέβασμα του εγγράφου');
    }
  };

  const handleSaveDocuments = async () => {
    try {
      setIsSaving(true);
      
      // Ανέβασμα όλων των αρχείων
      for (const [documentType, file] of Object.entries(uploadedFiles)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);
        formData.append('propertyId', propertyId);

        const response = await fetch(`/api/properties/${propertyId}/progress/documents`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Σφάλμα κατά το ανέβασμα του εγγράφου');
        }
      }

      toast.success('Τα έγγραφα αποθηκεύτηκαν επιτυχώς');
      setUploadedFiles({});
      await fetchProgress();
      await fetchDocuments();
    } catch (error) {
      console.error('Error saving documents:', error);
      toast.error('Σφάλμα κατά την αποθήκευση των εγγράφων');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDocumentDownload = (document: Document) => {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement save draft functionality
      console.log('Saving draft...');
      toast.success('Η πρόοδος αποθηκεύτηκε επιτυχώς');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadMethodChange = (method: 'self' | 'lawyer') => {
    setUploadMethod(method);
    if (method === 'lawyer') {
      setExpandedStage('lawyerForm');
    }
  };

  const handleLawyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await fetch(`/api/properties/${propertyId}/lawyer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: lawyerInfo.name,
          email: lawyerInfo.email,
          phone: lawyerInfo.phone,
          taxId: lawyerInfo.taxId
        }),
      });
      toast.success('Καταχωρήσατε τα στοιχεία του δικηγόρου σας επιτυχώς');
      setLawyerSuccess(true);
      setIsEditingLawyer(false);
    } catch (error) {
      console.error('Error sending lawyer request:', error);
      toast.error('Σφάλμα κατά την αποστολή του αιτήματος');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setUploadMethod(null);
  };

  const handleAssignmentTypeChange = (type: 'platform' | 'self') => {
    setAssignmentType(type);
  };

  const handleAssignmentUpload = async (file: File) => {
    // TODO: Implement file upload
    console.log('Uploading assignment file:', file);
  };

  const stages = [
    {
      id: 'basicInfo',
      title: 'Βασικές Πληροφορίες',
      description: 'Συμπλήρωση βασικών πληροφοριών του ακινήτου',
      status: 'completed',
      completedAt: progress?.basicInfoCompletedAt || new Date().toISOString()
    },
    {
      id: 'legalDocuments',
      title: 'Νομικά Έγγραφα',
      description: 'Ανέβασμα και έλεγχος νομικών εγγράφων',
      status: progress?.legalDocumentsStatus || 'pending',
      completedAt: progress?.legalDocumentsCompletedAt
    },
    {
      id: 'platformReview',
      title: 'Βήμα 3 – Έλεγχος Πλατφόρμας',
      status: progress?.platformReviewStatus || 'pending',
      completedAt: progress?.platformReviewCompletedAt,
      description: 'Ολοκληρώθηκε ο έλεγχος της πλατφόρμας.',
      adminComment: progress?.platformReviewComment
    },
    {
      id: 'platformAssignment',
      title: 'Βήμα 4 – Ανάθεση Πλατφόρμας',
      status: progress?.platformAssignmentStatus || 'pending',
      completedAt: progress?.platformAssignmentCompletedAt,
      description: 'Ολοκληρώθηκε η ανάθεση της πλατφόρμας.'
    },
    {
      id: 'listing',
      title: 'Βήμα 5 – Δημοσίευση',
      status: progress?.listingStatus || 'pending',
      completedAt: progress?.listingCompletedAt,
      description: 'Ολοκληρώθηκε η δημοσίευση του ακινήτου.'
    }
  ];

  const getRequiredDocuments = () => {
    console.log('Getting required documents for type:', propertyType);
    return Object.entries(documentTypes)
      .filter(([_, info]) => info.requiredFor.includes(propertyType))
      .map(([type, info]) => ({ type, ...info }));
  };

  // Επιστρέφει αντικείμενο { [type]: Document } με το πιο πρόσφατο για κάθε τύπο
  const latestDocumentsByType = React.useMemo(() => {
    const map: { [type: string]: Document } = {};
    documents.forEach((doc) => {
      if (!doc.type) return;
      if (!map[doc.type]) {
        map[doc.type] = doc;
      } else {
        // Σύγκριση uploadedAt/lastModified
        const prevDate = new Date(map[doc.type].uploadedAt || map[doc.type].lastModified || 0).getTime();
        const currDate = new Date(doc.uploadedAt || doc.lastModified || 0).getTime();
        if (currDate > prevDate) {
          map[doc.type] = doc;
        }
      }
    });
    return map;
  }, [documents]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Πρόοδος Καταχώρησης: {propertyTitle}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
            >
              <FaTimes className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-8">
            {stages.map((stage, index) => (
              <div key={stage.id} className="relative">
                {/* Timeline connector */}
                {index < stages.length - 1 && (
                  <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200" />
                )}

                <div className="flex items-start space-x-4">
                  {/* Stage number and status */}
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      getStageStatusColor(stage.status || '')
                    }`}>
                      {getStageStatusIcon(stage.status || '', stage.id)}
                    </div>
                  </div>

                  {/* Stage content */}
                  <div className="flex-grow">
                    <div
                      className={`flex items-center p-4 rounded-lg cursor-pointer ${
                        expandedStage === stage.id ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => {
                        if (stage.status === 'completed') {
                          // Εμφανίζουμε διαφορετικά μηνύματα ανάλογα με το βήμα
                          switch (stage.id) {
                            case 'basicInfo':
                              toast.success('Τα βασικά στοιχεία του ακινήτου έχουν ολοκληρωθεί επιτυχώς.');
                              break;
                            case 'legalDocuments':
                              toast.success('Τα νομικά έγγραφα ελέγχθηκαν και εγκρίθηκαν επιτυχώς από την πλατφόρμα μας.');
                              break;
                            case 'platformReview':
                              toast.success('Η εξέταση της πλατφόρμας ολοκληρώθηκε επιτυχώς.');
                              break;
                            case 'platformAssignment':
                              toast.success('Η ανάθεση στην πλατφόρμα ολοκληρώθηκε επιτυχώς.');
                              break;
                            case 'listing':
                              toast.success('Η καταχώρηση του ακινήτου ολοκληρώθηκε επιτυχώς.');
                              break;
                            default:
                              toast.success(`Το βήμα "${stage.title}" ολοκληρώθηκε επιτυχώς.`);
                          }
                        }
                        setExpandedStage(expandedStage === stage.id ? null : stage.id);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {stage.id === 'legalDocuments' 
                            ? 'Βήμα 2 – Ποιος θα αναλάβει την αποστολή των νομικών εγγράφων;'
                            : stage.title}
                        </h3>
                        <div className="flex items-center space-x-3">
                          {stage.completedAt && (
                            <span className="text-xs text-gray-500">
                              Ολοκληρώθηκε: {new Date(stage.completedAt).toLocaleDateString('el-GR')}
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-sm ${getStageStatusColor(stage.status || '')}`}>
                            {(stage.status || '') === 'completed' ? 'Ολοκληρώθηκε' :
                             (stage.status || '') === 'pending' ? 'Σε Εξέλιξη' :
                             (stage.status || '') === 'lawyer_pending' ? 'Σε εξέλιξη μέσω δικηγόρου' :
                             (stage.status || '') === 'rejected' ? 'Απορρίφθηκε' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedStage === stage.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-4 space-y-4 w-full"
                        >
                          <p className="text-gray-600">{stage.description}</p>

                          {/* Documents section for legal documents stage */}
                          {stage.id === 'legalDocuments' && (stage.status === 'pending' || stage.status === 'in_progress') && (
                            <div className="space-y-4">
                              <AnimatePresence mode="wait">
                                {!uploadMethod ? (
                                  <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-4"
                                  >
                                    <p className="text-gray-600">Επιλέξτε πώς θέλετε να ολοκληρώσετε τη διαδικασία υποβολής εγγράφων:</p>
                                    <div className="space-y-2">
                                      <motion.button
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => setUploadMethod('self')}
                                        className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-all duration-200"
                                      >
                                        <div className="flex items-center space-x-3">
                                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                            uploadMethod === 'self' ? 'border-blue-500' : 'border-gray-300'
                                          }`}>
                                            {uploadMethod === 'self' && (
                                              <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-3 h-3 rounded-full bg-blue-500"
                                              />
                                            )}
                                          </div>
                                          <span className="font-medium">Θα τα ανεβάσω εγώ ως ιδιοκτήτης</span>
                                        </div>
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => setUploadMethod('lawyer')}
                                        className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-all duration-200"
                                      >
                                        <div className="flex items-center space-x-3">
                                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                            uploadMethod === 'lawyer' ? 'border-blue-500' : 'border-gray-300'
                                          }`}>
                                            {uploadMethod === 'lawyer' && (
                                              <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-3 h-3 rounded-full bg-blue-500"
                                              />
                                            )}
                                          </div>
                                          <span className="font-medium">Θα τα αναλάβει ο δικηγόρος μου</span>
                                        </div>
                                      </motion.button>
                                    </div>
                                  </motion.div>
                                ) : uploadMethod === 'self' ? (
                                  <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-4"
                                  >
                                    <div className="flex justify-between items-center mb-4">
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setUploadMethod(null)}
                                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
                                      >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Πίσω στην επιλογή μεθόδου
                                      </motion.button>
                                    </div>
                                    {getRequiredDocuments().map(({ type, name, info }, index) => {
                                      // Βρες το πιο πρόσφατο ανεβασμένο έγγραφο για αυτόν τον τύπο
                                      const existingDoc = latestDocumentsByType[type];
                                      return (
                                        <motion.div
                                          key={type}
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.3, delay: index * 0.1 }}
                                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                        >
                                          <div className="flex items-center space-x-3">
                                            <div className="flex items-center space-x-2">
                                              <span className="font-medium">{name}</span>
                                              <div
                                                data-tooltip-id={`tooltip-${type}`}
                                                data-tooltip-content={info}
                                                className="cursor-help"
                                              >
                                                <FaQuestionCircle className="text-gray-400 hover:text-gray-600" />
                                              </div>
                                              <Tooltip id={`tooltip-${type}`} />
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-4">
                                            {/* Αν υπάρχει ήδη ανεβασμένο έγγραφο */}
                                            {existingDoc && existingDoc.fileUrl && (
                                              <div className="flex items-center space-x-2">
                                                <a
                                                  href={existingDoc.fileUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-blue-600 hover:underline"
                                                >
                                                  Λήψη
                                                </a>
                                                <span className="text-xs text-gray-500">({existingDoc.fileUrl.split('/').pop()})</span>
                                              </div>
                                            )}
                                            {/* Ανέβασμα ή Αλλαγή */}
                                            <motion.button
                                              whileHover={{ scale: 1.05 }}
                                              whileTap={{ scale: 0.95 }}
                                              onClick={() => handleDocumentUpload(type)}
                                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                                            >
                                              {existingDoc ? 'Αλλαγή' : 'Ανέβασμα'}
                                            </motion.button>
                                            {/* Εμφάνιση ονόματος νέου αρχείου αν έχει επιλεγεί */}
                                            {uploadedFiles[type] && (
                                              <div className="flex items-center space-x-2">
                                                <FaFileUpload className="text-green-500" />
                                                <span className="text-sm text-gray-600">{uploadedFiles[type].name}</span>
                                              </div>
                                            )}
                                          </div>
                                        </motion.div>
                                      );
                                    })}
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-4"
                                  >
                                    <div className="flex justify-between items-center mb-4">
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setUploadMethod(null)}
                                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
                                      >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Πίσω στην επιλογή μεθόδου
                                      </motion.button>
                                    </div>
                                    <motion.h4 
                                      initial={{ opacity: 0, y: -20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="font-medium text-lg"
                                    >
                                      📝 Καταχώρηση Στοιχείων Δικηγόρου
                                    </motion.h4>
                                    {stage.id === 'legalDocuments' && uploadMethod === 'lawyer' && (
                                      <div className="mt-4">
                                        {lawyerInfo.name && !isEditingLawyer ? (
                                          <div className="space-y-4">
                                            <div className="p-4 bg-green-50 border border-green-400 rounded text-green-800">
                                              Καταχωρήσατε τα στοιχεία του δικηγόρου σας επιτυχώς.
                                            </div>
                                            <div className="space-y-2">
                                              <div><span className="font-medium">Όνομα:</span> {lawyerInfo.name || '-'}</div>
                                              <div><span className="font-medium">Email:</span> {lawyerInfo.email || '-'}</div>
                                              <div><span className="font-medium">Τηλέφωνο:</span> {lawyerInfo.phone || '-'}</div>
                                              <div><span className="font-medium">ΑΦΜ:</span> {lawyerInfo.taxId || '-'}</div>
                                            </div>
                                            <button
                                              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                              onClick={() => setIsEditingLawyer(true)}
                                            >
                                              Αλλαγή στοιχείων
                                            </button>
                                          </div>
                                        ) : (
                                          <form onSubmit={handleLawyerSubmit} className="space-y-4">
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700">Ονοματεπώνυμο</label>
                                              <input type="text" required value={lawyerInfo.name} onChange={e => setLawyerInfo(prev => ({ ...prev, name: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200" />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700">Email</label>
                                              <input type="email" required value={lawyerInfo.email} onChange={e => setLawyerInfo(prev => ({ ...prev, email: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200" />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700">Τηλέφωνο</label>
                                              <input type="text" required value={lawyerInfo.phone} onChange={e => setLawyerInfo(prev => ({ ...prev, phone: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200" />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700">ΑΦΜ (προαιρετικό)</label>
                                              <input type="text" value={lawyerInfo.taxId} onChange={e => setLawyerInfo(prev => ({ ...prev, taxId: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200" />
                                            </div>
                                            <button type="submit" disabled={isSaving} className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                              {isSaving ? 'Αποστολή...' : 'Αποστολή Αιτήματος στον Δικηγόρο'}
                                            </button>
                                          </form>
                                        )}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {stage.id === 'platformAssignment' && (stage.status === 'pending' || stage.status === 'in_progress') && (
                            <div className="w-full space-y-6">
                              <div className="space-y-4">
                                <div className="w-full p-6 bg-blue-50 border-2 border-blue-500 rounded-xl">
                                  <div className="flex items-center space-x-4">
                                    <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center flex-shrink-0">
                                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    </div>
                                    <div className="flex-1">
                                      <span className="text-lg font-semibold block text-gray-900">
                                        Ανάθεση στην πλατφόρμα/μεσίτη
                                      </span>
                                      <span className="text-sm text-gray-500 mt-1 block">
                                        Υπογραφή εντολής ανάθεσης με αποκλειστικότητα. Η πλατφόρμα αναλαμβάνει την πλήρη διαχείριση του ακινήτου σας.
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                  Ανέβασμα εγγράφου ανάθεσης
                                </h4>
                                <div className="space-y-4">
                                  <div className="flex items-center justify-center w-full">
                                    <label className="w-full flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200">
                                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="mb-2 text-sm text-gray-500">
                                          <span className="font-semibold">Κάντε κλικ για ανέβασμα</span> ή σύρετε το αρχείο εδώ
                                        </p>
                                        <p className="text-xs text-gray-500">PDF, JPG ή PNG</p>
                                      </div>
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleAssignmentUpload(file);
                                        }}
                                      />
                                    </label>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    <p className="font-medium mb-2">Αποδεκτοί τύποι εγγράφων:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                      <li>Έγγραφο ανάθεσης με αποκλειστικότητα</li>
                                      <li>Συμβόλαιο συνεργασίας</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Admin comment section */}
                          {stage.adminComment && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Σχόλιο Διαχειριστή:</span> {stage.adminComment}
                              </p>
                            </div>
                          )}

                          {/* Completion date */}
                          {stage.completedAt && (
                            <p className="text-sm text-gray-500">
                              Ολοκληρώθηκε στις: {new Date(stage.completedAt).toLocaleDateString('el-GR')}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Documents Button */}
          {Object.keys(uploadedFiles).length > 0 && (
            <div className="mt-4 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveDocuments}
                disabled={isSaving}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση Εγγράφων'}
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Document comment modal */}
      <AnimatePresence>
        {selectedDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Σχόλιο Διαχειριστή
                </h3>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>
              <p className="text-gray-600">{selectedDocument.adminComment}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PropertyProgressModal; 