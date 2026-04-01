'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaMapMarkerAlt } from 'react-icons/fa';
import Image from 'next/image';

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  images?: string[];
  city?: string;
  street?: string;
  number?: string;
  status?: string;
  propertySold?: boolean;
}

interface SelectPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  buyerName: string;
  onSelect: (propertyId: string) => void;
}

export default function SelectPropertyModal({
  isOpen,
  onClose,
  properties,
  buyerName,
  onSelect,
}: SelectPropertyModalProps) {
  const handleSelect = (propertyId: string) => {
    onSelect(propertyId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Επίλεξε Ακίνητο</h2>
                  <p className="text-green-100 mt-1">
                    Ο {buyerName} έχει ενδιαφέρον σε {properties.length} ακίνητα
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Κλείσιμο"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {properties.map((property) => (
                    <motion.button
                      key={property.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(property.id)}
                      className="w-full text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-green-500 hover:shadow-lg transition-all"
                    >
                      <div className="flex gap-4">
                        {property.images && property.images[0] && (
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={property.images[0]}
                              alt={property.title}
                              fill
                              className="object-cover"
                            />
                            {property.propertySold && (
                              <span className="absolute top-1 left-1 bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                Πουλημένο
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 mb-1">{property.title}</h3>
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <FaMapMarkerAlt className="w-3 h-3 mr-1 text-green-500" />
                            <span className="truncate">{property.location}</span>
                          </div>
                          <div className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                            {property.price.toLocaleString('el-GR')} €
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                >
                  Ακύρωση
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

