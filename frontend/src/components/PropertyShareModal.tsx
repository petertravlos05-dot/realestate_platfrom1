import React, { useState } from 'react';
import { FiX, FiCopy, FiCheck } from 'react-icons/fi';
import { Property } from '@/lib/api/properties';

interface PropertyShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

export default function PropertyShareModal({
  isOpen,
  onClose,
  property,
}: PropertyShareModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/properties/${property.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Κοινοποίηση Ακινήτου</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Κοινοποιήστε το ακίνητο με τους πελάτες σας χρησιμοποιώντας τον παρακάτω σύνδεσμο:
          </p>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
            >
              {copied ? (
                <>
                  <FiCheck size={16} />
                  <span className="ml-2">Αντιγράφηκε!</span>
                </>
              ) : (
                <>
                  <FiCopy size={16} />
                  <span className="ml-2">Αντιγραφή</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Εναλλακτικοί τρόποι κοινοποίησης:</h3>
            <div className="grid grid-cols-2 gap-4">
              <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-600 rounded-lg">
                WhatsApp
              </button>
              <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-600 rounded-lg">
                Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 