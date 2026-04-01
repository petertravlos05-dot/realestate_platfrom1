'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCopy, FaCheck, FaFacebook, FaInstagram, FaEnvelope, FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';

interface AgentPropertyShareModalProps {
  propertyId: string;
  propertyTitle: string;
  onClose: () => void;
}

type ShareChannel = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  getUrl?: (link: string, title?: string) => string;
  openInNewTab?: boolean;
  copyOnly?: boolean;
};

const shareChannels: ShareChannel[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: FaWhatsapp,
    color: 'bg-emerald-500 hover:bg-emerald-600',
    getUrl: (link) => `https://wa.me/?text=${encodeURIComponent(link)}`,
    openInNewTab: true,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: FaFacebook,
    color: 'bg-blue-600 hover:bg-blue-700',
    getUrl: (link) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    openInNewTab: true,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: FaInstagram,
    color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 hover:from-purple-600 hover:via-pink-600 hover:to-orange-500',
    copyOnly: true,
  },
  {
    id: 'email',
    label: 'Email',
    icon: FaEnvelope,
    color: 'bg-slate-600 hover:bg-slate-700',
    getUrl: (link, title) => `mailto:?subject=${encodeURIComponent(`Ακίνητο: ${title || 'Ενδιαφέρον ακίνητο'}`)}&body=${encodeURIComponent(link)}`,
    openInNewTab: false,
  },
];

export default function AgentPropertyShareModal({
  propertyId,
  propertyTitle,
  onClose,
}: AgentPropertyShareModalProps) {
  const [copied, setCopied] = useState(false);
  const { data: session } = useSession();
  const agentId = session?.user?.id;
  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/properties/${propertyId}/connect/${agentId}`
    : '';

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Το link αντιγράφηκε!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Σφάλμα κατά την αντιγραφή');
    }
  };

  const handleShare = (channel: ShareChannel) => {
    if (channel.copyOnly) {
      handleCopy();
      toast.success('Αντιγράφηκε! Κολλήστε το στο Instagram DM');
      return;
    }
    const url = channel.getUrl?.(referralLink, propertyTitle) ?? '';
    if (channel.openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
    } else {
      window.location.href = url;
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header - agent gradient */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <FaCopy className="text-white text-sm" />
                </span>
                Προώθηση Ακινήτου
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Κλείσιμο"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <p className="text-indigo-100 text-sm mt-1 truncate" title={propertyTitle}>
              {propertyTitle}
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Link + Copy */}
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Link προώθησης
              </label>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 truncate font-mono">
                  {referralLink}
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <FaCheck size={16} />
                      Αντιγράφηκε
                    </>
                  ) : (
                    <>
                      <FaCopy size={16} />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Share buttons */}
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                Κοινοποίηση
              </label>
              <div className="grid grid-cols-4 gap-3">
                {shareChannels.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => handleShare(channel)}
                      className={`flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl text-white ${channel.color} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
                      title={channel.label}
                    >
                      <Icon size={22} />
                      <span className="text-xs font-medium">{channel.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Όταν κάποιος ανοίξει το link και κάνει εγγραφή, θα συνδεθεί αυτόματα μαζί σας.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
