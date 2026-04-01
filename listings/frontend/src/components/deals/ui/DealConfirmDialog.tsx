'use client';

import { FaTimes, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';

export interface DealConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Κουμπί επιβεβαίωσης: επικίνδυνη ενέργεια (κόκκινο) ή ουδέτερη (emerald όπως το deal room) */
  confirmVariant?: 'danger' | 'primary';
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /**
   * Tailwind z-* στο overlay. Προεπιλογή πάνω από deal modals (π.χ. ActionsTab signing z-[9999]).
   */
  overlayZClass?: string;
}

/**
 * Επιβεβαίωση ίδιου τύπου με το modal «Κανονίστε υπογραφή»: backdrop blur, λευκή κάρτα, header emerald–teal.
 */
export default function DealConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Επιβεβαίωση',
  cancelLabel = 'Άκυρο',
  confirmVariant = 'danger',
  isLoading = false,
  onCancel,
  onConfirm,
  overlayZClass = 'z-[10050]',
}: DealConfirmDialogProps) {
  const confirmClasses =
    confirmVariant === 'danger'
      ? 'flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-lg font-semibold hover:from-rose-700 hover:to-red-700 disabled:opacity-60 shadow-md'
      : 'flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 shadow-md';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 ${overlayZClass}`}
          onClick={() => !isLoading && onCancel()}
          role="presentation"
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-gray-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deal-confirm-title"
            aria-describedby="deal-confirm-desc"
          >
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <FaExclamationTriangle className="text-lg" aria-hidden />
                </div>
                <h3 id="deal-confirm-title" className="text-lg font-bold leading-tight truncate">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="p-2 rounded-lg hover:bg-white/20 disabled:opacity-50 flex-shrink-0"
                aria-label={cancelLabel}
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="p-6">
              <p id="deal-confirm-desc" className="text-gray-700 text-sm leading-relaxed">
                {message}
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-60"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`${confirmClasses} flex items-center justify-center gap-2`}
                >
                  {isLoading ? <FaSpinner className="animate-spin" /> : null}
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
