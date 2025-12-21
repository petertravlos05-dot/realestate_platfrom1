import React, { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { transactionApi, TransactionProgress } from '@/lib/api/transactions';
import { FaQuestionCircle, FaCalendarAlt, FaFileAlt, FaMoneyBillWave, FaFileContract, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface TransactionProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  buyerName: string;
  propertyTitle: string;
}

interface Step {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'completed' | 'in_progress' | 'cancelled' | 'pending';
  comment?: string;
}

const steps: Step[] = [
  { id: 'INQUIRY', label: 'Αίτημα Πληροφοριών', icon: <FaQuestionCircle />, status: 'pending' },
  { id: 'APPOINTMENT_SCHEDULED', label: 'Ραντεβού', icon: <FaCalendarAlt />, status: 'pending' },
  { id: 'APPOINTMENT_COMPLETED', label: 'Ολοκληρωμένο Ραντεβού', icon: <FaCalendarAlt />, status: 'pending' },
  { id: 'DOCUMENT_CHECK', label: 'Έλεγχος Εγγράφων', icon: <FaFileAlt />, status: 'pending' },
  { id: 'PRE_DEPOSIT', label: 'Προκαταβολή', icon: <FaMoneyBillWave />, status: 'pending' },
  { id: 'CONTRACT_SIGNING', label: 'Υπογραφή Συμβολαίου', icon: <FaFileContract />, status: 'pending' },
  { id: 'COMPLETED', label: 'Ολοκληρωμένη Συναλλαγή', icon: <FaCheckCircle />, status: 'pending' }
];

export default function TransactionProgressModal({
  isOpen,
  onClose,
  transactionId,
  buyerName,
  propertyTitle
}: TransactionProgressModalProps) {
  const [progress, setProgress] = useState<TransactionProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [comment, setComment] = useState('');
  const [stepsState, setStepsState] = useState<Step[]>(steps);

  useEffect(() => {
    if (isOpen) {
      fetchProgress();
    }
  }, [isOpen, transactionId]);

  const fetchProgress = async () => {
    try {
      const data = await transactionApi.getProgress(transactionId);
      setProgress(data);
      
      // Update steps status based on progress data
      const updatedSteps = steps.map(step => {
        const stepProgress = data.find(p => p.status === step.id);
        if (stepProgress) {
          return {
            ...step,
            status: 'completed' as const,
            comment: stepProgress.comment || undefined
          };
        }
        return step;
      });
      
      // Find the first pending step and mark it as in_progress
      const firstPendingIndex = updatedSteps.findIndex(step => step.status === 'pending');
      if (firstPendingIndex !== -1) {
        updatedSteps[firstPendingIndex].status = 'in_progress';
      }
      
      setStepsState(updatedSteps);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStepColor = (status: Step['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-orange-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const handleStepClick = (step: Step) => {
    setSelectedStep(step);
    setComment(step.comment || '');
  };

  const handleCommentSubmit = () => {
    if (selectedStep) {
      // Here we would typically send the comment to the backend
      console.log('Submitting comment:', comment, 'for step:', selectedStep.id);
      setSelectedStep(null);
      setComment('');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center">
        <div className="fixed inset-0 bg-black/30" />

        <div className="relative mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-lg">
          <Dialog.Title className="text-xl font-semibold mb-4">
            Πρόοδος Συναλλαγής
          </Dialog.Title>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Αγοραστής:</span> {buyerName}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Ακίνητο:</span> {propertyTitle}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-8 left-0 w-full h-0.5 bg-gray-200">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ 
                    width: `${(stepsState.filter(s => s.status === 'completed').length / stepsState.length) * 100}%` 
                  }}
                />
              </div>

              {/* Steps */}
              <div className="relative flex justify-between mb-12">
                {stepsState.map((step, index) => (
                  <div 
                    key={step.id}
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => handleStepClick(step)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepColor(step.status)} text-white mb-2 transition-all duration-200 group-hover:scale-110`}>
                      {step.icon}
                    </div>
                    <span className="text-xs text-gray-600 text-center group-hover:text-blue-600 transition-colors duration-200">
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Comments Section */}
              {selectedStep && (
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Σχόλια για το βήμα: {selectedStep.label}
                  </h4>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-2 border rounded-md mb-2"
                    rows={3}
                    placeholder="Προσθέστε σχόλια για αυτό το βήμα..."
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleCommentSubmit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                    >
                      Υποβολή Σχολίου
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={onClose}
            >
              Κλείσιμο
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
} 