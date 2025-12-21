"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FaList, FaThLarge, FaMapMarked, FaFilter, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaUser, FaHome, FaEnvelope, FaInfoCircle, FaQuestionCircle, FaCog, FaComments, FaExchangeAlt, FaSearch, FaChartBar, FaHeart, FaShare, FaStar, FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined, FaEuroSign, FaTimes, FaChevronDown, FaPhone } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import PropertyCard from '@/components/properties/PropertyCard';
import PropertyMap from '@/components/properties/PropertyMap';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BuyerHeader from '@/components/layout/BuyerHeader';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import SearchBar from '@/components/search/SearchBar';
import PropertyDetailsModal from '@/components/properties/PropertyDetailsModal';
import DynamicNavbar from '@/components/navigation/DynamicNavbar';
import LocationAutocomplete from '@/components/search/LocationAutocomplete';
import FilterModal from '@/components/search/FilterModal';
import NotificationBell from '@/components/notifications/NotificationBell';
import { fetchFromBackend } from '@/lib/api/client';

interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  images: string[];
  type: string;
  status: string;
  fullDescription: string;
  propertyType: string;
  features: string[];
  state: string;
  city: string;
  street: string;
  number: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

type ViewMode = 'grid' | 'list' | 'map';

export default function AgentPropertiesPage() {
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [displayedProperties, setDisplayedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { data: session, status } = useSession();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [userRole, setUserRole] = useState<'buyer' | 'seller' | 'agent' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const propertiesPerPage = 6;
  const [sortOption, setSortOption] = useState('newest');

  const sortedProperties = [...displayedProperties].sort((a, b) => {
    if (sortOption === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortOption === 'priceLow') {
      return a.price - b.price;
    } else if (sortOption === 'priceHigh') {
      return b.price - a.price;
    }
    return 0;
  });
  const paginatedProperties = sortedProperties.slice((currentPage - 1) * propertiesPerPage, currentPage * propertiesPerPage);
  const totalPages = Math.ceil(sortedProperties.length / propertiesPerPage);

  useEffect(() => {
    const checkAuth = async () => {
      // Εδώ θα μπορούσε να γίνει έλεγχος authentication
      setUserRole('agent'); // Προσωρινά το θέτουμε ως agent
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const handleChangeRole = () => {
    router.push('/');
  };

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
    setSelectedLocation(locations[0] || '');
  };

  const handleDrawArea = () => {
    console.log('Draw area clicked');
  };

  const handleFilterApply = (filters: any) => {
    console.log('Applying filters:', filters);
    setActiveFilters(filters);
    const filteredResults = applyFilters(allProperties);
    console.log('Filtered results:', filteredResults);
    setDisplayedProperties(filteredResults);
    setHasSearched(true);
  };

  const applyFilters = (properties: Property[]) => {
    let filtered = [...properties];
    console.log('Initial properties:', filtered.length);

    // Φιλτράρισμα με βάση την τοποθεσία
    if (selectedLocation) {
      filtered = filtered.filter(property =>
        property.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
      console.log('After location filter:', filtered.length);
    }

    // Φιλτράρισμα με βάση τα φίλτρα από το modal
    if (activeFilters) {
      console.log('Active filters:', activeFilters);

      // Φιλτράρισμα με βάση την τιμή
      if (activeFilters.priceRange?.min || activeFilters.priceRange?.max) {
        const minPrice = activeFilters.priceRange.min ? Number(activeFilters.priceRange.min) : 0;
        const maxPrice = activeFilters.priceRange.max ? Number(activeFilters.priceRange.max) : Infinity;
        console.log('Price range:', { minPrice, maxPrice });
        
        filtered = filtered.filter(property => {
          const price = Number(property.price);
          return price >= minPrice && price <= maxPrice;
        });
        console.log('After price filter:', filtered.length);
      }

      // Φιλτράρισμα με βάση τον τύπο ακινήτου
      if (activeFilters.propertyType && activeFilters.propertyType.length > 0) {
        filtered = filtered.filter(property =>
          activeFilters.propertyType.includes(property.type)
        );
        console.log('After property type filter:', filtered.length);
      }

      // Φιλτράρισμα με βάση τα υπνοδωμάτια
      if (activeFilters.bedrooms && activeFilters.bedrooms > 0) {
        filtered = filtered.filter(property =>
          property.bedrooms >= activeFilters.bedrooms
        );
        console.log('After bedrooms filter:', filtered.length);
      }

      // Φιλτράρισμα με βάση τα μπάνια
      if (activeFilters.bathrooms && activeFilters.bathrooms > 0) {
        filtered = filtered.filter(property =>
          property.bathrooms >= activeFilters.bathrooms
        );
        console.log('After bathrooms filter:', filtered.length);
      }

      // Φιλτράρισμα με βάση το εμβαδόν
      if (activeFilters.areaRange?.min || activeFilters.areaRange?.max) {
        const minArea = activeFilters.areaRange.min ? Number(activeFilters.areaRange.min) : 0;
        const maxArea = activeFilters.areaRange.max ? Number(activeFilters.areaRange.max) : Infinity;
        
        filtered = filtered.filter(property => {
          const area = Number(property.area);
          return area >= minArea && area <= maxArea;
        });
        console.log('After area filter:', filtered.length);
      }

      // Φιλτράρισμα με βάση τα χαρακτηριστικά
      if (activeFilters.features && activeFilters.features.length > 0) {
        filtered = filtered.filter(property =>
          activeFilters.features.every((feature: string) =>
            property.features?.includes(feature)
          )
        );
        console.log('After features filter:', filtered.length);
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
    router.push(`/agent/properties/${propertyId}`);
  };

  const handleFavoriteClick = async (propertyId: string) => {
    console.log('Toggle favorite:', propertyId);
  };

  const handleReset = () => {
    setSelectedLocation('');
    setActiveFilters(null);
    setDisplayedProperties(allProperties);
    setHasSearched(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Φόρτωση ακινήτων...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* Dynamic Navigation */}
      <DynamicNavbar />

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section with Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 overflow-hidden min-h-screen flex items-center justify-center"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-indigo-600/20"></div>
          
          <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col justify-center items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center mb-12"
            >
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Ακίνητα για Προώθηση
              </h1>
              <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                Ανακαλύψτε χιλιάδες ακίνητα σε όλη την Ελλάδα. Επιλέξτε τα καλύτερα για να τα προωθήσετε στους πελάτες σας.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
                <div className="flex flex-col gap-6">
                <LocationAutocomplete
                  onLocationSelect={handleLocationSelect}
                  onDrawAreaClick={handleDrawArea}
                />
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex flex-col sm:flex-row gap-3 flex-1">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsFilterModalOpen(true)}
                        className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 shadow-md"
                      >
                        <FaFilter className="mr-2" />
                        Φίλτρα Αναζήτησης
                        {activeFilters && (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-2 px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm rounded-full font-medium"
                          >
                            {Object.keys(activeFilters).length}
                          </motion.span>
                        )}
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      onClick={handleReset}
                        className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 shadow-md"
                      title="Επαναφορά όλων των φίλτρων"
                    >
                        <FaExchangeAlt className="rotate-90 mr-2" />
                      Επαναφορά
                    </motion.button>
                  </div>
                  <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    onClick={handleSearch}
                      className="flex items-center justify-center px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 shadow-lg font-medium text-lg"
                  >
                      <FaSearch className="mr-2" />
                      Αναζήτηση Ακινήτων
                  </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* View Mode Selector and Results */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gradient-to-b from-white via-purple-50 to-white rounded-3xl shadow-xl mt-[-4rem] relative z-10"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1"
            >
              <h2 className="text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">
                Όλα τα Διαθέσιμα Ακίνητα
              </h2>
              <p className="text-gray-500 text-lg mb-2">Ανακαλύψτε μοναδικά ακίνητα για να τα προωθήσετε στους πελάτες σας.</p>
              {hasSearched && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 text-gray-600"
                >
                  <FaSearch className="text-purple-500" />
                  <span className="font-medium">
                    {sortedProperties.length} {sortedProperties.length === 1 ? 'ακίνητο βρέθηκε' : 'ακίνητα βρέθηκαν'}
                </span>
                </motion.div>
              )}
            </motion.div>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-gray-600 font-medium mr-2">Ταξινόμηση:</label>
              <select
                id="sort"
                value={sortOption}
                onChange={e => { setSortOption(e.target.value); setCurrentPage(1); }}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
              >
                <option value="newest">Νεότερα</option>
                <option value="priceLow">Φθηνότερα</option>
                <option value="priceHigh">Ακριβότερα</option>
              </select>
            </div>
          </div>

          {/* Properties Display */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="mt-8 relative"
              >
            {viewMode === 'map' ? (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <PropertyMap 
                  properties={sortedProperties} 
                  onPropertyClick={(propertyId: string) => router.push(`/agent/properties/${propertyId}`)}
                />
              </div>
            ) : sortedProperties.length > 0 ? (
              <>
              <motion.div
                  layout
                  className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10' : 'grid-cols-1 gap-6'}`}
                >
                  {paginatedProperties.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: -5 }}
                      className="group"
                  >
                    <PropertyCard
                      property={property}
                      viewMode={viewMode}
                        onFavoriteClick={handleFavoriteClick}
                      isAuthenticated={isAuthenticated}
                      userRole="agent"
                    />
                  </motion.div>
                ))}
              </motion.div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-10">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full shadow-lg p-3 transition-all duration-300 hover:scale-110 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Προηγούμενη σελίδα"
                    >
                      <FaChevronDown className="w-5 h-5 rotate-90" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-200 text-lg ${
                          currentPage === i + 1
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg scale-110'
                            : 'bg-white border border-gray-200 text-purple-600 hover:bg-purple-50'
                        }`}
                        aria-current={currentPage === i + 1 ? 'page' : undefined}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full shadow-lg p-3 transition-all duration-300 hover:scale-110 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Επόμενη σελίδα"
                    >
                      <FaChevronDown className="w-5 h-5 rotate-0" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center py-24"
              >
                <div className="max-w-md mx-auto">
                  <div className="w-28 h-28 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                    <FaSearch className="w-16 h-16 text-purple-400" />
                  </div>
                  <h3 className="text-3xl font-extrabold text-gray-900 mb-4">
                    {hasSearched ? 'Δεν βρέθηκαν ακίνητα' : 'Δεν υπάρχουν διαθέσιμα ακίνητα'}
                </h3>
                  <p className="text-gray-500 mb-8 leading-relaxed text-lg">
                    {hasSearched 
                      ? 'Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης ή τα φίλτρα για να βρείτε περισσότερα αποτελέσματα.'
                      : 'Παρακαλώ δοκιμάστε ξανά αργότερα ή επικοινωνήστε μαζί μας για περισσότερες πληροφορίες.'
                    }
                  </p>
                  {hasSearched && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleReset}
                      className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 shadow-lg text-lg font-semibold"
                    >
                      Επαναφορά Φίλτρων
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="bg-white border-t border-gray-200 py-12 mt-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-sm" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  RealEstate
                </span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες. Βρείτε το ιδανικό σπίτι ή πουλήστε το ακίνητό σας με ευκολία.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/agent/properties" className="text-gray-600 hover:text-purple-600 transition-colors duration-200 flex items-center">
                    <FaSearch className="mr-2 text-purple-500" />
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/agent/about" className="text-gray-600 hover:text-purple-600 transition-colors duration-200 flex items-center">
                    <FaInfoCircle className="mr-2 text-purple-500" />
                    Σχετικά
                  </Link>
                </li>
                <li>
                  <Link href="/agent/contact" className="text-gray-600 hover:text-purple-600 transition-colors duration-200 flex items-center">
                    <FaEnvelope className="mr-2 text-purple-500" />
                    Επικοινωνία
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Επικοινωνία</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <FaEnvelope className="mr-3 text-purple-500" />
                  info@realestate.com
                </li>
                <li className="flex items-center">
                  <FaPhone className="mr-3 text-purple-500" />
                  +30 210 1234567
                </li>
                <li className="flex items-center">
                  <FaMapMarkerAlt className="mr-3 text-purple-500" />
                  Αθήνα, Ελλάδα
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg flex items-center justify-center hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 shadow-md">
                  <FaFacebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg flex items-center justify-center hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 shadow-md">
                  <FaTwitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg flex items-center justify-center hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 shadow-md">
                  <FaInstagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg flex items-center justify-center hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 shadow-md">
                  <FaLinkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-600">
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </div>
        </div>
      </motion.footer>

      {/* Property Details Modal */}
      {selectedProperty && (
        <PropertyDetailsModal
          property={selectedProperty}
          isOpen={!!selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleFilterApply}
      />
    </div>
  );
} 