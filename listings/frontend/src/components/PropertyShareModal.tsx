'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';

interface PropertyShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  agentId: string;
  propertyTitle: string;
}

export default function PropertyShareModal({
  isOpen,
  onClose,
  propertyId,
  agentId,
  propertyTitle,
}: PropertyShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/properties/${propertyId}/connect/${agentId}`;
    }
    return '';
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(`Check out this property: ${propertyTitle}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Property Listing: ${propertyTitle}`);
    const body = encodeURIComponent(`Check out this property:\n\n${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center">
        <div className="fixed inset-0 bg-black/30" />

        <div className="relative mx-auto max-w-md rounded-lg bg-white p-6 shadow-lg">
          <Dialog.Title className="text-lg font-medium">
            Κοινοποίηση Ακινήτου
          </Dialog.Title>

          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Κοινοποιήστε αυτό το ακίνητο με πιθανούς αγοραστές χρησιμοποιώντας μία από τις παρακάτω μεθόδους:
            </p>

            <div className="mt-6 space-y-4">
              <button
                type="button"
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={handleCopyLink}
              >
                {copied ? 'Αντιγράφηκε!' : 'Αντιγραφή Link'}
              </button>

              <button
                type="button"
                className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                onClick={handleShareWhatsApp}
              >
                Κοινοποίηση μέσω WhatsApp
              </button>

              <button
                type="button"
                className="w-full rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                onClick={handleShareEmail}
              >
                Κοινοποίηση μέσω Email
              </button>
            </div>
          </div>

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