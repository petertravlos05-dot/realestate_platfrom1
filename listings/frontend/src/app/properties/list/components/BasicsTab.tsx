'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { FaHome, FaBuilding, FaCrown, FaWarehouse, FaStore, FaBed, FaBath, FaRulerCombined, FaLayerGroup, FaCalendarAlt } from 'react-icons/fa';
import { BiArea } from 'react-icons/bi';
import { HiOfficeBuilding } from 'react-icons/hi';

interface BasicsTabProps {
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export default function BasicsTab({ formData, onChange }: BasicsTabProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 124}, (_, i) => currentYear - i);
  
  const handleCustomChange = (name: string, value: any) => {
    onChange({ target: { name, value } } as any);
  };

  return (
    <div className="bg-gray-50 py-8 px-4 rounded-lg">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Κατασκευαστής / Τύπος */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Κατασκευαστής <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer || ''}
                onChange={onChange}
                placeholder="π.χ. ΤΕΚΑ Κατασκευαστική"
                className="w-full py-3 px-4 bg-white border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Μοντέλο / Περιοχή */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Περιοχή
            </label>
            <div className="relative">
              <input
                type="text"
                name="neighborhood"
                value={formData.neighborhood || ''}
                onChange={onChange}
                placeholder="π.χ. Γλυφάδα"
                className="w-full py-3 px-4 bg-white border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Έτος κατασκευής */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Έτος κατασκευής <span className="text-red-500">*</span>
            </label>
            <div className="relative flex space-x-2">
              <select
                name="yearBuilt"
                value={formData.yearBuilt || ''}
                onChange={onChange}
                className="w-1/2 py-3 px-4 bg-white border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                required
              >
                <option value="">Επιλέξτε</option>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Έτος ανακαίνισης */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Έτος ανακαίνισης
            </label>
            <div className="relative flex space-x-2">
              <select
                name="renovationYear"
                value={formData.renovationYear || ''}
                onChange={onChange}
                className="w-1/2 py-3 px-4 bg-white border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="">Επιλέξτε</option>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Μέγεθος */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Μέγεθος <span className="text-red-500">*</span>
            </label>
            <div className="relative flex">
              <input
                type="number"
                name="area"
                value={formData.area || ''}
                onChange={onChange}
                min="0"
                placeholder="0"
                className="w-full py-3 px-4 bg-white border border-gray-200 rounded-l-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <div className="bg-gray-100 py-3 px-4 text-gray-700 border border-l-0 border-gray-200 rounded-r-md flex items-center">
                τ.μ.
              </div>
            </div>
          </div>

          {/* Τιμή */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Τιμή <span className="text-red-500">*</span>
            </label>
            <div className="relative flex">
              <input
                type="number"
                name="price"
                value={formData.price || ''}
                onChange={onChange}
                min="0"
                placeholder="0"
                className="w-full py-3 px-4 bg-white border border-gray-200 rounded-l-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <div className="bg-gray-100 py-3 px-4 text-gray-700 border border-l-0 border-gray-200 rounded-r-md flex items-center">
                €
              </div>
            </div>
          </div>

          {/* Τύπος ακινήτου */}
          <div className="space-y-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Τύπος ακινήτου <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { id: 'apartment', name: 'Διαμέρισμα', icon: FaBuilding },
                { id: 'house', name: 'Μονοκατοικία', icon: FaHome },
                { id: 'villa', name: 'Βίλα', icon: FaCrown },
                { id: 'studio', name: 'Γκαρσονιέρα', icon: FaWarehouse },
                { id: 'office', name: 'Γραφείο', icon: HiOfficeBuilding },
                { id: 'commercial', name: 'Κατάστημα', icon: FaStore },
              ].map((type) => (
                <div 
                  key={type.id}
                  onClick={() => handleCustomChange('type', type.id)}
                  className={`
                    cursor-pointer p-3 rounded-md flex flex-col items-center justify-center text-center
                    ${formData.type === type.id 
                      ? 'bg-blue-50 border-2 border-blue-500 text-blue-700' 
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                    }
                  `}
                >
                  <type.icon className="w-6 h-6 mb-1" />
                  <span className="text-sm font-medium">{type.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Υπνοδωμάτια */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Υπνοδωμάτια <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-4">
              {[0, 1, 2, 3, 4, 5].map((num) => (
                <div 
                  key={num}
                  onClick={() => handleCustomChange('bedrooms', num)}
                  className={`
                    cursor-pointer w-10 h-10 flex items-center justify-center rounded-md
                    ${parseInt(formData.bedrooms) === num 
                      ? 'bg-blue-50 border-2 border-blue-500 text-blue-700' 
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                    }
                  `}
                >
                  {num}
                </div>
              ))}
              <div 
                onClick={() => handleCustomChange('bedrooms', '6+')}
                className={`
                  cursor-pointer w-10 h-10 flex items-center justify-center rounded-md
                  ${formData.bedrooms === '6+' 
                    ? 'bg-blue-50 border-2 border-blue-500 text-blue-700' 
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                  }
                `}
              >
                6+
              </div>
            </div>
          </div>

          {/* Μπάνια */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Μπάνια <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-4">
              {[0, 1, 2, 3, 4].map((num) => (
                <div 
                  key={num}
                  onClick={() => handleCustomChange('bathrooms', num)}
                  className={`
                    cursor-pointer w-10 h-10 flex items-center justify-center rounded-md
                    ${parseInt(formData.bathrooms) === num 
                      ? 'bg-blue-50 border-2 border-blue-500 text-blue-700' 
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                    }
                  `}
                >
                  {num}
                </div>
              ))}
              <div 
                onClick={() => handleCustomChange('bathrooms', '5+')}
                className={`
                  cursor-pointer w-10 h-10 flex items-center justify-center rounded-md
                  ${formData.bathrooms === '5+' 
                    ? 'bg-blue-50 border-2 border-blue-500 text-blue-700' 
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                  }
                `}
              >
                5+
              </div>
            </div>
          </div>

          {/* Όροφος */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Όροφος
            </label>
            <div className="relative">
              <select
                name="floor"
                value={formData.floor || ''}
                onChange={onChange}
                className="w-full py-3 px-4 bg-white border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="">Επιλέξτε</option>
                <option value="-1">Υπόγειο</option>
                <option value="0">Ισόγειο</option>
                <option value="1">1ος</option>
                <option value="2">2ος</option>
                <option value="3">3ος</option>
                <option value="4">4ος</option>
                <option value="5">5ος</option>
                <option value="6">6ος</option>
                <option value="7">7ος</option>
                <option value="8">8ος</option>
                <option value="9">9ος</option>
                <option value="10+">10+ όροφος</option>
              </select>
            </div>
          </div>

          {/* Κατάσταση ακινήτου */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Κατάσταση ακινήτου
            </label>
            <div className="relative">
              <select
                name="condition"
                value={formData.condition || ''}
                onChange={onChange}
                className="w-full py-3 px-4 bg-white border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="">Επιλέξτε</option>
                <option value="NEW">Καινούριο</option>
                <option value="EXCELLENT">Άριστη</option>
                <option value="GOOD">Καλή</option>
                <option value="FAIR">Μέτρια</option>
                <option value="POOR">Χρήζει ανακαίνισης</option>
              </select>
            </div>
          </div>

          {/* Θέρμανση */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Θέρμανση
            </label>
            <div className="relative">
              <select
                name="heatingType"
                value={formData.heatingType || ''}
                onChange={onChange}
                className="w-full py-3 px-4 bg-white border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="">Επιλέξτε</option>
                <option value="CENTRAL">Κεντρική</option>
                <option value="AUTONOMOUS">Αυτόνομη</option>
                <option value="NATURAL_GAS">Φυσικό αέριο</option>
                <option value="OIL">Πετρέλαιο</option>
                <option value="ELECTRIC">Ηλεκτρική</option>
                <option value="NONE">Χωρίς θέρμανση</option>
              </select>
            </div>
          </div>

          {/* Ενεργειακή κλάση */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ενεργειακή κλάση
            </label>
            <div className="relative">
              <select
                name="energyClass"
                value={formData.energyClass || ''}
                onChange={onChange}
                className="w-full py-3 px-4 bg-white border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="">Επιλέξτε</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B+">B+</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
                <option value="G">G</option>
                <option value="H">H</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 