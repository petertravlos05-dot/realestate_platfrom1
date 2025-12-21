"use client";

import React, { useState } from 'react';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';

interface FilterValues {
  type: string;
  priceRange: [number, number];
  bedrooms: string;
  bathrooms: string;
  area: [number, number];
  location: string;
}

interface PropertyFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function PropertyFilters({ onFilterChange, isSidebarOpen, onToggleSidebar }: PropertyFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({
    type: '',
    priceRange: [0, 1000000],
    bedrooms: '',
    bathrooms: '',
    area: [0, 500],
    location: '',
  });

  const handleFilterChange = (key: keyof FilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className={`
      fixed lg:relative top-0 left-0 h-full 
      ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      transition-transform duration-300 ease-in-out
      w-80 lg:w-72 bg-gradient-to-b from-gray-50 to-white
      shadow-lg lg:shadow-md z-40 lg:z-auto
      overflow-y-auto
      p-6
    `}>
      <button 
        className="lg:hidden absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        onClick={onToggleSidebar}
      >
        <FaTimes size={24} />
      </button>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">Φίλτρα Αναζήτησης</h2>

      {/* Τύπος Ακινήτου */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">Τύπος Ακινήτου</label>
        <select 
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
        >
          <option value="">Όλοι οι τύποι</option>
          <option value="apartment">Διαμέρισμα</option>
          <option value="house">Μονοκατοικία</option>
          <option value="villa">Βίλα</option>
          <option value="studio">Γκαρσονιέρα</option>
        </select>
      </div>

      {/* Εύρος Τιμής */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">Εύρος Τιμής (€)</label>
        <div className="flex space-x-4">
          <input
            type="number"
            placeholder="Από"
            className="w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.priceRange[0]}
            onChange={(e) => handleFilterChange('priceRange', [parseInt(e.target.value), filters.priceRange[1]])}
          />
          <input
            type="number"
            placeholder="Έως"
            className="w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.priceRange[1]}
            onChange={(e) => handleFilterChange('priceRange', [filters.priceRange[0], parseInt(e.target.value)])}
          />
        </div>
      </div>

      {/* Υπνοδωμάτια */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">Υπνοδωμάτια</label>
        <select 
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={filters.bedrooms}
          onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
        >
          <option value="">Όλα</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
        </select>
      </div>

      {/* Μπάνια */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">Μπάνια</label>
        <select 
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={filters.bathrooms}
          onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
        >
          <option value="">Όλα</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
        </select>
      </div>

      {/* Εμβαδόν */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">Εμβαδόν (τ.μ.)</label>
        <div className="flex space-x-4">
          <input
            type="number"
            placeholder="Από"
            className="w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.area[0]}
            onChange={(e) => handleFilterChange('area', [parseInt(e.target.value), filters.area[1]])}
          />
          <input
            type="number"
            placeholder="Έως"
            className="w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.area[1]}
            onChange={(e) => handleFilterChange('area', [filters.area[0], parseInt(e.target.value)])}
          />
        </div>
      </div>

      {/* Τοποθεσία */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">Τοποθεσία</label>
        <input
          type="text"
          placeholder="π.χ. Γλυφάδα"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={filters.location}
          onChange={(e) => handleFilterChange('location', e.target.value)}
        />
      </div>

      {/* Κουμπί Εφαρμογής */}
      <button
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-300"
        onClick={() => onFilterChange(filters)}
      >
        <FaSearch className="inline-block mr-2" />
        Εφαρμογή Φίλτρων
      </button>
    </div>
  );
} 