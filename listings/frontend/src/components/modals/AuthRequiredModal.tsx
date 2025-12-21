'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaLock, FaTimes, FaHome, FaSearch } from 'react-icons/fa';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyTitle?: string;
}

export default function AuthRequiredModal({ isOpen, onClose, propertyTitle }: AuthRequiredModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      />
      
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
      >
        <div className="bg-gradient-to-br from-white to-blue-50/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/50
                      relative overflow-hidden w-full max-w-[500px]"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 transition-colors
                     hover:rotate-90 transform duration-300"
          >
            <FaTimes className="w-6 h-6" />
          </button>

          {/* Content */}
          <div className="text-center">
            {/* Icon */}
            <div className="mb-6">
              <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg">
                <FaLock className="w-10 h-10 text-white" />
              </span>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Σύνδεση Απαιτείται
            </h2>

            {/* Message */}
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              {propertyTitle ? (
                <>
                  Για να δείτε τις λεπτομέρειες του ακινήτου <span className="font-semibold text-blue-600">"{propertyTitle}"</span>, 
                  παρακαλώ συνδεθείτε ή εγγραφείτε στον λογαριασμό σας.
                </>
              ) : (
                <>
                  Για να δείτε τις λεπτομέρειες των ακινήτων, 
                  παρακαλώ συνδεθείτε ή εγγραφείτε στον λογαριασμό σας.
                </>
              )}
            </p>

            {/* Benefits */}
            <div className="bg-blue-50/50 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Τι κερδίζετε με τη σύνδεση:</h3>
              <div className="space-y-3 text-left">
                <div className="flex items-center text-gray-700">
                  <FaSearch className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                  <span>Πρόσβαση σε όλες τις λεπτομέρειες των ακινήτων</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <FaHome className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                  <span>Δυνατότητα επικοινωνίας με μεσίτες</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <FaUser className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                  <span>Προσωπικοποιημένη εμπειρία αναζήτησης</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/buyer/auth/login"
                onClick={onClose}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-8 py-4 rounded-xl
                         hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 font-semibold
                         shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center"
              >
                <FaLock className="mr-2" />
                Σύνδεση
              </Link>
              <Link
                href="/buyer/auth/register"
                onClick={onClose}
                className="flex-1 bg-white text-blue-600 px-8 py-4 rounded-xl border-2 border-blue-500
                         hover:bg-blue-50 transition-all duration-300 font-semibold
                         shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center"
              >
                <FaUser className="mr-2" />
                Εγγραφή
              </Link>
            </div>

            {/* Skip option */}
            <button
              onClick={onClose}
              className="mt-6 text-gray-500 hover:text-gray-700 transition-colors duration-200 text-sm"
            >
              Ίσως αργότερα
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 