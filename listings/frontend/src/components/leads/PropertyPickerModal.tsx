'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSearch, FaMapMarkerAlt, FaChevronDown, FaChevronUp, FaBuilding, FaEuroSign } from 'react-icons/fa';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

export interface PropertyOptionExtended {
  id: string;
  title: string;
  city?: string;
  price?: number;
  coordinates?: { lat: number; lng: number };
  status?: string;
  propertySold?: boolean;
  isSold?: boolean;
  isReserved?: boolean;
  amenities?: Record<string, unknown>;
  isRent?: boolean;
}

function parseIsRent(p: PropertyOptionExtended): boolean {
  if (p.isRent === true) return true;
  const a = p.amenities;
  if (!a) return false;
  const obj = typeof a === 'string' ? (() => { try { return JSON.parse(a); } catch { return null; } })() : a;
  if (!obj || typeof obj !== 'object') return false;
  const v = (obj as Record<string, unknown>).listingType ?? (obj as Record<string, unknown>).transactionType;
  return String(v || '').toLowerCase() === 'rent';
}

/** Υπολογίζει την ετικέτα κατάστασης ακινήτου για το banner */
export function getPropertyStatusLabel(p: PropertyOptionExtended): { label: string; className: string } {
  const isRent = parseIsRent(p);
  const sold = !!(p.propertySold ?? p.isSold);

  if (p.status === 'unavailable') {
    return { label: 'Μη διαθέσιμο', className: 'bg-gray-200 text-gray-700' };
  }
  if (sold) {
    return { label: isRent ? 'Ενοικιάστηκε' : 'Πουλήθηκε', className: 'bg-slate-200 text-slate-800' };
  }
  if (p.isReserved) {
    return { label: 'Προκαταβολή πληρωμένη', className: 'bg-blue-100 text-blue-800' };
  }
  if (isRent) {
    return { label: 'Ενοικιάζεται', className: 'bg-teal-100 text-teal-800' };
  }
  return { label: 'Πωλείται', className: 'bg-indigo-100 text-indigo-800' };
}

interface PropertyPickerModalProps {
  open: boolean;
  onClose: () => void;
  properties: PropertyOptionExtended[];
  selectedId: string | null;
  onSelect: (propertyId: string) => void;
}

export default function PropertyPickerModal({
  open,
  onClose,
  properties,
  selectedId,
  onSelect,
}: PropertyPickerModalProps) {
  const [searchTitle, setSearchTitle] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [mapOpen, setMapOpen] = useState(false);

  const cities = useMemo(() => {
    const set = new Set<string>();
    properties.forEach(p => p.city && set.add(p.city));
    return Array.from(set).sort();
  }, [properties]);

  const filtered = useMemo(() => {
    return properties.filter(p => {
      const soldOrRented = !!(p.propertySold ?? p.isSold);
      if (soldOrRented) return false;
      const matchTitle = !searchTitle.trim() ||
        (p.title || '').toLowerCase().includes(searchTitle.trim().toLowerCase());
      const matchCity = !filterCity || (p.city || '') === filterCity;
      return matchTitle && matchCity;
    });
  }, [properties, searchTitle, filterCity]);

  const propertiesWithCoords = filtered.filter(p => p.coordinates && typeof p.coordinates.lat === 'number');
  const mapCenter = propertiesWithCoords.length > 0
    ? propertiesWithCoords[0].coordinates!
    : { lat: 37.9838, lng: 23.7275 };

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FaBuilding className="text-indigo-600" />
              Επιλογή ακινήτου
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Filters */}
          <div className="p-4 space-y-3 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTitle}
                onChange={e => setSearchTitle(e.target.value)}
                placeholder="Αναζήτηση με τίτλο ακινήτου..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filterCity}
                onChange={e => setFilterCity(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">Όλες οι πόλεις</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Map Toggle */}
            <button
              type="button"
              onClick={() => setMapOpen(!mapOpen)}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <FaMapMarkerAlt />
              {mapOpen ? 'Απόκρυψη χάρτη' : 'Εμφάνιση χάρτη'}
              {mapOpen ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
            </button>

            {mapOpen && (
              <div className="rounded-xl overflow-hidden border border-gray-200 h-48">
                {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                  <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={mapCenter}
                      zoom={propertiesWithCoords.length > 1 ? 10 : 14}
                      options={{
                        zoomControl: true,
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                      }}
                    >
                      {propertiesWithCoords.map(p => (
                        <Marker
                          key={p.id}
                          position={p.coordinates!}
                          onClick={() => handleSelect(p.id)}
                          title={p.title}
                        />
                      ))}
                    </GoogleMap>
                  </LoadScript>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                    Χάρτης μη διαθέσιμος (ρυθμίστε NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Property List */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Δεν βρέθηκαν ακίνητα με τα κριτήρια αναζήτησης.
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map(p => {
                  const statusBanner = getPropertyStatusLabel(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelect(p.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                        selectedId === p.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900 truncate">{p.title}</h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0 ${statusBanner.className}`}>
                            {statusBanner.label}
                          </span>
                        </div>
                        {p.city && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                            <FaMapMarkerAlt className="w-3 h-3 flex-shrink-0" />
                            {p.city}
                          </p>
                        )}
                      </div>
                      {p.price != null && (
                        <span className="flex items-center gap-1 text-indigo-600 font-bold flex-shrink-0">
                          <FaEuroSign className="w-3 h-3" />
                          {p.price.toLocaleString('el-GR')}
                          {parseIsRent(p) && <span className="text-indigo-500 font-normal text-sm">/μήνα</span>}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors"
            >
              Ακύρωση
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
