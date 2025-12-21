'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCopy, FaCheck, FaLink } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';

interface ReferralLinkModalProps {
  propertyId: string;
  propertyTitle: string;
  onClose: () => void;
}

export default function ReferralLinkModal({
  propertyId,
  propertyTitle,
  onClose,
}: ReferralLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const { data: session } = useSession();
  const agentId = session?.user?.id;
  const referralLink = `${window.location.origin}/properties/${propertyId}/connect/${agentId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Το link αντιγράφηκε!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Σφάλμα κατά την αντιγραφή του link');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Κοινοποίηση Ακινήτου</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FaTimes size={24} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Το ακίνητο <strong>{propertyTitle}</strong> μπορεί να κοινοποιηθεί μέσω του παρακάτω link:
          </p>
          <div className="flex items-center space-x-2">
            <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600 truncate">
              {referralLink}
            </div>
            <button
              onClick={handleCopy}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {copied ? <FaCheck size={20} /> : <FaCopy size={20} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Κλείσιμο
          </button>
        </div>
      </motion.div>
    </div>
  );
} 