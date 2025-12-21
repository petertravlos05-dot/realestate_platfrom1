'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { FaBed, FaBath, FaRuler, FaMapMarkerAlt, FaHeart, FaShare, FaPhone, FaEnvelope, 
         FaUser, FaCheck, FaChevronLeft, FaChevronRight, FaHome, FaSearch, FaInfoCircle, 
         FaQuestionCircle, FaFacebook, FaTwitter, FaInstagram, FaLinkedin,
         FaCog, FaComments, FaExchangeAlt, FaSignOutAlt, FaThLarge, FaList, FaMapMarked, FaChevronDown, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import PropertyInquiryModal from '@/components/shared/PropertyInquiryModal';

interface Property {
  id: string;
  title: string;
  shortDescription?: string;
  fullDescription: string;
  price: number;
  propertyType: string;
  status: string;
  images: string[];
  bedrooms?: number;
  bathrooms?: number;
  area: number;
  yearBuilt?: number;
  floor?: string;
  heatingType?: string;
  heatingSystem?: string;
  energyClass?: string;
  condition?: string;
  renovationYear?: number;
  parkingSpaces?: number;
  garden?: boolean;
  multipleFloors?: boolean;
  commercialType?: string;
  rooms?: number;
  plotCategory?: string;
  plotOwnershipType?: string;
  windows?: string;
  windowsType?: string;
  flooring?: string;
  elevator?: boolean;
  furnished?: boolean;
  securityDoor?: boolean;
  alarm?: boolean;
  disabledAccess?: boolean;
  soundproofing?: boolean;
  thermalInsulation?: boolean;
  pool?: string;
  balconyArea?: number;
  hasBalcony?: boolean;
  plotArea?: number;
  buildingCoefficient?: number;
  coverageRatio?: number;
  facadeLength?: number;
  sides?: number;
  buildableArea?: number;
  buildingPermit?: boolean;
  roadAccess?: string;
  terrain?: string;
  shape?: string;
  suitability?: string;
  storageType?: string;
  elevatorType?: string;
  fireproofDoor?: boolean;
  state: string;
  city: string;
  neighborhood?: string;
  street: string;
  number: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  pricePerSquareMeter?: number;
  negotiable?: boolean;
  additionalPriceNotes?: string;
  isVerified?: boolean;
  isReserved?: boolean;
  isSold?: boolean;
  keywords?: string[];
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  stats?: {
    views: number;
    interestedCount: number;
    viewingCount: number;
    lastViewed?: Date;
    favorites?: number;
    inquiries?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export default function PropertyDetailsPage() {
  const params = useParams();
  const property_id = params?.property_id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/seller/properties/${property_id}`);
        
        if (!response.ok) {
          throw new Error('Αδυναμία φόρτωσης των λεπτομερειών του ακινήτου');
        }
        
        const data = await response.json();
        setProperty(data);
        
        // Check if property is in favorites
        const favResponse = await fetch(`/api/seller/favorites/${property_id}`);
        if (favResponse.ok) {
          const { isFavorite } = await favResponse.json();
          setIsFavorite(isFavorite);
        }
      } catch (err) {
        console.error('Error fetching property:', err);
        setError('Προέκυψε σφάλμα κατά τη φόρτωση των λεπτομερειών του ακινήτου');
      } finally {
        setLoading(false);
      }
    };

    if (property_id) {
      fetchProperty();
    }
  }, [property_id]);

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

  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'BUYER') {
      router.push('/buyer');
    } else if (role === 'AGENT') {
      router.push('/agent');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: property?.title,
        text: property?.fullDescription,
        url: window.location.href,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleLogout = () => {
    signOut();
  };

  const handleEdit = () => {
    router.push(`/seller/properties/${property_id}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το ακίνητο;')) {
      return;
    }

    try {
      const response = await fetch(`/api/seller/properties/${property_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Αδυναμία διαγραφής του ακινήτου');
      }

      toast.success('Το ακίνητο διαγράφηκε με επιτυχία');
      router.push('/seller/properties');
    } catch (err) {
      console.error('Error deleting property:', err);
      toast.error('Προέκυψε σφάλμα κατά τη διαγραφή του ακινήτου');
    }
  };

  const nextImage = () => {
    if (property && property.images.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === property.images.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const prevImage = () => {
    if (property && property.images.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? property.images.length - 1 : prevIndex - 1
      );
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const response = await fetch(`/api/seller/favorites/${property_id}`, {
        method: isFavorite ? 'DELETE' : 'POST',
      });

      if (!response.ok) {
        throw new Error(isFavorite ? 'Αδυναμία αφαίρεσης από τα αγαπημένα' : 'Αδυναμία προσθήκης στα αγαπημένα');
      }

      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? 'Αφαιρέθηκε από τα αγαπημένα' : 'Προστέθηκε στα αγαπημένα');
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Προέκυψε σφάλμα');
    }
  };

  // Δημιουργία πλήρους διεύθυνσης
  const fullAddress = property ? `${property.street} ${property.number}, ${property.city}, ${property.state}` : '';

  // Δημιουργία λιστών χαρακτηριστικών και παροχών
  const propertyFeatures = property ? [
    property.heatingType && `Θέρμανση: ${property.heatingType}`,
    property.heatingSystem && `Σύστημα θέρμανσης: ${property.heatingSystem}`,
    property.energyClass && `Ενεργειακή κλάση: ${property.energyClass}`,
    property.windows && `Κουφώματα: ${property.windows}`,
    property.windowsType && `Τύπος κουφωμάτων: ${property.windowsType}`,
    property.flooring && `Δάπεδο: ${property.flooring}`,
  ].filter(Boolean) : [];

  const propertyAmenities = property ? [
    property.elevator && 'Ανελκυστήρας',
    property.furnished && 'Επιπλωμένο',
    property.securityDoor && 'Πόρτα ασφαλείας',
    property.alarm && 'Συναγερμός',
    property.disabledAccess && 'Πρόσβαση ΑΜΕΑ',
    property.soundproofing && 'Ηχομόνωση',
    property.thermalInsulation && 'Θερμομόνωση',
    property.pool && `Πισίνα: ${property.pool}`,
    property.hasBalcony && 'Μπαλκόνι',
  ].filter(Boolean) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#001f3f]"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="bg-red-50 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-2">Σφάλμα!</h2>
          <p>{error || 'Το ακίνητο δεν βρέθηκε'}</p>
          <Link href="/seller/properties" className="mt-4 inline-block text-[#001f3f] hover:underline">
            Επιστροφή στα ακίνητά μου
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f4ff] to-[#e5eaff]">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - Left */}
            <div className="flex items-center">
              <Link href="/seller" className="flex items-center">
                <span className="text-2xl font-bold text-[#001f3f]">
                  RealEstate
                </span>
              </Link>
              <div className="relative ml-4" ref={roleMenuRef}>
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

            {/* Navigation - Center */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/seller/properties"
                className="text-base text-gray-600 hover:text-[#001f3f]"
              >
                Ακίνητα
              </Link>
              <Link
                href="/seller/about"
                className="text-base text-gray-600 hover:text-[#001f3f]"
              >
                Σχετικά
              </Link>
              <Link
                href="/seller/contact"
                className="text-base text-gray-600 hover:text-[#001f3f]"
              >
                Επικοινωνία
              </Link>
            </nav>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/seller"
                className="px-4 py-2 rounded-lg bg-[#001f3f] text-white hover:bg-[#003366] transition-colors duration-200"
              >
                Dashboard
              </Link>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-[#001f3f]"
                >
                  <FaUser className="w-5 h-5" />
                </button>
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                      ref={profileMenuRef}
                    >
                      <Link
                        href="/dashboard/seller/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <FaCog className="inline-block mr-2" />
                        Ρυθμίσεις
                      </Link>
                      <Link
                        href="/dashboard/seller/messages"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <FaComments className="inline-block mr-2" />
                        Μηνύματα
                      </Link>
                      <Link
                        href="/seller/how-it-works#faq"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <FaQuestionCircle className="inline-block mr-2" />
                        Συχνές Ερωτήσεις
                      </Link>
                      <Link
                        href="/"
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <FaExchangeAlt className="inline-block mr-2" />
                        Αλλαγή Ρόλων
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <FaSignOutAlt className="inline-block mr-2" />
                        Αποσύνδεση
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link href="/seller/properties" className="text-[#001f3f] hover:text-[#003366] transition-colors flex items-center text-sm">
            <FaChevronLeft className="mr-2" />
            Επιστροφή στα ακίνητά μου
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Image Gallery */}
          <div className="relative h-[500px] bg-gray-100">
            {property.images && property.images.length > 0 ? (
              <>
                <Image
                  src={property.images[currentImageIndex]}
                  alt={`${property.title} - Εικόνα ${currentImageIndex + 1}`}
                  fill
                  className="object-cover transition-opacity duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                  priority
                />
                {property.images.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 p-4 rounded-full shadow-lg transition-all group"
                      aria-label="Προηγούμενη εικόνα"
                    >
                      <FaChevronLeft className="text-white text-xl group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      onClick={nextImage}
                      className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 p-4 rounded-full shadow-lg transition-all group"
                      aria-label="Επόμενη εικόνα"
                    >
                      <FaChevronRight className="text-white text-xl group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3">
                      {property.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-4 h-4 rounded-full transition-all ${
                            index === currentImageIndex 
                              ? 'bg-white scale-110' 
                              : 'bg-white/50 hover:bg-white/80'
                          }`}
                          aria-label={`Εικόνα ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-500">Δεν υπάρχει εικόνα</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="absolute top-6 right-6 flex space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEdit}
                className="bg-white/90 hover:bg-white p-4 rounded-full text-gray-700 shadow-lg transition-all"
                aria-label="Επεξεργασία"
              >
                <FaEdit className="text-xl" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDelete}
                className="bg-white/90 hover:bg-white p-4 rounded-full text-red-500 shadow-lg transition-all"
                aria-label="Διαγραφή"
              >
                <FaTrash className="text-xl" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="bg-white/90 hover:bg-white p-4 rounded-full text-gray-700 shadow-lg transition-all"
                aria-label="Κοινή χρήση"
              >
                <FaShare className="text-xl" />
              </motion.button>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
              <div className="flex-1">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-2xl md:text-3xl font-bold text-[#001f3f] mb-2"
                >
                  {property.title}
                </motion.h1>
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex items-center text-gray-600 mb-3"
                >
                  <FaMapMarkerAlt className="mr-2 text-[#001f3f]" />
                  <span className="text-sm">{fullAddress}</span>
                </motion.div>
                <div className="flex flex-wrap items-center gap-3">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="flex items-center bg-gray-50 px-3 py-1 rounded-lg"
                  >
                    <FaBed className="mr-2 text-[#001f3f] text-sm" />
                    <span className="text-sm">{property.bedrooms || 0} Υπνοδωμάτια</span>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                    className="flex items-center bg-gray-50 px-3 py-1 rounded-lg"
                  >
                    <FaBath className="mr-2 text-[#001f3f] text-sm" />
                    <span className="text-sm">{property.bathrooms || 0} Μπάνια</span>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                    className="flex items-center bg-gray-50 px-3 py-1 rounded-lg"
                  >
                    <FaRuler className="mr-2 text-[#001f3f] text-sm" />
                    <span className="text-sm">{property.area || 0} m²</span>
                  </motion.div>
                </div>
              </div>
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col items-end"
              >
                <p className="text-2xl md:text-3xl font-bold text-[#001f3f] mb-2">
                  {property.price.toLocaleString('el-GR')} €
                </p>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {property.status === 'PENDING' ? 'Εκκρεμεί' : 
                   property.status === 'ACTIVE' ? 'Ενεργό' : 
                   property.status === 'SOLD' ? 'Πωλήθηκε' : 'Διαθέσιμο'}
                </div>
              </motion.div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-lg font-bold text-[#001f3f] mb-3 pb-2 border-b border-gray-200"
              >
                Περιγραφή
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-gray-600 whitespace-pre-line"
              >
                {property.fullDescription}
              </motion.p>
            </div>

            {/* Features & Amenities */}
            <div className="mb-6">
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-lg font-bold text-[#001f3f] mb-3 pb-2 border-b border-gray-200"
              >
                Χαρακτηριστικά & Παροχές
              </motion.h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#001f3f] mb-3 pb-2 border-b border-gray-200">Χαρακτηριστικά</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {propertyFeatures.length > 0 ? (
                      propertyFeatures.map((feature, index) => (
                        <li key={index} className="flex items-center text-gray-700 bg-gray-50 p-2 rounded-lg">
                          <FaCheck className="mr-2 text-[#001f3f] text-sm" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500 text-sm">Δεν υπάρχουν χαρακτηριστικά</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#001f3f] mb-3 pb-2 border-b border-gray-200">Παροχές</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {propertyAmenities.length > 0 ? (
                      propertyAmenities.map((amenity, index) => (
                        <li key={index} className="flex items-center text-gray-700 bg-gray-50 p-2 rounded-lg">
                          <FaCheck className="mr-2 text-[#001f3f] text-sm" />
                          <span className="text-sm">{amenity}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500 text-sm">Δεν υπάρχουν παροχές</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mb-6">
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-lg font-bold text-[#001f3f] mb-3 pb-2 border-b border-gray-200"
              >
                Επιπλέον Πληροφορίες
              </motion.h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {property.yearBuilt && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="bg-gray-50 p-3 rounded-lg"
                  >
                    <p className="text-gray-500 text-xs mb-1">Έτος κατασκευής</p>
                    <p className="text-base font-semibold text-[#001f3f]">{property.yearBuilt}</p>
                  </motion.div>
                )}
                {property.floor && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="bg-gray-50 p-3 rounded-lg"
                  >
                    <p className="text-gray-500 text-xs mb-1">Όροφος</p>
                    <p className="text-base font-semibold text-[#001f3f]">{property.floor}</p>
                  </motion.div>
                )}
                {property.heatingType && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                    className="bg-gray-50 p-3 rounded-lg"
                  >
                    <p className="text-gray-500 text-xs mb-1">Θέρμανση</p>
                    <p className="text-base font-semibold text-[#001f3f]">{property.heatingType || 'Δεν έχει οριστεί'}</p>
                  </motion.div>
                )}
                {property.heatingSystem && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                    className="bg-gray-50 p-3 rounded-lg"
                  >
                    <p className="text-gray-500 text-xs mb-1">Σύστημα θέρμανσης</p>
                    <p className="text-base font-semibold text-[#001f3f]">{property.heatingSystem || 'Δεν έχει οριστεί'}</p>
                  </motion.div>
                )}
                {property.energyClass && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.6 }}
                    className="bg-gray-50 p-3 rounded-lg"
                  >
                    <p className="text-gray-500 text-xs mb-1">Ενεργειακή κλάση</p>
                    <p className="text-base font-semibold text-[#001f3f]">{property.energyClass}</p>
                  </motion.div>
                )}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.7 }}
                  className="bg-gray-50 p-3 rounded-lg"
                >
                  <p className="text-gray-500 text-xs mb-1">Τύπος ακινήτου</p>
                  <p className="text-base font-semibold text-[#001f3f]">{property.propertyType}</p>
                </motion.div>
              </div>
            </div>

            {/* Stats */}
            {property.stats && (
              <div className="mb-6">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-lg font-bold text-[#001f3f] mb-3 pb-2 border-b border-gray-200"
                >
                  Στατιστικά
                </motion.h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="bg-blue-50 p-3 rounded-lg"
                  >
                    <p className="text-blue-600 text-xs mb-1">Προβολές</p>
                    <p className="text-xl font-bold text-blue-800">{property.stats.views || 0}</p>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="bg-green-50 p-3 rounded-lg"
                  >
                    <p className="text-green-600 text-xs mb-1">Αγαπημένα</p>
                    <p className="text-xl font-bold text-green-800">{property.stats.favorites || 0}</p>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                    className="bg-purple-50 p-3 rounded-lg"
                  >
                    <p className="text-purple-600 text-xs mb-1">Ερωτήσεις</p>
                    <p className="text-xl font-bold text-purple-800">{property.stats.inquiries || 0}</p>
                  </motion.div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

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