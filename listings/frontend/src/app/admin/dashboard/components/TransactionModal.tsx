'use client';

import { Fragment, useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import Image from 'next/image';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaHome, FaCalendar, FaMoneyBill, FaFileContract, FaCheckCircle, FaTimesCircle, FaClock, FaEye, FaHandshake, FaFileAlt, FaFileSignature, FaCreditCard, FaExchangeAlt } from 'react-icons/fa';
import React from 'react';
import type { IconType } from 'react-icons';
import { toast } from 'react-hot-toast';
import { generateId } from '@/lib/utils/id';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface Update {
  id: string;
  text: string;
  date: string;
  message: string;
  recipient?: 'buyer' | 'seller' | 'agent';
  category: 'appointment' | 'payment' | 'contract' | 'completion' | 'general' | 'offer';
  isUnread: boolean;
  stage: string;
  createdAt?: string;
}

interface Transaction {
  id: string;
  buyer: {
    name: string;
    email: string;
    phone?: string;
  };
  seller: {
    name: string;
    email: string;
    phone?: string;
  };
  agent?: {
    name: string;
    email: string;
    phone?: string;
  };
  property: {
    id: string;
    title: string;
    status: string;
    images: string[];
    location: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    area: number;
    features: string[];
  };
  stage?: string;
  status: string;
  progress: {
    stage: string;
    updatedAt: string;
    notifications: Update[];
  };
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  onUpdateStage: (stage: string) => Promise<void>;
  onSendNotification: (recipient: 'buyer' | 'seller' | 'agent', message: string, messageStage: string) => Promise<void>;
}

type StageType = 'PENDING' | 'MEETING_SCHEDULED' | 'DEPOSIT_PAID' | 'FINAL_SIGNING' | 'COMPLETED' | 'CANCELLED';
type CategoryType = 'APPOINTMENT' | 'PAYMENT' | 'CONTRACT' | 'COMPLETION' | 'GENERAL' | 'OFFER';

const stages = [
  { id: 'PENDING', label: 'Αναμονή', icon: FaClock, description: 'Η συναλλαγή βρίσκεται σε αρχικό στάδιο.' },
  { id: 'MEETING_SCHEDULED', label: 'Έγινε ραντεβού', icon: FaCalendar, description: 'Το ραντεβού έχει προγραμματιστεί και ολοκληρωθεί.' },
  { id: 'DEPOSIT_PAID', label: 'Έγινε προκαταβολή', icon: FaMoneyBill, description: 'Η προκαταβολή έχει καταβληθεί από τον αγοραστή.' },
  { id: 'FINAL_SIGNING', label: 'Τελική Υπογραφή', icon: FaFileContract, description: 'Διαδικασία τελικής υπογραφής συμβολαίων.' },
  { id: 'COMPLETED', label: 'Ολοκληρώθηκε', icon: FaCheckCircle, description: 'Η συναλλαγή έχει ολοκληρωθεί επιτυχώς.' },
  { id: 'CANCELLED', label: 'Ακυρώθηκε', icon: FaTimesCircle, description: 'Η συναλλαγή έχει ακυρωθεί.' }
] as const;

type RecipientType = 'buyer' | 'seller' | 'agent';

const categoryColors = {
  APPOINTMENT: 'bg-purple-100 text-purple-800',
  PAYMENT: 'bg-green-100 text-green-800',
  CONTRACT: 'bg-indigo-100 text-indigo-800',
  COMPLETION: 'bg-teal-100 text-teal-800',
  GENERAL: 'bg-gray-100 text-gray-800',
  OFFER: 'bg-orange-100 text-orange-800'
} as const;

const categoryLabels = {
  APPOINTMENT: 'Ραντεβού',
  PAYMENT: 'Πληρωμή',
  CONTRACT: 'Συμβόλαιο',
  COMPLETION: 'Ολοκλήρωση',
  GENERAL: 'Γενικά',
  OFFER: 'Προσφορά'
} as const;

const messageTemplates: Record<StageType, Record<CategoryType, string[]>> = {
  PENDING: {
    APPOINTMENT: [
      "Ευχαριστούμε για το ενδιαφέρον σας. Θα επικοινωνήσουμε σύντομα για το ραντεβού.",
      "Παρακαλώ ενημερώστε μας για τη διαθεσιμότητά σας για το ραντεβού."
    ],
    PAYMENT: [],
    CONTRACT: [],
    COMPLETION: [],
    GENERAL: [
      "Καλώς ήρθατε στο σύστημά μας. Θα σας ενημερώσουμε για την πρόοδο της συναλλαγής."
    ],
    OFFER: []
  },
  MEETING_SCHEDULED: {
    APPOINTMENT: [
      "Το ραντεβού έχει προγραμματιστεί επιτυχώς.",
      "Παρακαλώ επιβεβαιώστε την παρουσία σας στο ραντεβού."
    ],
    PAYMENT: [],
    CONTRACT: [],
    COMPLETION: [],
    GENERAL: [
      "Το ραντεβού έχει προγραμματιστεί. Θα σας ενημερώσουμε για τυχόν αλλαγές."
    ],
    OFFER: []
  },
  DEPOSIT_PAID: {
    APPOINTMENT: [],
    PAYMENT: [
      "Η προκαταβολή έχει καταβληθεί επιτυχώς.",
      "Ευχαριστούμε για την πληρωμή."
    ],
    CONTRACT: [],
    COMPLETION: [],
    GENERAL: [
      "Η προκαταβολή έχει καταβληθεί. Η συναλλαγή προχωράει κανονικά."
    ],
    OFFER: []
  },
  FINAL_SIGNING: {
    APPOINTMENT: [],
    PAYMENT: [],
    CONTRACT: [
      "Το τελικό συμβόλαιο είναι έτοιμο για υπογραφή.",
      "Παρακαλώ επικοινωνήστε μαζί μας για να προγραμματίσουμε τη συνάντηση υπογραφής."
    ],
    COMPLETION: [],
    GENERAL: [
      "Το τελικό συμβόλαιο είναι έτοιμο για υπογραφή. Θα σας ενημερώσουμε για τα επόμενα βήματα."
    ],
    OFFER: []
  },
  COMPLETED: {
    APPOINTMENT: [],
    PAYMENT: [],
    CONTRACT: [],
    COMPLETION: [
      "Η συναλλαγή έχει ολοκληρωθεί επιτυχώς.",
      "Ευχαριστούμε που μας εμπιστευτήκατε."
    ],
    GENERAL: [
      "Η συναλλαγή έχει ολοκληρωθεί επιτυχώς. Ευχαριστούμε για τη συνεργασία."
    ],
    OFFER: []
  },
  CANCELLED: {
    APPOINTMENT: [],
    PAYMENT: [],
    CONTRACT: [],
    COMPLETION: [
      "Η συναλλαγή έχει ακυρωθεί.",
      "Ευχαριστούμε για το ενδιαφέρον σας."
    ],
    GENERAL: [
      "Η συναλλαγή έχει ακυρωθεί. Ευχαριστούμε για το ενδιαφέρον σας."
    ],
    OFFER: []
  }
};

const defaultMessages: Record<StageType, Record<CategoryType, string[]>> = {
  PENDING: {
    APPOINTMENT: [],
    PAYMENT: [],
    CONTRACT: [],
    COMPLETION: [],
    GENERAL: [],
    OFFER: []
  },
  MEETING_SCHEDULED: {
    APPOINTMENT: [],
    PAYMENT: [],
    CONTRACT: [],
    COMPLETION: [],
    GENERAL: [],
    OFFER: []
  },
  DEPOSIT_PAID: {
    APPOINTMENT: [],
    PAYMENT: [],
    CONTRACT: [],
    COMPLETION: [],
    GENERAL: [],
    OFFER: []
  },
  FINAL_SIGNING: {
    APPOINTMENT: [],
    PAYMENT: [],
    CONTRACT: [],
    COMPLETION: [],
    GENERAL: [],
    OFFER: []
  },
  COMPLETED: {
    APPOINTMENT: [],
    PAYMENT: [],
    CONTRACT: [],
    COMPLETION: [],
    GENERAL: [],
    OFFER: []
  },
  CANCELLED: {
    APPOINTMENT: [],
    PAYMENT: [],
    CONTRACT: [],
    COMPLETION: [],
    GENERAL: [],
    OFFER: []
  }
};

export default function TransactionModal({ isOpen, onClose, transaction, onUpdateStage, onSendNotification }: TransactionModalProps) {
  const [selectedStage, setSelectedStage] = useState<StageType>(transaction.stage as StageType);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientType>('buyer');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('GENERAL');
  const [selectedMessage, setSelectedMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transactionData, setTransactionData] = useState<Transaction | null>(null);

  // Βοηθητική συνάρτηση για να προσδιορίσω αν πρέπει να εφαρμοστεί blur στα στοιχεία του ενδιαφερομένου
  const shouldBlurLeadInfo = (stage: string) => {
    const stageOrder = {
      'PENDING': 0,
      'MEETING_SCHEDULED': 1,
      'DEPOSIT_PAID': 2,
      'FINAL_SIGNING': 3,
      'COMPLETED': 4,
      'CANCELLED': 5
    };
    const currentStageOrder = stageOrder[stage as keyof typeof stageOrder] || 0;
    // Blur αν το στάδιο είναι μικρότερο από "έγινε προκαταβολή" (stageOrder < 2)
    // Δηλαδή blur για: pending, meeting_scheduled
    // Κανονική εμφάνιση για: deposit_paid, final_signing, completed
    return currentStageOrder < 2;
  };

  // Fetch latest transaction data
  useEffect(() => {
    const fetchTransactionData = async () => {
      if (!transaction.id) return;

      try {
        const response = await fetch(`/api/admin/transactions/${transaction.id}`);
        if (!response.ok) throw new Error('Failed to fetch transaction data');
        
        const data = await response.json();
        setTransactionData(data);
        setSelectedStage(data.stage as StageType);
      } catch (error) {
        console.error('Error fetching transaction data:', error);
      }
    };

    fetchTransactionData();
    const interval = setInterval(fetchTransactionData, 5000);
    return () => clearInterval(interval);
  }, [transaction.id]);

  // Use transactionData if available, otherwise use props
  const effectiveTransaction = transactionData || transaction;

  const handleStageSelect = (stage: StageType) => {
    setSelectedStage(stage);
  };

  const handleSaveStage = async () => {
    if (!selectedStage) return;
    
    try {
      setIsLoading(true);
      await onUpdateStage(selectedStage);
      toast.success('Το στάδιο ενημερώθηκε επιτυχώς');
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Σφάλμα κατά την ενημέρωση του σταδίου');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!selectedMessage.trim()) return;
    
    try {
      setIsLoading(true);
      await onSendNotification(selectedRecipient, selectedMessage, selectedStage);
      toast.success('Η ειδοποίηση στάλθηκε επιτυχώς');
      setSelectedMessage('');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Σφάλμα κατά την αποστολή της ειδοποίησης');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMessage(e.target.value);
  };

  const handleCustomMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSelectedMessage(e.target.value);
  };

  const getMessageOptions = () => {
    if (!selectedCategory || !selectedStage) return [];
    return messageTemplates[selectedStage]?.[selectedCategory] || [];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Λεπτομέρειες Συναλλαγής
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Property Details */}
              {effectiveTransaction.property ? (
                <>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Στοιχεία Ακινήτου</h4>
                    <div className="space-y-2">
                      <p><strong>Τίτλος:</strong> {effectiveTransaction.property.title}</p>
                      <p><strong>Τοποθεσία:</strong> {effectiveTransaction.property.location}</p>
                      <p><strong>Τιμή:</strong> €{effectiveTransaction.property.price ? effectiveTransaction.property.price.toLocaleString() : '0'}</p>
                      <p><strong>Δωμάτια:</strong> {effectiveTransaction.property.bedrooms}</p>
                      <p><strong>Μπάνια:</strong> {effectiveTransaction.property.bathrooms}</p>
                      <p><strong>Επιφάνεια:</strong> {effectiveTransaction.property.area}m²</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Στοιχεία Ακινήτου</h4>
                  <div className="space-y-2">
                    <p>Δεν υπάρχουν πληροφορίες για το ακίνητο</p>
                  </div>
                </div>
              )}

              {/* Buyer Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Στοιχεία Αγοραστή</h4>
                
                {/* Επεξήγηση για το blur effect */}
                {effectiveTransaction.stage && shouldBlurLeadInfo(effectiveTransaction.stage) && (
                  <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-3 border-blue-400 rounded">
                    <div className="flex items-start space-x-2">
                      <svg className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-blue-700">
                        <span className="font-medium">🔒 Προστασία:</span> Τα στοιχεία εμφανίζονται ως <span className="font-medium">••••••••</span> 
                        μέχρι το στάδιο <span className="font-semibold">"Έγινε Προκαταβολή"</span>.
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <p>
                    <strong>Όνομα:</strong> 
                    <span className={`ml-2 ${effectiveTransaction.stage && shouldBlurLeadInfo(effectiveTransaction.stage) ? 'blur-sm select-none' : ''}`}>
                      {effectiveTransaction.stage && shouldBlurLeadInfo(effectiveTransaction.stage) ? '••••••••' : effectiveTransaction.buyer.name}
                    </span>
                  </p>
                  <p>
                    <strong>Email:</strong> 
                    <span className={`ml-2 ${effectiveTransaction.stage && shouldBlurLeadInfo(effectiveTransaction.stage) ? 'blur-sm select-none' : ''}`}>
                      {effectiveTransaction.stage && shouldBlurLeadInfo(effectiveTransaction.stage) ? '••••••••••••••••••••••••••••••••' : effectiveTransaction.buyer.email}
                    </span>
                  </p>
                  {effectiveTransaction.buyer.phone && (
                    <p>
                      <strong>Τηλέφωνο:</strong> 
                      <span className={`ml-2 ${effectiveTransaction.stage && shouldBlurLeadInfo(effectiveTransaction.stage) ? 'blur-sm select-none' : ''}`}>
                        {effectiveTransaction.stage && shouldBlurLeadInfo(effectiveTransaction.stage) ? '••••••••••••••••••••••••••••••••' : effectiveTransaction.buyer.phone}
                      </span>
                    </p>
                  )}
                  {effectiveTransaction.stage && shouldBlurLeadInfo(effectiveTransaction.stage) && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800">
                        🔒 Τα στοιχεία είναι κρυφά μέχρι να προχωρήσει η συναλλαγή
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Seller Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Στοιχεία Πωλητή</h4>
                <div className="space-y-2">
                  <p><strong>Όνομα:</strong> {effectiveTransaction.seller.name}</p>
                  <p><strong>Email:</strong> {effectiveTransaction.seller.email}</p>
                  {effectiveTransaction.seller.phone && (
                    <p><strong>Τηλέφωνο:</strong> {effectiveTransaction.seller.phone}</p>
                  )}
                </div>
              </div>

              {/* Agent Details */}
              {effectiveTransaction.agent && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Στοιχεία Μεσιτευόμενου</h4>
                  <div className="space-y-2">
                    <p><strong>Όνομα:</strong> {effectiveTransaction.agent.name}</p>
                    <p><strong>Email:</strong> {effectiveTransaction.agent.email}</p>
                    {effectiveTransaction.agent.phone && (
                      <p><strong>Τηλέφωνο:</strong> {effectiveTransaction.agent.phone}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Transaction Progress */}
            <div className="mt-6">
              <h4 className="font-medium mb-4">Πρόοδος Συναλλαγής</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stages.map((stage) => (
                  <div
                    key={stage.id}
                    className={classNames(
                      'p-4 rounded-lg cursor-pointer transition-colors',
                      selectedStage === stage.id
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                    )}
                    onClick={() => handleStageSelect(stage.id as StageType)}
                  >
                    <div className="flex items-center space-x-2">
                      <stage.icon className="text-gray-500" />
                      <span className="font-medium">{stage.label}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{stage.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="mt-6">
              <h4 className="font-medium mb-4">Ειδοποιήσεις</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    value={selectedRecipient}
                    onChange={(e) => setSelectedRecipient(e.target.value as RecipientType)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="buyer">Αγοραστής</option>
                    <option value="seller">Πωλητής</option>
                    <option value="agent">Μεσιτευόμενος</option>
                  </select>

                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as CategoryType)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedMessage}
                    onChange={handleMessageChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Επιλέξτε μήνυμα</option>
                    {getMessageOptions().map((message, index) => (
                      <option key={index} value={message}>
                        {message}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSendNotification}
                  disabled={isLoading || !selectedMessage.trim()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isLoading ? 'Αποστολή...' : 'Αποστολή Ειδοποίησης'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSaveStage}
              disabled={isLoading || selectedStage === effectiveTransaction.stage}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {isLoading ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Κλείσιμο
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
