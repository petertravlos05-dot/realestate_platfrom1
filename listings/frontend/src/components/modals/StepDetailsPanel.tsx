import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

interface StepDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  step: {
    title: string;
    icon: JSX.Element;
    description: string;
    details: {
      subtitle: string;
      content: string[];
      tips?: string[];
    };
  } | null;
}

export default function StepDetailsPanel({ isOpen, onClose, step }: StepDetailsPanelProps) {
  if (!step) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-blue-600">
                  {step.icon}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{step.title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FaTimes className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-8">
              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {step.details.subtitle}
                </h3>
                
                {step.details.content.map((paragraph, index) => (
                  <p key={index} className="text-gray-600 mb-4">
                    {paragraph}
                  </p>
                ))}

                {step.details.tips && (
                  <div className="mt-8">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Χρήσιμες Συμβουλές
                    </h4>
                    <ul className="list-disc pl-5 space-y-2">
                      {step.details.tips.map((tip, index) => (
                        <li key={index} className="text-gray-600">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 