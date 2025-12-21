import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AdminTransactionProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  buyerName: string;
  propertyTitle: string;
}

const PROGRESS_STAGES = [
  { id: 'INQUIRY', label: 'Αρχική Επικοινωνία' },
  { id: 'APPOINTMENT_SCHEDULED', label: 'Προγραμματισμένο Ραντεβού' },
  { id: 'APPOINTMENT_COMPLETED', label: 'Ολοκληρωμένο Ραντεβού' },
  { id: 'DOCUMENT_CHECK', label: 'Έλεγχος Εγγράφων' },
  { id: 'DEPOSIT', label: 'Προκαταβολή' },
  { id: 'CONTRACT_SIGNING', label: 'Υπογραφή Συμβολαίου' },
  { id: 'COMPLETED', label: 'Ολοκληρωμένη Συναλλαγή' }
];

export default function AdminTransactionProgressModal({
  isOpen,
  onClose,
  transactionId,
  buyerName,
  propertyTitle
}: AdminTransactionProgressModalProps) {
  const [currentStage, setCurrentStage] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCurrentProgress = async () => {
      try {
        const response = await fetch(`/api/admin/transactions/${transactionId}/progress`);
        if (!response.ok) {
          throw new Error('Failed to fetch progress');
        }
        const data = await response.json();
        setCurrentStage(data.currentStage);
        setComment(data.comment || '');
      } catch (error) {
        console.error('Error fetching progress:', error);
        setError('Σφάλμα κατά τη φόρτωση της προόδου');
      }
    };

    if (isOpen && transactionId) {
      fetchCurrentProgress();
    }
  }, [isOpen, transactionId]);

  const handleUpdateProgress = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/transactions/${transactionId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: currentStage,
          comment
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      onClose();
    } catch (error) {
      console.error('Error updating progress:', error);
      setError('Σφάλμα κατά την ενημέρωση της προόδου');
    } finally {
      setLoading(false);
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
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Κλείσιμο</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Ενημέρωση Προόδου Συναλλαγής
                    </Dialog.Title>
                    
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Αγοραστής: <span className="font-medium">{buyerName}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Ακίνητο: <span className="font-medium">{propertyTitle}</span>
                      </p>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Στάδιο Συναλλαγής
                      </label>
                      <select
                        value={currentStage}
                        onChange={(e) => setCurrentStage(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="">Επιλέξτε στάδιο</option>
                        {PROGRESS_STAGES.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Σχόλια
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Προσθέστε σχόλια σχετικά με την πρόοδο..."
                      />
                    </div>

                    {error && (
                      <div className="mt-4 text-sm text-red-600">
                        {error}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
                    onClick={handleUpdateProgress}
                    disabled={loading || !currentStage}
                  >
                    {loading ? 'Ενημέρωση...' : 'Ενημέρωση Προόδου'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={onClose}
                  >
                    Ακύρωση
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 