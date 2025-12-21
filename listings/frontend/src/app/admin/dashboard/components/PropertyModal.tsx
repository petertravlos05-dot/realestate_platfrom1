import { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FiX, FiEdit2, FiCheck, FiAlertCircle, FiUpload, FiFile, FiClock } from 'react-icons/fi';
import Image from 'next/image';
import PropertyFeatures from './PropertyFeatures';
import PropertySpecialFeatures from './PropertySpecialFeatures';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { FaDownload } from 'react-icons/fa';

interface PropertyProgress {
  legalDocumentsStatus: string;
  platformReviewStatus: string;
  platformAssignmentStatus: string;
  listingStatus: string;
  updatedAt: string;
  notifications: Notification[];
}

interface Notification {
  id: string;
  message: string;
  title: string;
  type: string;
  createdAt: string;
}

interface PropertyDocument {
  id: string;
  type: string;
  fileUrl: string;
  status: string;
  uploadedAt: string;
  adminComment?: string;
}

interface Property {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  price: number;
  status: string;
  removalRequested?: boolean;
  images: string[];
  propertyType: string;
  city: string;
  street: string;
  number: string;
  area: number;
  owner: {
    id: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  uploadMethod: string;
  assignmentDocument?: {
    fileUrl: string;
  };
  lawyerInfo?: {
    name: string;
    email: string;
    phone: string;
    taxId?: string;
  };
  assignmentType: string;
  progress?: PropertyProgress;
}

interface PropertyModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onStatusChange: (status: string, message?: string) => Promise<void>;
  onCompleteChanges: (propertyId: string, data: any) => Promise<void>;
  onUploadImages?: (files: File[]) => Promise<void>;
  onMarkUnavailable?: () => Promise<void>;
  onToggleOwnership?: () => Promise<void>;
  onToggleRemovalRequest?: () => Promise<void>;
}

// Constants for select options
const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'commercial', 'plot'];
const CONDITIONS = ['underConstruction', 'renovated', 'needsRenovation'];
const HEATING_TYPES = ['autonomous', 'central', 'heatpump'];
const HEATING_SYSTEMS = ['gas', 'oil', 'electricity'];
const WINDOW_TYPES = ['pvc', 'wooden', 'aluminum'];
const WINDOW_STYLES = ['insulated', 'non_insulated'];
const FLOORING_TYPES = ['tiles', 'wooden', 'marble'];
const ENERGY_CLASSES = ['A+', 'A', 'B+', 'B', 'C', 'D', 'E', 'F', 'G'];
const POOL_TYPES = ['private', 'shared', 'none'];
const COMMERCIAL_TYPES = ['store', 'office', 'warehouse'];
const PLOT_CATEGORIES = ['residential', 'agricultural', 'industrial', 'investment'];
const PLOT_OWNERSHIP_TYPES = ['private', 'corporate', 'shared'];
const ROAD_ACCESS_TYPES = ['asphalt', 'dirt', 'municipal', 'rural'];
const TERRAIN_TYPES = ['flat', 'sloped', 'amphitheater'];
const SHAPE_TYPES = ['triangular', 'rectangular', 'corner'];
const SUITABILITY_TYPES = ['residential', 'professional', 'tourist', 'industrial'];
const STORAGE_TYPES = ['internal', 'external', 'none'];
const ELEVATOR_TYPES = ['passenger', 'freight', 'both', 'none'];

export default function PropertyModal({
  property,
  isOpen,
  onClose,
  onSave,
  onStatusChange,
  onCompleteChanges,
  onUploadImages,
  onMarkUnavailable,
  onToggleOwnership,
  onToggleRemovalRequest
}: PropertyModalProps) {
  console.log('=== PropertyModal Render ===', {
    propertyId: property.id,
    status: property.status,
    progress: property.progress,
    timestamp: new Date().toISOString()
  });

  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [additionalInfoRequest, setAdditionalInfoRequest] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(property);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isInfoRequestModalOpen, setIsInfoRequestModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isEditingStage, setIsEditingStage] = useState<string | null>(null);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [lawyerInfo, setLawyerInfo] = useState<any>(null);
  const [lawyerLoading, setLawyerLoading] = useState(false);

  useEffect(() => {
    console.log('=== PropertyModal useEffect ===', {
      propertyId: property.id,
      status: property.status,
      progress: property.progress,
      timestamp: new Date().toISOString()
    });
    setSelectedProperty(property);
  }, [property]);

  useEffect(() => {
    if (isOpen) {
      fetchProgress();
      fetchDocuments();
    }
  }, [isOpen, property.id]);

  useEffect(() => {
    if (isOpen && activeTab === 'lawyer') {
      fetchLawyerInfo();
    }
  }, [isOpen, activeTab, property.id]);

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/properties/${property.id}/progress`);
      if (!response.ok) throw new Error('Failed to fetch progress');
      const data = await response.json();
      
      setSelectedProperty(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          ...data
        }
      }));
    } catch (error) {
      console.error('Error fetching progress:', error);
      toast.error('Σφάλμα κατά την ανάκτηση της προόδου');
    }
  };

  const fetchDocuments = async () => {
    setDocumentsLoading(true);
    try {
      const response = await fetch(`/api/properties/${property.id}/progress/documents`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Σφάλμα κατά την ανάκτηση των εγγράφων');
    } finally {
      setDocumentsLoading(false);
    }
  };

  const fetchLawyerInfo = async () => {
    setLawyerLoading(true);
    try {
      const response = await fetch(`/api/properties/${property.id}/lawyer`);
      if (!response.ok) throw new Error('Failed to fetch lawyer info');
      const data = await response.json();
      setLawyerInfo(data); // απευθείας τα πεδία lawyerName, lawyerEmail, ...
    } catch (error) {
      setLawyerInfo(null);
    } finally {
      setLawyerLoading(false);
    }
  };

  const handleEdit = () => {
    console.log('=== Starting Edit Mode ===', {
      propertyId: property.id,
      currentStatus: property.status,
      timestamp: new Date().toISOString()
    });
    setIsEditing(true);
  };

  const handleCompleteChanges = async () => {
    console.log('=== Completing Changes ===', {
      propertyId: property.id,
      currentStatus: property.status,
      editedData: selectedProperty,
      timestamp: new Date().toISOString()
    });
    try {
      setIsSubmitting(true);
      await onCompleteChanges(selectedProperty.id, { ...selectedProperty, status: 'approved' });
      setHasChanges(false);
      toast.success('Οι αλλαγές ολοκληρώθηκαν με επιτυχία');
    } catch (error) {
      console.error('Error completing changes:', error);
      toast.error('Παρουσιάστηκε σφάλμα κατά την ολοκλήρωση των αλλαγών');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = () => {
    console.log('=== Opening Reject Modal ===', {
      propertyId: property.id,
      currentStatus: property.status,
      timestamp: new Date().toISOString()
    });
    setIsRejectModalOpen(true);
  };

  const handleRequestInfo = () => {
    console.log('=== Opening Info Request Modal ===', {
      propertyId: property.id,
      currentStatus: property.status,
      timestamp: new Date().toISOString()
    });
    setIsInfoRequestModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== Image Upload Started ===', {
      propertyId: property.id,
      filesCount: e.target.files?.length,
      timestamp: new Date().toISOString()
    });
    if (e.target.files && onUploadImages) {
      onUploadImages(Array.from(e.target.files));
    }
  };

  const handleToggleOwnership = async () => {
    console.log('=== Toggling Ownership ===', {
      propertyId: property.id,
      currentStatus: property.status,
      timestamp: new Date().toISOString()
    });
    if (!onToggleOwnership) return;
    
    try {
      setIsSubmitting(true);
      await onToggleOwnership();
    } catch (error) {
      console.error('Error toggling ownership:', error);
      toast.error('Παρουσιάστηκε σφάλμα κατά την αλλαγή κατοχής');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRemovalRequest = async () => {
    console.log('=== Toggle Removal Request START ===', {
      propertyId: property.id,
      currentRemovalRequested: property.removalRequested,
      timestamp: new Date().toISOString()
    });
    
    if (!onToggleRemovalRequest) return;
    
    try {
      setIsSubmitting(true);
      await onToggleRemovalRequest();
      toast.success(property.removalRequested 
        ? 'Η αίτηση αφαίρεσης ακυρώθηκε επιτυχώς' 
        : 'Η αίτηση αφαίρεσης εγκρίθηκε επιτυχώς'
      );
    } catch (error) {
      console.error('Error toggling removal request:', error);
      toast.error('Σφάλμα κατά την επεξεργασία της αίτησης αφαίρεσης');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectRemove = async () => {
    console.log('=== Direct Remove START ===', {
      propertyId: property.id,
      timestamp: new Date().toISOString()
    });
    
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin/listings/${property.id}/remove`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove property');
      }

      toast.success('Το ακίνητο αφαιρέθηκε επιτυχώς από την πλατφόρμα');
      
      // Κλείνουμε το modal
      onClose();
    } catch (error) {
      console.error('Error removing property:', error);
      toast.error('Σφάλμα κατά την αφαίρεση του ακινήτου');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProgressUpdate = async (stage: string, status: string) => {
    console.log('=== handleProgressUpdate START ===');
    console.log('Stage:', stage);
    console.log('Status:', status);
    console.log('Property:', selectedProperty);

    try {
      const response = await fetch(`/api/properties/${selectedProperty.id}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage,
          status,
          message: `Ενημέρωση προόδου: ${stage} - ${status}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      const data = await response.json();
      console.log('Progress API Response:', data);

      setSelectedProperty(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          legalDocumentsStatus: stage === 'legalDocuments' ? status : prev.progress?.legalDocumentsStatus,
          platformReviewStatus: stage === 'platformReview' ? status : prev.progress?.platformReviewStatus,
          platformAssignmentStatus: stage === 'platformAssignment' ? status : prev.progress?.platformAssignmentStatus,
          listingStatus: stage === 'listing' ? status : prev.progress?.listingStatus,
          updatedAt: new Date().toISOString()
        } as PropertyProgress
      }));

      toast.success('Το βήμα ολοκληρώθηκε επιτυχώς');
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Σφάλμα κατά την ενημέρωση της προόδου');
    }

    console.log('=== handleProgressUpdate END ===');
  };

  const handleStatusChange = async (status: string, message?: string) => {
    console.log('=== Changing Status ===', {
      propertyId: property.id,
      newStatus: status,
      message,
      timestamp: new Date().toISOString()
    });
    try {
      await onStatusChange(status, message);
      setIsRejectModalOpen(false);
      setIsInfoRequestModalOpen(false);
      toast.success('Η κατάσταση ενημερώθηκε επιτυχώς');
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('Σφάλμα κατά την ενημέρωση της κατάστασης');
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-7xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="sticky top-0 bg-white z-10 border-b pb-4 mb-4 flex justify-between items-center">
                  <Dialog.Title as="h3" className="text-2xl font-semibold">
                    {property.title}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Κλείσιμο"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Tabs */}
                  <div className="border-b border-gray-200 mb-6">
                    <nav className="flex space-x-8">
                      <button
                        onClick={() => setActiveTab('details')}
                        className={`${
                          activeTab === 'details'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        Λεπτομέρειες
                      </button>
                      <button
                        onClick={() => setActiveTab('legal')}
                        className={`${
                          activeTab === 'legal'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        Νομικά Έγγραφα
                      </button>
                      <button
                        onClick={() => setActiveTab('progress')}
                        className={`${
                          activeTab === 'progress'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        Πρόοδος
                      </button>
                      <button
                        onClick={() => setActiveTab('documents')}
                        className={`${
                          activeTab === 'documents'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        Έγγραφα
                      </button>
                      <button
                        onClick={() => setActiveTab('lawyer')}
                        className={`${
                          activeTab === 'lawyer'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        Δικηγόρος
                      </button>
                    </nav>
                  </div>

                  {/* Content */}
                  {activeTab === 'details' && (
                    <>
                      <div className="space-y-8">
                        {/* Basic Property Details */}
                        <div className="grid grid-cols-2 gap-4">
                          {!isEditing ? (
                            <>
                              <div className="col-span-2">
                                <h3 className="font-medium">Τίτλος</h3>
                                <p>{property.title}</p>
                              </div>
                              <div>
                                <h3 className="font-medium">Τιμή</h3>
                                <p>{property.price.toLocaleString('el-GR')} €</p>
                              </div>
                              <div>
                                <h3 className="font-medium">Τύπος</h3>
                                <p>{property.propertyType}</p>
                              </div>
                              <div>
                                <h3 className="font-medium">Τοποθεσία</h3>
                                <p>{property.city}, {property.street} {property.number}</p>
                              </div>
                              <div>
                                <h3 className="font-medium">Εμβαδόν</h3>
                                <p>{property.area} τ.μ.</p>
                              </div>
                              <div>
                                <h3 className="font-medium">Αφαιρεση Ιδιοκτησιας</h3>
                                <p className={`px-2 py-1 rounded-full text-sm font-medium ${
                                  property.removalRequested 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {property.removalRequested ? '✓ Ζητήθηκε' : '✗ Δεν ζητήθηκε'}
                                </p>
                              </div>
                              <div className="col-span-2">
                                <h3 className="font-medium">Περιγραφή</h3>
                                <p>{property.fullDescription}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <input
                                type="text"
                                value={selectedProperty.title}
                                onChange={(e) => setSelectedProperty({ ...selectedProperty, title: e.target.value })}
                                className="border rounded p-2 col-span-2"
                                placeholder="Τίτλος"
                              />
                              <input
                                type="number"
                                value={selectedProperty.price}
                                onChange={(e) => setSelectedProperty({ ...selectedProperty, price: parseFloat(e.target.value) })}
                                className="border rounded p-2"
                                placeholder="Τιμή"
                              />
                              <input
                                type="text"
                                value={selectedProperty.propertyType}
                                onChange={(e) => setSelectedProperty({ ...selectedProperty, propertyType: e.target.value })}
                                className="border rounded p-2"
                                placeholder="Τύπος"
                              />
                              <input
                                type="text"
                                value={selectedProperty.city}
                                onChange={(e) => setSelectedProperty({ ...selectedProperty, city: e.target.value })}
                                className="border rounded p-2"
                                placeholder="Πόλη"
                              />
                              <input
                                type="number"
                                value={selectedProperty.area}
                                onChange={(e) => setSelectedProperty({ ...selectedProperty, area: parseFloat(e.target.value) })}
                                className="border rounded p-2"
                                placeholder="Εμβαδόν"
                              />
                              <textarea
                                value={selectedProperty.fullDescription}
                                onChange={(e) => setSelectedProperty({ ...selectedProperty, fullDescription: e.target.value })}
                                className="border rounded p-2 col-span-2"
                                placeholder="Περιγραφή"
                                rows={4}
                              />
                            </>
                          )}
                        </div>

                        {/* Features */}
                        <PropertyFeatures
                          isEditing={isEditing}
                          property={property}
                          editedData={selectedProperty}
                          setEditedData={setSelectedProperty}
                        />

                        {/* Special Features */}
                        <PropertySpecialFeatures
                          isEditing={isEditing}
                          property={property}
                          editedData={selectedProperty}
                          setEditedData={setSelectedProperty}
                        />

                        {/* Images */}
                        <div>
                          <h3 className="font-medium mb-2">Φωτογραφίες</h3>
                          <div className="grid grid-cols-4 gap-4">
                            {property.images?.map((image: string, index: number) => (
                              <div key={index} className="relative aspect-square">
                                <Image
                                  src={image}
                                  alt={`Property image ${index + 1}`}
                                  fill
                                  className="object-cover rounded"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="mt-4">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              id="image-upload"
                            />
                            <label
                              htmlFor="image-upload"
                              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <FiUpload className="mr-2" />
                              Προσθήκη φωτογραφιών
                            </label>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="border-t pt-4 flex justify-between items-center">
                          <div className="space-x-2">
                            {!isEditing ? (
                              <button
                                onClick={() => setIsEditing(true)}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <FiEdit2 className="mr-2" />
                                Επεξεργασία
                              </button>
                            ) : (
                              <button
                                onClick={handleEdit}
                                className="inline-flex items-center px-4 py-2 border border-blue-500 rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600"
                              >
                                <FiCheck className="mr-2" />
                                Αποθήκευση
                              </button>
                            )}
                            {hasChanges && !isEditing && (
                              <button
                                onClick={handleCompleteChanges}
                                disabled={isSubmitting}
                                className={`inline-flex items-center px-4 py-2 border border-indigo-500 rounded-md shadow-sm text-sm font-medium text-white ${
                                  isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'
                                }`}
                              >
                                {isSubmitting ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Ολοκλήρωση...
                                  </>
                                ) : (
                                  <>
                                    <FiCheck className="mr-2" />
                                    Ολοκλήρωση Αλλαγών
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <div className="space-x-2">
                            {property.status !== 'unavailable' ? (
                              <button
                                onClick={handleToggleOwnership}
                                disabled={isSubmitting}
                                className={`inline-flex items-center px-4 py-2 border border-red-500 rounded-md shadow-sm text-sm font-medium text-white ${
                                  isSubmitting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
                                }`}
                              >
                                <FiX className="mr-2" />
                                Αφαίρεση Ιδιοκτησίας
                              </button>
                            ) : (
                              <button
                                onClick={handleToggleOwnership}
                                disabled={isSubmitting}
                                className={`inline-flex items-center px-4 py-2 border border-green-500 rounded-md shadow-sm text-sm font-medium text-white ${
                                  isSubmitting ? 'bg-green-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
                                }`}
                              >
                                <FiCheck className="mr-2" />
                                Επαναφορά Ιδιοκτησίας
                              </button>
                            )}

                            <button
                              onClick={() => onSave({ ...property, status: 'approved' })}
                              className="inline-flex items-center px-4 py-2 border border-green-500 rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600"
                            >
                              <FiCheck className="mr-2" />
                              Έγκριση
                            </button>

                            <button
                              onClick={handleReject}
                              className="inline-flex items-center px-4 py-2 border border-red-500 rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600"
                            >
                              <FiX className="mr-2" />
                              Απόρριψη
                            </button>

                            <button
                              onClick={handleRequestInfo}
                              className="inline-flex items-center px-4 py-2 border border-yellow-500 rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600"
                            >
                              <FiAlertCircle className="mr-2" />
                              Ζήτηση πληροφοριών
                            </button>
                          </div>
                        </div>

                        {/* Rejection Reason Input */}
                        {property.status === 'rejected' && (
                          <div className="mt-4">
                            <textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="w-full border rounded p-2"
                              placeholder="Αιτιολογία απόρριψης"
                              rows={3}
                            />
                          </div>
                        )}

                        {/* Additional Info Request Input */}
                        {property.status === 'info_requested' && (
                          <div className="mt-4">
                            <textarea
                              value={additionalInfoRequest}
                              onChange={(e) => setAdditionalInfoRequest(e.target.value)}
                              className="w-full border rounded p-2"
                              placeholder="Ζητούμενες πληροφορίες"
                              rows={3}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {activeTab === 'legal' && (
                    <div className="space-y-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Μέθοδος Ανέβασματος</h3>
                        <div className="space-y-4">
                          {property.uploadMethod === 'self' ? (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Ο πωλητής ανέβασε τα έγγραφα</p>
                              {property.assignmentDocument && (
                                <div className="mt-4">
                                  <a
                                    href={property.assignmentDocument.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                  >
                                    <FiFile className="mr-2" />
                                    Προβολή Εγγράφου
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Δικηγόρος ανέβασε τα έγγραφα</p>
                              {property.lawyerInfo && (
                                <div className="mt-4 space-y-2">
                                  <p><span className="font-medium">Όνομα:</span> {property.lawyerInfo.name}</p>
                                  <p><span className="font-medium">Email:</span> {property.lawyerInfo.email}</p>
                                  <p><span className="font-medium">Τηλέφωνο:</span> {property.lawyerInfo.phone}</p>
                                  {property.lawyerInfo.taxId && (
                                    <p><span className="font-medium">ΑΦΜ:</span> {property.lawyerInfo.taxId}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end space-x-4">
                        <button
                          onClick={() => onStatusChange('info_requested', 'Παρακαλώ ελέγξτε τα νομικά έγγραφα')}
                          className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          Αφαίρεση
                        </button>
                        <button
                          onClick={() => onCompleteChanges(property.id, { legalDocuments: { status: 'completed' } })}
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                        >
                          Επιβεβαίωση Εγγράφων
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'progress' && (
                    <div className="space-y-6">
                      {/* Legal Documents Stage */}
                      <div className="bg-white rounded-lg shadow p-4 mb-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Νομικά Έγγραφα</h3>
                          {selectedProperty.progress?.legalDocumentsStatus === 'completed' ? (
                            <div className="flex items-center space-x-2">
                              <span className="flex items-center text-green-600">
                                <FiCheck className="mr-2" />
                                Το στάδιο ολοκληρώθηκε
                              </span>
                              <button
                                onClick={() => setIsEditingStage('legalDocuments')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : selectedProperty.progress?.legalDocumentsStatus === 'pending' ? (
                            <div className="flex items-center space-x-2">
                              <span className="flex items-center text-yellow-600">
                                <FiClock className="mr-2" />
                                Το στάδιο βρίσκεται σε αναμονή
                              </span>
                              <button
                                onClick={() => setIsEditingStage('legalDocuments')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleProgressUpdate('legalDocuments', 'pending')}
                                className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                              >
                                Αναμονή
                              </button>
                              <button
                                onClick={() => handleProgressUpdate('legalDocuments', 'completed')}
                                className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                              >
                                Ολοκλήρωση
                              </button>
                            </div>
                          )}
                        </div>
                        {isEditingStage === 'legalDocuments' && (
                          <div className="mt-2 flex space-x-2">
                            <button
                              onClick={() => {
                                handleProgressUpdate('legalDocuments', 'pending');
                                setIsEditingStage(null);
                              }}
                              className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                            >
                              Αναμονή
                            </button>
                            <button
                              onClick={() => {
                                handleProgressUpdate('legalDocuments', 'completed');
                                setIsEditingStage(null);
                              }}
                              className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                            >
                              Ολοκλήρωση
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Platform Review Stage */}
                      <div className="bg-white rounded-lg shadow p-4 mb-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Έλεγχος Πλατφόρμας</h3>
                          {selectedProperty.progress?.platformReviewStatus === 'completed' ? (
                            <div className="flex items-center space-x-2">
                              <span className="flex items-center text-green-600">
                                <FiCheck className="mr-2" />
                                Το στάδιο ολοκληρώθηκε
                              </span>
                              <button
                                onClick={() => setIsEditingStage('platformReview')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : selectedProperty.progress?.platformReviewStatus === 'pending' ? (
                            <div className="flex items-center space-x-2">
                              <span className="flex items-center text-yellow-600">
                                <FiClock className="mr-2" />
                                Το στάδιο βρίσκεται σε αναμονή
                              </span>
                              <button
                                onClick={() => setIsEditingStage('platformReview')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleProgressUpdate('platformReview', 'pending')}
                                className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                              >
                                Αναμονή
                              </button>
                              <button
                                onClick={() => handleProgressUpdate('platformReview', 'completed')}
                                className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                              >
                                Ολοκλήρωση
                              </button>
                            </div>
                          )}
                        </div>
                        {isEditingStage === 'platformReview' && (
                          <div className="mt-2 flex space-x-2">
                            <button
                              onClick={() => {
                                handleProgressUpdate('platformReview', 'pending');
                                setIsEditingStage(null);
                              }}
                              className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                            >
                              Αναμονή
                            </button>
                            <button
                              onClick={() => {
                                handleProgressUpdate('platformReview', 'completed');
                                setIsEditingStage(null);
                              }}
                              className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                            >
                              Ολοκλήρωση
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Platform Assignment Stage */}
                      <div className="bg-white rounded-lg shadow p-4 mb-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Ανάθεση Πλατφόρμας</h3>
                          {selectedProperty.progress?.platformAssignmentStatus === 'completed' ? (
                            <div className="flex items-center space-x-2">
                              <span className="flex items-center text-green-600">
                                <FiCheck className="mr-2" />
                                Το στάδιο ολοκληρώθηκε
                              </span>
                              <button
                                onClick={() => setIsEditingStage('platformAssignment')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : selectedProperty.progress?.platformAssignmentStatus === 'pending' ? (
                            <div className="flex items-center space-x-2">
                              <span className="flex items-center text-yellow-600">
                                <FiClock className="mr-2" />
                                Το στάδιο βρίσκεται σε αναμονή
                              </span>
                              <button
                                onClick={() => setIsEditingStage('platformAssignment')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleProgressUpdate('platformAssignment', 'pending')}
                                className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                              >
                                Αναμονή
                              </button>
                              <button
                                onClick={() => handleProgressUpdate('platformAssignment', 'completed')}
                                className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                              >
                                Ολοκλήρωση
                              </button>
                            </div>
                          )}
                        </div>
                        {isEditingStage === 'platformAssignment' && (
                          <div className="mt-2 flex space-x-2">
                            <button
                              onClick={() => {
                                handleProgressUpdate('platformAssignment', 'pending');
                                setIsEditingStage(null);
                              }}
                              className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                            >
                              Αναμονή
                            </button>
                            <button
                              onClick={() => {
                                handleProgressUpdate('platformAssignment', 'completed');
                                setIsEditingStage(null);
                              }}
                              className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                            >
                              Ολοκλήρωση
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Listing Stage */}
                      <div className="bg-white rounded-lg shadow p-4 mb-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Δημοσίευση</h3>
                          {selectedProperty.progress?.listingStatus === 'completed' ? (
                            <div className="flex items-center space-x-2">
                              <span className="flex items-center text-green-600">
                                <FiCheck className="mr-2" />
                                Το στάδιο ολοκληρώθηκε
                              </span>
                              <button
                                onClick={() => setIsEditingStage('listing')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : selectedProperty.progress?.listingStatus === 'pending' ? (
                            <div className="flex items-center space-x-2">
                              <span className="flex items-center text-yellow-600">
                                <FiClock className="mr-2" />
                                Το στάδιο βρίσκεται σε αναμονή
                              </span>
                              <button
                                onClick={() => setIsEditingStage('listing')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleProgressUpdate('listing', 'pending')}
                                className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                              >
                                Αναμονή
                              </button>
                              <button
                                onClick={() => handleProgressUpdate('listing', 'completed')}
                                className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                              >
                                Ολοκλήρωση
                              </button>
                            </div>
                          )}
                        </div>
                        {isEditingStage === 'listing' && (
                          <div className="mt-2 flex space-x-2">
                            <button
                              onClick={() => {
                                handleProgressUpdate('listing', 'pending');
                                setIsEditingStage(null);
                              }}
                              className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                            >
                              Αναμονή
                            </button>
                            <button
                              onClick={() => {
                                handleProgressUpdate('listing', 'completed');
                                setIsEditingStage(null);
                              }}
                              className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                            >
                              Ολοκλήρωση
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'documents' && (
                    <div className="space-y-4">
                      {documentsLoading ? (
                        <div className="text-gray-500">Φόρτωση εγγράφων...</div>
                      ) : documents.length === 0 ? (
                        <div className="text-gray-500">Δεν έχουν καταχωρηθεί έγγραφα για αυτό το ακίνητο.</div>
                      ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Τύπος</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Κατάσταση</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ημερομηνία</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ενέργειες</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {documents.map((doc) => (
                              <tr key={doc.id}>
                                <td className="px-4 py-2 whitespace-nowrap">{doc.type}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{doc.status}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{new Date(doc.uploadedAt).toLocaleDateString('el-GR')}</td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                                    <FaDownload className="mr-1" /> Λήψη
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {activeTab === 'lawyer' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Στοιχεία Δικηγόρου</h3>
                      {lawyerLoading ? (
                        <div className="text-gray-500">Φόρτωση...</div>
                      ) : lawyerInfo && (lawyerInfo.lawyerName || lawyerInfo.lawyerEmail || lawyerInfo.lawyerPhone) ? (
                        <div className="space-y-2">
                          <div><span className="font-medium">Όνομα:</span> {lawyerInfo.lawyerName || '-'}</div>
                          <div><span className="font-medium">Email:</span> {lawyerInfo.lawyerEmail || '-'}</div>
                          <div><span className="font-medium">Τηλέφωνο:</span> {lawyerInfo.lawyerPhone || '-'}</div>
                          <div><span className="font-medium">ΑΦΜ:</span> {lawyerInfo.lawyerTaxId || '-'}</div>
                        </div>
                      ) : (
                        <div className="text-gray-500">Δεν έχουν καταχωρηθεί στοιχεία δικηγόρου για αυτό το ακίνητο.</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex justify-between mt-4">
                  <div className="flex space-x-2">
                    {property.removalRequested ? (
                      <Button
                        variant="outline"
                        onClick={handleToggleRemovalRequest}
                        disabled={isSubmitting}
                        className="bg-green-100 text-green-800 hover:bg-green-200"
                      >
                        {isSubmitting ? 'Επεξεργασία...' : 'Ακύρωση Αίτησης Αφαίρεσης'}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={handleToggleRemovalRequest}
                        disabled={isSubmitting}
                        className="bg-red-100 text-red-800 hover:bg-red-200"
                      >
                        {isSubmitting ? 'Επεξεργασία...' : 'Έγκριση Αίτησης Αφαίρεσης'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleDirectRemove}
                      disabled={isSubmitting || property.status === 'unavailable'}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      {isSubmitting ? 'Επεξεργασία...' : 'Άμεση Αφαίρεση'}
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={onClose}
                    >
                      Ακύρωση
                    </Button>
                    {hasChanges && (
                      <Button
                        onClick={handleCompleteChanges}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Ολοκλήρωση...' : 'Ολοκλήρωση Αλλαγών'}
                      </Button>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 