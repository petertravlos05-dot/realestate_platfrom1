'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  initialFilters?: any;
}

type PropertyType = 'ΚΑΤΟΙΚΙΑ' | 'ΟΙΚΟΠΕΔΟ' | 'ΕΠΑΓΓΕΛΜΑΤΙΚΟ' | 'VILLA';

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, initialFilters }) => {
  const [selectedType, setSelectedType] = useState<PropertyType>('ΚΑΤΟΙΚΙΑ');
  const [filters, setFilters] = useState({
    propertyType: [] as string[],
    priceRange: { min: '', max: '' },
    area: { min: '', max: '' },
    bedrooms: '',
    bathrooms: '',
    constructionYear: { min: 1950, max: 2025 },
    renovationYear: { min: 2014, max: 2025 },
    floor: '',
    view: false,
    heating: '',
    furnished: false,
    nearMetro: false,
    parking: false,
    insulation: false,
    nearSchool: false,
    // Οικόπεδα
    inSettlement: false,
    buildingCoefficient: '',
    landUse: '',
    specialFeatures: [],
    inCityPlan: false,
    utilities: [],
    // Επαγγελματικά
    usageLicense: false,
    streetFacing: false,
    commercialType: '',
    securityFeatures: []
  });

  const propertyTypes = [
    'Διαμέρισμα',
    'Μονοκατοικία',
    'Μεζονέτα',
    'Villa',
    'Επαγγελματικός χώρος',
    'Οικόπεδο'
  ];

  const handlePropertyTypeChange = (type: string) => {
    setFilters(prev => ({
      ...prev,
      propertyType: prev.propertyType.includes(type)
        ? prev.propertyType.filter(t => t !== type)
        : [...prev.propertyType, type]
    }));
  };

  const renderResidentialFilters = () => (
    <>
      {/* Βασικά φίλτρα */}
      <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Τιμή</label>
          <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Από"
              className="w-full px-3 py-2 border rounded-lg"
                    value={filters.priceRange.min}
              onChange={(e) => setFilters({...filters, priceRange: {...filters.priceRange, min: e.target.value}})}
                  />
                  <input
                    type="number"
                    placeholder="Έως"
              className="w-full px-3 py-2 border rounded-lg"
                    value={filters.priceRange.max}
              onChange={(e) => setFilters({...filters, priceRange: {...filters.priceRange, max: e.target.value}})}
                  />
                </div>
              </div>
              <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Εμβαδόν (τ.μ.)</label>
          <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Από"
              className="w-full px-3 py-2 border rounded-lg"
              value={filters.area.min}
              onChange={(e) => setFilters({...filters, area: {...filters.area, min: e.target.value}})}
                  />
                  <input
                    type="number"
                    placeholder="Έως"
              className="w-full px-3 py-2 border rounded-lg"
              value={filters.area.max}
              onChange={(e) => setFilters({...filters, area: {...filters.area, max: e.target.value}})}
            />
          </div>
                </div>
              </div>

      {/* Χαρακτηριστικά */}
      <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Υπνοδωμάτια</label>
                <div className="flex gap-2">
            {['-', '1+', '2+', '3+', '4+', '5+'].map((num) => (
                    <button
                key={num}
                className={`px-3 py-1 border rounded ${
                  filters.bedrooms === num ? 'bg-[#001f3f] text-white' : 'bg-white'
                }`}
                onClick={() => setFilters({...filters, bedrooms: num})}
              >
                {num}
                    </button>
                  ))}
                </div>
              </div>
              <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Μπάνια</label>
                <div className="flex gap-2">
            {['-', '1+', '2+', '3+', '4+', '5+'].map((num) => (
                    <button
                key={num}
                className={`px-3 py-1 border rounded ${
                  filters.bathrooms === num ? 'bg-[#001f3f] text-white' : 'bg-white'
                }`}
                onClick={() => setFilters({...filters, bathrooms: num})}
              >
                {num}
                    </button>
                  ))}
                </div>
              </div>
      </div>

      {/* Έτη */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Έτος Κατασκευής</label>
          <input
            type="range"
            min="1950"
            max="2025"
            value={filters.constructionYear.max}
            onChange={(e) => setFilters({...filters, constructionYear: {...filters.constructionYear, max: parseInt(e.target.value)}})}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>1950</span>
            <span>{filters.constructionYear.max}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Έτος Ανακαίνισης</label>
          <input
            type="range"
            min="2014"
            max="2025"
            value={filters.renovationYear.max}
            onChange={(e) => setFilters({...filters, renovationYear: {...filters.renovationYear, max: parseInt(e.target.value)}})}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>2014</span>
            <span>{filters.renovationYear.max}</span>
          </div>
        </div>
      </div>

      {/* Επιπλέον Χαρακτηριστικά */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Επιπλέον Χαρακτηριστικά</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            className={`px-4 py-2 border rounded-lg ${filters.parking ? 'bg-[#001f3f] text-white' : 'bg-white'}`}
            onClick={() => setFilters({...filters, parking: !filters.parking})}
          >
            Parking
          </button>
          <button
            className={`px-4 py-2 border rounded-lg ${filters.furnished ? 'bg-[#001f3f] text-white' : 'bg-white'}`}
            onClick={() => setFilters({...filters, furnished: !filters.furnished})}
          >
            Επιπλωμένο
          </button>
          <button
            className={`px-4 py-2 border rounded-lg ${filters.nearMetro ? 'bg-[#001f3f] text-white' : 'bg-white'}`}
            onClick={() => setFilters({...filters, nearMetro: !filters.nearMetro})}
          >
            Κοντά σε Μετρό
          </button>
          <button
            className={`px-4 py-2 border rounded-lg ${filters.view ? 'bg-[#001f3f] text-white' : 'bg-white'}`}
            onClick={() => setFilters({...filters, view: !filters.view})}
          >
            Θέα
          </button>
        </div>
      </div>
    </>
  );

  const renderLandFilters = () => (
    <>
      {/* Βασικά φίλτρα για οικόπεδα */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Τιμή</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Από"
              className="w-full px-3 py-2 border rounded-lg"
              value={filters.priceRange.min}
              onChange={(e) => setFilters({...filters, priceRange: {...filters.priceRange, min: e.target.value}})}
            />
            <input
              type="number"
              placeholder="Έως"
              className="w-full px-3 py-2 border rounded-lg"
              value={filters.priceRange.max}
              onChange={(e) => setFilters({...filters, priceRange: {...filters.priceRange, max: e.target.value}})}
            />
          </div>
        </div>
              <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Εμβαδόν (τ.μ.)</label>
          <div className="flex gap-2">
                  <input
                    type="number"
              placeholder="Από"
              className="w-full px-3 py-2 border rounded-lg"
              value={filters.area.min}
              onChange={(e) => setFilters({...filters, area: {...filters.area, min: e.target.value}})}
                  />
                  <input
                    type="number"
              placeholder="Έως"
              className="w-full px-3 py-2 border rounded-lg"
              value={filters.area.max}
              onChange={(e) => setFilters({...filters, area: {...filters.area, max: e.target.value}})}
                  />
                </div>
              </div>
      </div>

      {/* Ειδικά χαρακτηριστικά οικοπέδων */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Χαρακτηριστικά Οικοπέδου</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            className={`px-4 py-2 border rounded-lg ${filters.inSettlement ? 'bg-[#001f3f] text-white' : 'bg-white'}`}
            onClick={() => setFilters({...filters, inSettlement: !filters.inSettlement})}
          >
            Εντός Οικισμού
          </button>
          <button
            className={`px-4 py-2 border rounded-lg ${filters.inCityPlan ? 'bg-[#001f3f] text-white' : 'bg-white'}`}
            onClick={() => setFilters({...filters, inCityPlan: !filters.inCityPlan})}
          >
            Εντός Σχεδίου
          </button>
        </div>
      </div>

      {/* Χρήση Γης */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Χρήση Γης</label>
        <select
          className="w-full px-3 py-2 border rounded-lg"
          value={filters.landUse}
          onChange={(e) => setFilters({...filters, landUse: e.target.value})}
        >
          <option value="">Επιλέξτε</option>
          <option value="ΑΝΤΙΠΑΡΟΧΗ">Αντιπαροχή</option>
          <option value="ΑΓΡΟΤΙΚΗ">Αγροτική Ανάπτυξη</option>
          <option value="ΚΑΤΟΙΚΙΑ">Κατασκευή Οικίας</option>
        </select>
      </div>
    </>
  );

  const renderCommercialFilters = () => (
    <>
      {/* Βασικά φίλτρα για επαγγελματικά */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Τιμή</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Από"
              className="w-full px-3 py-2 border rounded-lg"
              value={filters.priceRange.min}
              onChange={(e) => setFilters({...filters, priceRange: {...filters.priceRange, min: e.target.value}})}
            />
            <input
              type="number"
              placeholder="Έως"
              className="w-full px-3 py-2 border rounded-lg"
              value={filters.priceRange.max}
              onChange={(e) => setFilters({...filters, priceRange: {...filters.priceRange, max: e.target.value}})}
            />
          </div>
        </div>
              <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Εμβαδόν (τ.μ.)</label>
          <div className="flex gap-2">
                  <input
                    type="number"
              placeholder="Από"
              className="w-full px-3 py-2 border rounded-lg"
              value={filters.area.min}
              onChange={(e) => setFilters({...filters, area: {...filters.area, min: e.target.value}})}
                  />
                  <input
                    type="number"
              placeholder="Έως"
              className="w-full px-3 py-2 border rounded-lg"
              value={filters.area.max}
              onChange={(e) => setFilters({...filters, area: {...filters.area, max: e.target.value}})}
                  />
                </div>
              </div>
            </div>

      {/* Τύπος Επαγγελματικού Χώρου */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Είδος Επαγγελματικής Στέγης</label>
        <select
          className="w-full px-3 py-2 border rounded-lg"
          value={filters.commercialType}
          onChange={(e) => setFilters({...filters, commercialType: e.target.value})}
        >
          <option value="">Επιλέξτε</option>
          <option value="ΚΑΤΑΣΤΗΜΑ">Κατάστημα</option>
          <option value="ΓΡΑΦΕΙΟ">Γραφείο</option>
          <option value="ΒΙΟΤΕΧΝΙΑ">Βιοτεχνία</option>
        </select>
      </div>

      {/* Επιπλέον Χαρακτηριστικά */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Χαρακτηριστικά</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            className={`px-4 py-2 border rounded-lg ${filters.usageLicense ? 'bg-[#001f3f] text-white' : 'bg-white'}`}
            onClick={() => setFilters({...filters, usageLicense: !filters.usageLicense})}
          >
            Άδεια Χρήσης
          </button>
          <button
            className={`px-4 py-2 border rounded-lg ${filters.streetFacing ? 'bg-[#001f3f] text-white' : 'bg-white'}`}
            onClick={() => setFilters({...filters, streetFacing: !filters.streetFacing})}
          >
            Προβολή σε Δρόμο
          </button>
          <button
            className={`px-4 py-2 border rounded-lg ${filters.parking ? 'bg-[#001f3f] text-white' : 'bg-white'}`}
            onClick={() => setFilters({...filters, parking: !filters.parking})}
          >
            Parking
          </button>
        </div>
      </div>
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={onClose}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative z-10"
            >
              <h2 className="text-2xl font-bold mb-6">Φίλτρα Αναζήτησης</h2>
              
              {/* Επιλογή Τύπου Ακινήτου */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Κατηγορία</label>
                <div className="flex flex-wrap gap-4">
                  {(['ΚΑΤΟΙΚΙΑ', 'VILLA', 'ΟΙΚΟΠΕΔΟ', 'ΕΠΑΓΓΕΛΜΑΤΙΚΟ'] as PropertyType[]).map((type) => (
              <button
                      key={type}
                      className={`px-4 py-2 rounded-lg ${
                        selectedType === type ? 'bg-[#001f3f] text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => {
                        setSelectedType(type);
                        // Ενημέρωση του propertyType στα φίλτρα
                        setFilters(prev => ({
                          ...prev,
                          propertyType: type === 'VILLA' ? ['Villa'] : []
                        }));
                      }}
                    >
                      {type}
              </button>
                  ))}
                </div>
              </div>

              {/* Φίλτρα ανάλογα με τον τύπο */}
              {(selectedType === 'ΚΑΤΟΙΚΙΑ' || selectedType === 'VILLA') && renderResidentialFilters()}
              {selectedType === 'ΟΙΚΟΠΕΔΟ' && renderLandFilters()}
              {selectedType === 'ΕΠΑΓΓΕΛΜΑΤΙΚΟ' && renderCommercialFilters()}

              {/* Κουμπιά */}
              <div className="flex justify-end gap-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={() => {
                    onApply(filters);
                    onClose();
                  }}
                  className="px-6 py-2 bg-[#001f3f] text-white rounded-lg hover:bg-[#002b5c]"
                >
                  Εφαρμογή
                </button>
              </div>
            </motion.div>
            </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FilterModal; 