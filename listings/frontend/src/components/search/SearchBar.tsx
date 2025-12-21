'use client';

import { useState, useRef, useEffect } from 'react';
import { FaSearch, FaMapMarkerAlt, FaFilter } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import LocationSearch from './LocationSearch';
import FilterModal from './FilterModal';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchBarProps {
  onSearch: (location: string, filters: any) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [filters, setFilters] = useState({});
  const router = useRouter();
  const searchBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        setIsLocationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationSelect = (selectedLocation: string) => {
    setLocation(selectedLocation);
    setIsLocationOpen(false);
  };

  const handleDrawArea = () => {
    router.push('/properties/draw-area');
  };

  const handleFilterApply = (newFilters: any) => {
    setFilters(newFilters);
    setIsFilterOpen(false);
  };

  const handleSearch = () => {
    onSearch(location, filters);
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto" ref={searchBarRef}>
      <div className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-lg">
        {/* Location Input */}
        <div className="relative flex-grow">
          <div className="relative">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onFocus={() => setIsLocationOpen(true)}
              placeholder="Πληκτρολογήστε τοποθεσία"
              className="w-full px-4 py-3 pl-10 border rounded-lg hover:border-blue-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          </div>

          <AnimatePresence>
            {isLocationOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-xl z-50"
              >
                <LocationSearch
                  onSelect={handleLocationSelect}
                  onDrawArea={handleDrawArea}
                  searchTerm={location}
                  onSearchTermChange={(term) => setLocation(term)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filter Button */}
        <button
          onClick={() => setIsFilterOpen(true)}
          className="px-6 py-3 flex items-center gap-2 border rounded-lg hover:border-blue-500 transition-colors"
        >
          <FaFilter className="text-gray-500" />
          <span className="text-gray-700">Φίλτρα</span>
        </button>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className="px-8 py-3 bg-[#001f3f] text-white rounded-lg hover:bg-[#003366] transition-colors flex items-center gap-2"
        >
          <FaSearch />
          <span>Αναζήτηση</span>
        </button>
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleFilterApply}
      />
    </div>
  );
} 