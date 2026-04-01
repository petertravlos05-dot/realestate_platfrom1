'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { FaBed, FaBath, FaRuler, FaMapMarkerAlt, FaHeart, FaShare, FaPhone, FaEnvelope, 
         FaUser, FaCheck, FaChevronLeft, FaChevronRight, FaChevronDown, FaHome, FaSearch, FaInfoCircle, 
         FaQuestionCircle, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaCog, FaComments, 
         FaExchangeAlt, FaSignOutAlt, FaLink, FaHandshake, FaArrowLeft, FaArrowRight, 
         FaBuilding, FaTachometerAlt, FaUserTie, FaCaretDown, FaChartBar, FaUserCircle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import PropertyInquiryModal from '@/components/shared/PropertyInquiryModal';
import AgentPropertyShareModal from '@/components/agent/AgentPropertyShareModal';
import ImageGalleryModal from '@/components/ImageGalleryModal';
import AgentNotificationBell from '@/components/notifications/AgentNotificationBell';
import { apiClient } from '@/lib/api/client';
import { getPropertyImageUrl } from '@/lib/utils/propertyImageUrl';
import { getQuickInfoItems, getTechSpecs, getAmenitiesWithIcons } from '@/lib/propertyDetailsConfig';

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
  propertySold?: boolean;
  depositLocked?: boolean;
  amenities?: any;
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
  const { property_id } = useParams() as { property_id: string };
  const router = useRouter();
  const { data: session, status } = useSession();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  /*
  useEffect(() => {
    if (session && session.user.role !== 'agent') {
      router.push('/');
    }
  }, [session, router]);
  */

  useEffect(() => {
    if (status === 'unauthenticated') {
      const returnTo = `/agent/properties/${property_id}`;
      router.push(`/agent/auth/login?callbackUrl=${encodeURIComponent(returnTo)}`);
    }
  }, [status, router, property_id]);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/agent/properties/${property_id}`);
        setProperty(data);

        // Check if property is in favorites
        try {
          const favResponse = await apiClient.get(`/agent/favorites/${property_id}`);
          setIsFavorite(favResponse.data.isFavorite);
        } catch (e) {
          // Property might not be in favorites
        }
      } catch (err) {
        console.error('Error fetching property:', err);
        setError(err instanceof Error ? err.message : 'Προέκυψε σφάλμα κατά τη φόρτωση των λεπτομερειών του ακινήτου');
      } finally {
        setLoading(false);
      }
    };

    if (status !== 'authenticated') {
      return;
    }

    if (property_id) {
      fetchProperty();
    }
  }, [property_id, status]);

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
    } else if (role === 'SELLER') {
      router.push('/seller');
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

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/agent');
  };

  const handleInquiry = async (message: string) => {
    try {
      await apiClient.post(`/agent/properties/${property_id}/inquiry`, { message });

      setShowInquiryModal(false);
      toast.success('Η ερώτησή σας στάλθηκε με επιτυχία!');
    } catch (err) {
      console.error('Error sending inquiry:', err);
      toast.error('Προέκυψε σφάλμα κατά την αποστολή της ερώτησης');
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
      if (isFavorite) {
        await apiClient.delete(`/agent/favorites/${property_id}`);
      } else {
        await apiClient.post(`/agent/favorites/${property_id}`);
      }

      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? 'Αφαιρέθηκε από τα αγαπημένα' : 'Προστέθηκε στα αγαπημένα');
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Προέκυψε σφάλμα');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="bg-red-50 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-2">Σφάλμα!</h2>
          <p>{error || 'Το ακίνητο δεν βρέθηκε'}</p>
          <Link href="/agent/properties" className="mt-4 inline-block text-indigo-600 hover:underline">
            Επιστροφή στα ακίνητα
          </Link>
        </div>
      </div>
    );
  }

  const fullAddress = property ? `${property.street} ${property.number}, ${property.city}, ${property.state}` : '';

  let amenitiesData: Record<string, unknown> | null = null;
  if (property?.amenities) {
    if (typeof property.amenities === 'string') {
      try {
        amenitiesData = JSON.parse(property.amenities);
      } catch {
        amenitiesData = null;
      }
    } else {
      amenitiesData = property.amenities as Record<string, unknown>;
    }
  }

  const propAsRecord = property ? (property as unknown as Record<string, unknown>) : {};
  const quickInfoItems = getQuickInfoItems(propAsRecord);
  const techSpecs = getTechSpecs(propAsRecord, amenitiesData);
  const amenitiesWithIcons = getAmenitiesWithIcons(propAsRecord, amenitiesData);

  const descriptionLength = property?.fullDescription?.split(/\s+/).filter(Boolean).length ?? 0;
  const showReadMore = descriptionLength > 500;
  const descriptionPreview = showReadMore && !descriptionExpanded
    ? property?.fullDescription?.split(/\s+/).filter(Boolean).slice(0, 500).join(' ') + '...'
    : property?.fullDescription ?? '';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Agent Navbar - same as /agent/properties */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100' : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-6">
          <div className="flex items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/agent" className="flex items-center group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mr-2 shadow-lg transition-colors ${
                  isScrolled ? 'bg-gradient-to-br from-indigo-600 to-indigo-700' : 'bg-white/20 backdrop-blur-sm border border-white/30'
                }`}>
                  <FaHome className="w-5 h-5 text-white" />
                </div>
                <span className={`text-xl font-bold transition-colors ${
                  isScrolled ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text text-transparent' : 'text-white'
                }`}>RealEstate</span>
              </Link>
              <div className="relative" ref={roleMenuRef}>
                <button
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all ${
                    isScrolled
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-lg'
                      : 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30'
                  }`}
                >
                  <FaUserCircle className="mr-2 w-4 h-4" />
                  Referral Agent
                  <FaChevronDown className={`ml-2 w-3 h-3 transition-transform duration-200 ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isRoleMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="absolute left-0 mt-3 w-64 bg-white rounded-2xl shadow-xl py-3 border border-gray-100 z-50 overflow-hidden"
                    >
                      <div className="px-6 py-3 bg-gradient-to-r from-indigo-50 to-indigo-50/50 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                          <FaExchangeAlt className="mr-2 text-indigo-500" />
                          Αλλαγή Ρόλου
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Επιλέξτε τον ρόλο που θέλετε να χρησιμοποιήσετε</p>
                      </div>
                      <div className="py-2">
                        <div
                          onClick={() => { handleRoleChange('BUYER'); setIsRoleMenuOpen(false); }}
                          className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <FaUserCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">Buyer Mode</div>
                            <div className="text-xs text-gray-500 mt-1">Αναζήτηση και αγορά ακινήτων</div>
                          </div>
                          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                        </div>
                        <div
                          onClick={() => { handleRoleChange('SELLER'); setIsRoleMenuOpen(false); }}
                          className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-200 cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <FaUserCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors duration-200">Seller Mode</div>
                            <div className="text-xs text-gray-500 mt-1">Διαχείριση ακινήτων και πωλήσεων</div>
                          </div>
                          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors duration-200" />
                        </div>
                      </div>
                      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs text-gray-500 text-center">
                          Τρέχων: <span className="font-semibold text-indigo-600">Referral Agent</span>
                        </p>
                        <p className="text-xs text-gray-500 text-center mt-1">
                          Είστε Επαγγελματίας;{' '}
                          <Link
                            href="/professionals"
                            className="font-semibold text-indigo-700 hover:text-indigo-800 underline underline-offset-2"
                          >
                            πατήστε εδώ
                          </Link>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <nav className="flex items-center space-x-10">
                <Link href="/agent" className={`transition-all font-medium relative group ${isScrolled ? 'text-gray-600 hover:text-indigo-600' : 'text-white hover:text-white/90'}`}>
                  Αρχική<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all" />
                </Link>
                <Link href="/agent/properties" className={`transition-all font-medium relative group ${isScrolled ? 'text-gray-600 hover:text-indigo-600' : 'text-white hover:text-white/90'}`}>
                  Ακίνητα<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all" />
                </Link>
                <Link href="/agent/about" className={`transition-all font-medium relative group ${isScrolled ? 'text-gray-600 hover:text-indigo-600' : 'text-white hover:text-white/90'}`}>
                  Σχετικά<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all" />
                </Link>
                <Link href="/agent/contact" className={`transition-all font-medium relative group ${isScrolled ? 'text-gray-600 hover:text-indigo-600' : 'text-white hover:text-white/90'}`}>
                  Επικοινωνία<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all" />
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-3">
              {session ? (
                <>
                  <AgentNotificationBell variant={!isScrolled ? 'onDark' : 'default'} />
                  <Link href="/deals?from=agent&tab=overview" className={`px-5 py-2.5 rounded-lg transition-all font-semibold text-sm ${
                    isScrolled ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800' : 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30'
                  }`}>
                    Συναλλαγές
                  </Link>
                  <div className="relative" ref={profileMenuRef}>
                    <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md ${
                      isScrolled ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800' : 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30'
                    }`}>
                      <FaUser className="w-4 h-4" />
                    </button>
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{session?.user?.name || 'Χρήστης'}</p>
                          <p className="text-xs text-gray-500">{session?.user?.email}</p>
                        </div>
                        <Link href="/agent/profile" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-slate-50" onClick={() => setIsProfileMenuOpen(false)}>
                          <FaCog className="mr-3 text-indigo-500" /> Ρυθμίσεις
                        </Link>
                        <Link href="/agent/messages" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-slate-50" onClick={() => setIsProfileMenuOpen(false)}>
                          <FaComments className="mr-3 text-indigo-500" /> Μηνύματα
                        </Link>
                        <Link href="/agent/about#faq" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-slate-50" onClick={() => setIsProfileMenuOpen(false)}>
                          <FaQuestionCircle className="mr-3 text-indigo-500" /> FAQ
                        </Link>
                        <div className="border-t my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            void handleLogout();
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                        >
                          <FaSignOutAlt className="mr-3" /> Αποσύνδεση
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link href="/agent/auth/login" className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isScrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/20'}`}>
                    Σύνδεση
                  </Link>
                  <Link href="/agent/auth/register" className={`px-5 py-2.5 rounded-lg transition-all font-semibold text-sm ${
                    isScrolled ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-lg' : 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30'
                  }`}>
                    Εγγραφή
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section - Fullscreen Gallery (όπως buyer) */}
        <section className="relative h-screen pt-16">
          <div className="absolute inset-0 cursor-pointer" onClick={() => property.images?.length > 0 && setShowGalleryModal(true)}>
            {property.images && property.images.length > 0 ? (
              <Image
                src={getPropertyImageUrl(property.images?.[currentImageIndex])}
                alt={property.title}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Δεν υπάρχει εικόνα</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>

          {property.images && property.images.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-6 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-4 rounded-full shadow-lg z-20"
                aria-label="Προηγούμενη εικόνα"
              >
                <FaChevronLeft className="text-white text-xl" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-4 rounded-full shadow-lg z-20"
                aria-label="Επόμενη εικόνα"
              >
                <FaChevronRight className="text-white text-xl" />
              </button>
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex space-x-3 z-20">
                {property.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index); }}
                    className={`w-4 h-4 rounded-full transition-all ${
                      index === currentImageIndex ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/80'
                    }`}
                    aria-label={`Εικόνα ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Property overlay στο κάτω μέρος - κουμπιά καρδιά/προώθηση αφαιρέθηκαν */}
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white z-10">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">{property.title}</h1>
                  <div className="flex items-center text-white/90 mb-4">
                    <FaMapMarkerAlt className="mr-3 text-indigo-200 text-xl flex-shrink-0" />
                    <span className="text-lg">{fullAddress}</span>
                  </div>
                  {quickInfoItems.length > 0 && (
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                      {quickInfoItems.map((item, idx) => (
                        <div key={idx} className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                          <span className="mr-2 text-indigo-200">{item.icon}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg">
                    {(() => {
                      const a = property.amenities;
                      const isRent = a && typeof a === 'object' && (a.listingType || a.transactionType) && String(a.listingType || a.transactionType).toLowerCase() === 'rent';
                      return isRent ? `${property.price.toLocaleString('el-GR')} €/μήνα` : `${property.price.toLocaleString('el-GR')} €`;
                    })()}
                  </p>
                  <div className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm ${
                    (property.propertySold || property.isSold) ? 'bg-slate-700/90' :
                    (property as any).depositLocked || property.isReserved ? 'bg-amber-600/90' : 'bg-indigo-600/90'
                  }`}>
                    {(property.propertySold || property.isSold) ? 'Πουλημένο' :
                     (property as any).depositLocked || property.isReserved ? 'Μη διαθεσίμο' : 'Διαθέσιμο'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section (όπως buyer) */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <Link href="/agent/properties" className="inline-flex items-center text-indigo-600 hover:text-indigo-700 transition-colors text-sm font-medium">
                <FaChevronLeft className="mr-2" />
                Επιστροφή στα ακίνητα
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Description */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center mr-3">
                      <FaInfoCircle className="text-white text-sm" />
                    </div>
                    Περιγραφή
                  </h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{descriptionPreview}</p>
                  {showReadMore && (
                    <button onClick={() => setDescriptionExpanded(!descriptionExpanded)} className="mt-4 text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
                      {descriptionExpanded ? 'Δείτε λιγότερα' : 'Διαβάστε περισσότερα'}
                    </button>
                  )}
                </motion.div>

                {/* Τεχνικά Χαρακτηριστικά */}
                {techSpecs.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center mr-3">
                        <FaRuler className="text-white text-xs" />
                      </div>
                      Τεχνικά Χαρακτηριστικά
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {techSpecs.map((spec, idx) => (
                        <div key={idx} className="flex justify-between items-baseline py-3 border-b border-gray-100 last:border-0">
                          <span className="font-semibold text-gray-700">{spec.label}</span>
                          <span className="text-gray-900">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Παροχές */}
                {amenitiesWithIcons.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center mr-3">
                        <FaHome className="text-white text-xs" />
                      </div>
                      Παροχές
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {amenitiesWithIcons.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors">
                          <span className="text-indigo-600 text-xl">{item.icon}</span>
                          <span className="font-medium text-gray-700">{item.label}</span>
                          <FaCheck className="ml-auto text-green-600 text-sm flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Stats */}
                {property.stats && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center mr-3">
                        <FaChartBar className="text-white text-xs" />
                      </div>
                      Στατιστικά
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-50/50 p-6 rounded-xl border border-indigo-200 text-center">
                        <p className="text-indigo-600 text-sm font-medium mb-2">Προβολές</p>
                        <p className="text-3xl font-bold text-indigo-600">{property.stats.views || 0}</p>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-50/50 p-6 rounded-xl border border-indigo-200 text-center">
                        <p className="text-indigo-600 text-sm font-medium mb-2">Αγαπημένα</p>
                        <p className="text-3xl font-bold text-indigo-600">{property.stats.favorites || 0}</p>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-50/50 p-6 rounded-xl border border-indigo-200 text-center">
                        <p className="text-indigo-600 text-sm font-medium mb-2">Ερωτήσεις</p>
                        <p className="text-3xl font-bold text-indigo-600">{property.stats.inquiries || 0}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Sidebar */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 sticky top-24">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-6 h-6 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center mr-3">
                      <FaUser className="text-white text-xs" />
                    </div>
                    Στοιχεία Επικοινωνίας
                  </h2>
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-full flex items-center justify-center">
                      <FaHome className="text-white text-lg" />
                    </div>
                    <div className="ml-3">
                      <p className="text-lg font-bold text-gray-900">RealEstate</p>
                      <p className="text-gray-500 text-sm">Πλατφόρμα</p>
                    </div>
                  </div>
                  {!(property.propertySold || property.isSold) && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowShareModal(true)}
                      className="w-full mb-6 flex items-center justify-center px-6 py-4 rounded-xl text-white font-medium text-lg transition-all duration-300 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-lg hover:shadow-xl"
                    >
                      <FaHandshake className="mr-3 text-xl" />
                      Προώθηση Ακινήτου
                    </motion.button>
                  )}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center text-gray-700">
                      <FaPhone className="mr-3 text-indigo-600" />
                      <span>+30 210 1234567</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <FaEnvelope className="mr-3 text-indigo-600" />
                      <span>info@realestate.com</span>
                    </div>
                  </div>
                  {!(property.propertySold || property.isSold) && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowInquiryModal(true)}
                      className="w-full bg-white border-2 border-indigo-600 text-indigo-600 py-3 px-4 rounded-xl hover:bg-indigo-50 transition-colors text-sm font-medium"
                    >
                      Στείλτε Ερώτηση
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* Image Gallery Modal */}
      {showGalleryModal && property && property.images && property.images.length > 0 && (
        <ImageGalleryModal
          isOpen={showGalleryModal}
          onClose={() => setShowGalleryModal(false)}
          images={property.images.map((img) => getPropertyImageUrl(img))}
          currentIndex={currentImageIndex}
          onImageChange={setCurrentImageIndex}
          propertyTitle={property.title}
        />
      )}

      {/* Modals */}
      {showInquiryModal && (
        <PropertyInquiryModal
          propertyId={property.id}
          onSave={handleInquiry}
          onClose={() => setShowInquiryModal(false)}
        />
      )}

      {showShareModal && (
        <AgentPropertyShareModal
          propertyId={property.id}
          propertyTitle={property.title}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Footer - same as /agent/properties */}
      <footer className="bg-slate-900 text-slate-300 py-16 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="flex flex-col items-center space-y-8">
            <div>
              <div className="flex items-center justify-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-sm" />
                </div>
                <span className="text-lg font-bold text-white">RealEstate</span>
              </div>
              <p className="text-sm max-w-md mx-auto">
                Η πλατφόρμα που συνδέει συνεργάτες με αγοραστές και ενοικιαστές ακινήτων.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
              <Link href="/agent/properties" className="hover:text-white transition-colors text-sm">Ακίνητα</Link>
              <Link href="/agent/about" className="hover:text-white transition-colors text-sm">Σχετικά</Link>
              <Link href="/agent/contact" className="hover:text-white transition-colors text-sm">Επικοινωνία</Link>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center justify-center"><FaEnvelope className="mr-2 text-indigo-400" />info@realestate.com</span>
              <span className="flex items-center justify-center"><FaPhone className="mr-2 text-indigo-400" />+30 210 1234567</span>
              <span className="flex items-center justify-center"><FaMapMarkerAlt className="mr-2 text-indigo-400" />Αθήνα, Ελλάδα</span>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-10 pt-8 text-sm">
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. Με επιφύλαξη παντός δικαιώματος.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 