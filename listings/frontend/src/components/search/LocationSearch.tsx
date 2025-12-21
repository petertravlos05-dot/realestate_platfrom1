'use client';

import { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaDrawPolygon } from 'react-icons/fa';

interface LocationSearchProps {
  onSelect: (location: string) => void;
  onDrawArea: () => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

export default function LocationSearch({ onSelect, onDrawArea, searchTerm, onSearchTermChange }: LocationSearchProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.length >= 3) {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/locations?q=${encodeURIComponent(searchTerm)}`);
          const data = await response.json();
          setSuggestions(data.suggestions);
        } catch (error) {
          console.error('Error fetching location suggestions:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  return (
    <div className="relative">
      {/* Draw Area Option */}
      <button
        onClick={onDrawArea}
        className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
      >
        <FaDrawPolygon className="text-blue-500" />
        <span>Σχεδιάστε την περιοχή αναζήτησης</span>
      </button>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          placeholder="Αναζητήστε περιοχή..."
          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500"
        />
        <FaMapMarkerAlt className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>

      {/* Location Suggestions */}
      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => {
                onSelect(suggestion);
                setSuggestions([]); // Clear suggestions after selection
              }}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2 border-b last:border-b-0"
            >
              <FaMapMarkerAlt className="text-blue-500" />
              <span className="text-gray-700">{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isLoading && searchTerm.length >= 3 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          Αναζήτηση...
        </div>
      )}
    </div>
  );
} 