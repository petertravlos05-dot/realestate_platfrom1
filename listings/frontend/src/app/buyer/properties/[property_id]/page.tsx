'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { FaRuler, FaMapMarkerAlt, FaHeart, FaPhone, FaEnvelope, FaUser, FaCheck, FaChevronLeft, FaChevronRight, FaHome, FaInfoCircle, FaHandshake, FaChartBar, FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';
import ImageGalleryModal from '@/components/ImageGalleryModal';
import { motion } from 'framer-motion';
import BuyerNavbar from '@/components/layout/BuyerNavbar';
import PropertyInquiryModal from '@/components/shared/PropertyInquiryModal';
import TransactionProgressModal from '@/components/TransactionProgressModal';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useNotifications } from '@/contexts/NotificationContext';
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
  poolType?: string;
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
  loadingRamp?: boolean;
  truckAccess?: boolean;
  fireSafety?: boolean;
  freightElevator?: boolean;
  toilets?: string;
  storeFrontLength?: string;
  maxHeight?: string;
  auxiliarySpaces?: string;
  landCategory?: string;
  ownershipType?: string;
  landArea?: string;
  buildingArea?: string;
  buildable?: boolean;
  morphology?: string;
  commercialCategory?: string;
  wc?: string;
  storefrontLength?: string;
  floorDetails?: string;
  amenities?: any;
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
  isFavorite?: boolean;
}

export default function PropertyDetailsPage() {
  const { property_id: propertyId } = useParams() as { property_id: string };
  const router = useRouter();
  const { data: session } = useSession();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false);
  const [interestCancelled, setInterestCancelled] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const { fetchNotifications } = useNotifications();

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const { data } = await apiClient.get(`/properties/${propertyId}`);
        setProperty(data.property || data);

        // Καταγραφή της προβολής (μετράει για το modal επισκόπησης ακινήτου του seller)
        try {
          await apiClient.post(`/properties/${propertyId}/view`);
        } catch (e) {
          // Αγνοούμε σφάλματα (π.χ. αν δεν είναι συνδεδεμένος)
        }
      } catch (err) {
        console.error('Error fetching property:', err);
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    const checkInterest = async () => {
      if (propertyId && session?.user) {
        try {
          const { data } = await apiClient.get(`/buyer/properties/${propertyId}/interest-status`);
          setHasExpressedInterest(data.hasExpressedInterest);
          setInterestCancelled(!!data.interestCancelled);
        } catch (error) {
          console.error('Error checking interest status:', error);
        }
      }
    };

    if (propertyId) {
      fetchProperty();
      checkInterest();
    }
  }, [propertyId, session]);

  const handleToggleFavorite = async () => {
    if (!session) {
      router.push('/buyer/auth/login');
      return;
    }

    try {
      await apiClient.post(`/buyer/properties/${propertyId}/favorite`);

      const { data: updatedProperty } = await apiClient.post(`/buyer/properties/${propertyId}/favorite`);
      setProperty(updatedProperty);
    } catch (err) {
      console.error('Error toggling favorite:', err);
      alert('Προέκυψε σφάλμα κατά την ενημέρωση των αγαπημένων');
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

  const handleInquiry = async (message: string) => {
    try {
      await apiClient.post(`/buyer/properties/${propertyId}/inquiry`, {
        message,
      });

      setShowInquiryModal(false);
      alert('Η ερώτησή σας στάλθηκε με επιτυχία!');
    } catch (err) {
      console.error('Error sending inquiry:', err);
      alert('Προέκυψε σφάλμα κατά την αποστολή της ερώτησης');
    }
  };

  const handleExpressInterest = async () => {
    if (!session) {
      router.push('/buyer/auth/login');
      return;
    }

    try {
      const { data } = await apiClient.post(`/buyer/properties/${propertyId}/express-interest`);
      setHasExpressedInterest(true);
      await fetchNotifications();
      
      // Αποθήκευσε το property ID ως νέο ακίνητο στο localStorage και για τα δύο κουμπιά
      const newProgress = JSON.parse(localStorage.getItem('newProgressNotifications') || '[]');
      if (!newProgress.includes(propertyId)) {
        newProgress.push(propertyId);
        localStorage.setItem('newProgressNotifications', JSON.stringify(newProgress));
      }
      const newAppointments = JSON.parse(localStorage.getItem('newAppointmentNotifications') || '[]');
      if (!newAppointments.includes(propertyId)) {
        newAppointments.push(propertyId);
        localStorage.setItem('newAppointmentNotifications', JSON.stringify(newAppointments));
      }
      
      // Μικρό delay για να δώσουμε χρόνο στο notification system να ενημερωθεί
      await new Promise(resolve => setTimeout(resolve, 100));
      
      toast.success('✅ Η εκδήλωση ενδιαφέροντος καταχωρήθηκε με επιτυχία!');
      router.push('/dashboard/buyer');
    } catch (err) {
      console.error('Error expressing interest:', err);
      const errorMessage = err instanceof Error ? err.message : 'Προέκυψε σφάλμα κατά την εκδήλωση ενδιαφέροντος';
      
      // Ειδική διαχείριση για το μήνυμα του seller
      if (errorMessage.includes('Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς')) {
        toast.error('❌ Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleRestoreInterest = async () => {
    if (!session) {
      router.push('/buyer/auth/login');
      return;
    }
    try {
      const { data } = await apiClient.patch(`/buyer/properties/${propertyId}`, { interestCancelled: false });
      if (data?.mode === 'request_sent') {
        toast.success('✅ Το αίτημα επαναφοράς στάλθηκε στον πωλητή για έγκριση.');
        return;
      }
      if (data?.mode === 'request_pending') {
        toast('⏳ Υπάρχει ήδη εκκρεμές αίτημα επαναφοράς προς τον πωλητή.');
        return;
      }
      setHasExpressedInterest(true);
      setInterestCancelled(false);
      toast.success('✅ Η συναλλαγή επανήλθε στις ενεργές συναλλαγές!');
      // Ενημέρωση του dashboard seller
      try {
        await apiClient.get('/seller/leads');
      } catch (e) {}
      router.push('/deals?tab=deals');
    } catch (err) {
      console.error('Error restoring interest:', err);
      const errorMessage = err instanceof Error ? err.message : 'Προέκυψε σφάλμα κατά την εκδήλωση ενδιαφέροντος';
      
      // Ειδική διαχείριση για το μήνυμα του seller
      if (errorMessage.includes('Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς')) {
        toast.error('❌ Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς');
      } else {
        toast.error(errorMessage);
      }
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

  // Δημιουργία πλήρους διεύθυνσης
  const fullAddress = property ? `${property.street} ${property.number}, ${property.city}, ${property.state}` : '';

  // Parse amenities from property
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex justify-center items-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-800 border-t-transparent"></div>
          <p className="text-gray-600 font-medium">Φόρτωση ακινήτου...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex justify-center items-center">
        <div className="bg-white border border-red-200 text-red-700 px-8 py-6 rounded-2xl shadow-xl max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaInfoCircle className="text-red-500 text-2xl" />
          </div>
          <h2 className="text-xl font-bold mb-2">Σφάλμα!</h2>
          <p className="mb-4">{error || 'Το ακίνητο δεν βρέθηκε'}</p>
          <Link href="/properties" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-lg hover:from-blue-900 hover:to-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl">
            <FaChevronLeft className="mr-2" />
            Επιστροφή στην αναζήτηση
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Navbar - ενσωματωμένο με hero όταν στο top, κανονικό μετά το scroll */}
      <BuyerNavbar signOutRedirect="/buyer" />

      {/* Main Content */}
      <main>
        {/* Hero Section - Fullscreen Gallery */}
        <section className="relative h-screen">
          {/* Background Image with Gradient Overlay */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowGalleryModal(true)}>
            <Image
              src={getPropertyImageUrl(property.images?.[currentImageIndex])}
              alt={property.title}
              layout="fill"
              objectFit="cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>

          {/* Image Gallery Controls */}
          {property.images && property.images.length > 1 && (
            <>
              <button 
                onClick={prevImage}
                className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 p-4 rounded-full shadow-lg transition-all group backdrop-blur-sm z-20"
                aria-label="Προηγούμενη εικόνα"
              >
                <FaChevronLeft className="text-white text-xl group-hover:scale-110 transition-transform" />
              </button>
              <button 
                onClick={nextImage}
                className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 p-4 rounded-full shadow-lg transition-all group backdrop-blur-sm z-20"
                aria-label="Επόμενη εικόνα"
              >
                <FaChevronRight className="text-white text-xl group-hover:scale-110 transition-transform" />
              </button>
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20">
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

          {/* Action Buttons */}
          <div className="absolute top-24 right-6 flex space-x-4 z-20">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleFavorite}
              className={`p-4 rounded-full shadow-lg transition-all backdrop-blur-sm ${
                property.isFavorite
                  ? 'bg-red-500 text-white'
                  : 'bg-white/90 hover:bg-white text-gray-700'
              }`}
              aria-label={property.isFavorite ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
            >
              <FaHeart className="text-xl" />
            </motion.button>
          </div>

          {/* Property Info Overlay - Header: Τίτλος, Τιμή, Τοποθεσία */}
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white z-10">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">{property.title}</h1>
                  <div className="flex items-center text-white/90 mb-4">
                    <FaMapMarkerAlt className="mr-3 text-blue-200 text-xl flex-shrink-0" />
                    <span className="text-lg">{fullAddress}</span>
                  </div>
                  {/* Quick Info Bar - 4 πιο σημαντικά χαρακτηριστικά με εικονίδια */}
                  {quickInfoItems.length > 0 && (
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                      {quickInfoItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full"
                        >
                          <span className="mr-2 text-blue-200">{item.icon}</span>
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
                      return isRent
                        ? `${property.price.toLocaleString('el-GR')} €/μήνα`
                        : `${property.price.toLocaleString('el-GR')} €`;
                    })()}
                  </p>
                  <div className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm ${
                    (property.propertySold || property.isSold) ? 'bg-slate-700/90' :
                    (property.depositLocked || property.isReserved) ? 'bg-amber-600/90' : 'bg-green-500/90'
                  }`}>
                    {(property.propertySold || property.isSold) ? 'Πουλημένο' :
                     (property.depositLocked || property.isReserved) ? 'Μη διαθεσίμο' : 'Διαθέσιμο'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <div className="mb-8">
              <Link href="/properties" className="inline-flex items-center text-blue-800 hover:text-blue-900 transition-colors text-sm font-medium">
                <FaChevronLeft className="mr-2" />
                Επιστροφή στην αναζήτηση
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Description - με "Read More" αν > 500 λέξεις */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-800 to-slate-700 rounded-lg flex items-center justify-center mr-3">
                      <FaInfoCircle className="text-white text-sm" />
                    </div>
                    Περιγραφή
                  </h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{descriptionPreview}</p>
                  {showReadMore && (
                    <button
                      onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                      className="mt-4 text-blue-800 font-medium hover:text-blue-900 transition-colors"
                    >
                      {descriptionExpanded ? 'Δείτε λιγότερα' : 'Διαβάστε περισσότερα'}
                    </button>
                  )}
                </motion.div>

                {/* Τεχνικά Χαρακτηριστικά - Πίνακας δύο στηλών (Label | Value) */}
                {techSpecs.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
                  >
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-800 to-slate-700 rounded-lg flex items-center justify-center mr-3">
                        <FaRuler className="text-white text-xs" />
                      </div>
                      Τεχνικά Χαρακτηριστικά
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {techSpecs.map((spec, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-baseline py-3 border-b border-gray-100 last:border-0"
                        >
                          <span className="font-semibold text-gray-700">{spec.label}</span>
                          <span className="text-gray-900">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Παροχές - Grid 4x4 με εικονίδια και checkmarks */}
                {amenitiesWithIcons.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
                  >
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-800 to-slate-700 rounded-lg flex items-center justify-center mr-3">
                        <FaHome className="text-white text-xs" />
                      </div>
                      Παροχές
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {amenitiesWithIcons.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <span className="text-blue-800 text-xl">{item.icon}</span>
                          <span className="font-medium text-gray-700">{item.label}</span>
                          <FaCheck className="ml-auto text-green-600 text-sm flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Stats */}
                {property.stats && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
                  >
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-800 to-slate-700 rounded-lg flex items-center justify-center mr-3">
                        <FaChartBar className="text-white text-xs" />
                      </div>
                      Στατιστικά
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-slate-50 p-6 rounded-xl border border-blue-200 text-center">
                        <p className="text-blue-800 text-sm font-medium mb-2">Προβολές</p>
                        <p className="text-3xl font-bold text-blue-800">{property.stats.views || 0}</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-slate-50 p-6 rounded-xl border border-blue-200 text-center">
                        <p className="text-blue-800 text-sm font-medium mb-2">Αγαπημένα</p>
                        <p className="text-3xl font-bold text-blue-800">{property.stats.favorites || 0}</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-slate-50 p-6 rounded-xl border border-blue-200 text-center">
                        <p className="text-blue-800 text-sm font-medium mb-2">Ερωτήσεις</p>
                        <p className="text-3xl font-bold text-blue-800">{property.stats.inquiries || 0}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 sticky top-24"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-800 to-slate-700 rounded-lg flex items-center justify-center mr-3">
                      <FaUser className="text-white text-xs" />
                    </div>
                    Στοιχεία Επικοινωνίας
                  </h2>
                  
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-800 to-slate-700 rounded-full flex items-center justify-center">
                      <FaUser className="text-white text-lg" />
                    </div>
                    <div className="ml-3">
                      <p className="text-lg font-bold text-gray-900">Πλατφόρμα</p>
                      <p className="text-gray-500 text-sm">Επικοινωνία μέσω πλατφόρμας</p>
                    </div>
                  </div>

                  {(property.propertySold || property.isSold) ? (
                    <div className="w-full mb-6 p-4 text-center bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                      <p className="font-medium">Το ακίνητο έχει πουληθεί</p>
                    </div>
                  ) : (property.depositLocked || property.isReserved) ? (
                    <div className="w-full mb-6 p-4 text-center bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                      <p className="font-medium">Το ακίνητο έχει γίνει reserved σε κάποιον άλλο χρήστη</p>
                      <p className="text-sm mt-2 text-amber-700">Δεν είναι δυνατή η εκδήλωση ενδιαφέροντος προς το παρόν.</p>
                    </div>
                  ) : !hasExpressedInterest ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleExpressInterest}
                      className="w-full mb-6 flex items-center justify-center px-6 py-4 rounded-xl text-white font-medium text-lg transition-all duration-300 bg-gradient-to-r from-blue-800 to-slate-700 hover:from-blue-900 hover:to-slate-800 shadow-lg hover:shadow-xl"
                    >
                      <FaHandshake className="mr-3 text-xl" />
                      Εκδήλωση Ενδιαφέροντος
                    </motion.button>
                  ) : interestCancelled ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleRestoreInterest}
                      className="w-full mb-6 flex items-center justify-center px-6 py-4 rounded-xl text-white font-medium text-lg transition-all duration-300 bg-gradient-to-r from-blue-800 to-slate-700 hover:from-blue-900 hover:to-slate-800 shadow-lg hover:shadow-xl"
                    >
                      <FaHandshake className="mr-3 text-xl" />
                      Επαναφορά Ενδιαφέροντος
                    </motion.button>
                  ) : (
                    <div className="w-full mb-6 p-4 text-center bg-gradient-to-r from-blue-50 to-slate-50 text-blue-800 rounded-xl border border-blue-200">
                      <FaCheck className="text-xl mx-auto mb-2" />
                      Έχετε ήδη εκδηλώσει ενδιαφέρον για αυτό το ακίνητο
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                    <Link
                      href="/buyer/contact"
                      className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <FaEnvelope className="mr-3 text-blue-800" />
                      <span>Επικοινωνήστε με την πλατφόρμα</span>
                    </Link>
                  </div>

                  {!(property.propertySold || property.isSold) && !(property.depositLocked || property.isReserved) && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowInquiryModal(true)}
                    className="w-full bg-white border-2 border-blue-800 text-blue-800 py-3 px-4 rounded-xl hover:bg-blue-50 transition-colors text-sm font-medium"
                  >
                    Στείλτε Ερώτηση
                  </motion.button>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modal ερώτησης */}
      {showInquiryModal && (
        <PropertyInquiryModal
          propertyId={property.id}
          onSave={handleInquiry}
          onClose={() => setShowInquiryModal(false)}
        />
      )}

      {showProgressModal && property && (
        <TransactionProgressModal
          isOpen={showProgressModal}
          onClose={() => setShowProgressModal(false)}
          transactionId={property.id}
          buyerName={session?.user?.name || ''}
          propertyTitle={property.title}
        />
      )}

      {/* Image Gallery Modal */}
      {showGalleryModal && property && property.images && property.images.length > 0 && (
        <ImageGalleryModal
          isOpen={showGalleryModal}
          onClose={() => setShowGalleryModal(false)}
          images={property.images.map(getPropertyImageUrl)}
          currentIndex={currentImageIndex}
          onImageChange={setCurrentImageIndex}
          propertyTitle={property.title}
        />
      )}

      {/* Modern Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="bg-gradient-to-r from-blue-800 to-slate-700 bg-clip-text text-transparent">RealEstate</span>
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες με ασφάλεια και εμπιστοσύνη.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/properties" className="text-gray-600 hover:text-blue-800 transition-colors duration-200">
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/buyer/about" className="text-gray-600 hover:text-blue-800 transition-colors duration-200">
                    Σχετικά
                  </Link>
                </li>
                <li>
                  <Link href="/buyer/contact" className="text-gray-600 hover:text-blue-800 transition-colors duration-200">
                    Επικοινωνία
                  </Link>
                </li>
                <li>
                  <Link href="/buyer/how-it-works" className="text-gray-600 hover:text-blue-800 transition-colors duration-200">
                    Πώς Λειτουργεί
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Επικοινωνία</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <FaEnvelope className="mr-2 text-blue-800" />
                  info@realestate.com
                </li>
                <li className="flex items-center">
                  <FaPhone className="mr-2 text-blue-800" />
                  +30 210 1234567
                </li>
                <li className="flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-blue-800" />
                  Αθήνα, Ελλάδα
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors duration-200">
                  <FaFacebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-blue-400 text-white rounded-lg flex items-center justify-center hover:bg-blue-500 transition-colors duration-200">
                  <FaTwitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-pink-600 text-white rounded-lg flex items-center justify-center hover:bg-pink-700 transition-colors duration-200">
                  <FaInstagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-lg flex items-center justify-center hover:from-blue-900 hover:to-slate-800 transition-colors duration-200">
                  <FaLinkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-600">
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 