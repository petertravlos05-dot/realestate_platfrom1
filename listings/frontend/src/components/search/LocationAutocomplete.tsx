import React, { useState, useEffect, useRef } from 'react';
import { FaMapMarkerAlt, FaDrawPolygon, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationAutocompleteProps {
  onLocationSelect: (locations: string[]) => void;
  onDrawAreaClick: () => void;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  onLocationSelect,
  onDrawAreaClick
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Προσομοίωση αναζήτησης τοποθεσιών
  const mockLocations = [
    'Αθήνα, Κέντρο',
    'Αθήνα, Κολωνάκι',
    'Αθήνα, Παγκράτι',
    'Αθήνα, Περιστέρι',
    'Αθήνα, Γλυφάδα',
    'Αθήνα, Μαρούσι',
    'Θεσσαλονίκη, Κέντρο',
    'Θεσσαλονίκη, Καλαμαριά',
    'Θεσσαλονίκη, Τούμπα',
    'Πάτρα, Κέντρο',
    'Πάτρα, Ρίο',
    'Ηράκλειο, Κρήτη',
    'Λάρισα, Κέντρο'
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.length > 0) {
      const filtered = mockLocations.filter(location =>
        location.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !selectedLocations.includes(location)
      );
      setSuggestions(filtered);
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const newLocations = [...selectedLocations, suggestion];
    setSelectedLocations(newLocations);
    onLocationSelect(newLocations);
    setQuery('');
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleRemoveLocation = (locationToRemove: string) => {
    const newLocations = selectedLocations.filter(loc => loc !== locationToRemove);
    setSelectedLocations(newLocations);
    onLocationSelect(newLocations);
  };

  return (
    <div className="relative w-full">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedLocations.map((location, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 px-3 py-1 bg-[#001f3f] text-white rounded-full"
          >
            <span className="text-sm">{location}</span>
            <button
              onClick={() => handleRemoveLocation(location)}
              className="ml-1 hover:text-red-300 transition-colors"
            >
              <FaTimes className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (query.length > 0) setIsOpen(true);
          }}
          placeholder="Αναζήτηση τοποθεσίας..."
          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f3f] focus:border-transparent"
        />
        <FaMapMarkerAlt className="absolute left-3 top-3.5 text-gray-400" />
      </div>

      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2 border-b last:border-b-0"
              >
                <FaMapMarkerAlt className="text-[#001f3f]" />
                <span className="text-gray-700">{suggestion}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFocused && query.length === 0 && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={onDrawAreaClick}
            className="mt-2 w-full flex items-center gap-2 px-4 py-2 text-[#001f3f] hover:bg-gray-50 rounded-lg border border-gray-200"
          >
            <FaDrawPolygon />
            <span>Σχεδιάστε την περιοχή αναζήτησης</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LocationAutocomplete; 