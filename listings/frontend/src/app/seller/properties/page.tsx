'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaList, FaThLarge, FaMapMarked, FaFilter, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaUser, FaHome, FaEnvelope, FaInfoCircle, FaQuestionCircle, FaCog, FaComments, FaExchangeAlt, FaSearch, FaChartBar, FaCaretDown } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import PropertyCard from '@/components/properties/PropertyCard';
import PropertyMap from '@/components/properties/PropertyMap';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import SearchBar from '@/components/search/SearchBar';
import PropertyDetailsModal from '@/components/properties/PropertyDetailsModal';
import LocationAutocomplete from '@/components/search/LocationAutocomplete';
import FilterModal from '@/components/search/FilterModal';
import SellerNotificationBell from '@/components/notifications/SellerNotificationBell';
import { Property } from '@/types/property';
import { fetchFromBackend } from '@/lib/api/client';

type ViewMode = 'grid' | 'list' | 'map';

export default function SellerPropertiesPage() {
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [displayedProperties, setDisplayedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { data: session, status } = useSession();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [selectedProperty, setSelectedProperty] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        console.log('Fetching properties...');
        const response = await fetchFromBackend('/properties');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched properties:', data);
        
        if (!Array.isArray(data)) {
          console.error('Expected array of properties but got:', typeof data);
          setAllProperties([]);
          setDisplayedProperties([]);
          return;
        }
        
        setAllProperties(data);
        setDisplayedProperties(data);
      } catch (error) {
        console.error('Error fetching properties:', error);
        setAllProperties([]);
        setDisplayedProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const handleLocationSelect = (locations: string[]) => {
    setSelectedLocations(locations);
  };

  const handleDrawArea = () => {
    console.log('Draw area clicked');
  };

  const handleFilterApply = (filters: any) => {
    setActiveFilters(filters);
    setIsFilterModalOpen(false);
  };

  const applyFilters = (properties: Property[]) => {
    let filtered = [...properties];

    // Φιλτράρισμα με βάση την τοποθεσία
    if (selectedLocations.length > 0) {
      filtered = filtered.filter(property =>
        selectedLocations.some(location =>
          property.location.toLowerCase().includes(location.toLowerCase())
        )
      );
    }

    // Φιλτράρισμα με βάση τα φίλτρα από το modal
    if (activeFilters) {
      // Φιλτράρισμα με βάση την τιμή
      if (activeFilters.priceRange.min || activeFilters.priceRange.max) {
        filtered = filtered.filter(property => {
          const meetsMinPrice = !activeFilters.priceRange.min || property.price >= activeFilters.priceRange.min;
          const meetsMaxPrice = !activeFilters.priceRange.max || property.price <= activeFilters.priceRange.max;
          return meetsMinPrice && meetsMaxPrice;
        });
      }

      // Φιλτράρισμα με βάση τον τύπο ακινήτου
      if (activeFilters.propertyType.length > 0) {
        filtered = filtered.filter(property =>
          activeFilters.propertyType.includes(property.propertyType)
        );
      }

      // Φιλτράρισμα με βάση τα υπνοδωμάτια
      if (activeFilters.bedrooms) {
        filtered = filtered.filter(property =>
          (property.bedrooms || 0) >= activeFilters.bedrooms
        );
      }

      // Φιλτράρισμα με βάση τα μπάνια
      if (activeFilters.bathrooms) {
        filtered = filtered.filter(property =>
          (property.bathrooms || 0) >= activeFilters.bathrooms
        );
      }

      // Φιλτράρισμα με βάση το εμβαδόν
      if (activeFilters.area.min || activeFilters.area.max) {
        filtered = filtered.filter(property => {
          const meetsMinArea = !activeFilters.area.min || property.area >= activeFilters.area.min;
          const meetsMaxArea = !activeFilters.area.max || property.area <= activeFilters.area.max;
          return meetsMinArea && meetsMaxArea;
        });
      }
    }

    return filtered;
  };

  const handleSearch = () => {
    const filteredResults = applyFilters(allProperties);
    setDisplayedProperties(filteredResults);
    setHasSearched(true);
  };

  const handlePropertyClick = (propertyId: string) => {
    console.log('Property clicked:', propertyId);
    router.push(`/properties/${propertyId}`);
  };

  const handleFavoriteClick = async (propertyId: string) => {
    console.log('Toggle favorite:', propertyId);
  };

  const handleReset = () => {
    setSelectedLocations([]);
    setActiveFilters(null);
    setDisplayedProperties(allProperties);
    setHasSearched(false);
  };

  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'BUYER') {
      router.push('/buyer');
    } else if (role === 'AGENT') {
      router.push('/agent');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f4ff] to-[#e5eaff]">
      {/* Header */}
      <header className="fixed w-full z-50 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            {/* Logo - Left */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="w-1/4"
            >
              <div className="flex items-center space-x-2">
                <Link href="/" className="flex items-center">
                <span className="text-2xl font-bold text-[#001f3f]">RealEstate</span>
                </Link>
                <div className="relative" ref={roleMenuRef}>
                  <button
                    onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                    className="px-2 py-1 text-xs font-semibold bg-[#001f3f] text-white rounded-full hover:bg-[#003366] transition-all duration-300 flex items-center space-x-1"
                  >
                    <span>Seller Mode</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isRoleMenuOpen && (
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2 border border-gray-100 z-50">
                      <div 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                        onClick={() => handleRoleChange('BUYER')}
                      >
                        <FaExchangeAlt className="mr-2 text-green-500" />
                        <span className="text-green-500 font-medium">Buyer Mode</span>
                      </div>
                      <div 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                        onClick={() => handleRoleChange('AGENT')}
                      >
                        <FaExchangeAlt className="mr-2 text-blue-500" />
                        <span className="text-blue-500 font-medium">Agent Mode</span>
                      </div>
                      <div className="border-t border-gray-100 my-1"></div>
                      <Link
                        href="/"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      >
                        <FaExchangeAlt className="mr-2 text-gray-500" />
                        Επιλογή Ρόλου
              </Link>
            </div>
                  )}
                </div>
              </div>
            </motion.div>
            
            {/* Navigation - Center */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex-1 flex justify-center"
            >
              <nav className="flex items-center space-x-12">
                <Link href="/seller/properties" className="text-gray-600 hover:text-[#001f3f] transition-colors duration-200 font-medium">
                  Ακίνητα
                </Link>
                <Link href="/about" className="text-gray-600 hover:text-[#001f3f] transition-colors duration-200 font-medium">
                  Σχετικά
                </Link>
                <Link href="/contact" className="text-gray-600 hover:text-[#001f3f] transition-colors duration-200 font-medium">
                  Επικοινωνία
                </Link>
              </nav>
            </motion.div>

            {/* Icons - Right */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="w-1/4 flex items-center justify-end space-x-4"
            >
              <SellerNotificationBell />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
              <Link
                href="/dashboard/seller"
                  className="bg-[#001f3f] text-white px-4 py-2 rounded-lg hover:bg-[#003366] transition-colors duration-200"
              >
                Dashboard
              </Link>
              </motion.div>
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-[#001f3f] transition-colors duration-200"
                >
                  <FaUser className="w-5 h-5" />
                  <FaCaretDown className="w-4 h-4" />
                </motion.button>
                <AnimatePresence>
                {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                    >
                      <Link href="/dashboard/seller" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200">
                      Πίνακας Ελέγχου
                    </Link>
                      <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200">
                      Προφίλ
                    </Link>
                      <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200">
                      Ρυθμίσεις
                    </Link>
                      <Link href="/" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200">
                      Αλλαγή Ρόλων
                    </Link>
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        // Add logout logic here
                      }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                    >
                      Αποσύνδεση
                    </button>
                    </motion.div>
                )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12">
        {/* Hero Section with Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white shadow-sm"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-4xl font-bold text-center text-gray-900 mb-4"
            >
              Αναζήτηση Ακινήτων
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center text-gray-600 mb-8"
            >
              Βρείτε το ιδανικό ακίνητο από την πλούσια συλλογή μας
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="max-w-3xl mx-auto"
            >
              <div className="flex flex-col gap-4">
                <LocationAutocomplete
                  onLocationSelect={handleLocationSelect}
                  onDrawAreaClick={handleDrawArea}
                />
                <div className="flex gap-4">
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsFilterModalOpen(true)}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors duration-200"
                    >
                      <FaFilter />
                      Φίλτρα
                      {activeFilters && (
                        <span className="ml-2 px-2 py-0.5 bg-[#001f3f] text-white text-sm rounded-full">
                          {Object.keys(activeFilters).length}
                        </span>
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleReset}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors duration-200"
                      title="Επαναφορά όλων των φίλτρων"
                    >
                      <FaExchangeAlt className="rotate-90" />
                      Επαναφορά
                    </motion.button>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSearch}
                    className="flex-1 px-6 py-3 bg-[#001f3f] text-white rounded-lg hover:bg-[#002b5c] flex items-center justify-center gap-2 transition-colors duration-200"
                  >
                    <FaSearch />
                    Αναζήτηση
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* View Mode Selector and Results */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
        >
          <div className="flex justify-between items-center">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-2xl font-bold text-gray-900"
            >
              {hasSearched ? 'Αποτελέσματα Αναζήτησης' : 'Όλα τα Ακίνητα'}
              {hasSearched && (
                <span className="ml-2 text-lg font-normal text-gray-600">
                  ({displayedProperties.length} {displayedProperties.length === 1 ? 'ακίνητο' : 'ακίνητα'})
                </span>
              )}
            </motion.h2>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex gap-2"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-[#001f3f] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FaThLarge className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  viewMode === 'list'
                    ? 'bg-[#001f3f] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FaList className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  viewMode === 'map'
                    ? 'bg-[#001f3f] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FaMapMarked className="w-5 h-5" />
              </motion.button>
            </motion.div>
        </div>

          {/* Properties Display */}
          <AnimatePresence mode="wait">
            {viewMode === 'map' ? (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6"
              >
                <PropertyMap 
                  properties={displayedProperties} 
                  onPropertyClick={handlePropertyClick} 
                />
              </motion.div>
            ) : displayedProperties.length > 0 ? (
              <motion.div
                key={viewMode}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`mt-6 grid gap-6 ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                }`}
              >
                {displayedProperties.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300"
                  >
                    <PropertyCard
                      property={property}
                      viewMode={viewMode}
                      onFavoriteClick={() => handleFavoriteClick(property.id)}
                      isAuthenticated={isAuthenticated}
                      userRole="seller"
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full text-center py-12"
              >
                <h3 className="text-lg font-medium text-gray-900">
                  {hasSearched ? 'Δεν βρέθηκαν ακίνητα με τα επιλεγμένα κριτήρια' : 'Δεν υπάρχουν διαθέσιμα ακίνητα'}
                </h3>
                <p className="mt-2 text-gray-500">
                  {hasSearched ? 'Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης' : 'Παρακαλώ δοκιμάστε ξανά αργότερα'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Filter Modal */}
      <AnimatePresence>
        {isFilterModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          >
            <FilterModal
              isOpen={isFilterModalOpen}
              onClose={() => setIsFilterModalOpen(false)}
              onApply={handleFilterApply}
              initialFilters={activeFilters}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="bg-[#001f3f] text-white py-8 mt-12"
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <h3 className="text-xl font-bold mb-4">Σχετικά με εμάς</h3>
              <p className="text-white">
                Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <h3 className="text-xl font-bold mb-4">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/properties" className="text-white hover:text-white/80 transition-colors duration-200">
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-white hover:text-white/80 transition-colors duration-200">
                    Σχετικά
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-white hover:text-white/80 transition-colors duration-200">
                    Επικοινωνία
                  </Link>
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
            >
              <h3 className="text-xl font-bold mb-4">Επικοινωνία</h3>
              <ul className="space-y-2 text-white">
                <li>Email: info@realestate.com</li>
                <li>Τηλέφωνο: +30 210 1234567</li>
                <li>Διεύθυνση: Αθήνα, Ελλάδα</li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
            >
              <h3 className="text-xl font-bold mb-4">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <motion.a 
                  whileHover={{ scale: 1.2 }}
                  href="#" 
                  className="text-white hover:text-white/80 transition-colors duration-200"
                >
                  <FaFacebook className="w-6 h-6" />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.2 }}
                  href="#" 
                  className="text-white hover:text-white/80 transition-colors duration-200"
                >
                  <FaTwitter className="w-6 h-6" />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.2 }}
                  href="#" 
                  className="text-white hover:text-white/80 transition-colors duration-200"
                >
                  <FaInstagram className="w-6 h-6" />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.2 }}
                  href="#" 
                  className="text-white hover:text-white/80 transition-colors duration-200"
                >
                  <FaLinkedin className="w-6 h-6" />
                </motion.a>
            </div>
            </motion.div>
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="border-t border-white/20 mt-8 pt-8 text-center text-white"
          >
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
} 