"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { FaList, FaThLarge, FaMapMarked, FaFilter, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaUser, FaHome, FaEnvelope, FaInfoCircle, FaQuestionCircle, FaCog, FaComments, FaExchangeAlt, FaSearch, FaChartBar, FaHeart, FaShare, FaStar, FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined, FaEuroSign, FaTimes, FaChevronDown, FaPhone, FaUserCircle, FaSignOutAlt, FaHandshake } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import PropertyCard from '@/components/properties/PropertyCard';
import PropertyMap from '@/components/properties/PropertyMap';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import BuyerHeader from '@/components/layout/BuyerHeader';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import SearchBar from '@/components/search/SearchBar';
import PropertyDetailsModal from '@/components/properties/PropertyDetailsModal';
import LocationAutocomplete from '@/components/search/LocationAutocomplete';
import FilterModal from '@/components/search/FilterModal';
import NotificationBell from '@/components/notifications/NotificationBell';

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

function PropertiesPageContent() {
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
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
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
      setUserRole('buyer'); // Προσωρινά το θέτουμε ως buyer
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

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/buyer');
  };

  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'BUYER') {
      router.push('/buyer');
    } else if (role === 'AGENT') {
      router.push('/agent');
    } else if (role === 'SELLER') {
      router.push('/seller');
    }
  };

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { fetchFromBackend } = await import('@/lib/api/client');
        const response = await fetchFromBackend('/properties');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseData = await response.json();
        const properties = Array.isArray(responseData) 
          ? responseData 
          : (responseData.data || responseData.properties || []);
        
        if (!Array.isArray(properties)) {
          setAllProperties([]);
          setDisplayedProperties([]);
          return;
        }
        
        const available = properties.filter((p: any) => !(p.propertySold ?? p.isSold ?? p.isReserved));
        setAllProperties(available);
        setDisplayedProperties(available);
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

  // Εφαρμογή φίλτρων από URL params όταν έρχεται από hero search
  useEffect(() => {
    if (loading || allProperties.length === 0) return;
    
    const loc = searchParams?.get('location')?.trim();
    const type = searchParams?.get('type'); // sale | rent
    const price = searchParams?.get('price');
    
    if (!loc && !type && !price) return;
    
    const urlFilters: any = {};
    if (loc) setSelectedLocation(loc);
    if (type) urlFilters.type = type;
    if (price) {
      const p = parseInt(price, 10);
      if (!isNaN(p)) urlFilters.priceRange = { min: '', max: String(p) };
    }
    if (Object.keys(urlFilters).length > 0) {
      setActiveFilters((prev: any) => ({ ...prev, ...urlFilters }));
    }
    setHasSearched(true);

    let filtered = [...allProperties];
    
    if (loc) {
      const locLower = loc.toLowerCase();
      filtered = filtered.filter((p: Property) => {
        const locStr = ((p.location || '') + ' ' + (p.city || '') + ' ' + (p.state || '')).toLowerCase();
        return locStr.includes(locLower);
      });
    }
    if (type) {
      filtered = filtered.filter((p: any) => {
        const a = p.amenities;
        const lt = a && typeof a === 'object' ? (a.listingType ?? a.transactionType ?? '') : '';
        const isRent = String(lt).toLowerCase() === 'rent';
        return type === 'rent' ? isRent : !isRent;
      });
    }
    if (price) {
      const maxP = parseInt(price, 10);
      if (!isNaN(maxP)) {
        filtered = filtered.filter((p: Property) => Number(p.price) <= maxP);
      }
    }
    
    setDisplayedProperties(filtered);
  }, [loading, allProperties, searchParams?.toString()]);

  const handleLocationSelect = (locations: string[]) => {
    setSelectedLocation(locations[0] || '');
  };

  const handleDrawArea = () => {
    console.log('Draw area clicked');
  };

  /** Μετρά μόνο τα ενεργά φίλτρα (όχι κενά/προεπιλεγμένα) */
  const countActiveFilters = (f: any): number => {
    if (!f) return 0;
    let n = 0;
    if (f.priceRange?.min || f.priceRange?.max) n++;
    if (f.area?.min || f.area?.max) n++;
    if (f.bedrooms && f.bedrooms !== '-') n++;
    if (f.bathrooms && f.bathrooms !== '-') n++;
    if (f.propertyType?.length > 0) n++;
    if (f.constructionYear?.max && Number(f.constructionYear.max) < 2025) n++;
    if (f.renovationYear?.max && Number(f.renovationYear.max) < 2025) n++;
    if (f.view) n++;
    if (f.furnished) n++;
    if (f.nearMetro) n++;
    if (f.parking) n++;
    if (f.inSettlement) n++;
    if (f.inCityPlan) n++;
    if (f.landUse) n++;
    if (f.commercialType) n++;
    if (f.usageLicense) n++;
    if (f.streetFacing) n++;
    return n;
  };

  const handleFilterApply = (filters: any) => {
    setActiveFilters(filters);
    const filteredResults = applyFilters(allProperties, filters);
    setDisplayedProperties(filteredResults);
    setHasSearched(true);
  };

  const applyFilters = (properties: Property[], filtersOverride?: any) => {
    let filtered = [...properties];
    const filters = filtersOverride ?? activeFilters;

    // Φιλτράρισμα με βάση την τοποθεσία (location, city, state)
    if (selectedLocation) {
      const locLower = selectedLocation.toLowerCase();
      filtered = filtered.filter((property: Property) => {
        const locStr = ((property.location || '') + ' ' + (property.city || '') + ' ' + (property.state || '')).toLowerCase();
        return locStr.includes(locLower);
      });
    }

    // Φιλτράρισμα με βάση τύπο (αγορά/ενοικίαση) από URL
    if (filters?.type) {
      filtered = filtered.filter((property: any) => {
        const a = property.amenities;
        const lt = a && typeof a === 'object' ? (a.listingType ?? a.transactionType ?? '') : '';
        const isRent = String(lt).toLowerCase() === 'rent';
        return filters.type === 'rent' ? isRent : !isRent;
      });
    }

    if (filters) {
      // Φιλτράρισμα με βάση την τιμή
      if (filters.priceRange?.min || filters.priceRange?.max) {
        const minPrice = filters.priceRange.min ? Number(filters.priceRange.min) : 0;
        const maxPrice = filters.priceRange.max ? Number(filters.priceRange.max) : Infinity;
        filtered = filtered.filter(property => {
          const price = Number(property.price);
          return price >= minPrice && price <= maxPrice;
        });
      }

      // Φιλτράρισμα με βάση τον τύπο ακινήτου (propertyType: APARTMENT, HOUSE, VILLA, LAND, OFFICE, STORE)
      if (filters.propertyType && filters.propertyType.length > 0) {
        filtered = filtered.filter((property: any) => {
          const pt = (property.propertyType || property.type || '').toUpperCase();
          return filters.propertyType.some((t: string) => 
            (t || '').toUpperCase() === pt || 
            (t === 'Villa' && pt === 'VILLA')
          );
        });
      }

      // Φιλτράρισμα με βάση τα υπνοδωμάτια ('1+' -> 1, '2+' -> 2)
      if (filters.bedrooms && filters.bedrooms !== '-') {
        const minBedrooms = parseInt(String(filters.bedrooms).replace(/\D/g, '') || '0');
        if (minBedrooms > 0) {
          filtered = filtered.filter(property => 
            Number(property.bedrooms ?? 0) >= minBedrooms
          );
        }
      }

      // Φιλτράρισμα με βάση τα μπάνια
      if (filters.bathrooms && filters.bathrooms !== '-') {
        const minBathrooms = parseInt(String(filters.bathrooms).replace(/\D/g, '') || '0');
        if (minBathrooms > 0) {
          filtered = filtered.filter(property => 
            Number(property.bathrooms ?? 0) >= minBathrooms
          );
        }
      }

      // Φιλτράρισμα με βάση το εμβαδόν
      if (filters.area?.min || filters.area?.max) {
        const minArea = filters.area.min ? Number(filters.area.min) : 0;
        const maxArea = filters.area.max ? Number(filters.area.max) : Infinity;
        filtered = filtered.filter(property => {
          const area = Number(property.area ?? 0);
          return area >= minArea && area <= maxArea;
        });
      }

      // Φιλτράρισμα με βάση έτος κατασκευής
      if (filters.constructionYear?.max) {
        const maxYear = Number(filters.constructionYear.max);
        filtered = filtered.filter(property => {
          const year = Number((property as any).yearBuilt ?? 0);
          return year === 0 || year <= maxYear;
        });
      }

      // Φιλτράρισμα επιπλέον χαρακτηριστικών από amenities
      const a = filters;
      if (a.parking || a.furnished || a.nearMetro || a.view) {
        filtered = filtered.filter((property: any) => {
          const amenities = property.amenities && typeof property.amenities === 'object' ? property.amenities : {};
          const hasParking = !!(amenities.parking || (property.parkingSpaces ?? 0) > 0);
          const hasFurnished = !!amenities.furnished;
          const hasNearMetro = !!(amenities.nearMetro || amenities.nearMetroStation);
          const hasView = !!(amenities.view || amenities.hasView);
          if (a.parking && !hasParking) return false;
          if (a.furnished && !hasFurnished) return false;
          if (a.nearMetro && !hasNearMetro) return false;
          if (a.view && !hasView) return false;
          return true;
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

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchFavorites = async () => {
      try {
        const res = await fetch('/api/favorites');
        if (!res.ok) return;
        const data = await res.json();
        const ids = (Array.isArray(data) ? data : []).map((f: any) => f.propertyId || f.property?.id).filter(Boolean);
        setFavoriteIds(new Set(ids));
      } catch (e) {
        console.error('Fetch favorites:', e);
      }
    };
    fetchFavorites();
  }, [isAuthenticated]);

  const handleFavoriteClick = async (propertyId: string) => {
    if (!isAuthenticated) {
      router.push('/buyer/auth/login');
      return;
    }
    try {
      const isFav = favoriteIds.has(propertyId);
      if (isFav) {
        await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId }),
          credentials: 'include',
        });
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(propertyId);
          return next;
        });
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId }),
          credentials: 'include',
        });
        setFavoriteIds((prev) => new Set([...prev, propertyId]));
      }
    } catch (e) {
      console.error('Toggle favorite:', e);
    }
  };

  const handleReset = () => {
    setSelectedLocation('');
    setActiveFilters(null);
    setDisplayedProperties(allProperties);
    setHasSearched(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-800 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Φόρτωση ακινήτων...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Enhanced Header */}
      <header className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Link href="/buyer" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-slate-800 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-sm" />
                </div>
                <span className={`text-xl font-bold ${isScrolled ? 'bg-gradient-to-r from-blue-900 to-slate-800 bg-clip-text text-transparent' : 'text-white'}`}>
                  RealEstate
                </span>
              </Link>
              {status === 'authenticated' && (
                <div className="relative" ref={roleMenuRef}>
                  <button 
                    onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-full shadow-sm transition-all duration-300 whitespace-nowrap ${
                      isScrolled 
                        ? 'bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800' 
                        : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                    }`}
                  >
                    <FaUserCircle className="mr-2" />
                    Buyer Mode
                    <FaChevronDown className={`ml-2 text-xs transition-transform duration-200 ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isRoleMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="absolute left-0 mt-3 w-64 bg-white rounded-2xl shadow-xl py-3 border border-gray-100 z-50 overflow-hidden"
                      >
                        {/* Header */}
                        <div className="px-6 py-3 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-100">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                            <FaExchangeAlt className="mr-2 text-blue-700" />
                            Αλλαγή Ρόλου
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">Επιλέξτε τον ρόλο που θέλετε να χρησιμοποιήσετε</p>
                        </div>
                        
                        {/* Options */}
                        <div className="py-2">
                          <div
                            role="button"
                            tabIndex={0}
                            className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group cursor-pointer"
                            onClick={(e) => { e.preventDefault(); setIsRoleMenuOpen(false); handleRoleChange('AGENT'); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsRoleMenuOpen(false); handleRoleChange('AGENT'); } }}
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-800 to-slate-700 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                              <FaUserCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 group-hover:text-blue-800 transition-colors duration-200">
                                Agent Mode
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Διαχείριση πελατών και ακινήτων
                              </div>
                            </div>
                            <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-700 transition-colors duration-200" />
                          </div>
                          
                          <div
                            role="button"
                            tabIndex={0}
                            className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-green-50 transition-all duration-200 group cursor-pointer"
                            onClick={(e) => { e.preventDefault(); setIsRoleMenuOpen(false); handleRoleChange('SELLER'); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsRoleMenuOpen(false); handleRoleChange('SELLER'); } }}
                          >
                            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                              <FaUserCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors duration-200">
                                Seller Mode
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Διαχείριση ακινήτων και πωλήσεων
                              </div>
                            </div>
                            <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors duration-200" />
                          </div>
                        </div>
                        
                        {/* Footer */}
                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                          <p className="text-xs text-gray-500 text-center">
                            Τρέχων: <span className="font-semibold text-blue-800">Buyer Mode</span>
                          </p>
                          <p className="text-xs text-gray-500 text-center mt-1">
                            Είστε Επαγγελματίας;{' '}
                            <Link
                              href="/professionals"
                              className="font-semibold text-blue-800 hover:text-blue-900 underline underline-offset-2"
                            >
                              πατήστε εδώ
                            </Link>
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              <Link
                href="/properties"
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  pathname === '/properties' 
                    ? (isScrolled ? 'bg-slate-100 text-blue-800' : 'bg-white/10 text-white')
                    : (isScrolled ? 'text-gray-700 hover:bg-slate-100 hover:text-blue-800' : 'text-white hover:bg-white/10')
                }`}
              >
                <FaSearch className="mr-2" />
                Ακίνητα
              </Link>
              <Link
                href="/buyer/contact"
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isScrolled ? 'text-gray-700 hover:bg-slate-100 hover:text-blue-800' : 'text-white hover:bg-white/10'
                }`}
              >
                <FaEnvelope className="mr-2" />
                Επικοινωνία
              </Link>
              <Link
                href="/buyer/about"
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isScrolled ? 'text-gray-700 hover:bg-slate-100 hover:text-blue-800' : 'text-white hover:bg-white/10'
                }`}
              >
                <FaInfoCircle className="mr-2" />
                Σχετικά
              </Link>
              <Link
                href="/buyer/how-it-works"
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isScrolled ? 'text-gray-700 hover:bg-slate-100 hover:text-blue-800' : 'text-white hover:bg-white/10'
                }`}
              >
                <FaQuestionCircle className="mr-2" />
                Πώς Λειτουργεί
              </Link>
              {status === 'authenticated' && (
                <Link
                  href="/deals"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    pathname === '/deals' || pathname?.startsWith('/deals/')
                      ? (isScrolled ? 'bg-slate-100 text-blue-800' : 'bg-white/10 text-white')
                      : (isScrolled ? 'text-gray-700 hover:bg-slate-100 hover:text-blue-800' : 'text-white hover:bg-white/10')
                  }`}
                >
                  <FaHandshake className="mr-2" />
                  Συναλλαγές
                </Link>
              )}
            </nav>

            <div className="flex items-center space-x-3">
              {status === 'authenticated' ? (
                <>
                  <Link
                    href="/buyer"
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                      isScrolled 
                        ? 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-800' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                    title="Επιστροφή στην Αρχική"
                  >
                    <FaHome className="w-4 h-4" />
                  </Link>
                  <NotificationBell />
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md ${
                        isScrolled 
                          ? 'bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800' 
                          : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                      }`}
                    >
                      <FaUser className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {isProfileMenuOpen && (
                        <motion.div
                          key="profile-menu"
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100 z-50 overflow-hidden"
                        >
                          <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-800 to-slate-700 flex items-center justify-center flex-shrink-0">
                                <FaUser className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">{session?.user?.name || 'Χρήστης'}</p>
                                <p className="text-[11px] text-gray-500 truncate">{session?.user?.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="py-1">
                            <Link
                              href="/buyer/profile?tab=settings"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-100 group-hover:scale-105 transition-all duration-200">
                                <FaCog className="w-3.5 h-3.5 text-blue-700" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-blue-800 transition-colors">Ρυθμίσεις / Προφίλ</span>
                            </Link>
                            <Link
                              href="/buyer/profile?tab=favorites"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center mr-3 group-hover:bg-red-100 group-hover:scale-105 transition-all duration-200">
                                <FaHeart className="w-3.5 h-3.5 text-red-500" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-red-600 transition-colors">Αγαπημένα</span>
                            </Link>
                            <Link
                              href="/buyer/profile?tab=faq"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-100 group-hover:scale-105 transition-all duration-200">
                                <FaQuestionCircle className="w-3.5 h-3.5 text-blue-700" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-blue-800 transition-colors">Συχνές Ερωτήσεις</span>
                            </Link>
                          </div>
                          <div className="border-t border-gray-100" />
                          <div className="py-1">
                            <Link
                              href="/"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center mr-3 group-hover:bg-slate-200 group-hover:scale-105 transition-all duration-200">
                                <FaExchangeAlt className="w-3.5 h-3.5 text-slate-600" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-slate-800 transition-colors">Αλλαγή Ρόλων</span>
                            </Link>
                            <button
                              onClick={handleSignOut}
                              className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center mr-3 group-hover:bg-red-100 group-hover:scale-105 transition-all duration-200">
                                <FaSignOutAlt className="w-3.5 h-3.5 text-red-600" />
                              </div>
                              <span className="font-medium group-hover:text-red-700 transition-colors">Αποσύνδεση</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/buyer/auth/login"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
                    }`}
                  >
                    Σύνδεση
                  </Link>
                  <Link
                    href="/buyer/auth/register"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-sm ${
                      isScrolled 
                        ? 'bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    Εγγραφή
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - χωρίς pt-16 ώστε το hero να ξεκινάει από την κορυφή και το navbar να επιπλέει πάνω του */}
      <main>
        {/* Hero Section with Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden min-h-screen flex items-center justify-center"
        >
          {/* Background Image */}
          <Image
            src="/images/hero-1.png"
            alt="Ακίνητα στην Ελλάδα"
            fill
            className="object-cover"
            priority
          />
          {/* Dark overlay για ανάγνωσιμο κείμενο */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70"></div>
          
          <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 flex flex-col justify-center items-center min-h-screen">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center mb-12"
            >
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Βρείτε το Ιδανικό Ακίνητο
              </h1>
              <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
                Ανακαλύψτε χιλιάδες ακίνητα σε όλη την Ελλάδα. Αναζητήστε, συγκρίνετε και βρείτε το σπίτι των ονείρων σας.
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
                    initialSelectedLocations={selectedLocation ? [selectedLocation] : []}
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
                        {activeFilters && countActiveFilters(activeFilters) > 0 && (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-2 px-3 py-1 bg-gradient-to-r from-blue-800 to-slate-700 text-white text-sm rounded-full font-medium"
                          >
                            {countActiveFilters(activeFilters)}
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
                      className="flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-xl hover:from-blue-900 hover:to-slate-800 transition-all duration-300 shadow-lg font-medium text-lg"
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
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white rounded-3xl shadow-xl border border-gray-100 mt-[-4rem] relative z-10"
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
              <p className="text-gray-500 text-lg mb-2">Ανακαλύψτε μοναδικά ακίνητα σε όλη την Ελλάδα.</p>
              {hasSearched && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 text-gray-600"
                >
                  <FaSearch className="text-blue-800" />
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
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-800 text-gray-700"
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
                  onPropertyClick={(propertyId: string) => router.push(`/properties/${propertyId}`)}
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
                        isFavorite={favoriteIds.has(property.id)}
                        userRole="buyer"
                      />
                    </motion.div>
                  ))}
                </motion.div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-10">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-full shadow-lg p-3 transition-all duration-300 hover:scale-110 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                            ? 'bg-gradient-to-r from-blue-800 to-slate-700 text-white shadow-lg scale-110'
                            : 'bg-white border border-gray-200 text-blue-800 hover:bg-slate-50'
                        }`}
                        aria-current={currentPage === i + 1 ? 'page' : undefined}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-full shadow-lg p-3 transition-all duration-300 hover:scale-110 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="py-24"
              >
                <div className="max-w-2xl mx-auto text-center mb-12">
                  <div className="w-28 h-28 bg-gradient-to-r from-blue-100 to-slate-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                    <FaSearch className="w-16 h-16 text-blue-800" />
                  </div>
                  <h3 className="text-3xl font-extrabold text-gray-900 mb-4">
                    {hasSearched ? 'Δεν βρέθηκαν ακίνητα στην περιοχή ή με τα φίλτρα που βάλατε' : 'Δεν υπάρχουν διαθέσιμα ακίνητα'}
                  </h3>
                  <p className="text-gray-500 mb-8 leading-relaxed text-lg">
                    {hasSearched 
                      ? 'Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης ή δείτε άλλα διαθέσιμα ακίνητα παρακάτω.'
                      : 'Παρακαλώ δοκιμάστε ξανά αργότερα ή επικοινωνήστε μαζί μας για περισσότερες πληροφορίες.'
                    }
                  </p>
                  {hasSearched && (
                    <div className="flex flex-wrap gap-4 justify-center">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleReset}
                        className="px-8 py-4 bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-xl hover:from-blue-900 hover:to-slate-800 transition-all duration-300 shadow-lg text-lg font-semibold"
                      >
                        Επαναφορά Φίλτρων
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* Άλλα διαθέσιμα ακίνητα - μόνο αν έχει κάνει αναζήτηση και υπάρχουν άλλα */}
                {hasSearched && allProperties.length > 0 && (
                  <div className="mt-12 pt-12 border-t border-gray-200">
                    <h4 className="text-xl font-bold text-gray-900 mb-6 text-center">
                      Άλλα διαθέσιμα ακίνητα
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {allProperties.slice(0, 6).map((property, index) => (
                        <motion.div
                          key={property.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.05 }}
                          whileHover={{ y: -5 }}
                        >
                          <PropertyCard
                            property={property}
                            viewMode="grid"
                            onFavoriteClick={handleFavoriteClick}
                            isAuthenticated={isAuthenticated}
                            isFavorite={favoriteIds.has(property.id)}
                            userRole="buyer"
                          />
                        </motion.div>
                      ))}
                    </div>
                    {allProperties.length > 6 && (
                      <div className="text-center mt-6">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleReset}
                          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
                        >
                          Δείτε όλα τα {allProperties.length} ακίνητα
                        </motion.button>
                      </div>
                    )}
                  </div>
                )}
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
        className="bg-[#f5f0e8] border-t border-stone-300/40 py-12 mt-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-900 to-slate-800 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-sm" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-slate-800 bg-clip-text text-transparent">
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
                  <Link href="/properties" className="text-gray-600 hover:text-blue-800 transition-colors duration-200 flex items-center">
                    <FaSearch className="mr-2 text-blue-700" />
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-gray-600 hover:text-blue-800 transition-colors duration-200 flex items-center">
                    <FaInfoCircle className="mr-2 text-blue-700" />
                    Σχετικά
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-600 hover:text-blue-800 transition-colors duration-200 flex items-center">
                    <FaEnvelope className="mr-2 text-blue-700" />
                    Επικοινωνία
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Επικοινωνία</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <FaEnvelope className="mr-3 text-blue-700" />
                  info@realestate.com
                </li>
                <li className="flex items-center">
                  <FaPhone className="mr-3 text-blue-700" />
                  +30 210 1234567
                </li>
                <li className="flex items-center">
                  <FaMapMarkerAlt className="mr-3 text-blue-700" />
                  Αθήνα, Ελλάδα
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200">
                  <FaFacebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200">
                  <FaTwitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200">
                  <FaInstagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200">
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
        initialFilters={activeFilters}
      />
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" /></div>}>
      <PropertiesPageContent />
    </Suspense>
  );
}
