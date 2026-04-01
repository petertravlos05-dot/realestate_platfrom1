'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import {
  FaBed,
  FaBath,
  FaRuler,
  FaMapMarkerAlt,
  FaHeart,
  FaPhone,
  FaEnvelope,
  FaUser,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaHome,
  FaInfoCircle,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaChartBar,
} from 'react-icons/fa';
import ImageGalleryModal from '@/components/ImageGalleryModal';
import { motion } from 'framer-motion';
import PropertyInquiryModal from '@/components/shared/PropertyInquiryModal';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { getPropertyImageUrl } from '@/lib/utils/propertyImageUrl';

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
  coordinates?: { lat: number; lng: number };
  pricePerSquareMeter?: number;
  negotiable?: boolean;
  additionalPriceNotes?: string;
  isVerified?: boolean;
  isReserved?: boolean;
  isSold?: boolean;
  keywords?: string[];
  user: { id: string; name: string; email: string; phone?: string };
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
  const { id: propertyId } = useParams() as { id: string };
  const router = useRouter();
  const { data: session } = useSession();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const { data } = await apiClient.get(`/properties/${propertyId}`);
        const p = data.property || data;
        if (session?.user && p.favorites) {
          (p as any).isFavorite = p.favorites.some((f: any) => f.user?.id === (session.user as any).id);
        }
        setProperty(p);
        // Καταγραφή της προβολής (μετράει για το modal επισκόπησης ακινήτου του seller)
        try {
          await apiClient.post(`/properties/${propertyId}/view`);
        } catch (e) {}
      } catch (err) {
        console.error('Error fetching property:', err);
        setError('Σφάλμα κατά τη φόρτωση του ακινήτου');
      } finally {
        setLoading(false);
      }
    };
    if (propertyId) fetchProperty();
  }, [propertyId, session]);

  const handleToggleFavorite = async () => {
    if (!session) {
      router.push('/buyer/auth/login');
      return;
    }
    try {
      const { data } = await apiClient.post(`/buyer/properties/${propertyId}/favorite`);
      setProperty((p) => (p ? { ...p, isFavorite: data.isFavorite } : null));
    } catch (err) {
      console.error('Error toggling favorite:', err);
      alert('Προέκυψε σφάλμα κατά την ενημέρωση των αγαπημένων');
    }
  };

  const handleInquiry = async (message: string) => {
    try {
      await apiClient.post(`/buyer/properties/${propertyId}/inquiry`, { message });
      setShowInquiryModal(false);
      alert('Η ερώτησή σας στάλθηκε με επιτυχία!');
    } catch (err) {
      console.error('Error sending inquiry:', err);
      alert('Προέκυψε σφάλμα κατά την αποστολή της ερώτησης');
    }
  };

  const nextImage = () => {
    if (property?.images?.length) {
      setCurrentImageIndex((i) => (i === property.images.length - 1 ? 0 : i + 1));
    }
  };

  const prevImage = () => {
    if (property?.images?.length) {
      setCurrentImageIndex((i) => (i === 0 ? property.images.length - 1 : i - 1));
    }
  };

  const fullAddress = property ? `${property.street} ${property.number}, ${property.city}, ${property.state}` : '';

  let amenitiesData: any = null;
  if (property?.amenities) {
    amenitiesData = typeof property.amenities === 'string' ? (() => { try { return JSON.parse(property.amenities); } catch { return null; } })() : property.amenities;
  }

  const propertyFeatures = property ? [
    property.condition && `Κατάσταση: ${property.condition}`,
    property.yearBuilt && `Έτος κατασκευής: ${property.yearBuilt}`,
    property.renovationYear && `Έτος ανακαίνισης: ${property.renovationYear}`,
    property.parkingSpaces && `Θέσεις στάθμευσης: ${property.parkingSpaces}`,
    property.garden && 'Κήπος',
    property.multipleFloors && 'Πολλαπλοί όροφοι',
    property.heatingType && `Θέρμανση: ${property.heatingType}`,
    property.heatingSystem && `Σύστημα θέρμανσης: ${property.heatingSystem}`,
    property.energyClass && `Ενεργειακή κλάση: ${property.energyClass}`,
    property.windows && `Κουφώματα: ${property.windows}`,
    property.windowsType && `Τύπος κουφωμάτων: ${property.windowsType}`,
    property.flooring && `Δάπεδο: ${property.flooring}`,
    property.poolType && `Πισίνα: ${property.poolType}`,
    property.balconyArea && `Μπαλκόνι: ${property.balconyArea} τ.μ.`,
    property.commercialType && `Τύπος: ${property.commercialType}`,
    property.rooms && `Δωμάτια: ${property.rooms}`,
    property.wc && `WC: ${property.wc}`,
    property.storefrontLength && `Μήκος πρόσοψης: ${property.storefrontLength}μ`,
    property.maxHeight && `Μέγιστο ύψος: ${property.maxHeight}μ`,
    property.auxiliarySpaces && `Βοηθητικοί χώροι: ${property.auxiliarySpaces}`,
    property.commercialCategory && `Κατηγορία: ${property.commercialCategory}`,
    property.floorDetails && `Λεπτομέρειες δαπέδου: ${property.floorDetails}`,
    property.plotArea && `Εμβαδόν οικοπέδου: ${property.plotArea} τ.μ.`,
    property.buildingCoefficient && `Συντελεστής δόμησης: ${property.buildingCoefficient}`,
    property.coverageRatio && `Συντελεστής κάλυψης: ${property.coverageRatio}`,
    property.facadeLength && `Μήκος πρόσοψης: ${property.facadeLength}μ`,
    property.sides && `Αριθμός όψεων: ${property.sides}`,
    property.buildableArea && `Κτίζει: ${property.buildableArea} τ.μ.`,
    property.buildingPermit && 'Άδεια οικοδομής',
    property.roadAccess && `Πρόσβαση: ${property.roadAccess}`,
    property.terrain && `Κλίση: ${property.terrain}`,
    property.shape && `Μορφολογία: ${property.shape}`,
    property.suitability && `Καταλληλότητα: ${property.suitability}`,
    property.landCategory && `Κατηγορία γης: ${property.landCategory}`,
    property.ownershipType && `Τύπος ιδιοκτησίας: ${property.ownershipType}`,
    property.landArea && `Εμβαδόν γης: ${property.landArea} τ.μ.`,
    property.buildingArea && `Εμβαδόν κτιρίου: ${property.buildingArea} τ.μ.`,
    property.buildable && 'Οικοδομησίμο',
    property.morphology && `Μορφολογία: ${property.morphology}`,
    property.plotCategory && `Κατηγορία οικοπέδου: ${property.plotCategory}`,
    property.plotOwnershipType && `Τύπος ιδιοκτησίας οικοπέδου: ${property.plotOwnershipType}`,
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
    property.loadingRamp && 'Ράμπα φορτοεκφόρτωσης',
    property.truckAccess && 'Πρόσβαση φορτηγού',
    property.fireSafety && 'Πυρασφάλεια',
    property.fireproofDoor && 'Πυρασφαλή πόρτα',
    property.storageType && `Αποθήκη: ${property.storageType}`,
    property.elevatorType && `Ανελκυστήρας: ${property.elevatorType}`,
    property.freightElevator && 'Ανελκυστήρας φορτίου',
    property.toilets && `Τουαλέτες: ${property.toilets}`,
    property.buildingPermit && 'Άδεια οικοδομής',
    ...(amenitiesData?.electricity ? ['Παροχή Ρεύματος'] : []),
    ...(amenitiesData?.water ? ['Παροχή Νερού'] : []),
    ...(amenitiesData?.buildingPermit ? ['Άδεια Οικοδομής'] : []),
    ...(amenitiesData?.containerPermit ? ['Άδεια Κοντέινερ'] : []),
    ...(amenitiesData?.pea ? ['ΠΕΑ'] : []),
    ...(amenitiesData?.fenced ? ['Περιφραγμένο'] : []),
    ...(amenitiesData?.withinPlan ? ['Εντός Σχεδίου'] : []),
    ...(amenitiesData?.withinSettlement ? ['Εντός Οικισμού'] : []),
    ...(amenitiesData?.reforestable ? ['Αναδασωσίμο'] : []),
    ...(amenitiesData?.landUse ? [`Χρήση Γης: ${amenitiesData.landUse}`] : []),
    ...(amenitiesData?.completeness ? [`Πληρότητα: ${amenitiesData.completeness}`] : []),
    ...(amenitiesData?.storage ? ['Αποθήκη'] : []),
    ...(amenitiesData?.guestHouse ? ['Ξενώνας'] : []),
    ...(amenitiesData?.jacuzzi ? ['Τζακούζι'] : []),
    ...(amenitiesData?.outdoorSports ? ['Αθλητικοί Εξωτερικοί Χώροι'] : []),
    ...(amenitiesData?.gym ? ['Γυμναστήριο'] : []),
    ...(amenitiesData?.sauna ? ['Σάουνα'] : []),
    ...(amenitiesData?.fireplace ? ['Τζάκι'] : []),
    ...(amenitiesData?.airConditioning ? ['Κλιματισμός'] : []),
    ...(amenitiesData?.solarWaterHeater ? ['Ηλιακός Θερμοσίφωνας'] : []),
    ...(amenitiesData?.smartTv ? ['Smart TV'] : []),
    ...(amenitiesData?.bbq ? ['BBQ'] : []),
    ...(amenitiesData?.electricalAppliances ? ['Ηλεκτρικές Συσκευές'] : []),
    ...(amenitiesData?.threePhaseElectricity ? ['Ρεύμα – Τριφασικό'] : []),
    ...(amenitiesData?.waterSupply ? ['Ύδρευση'] : []),
    ...(amenitiesData?.falseCeiling ? ['Ψευδοροφή'] : []),
    ...(amenitiesData?.airConditioningHeating ? ['A/C - Κεντρική Θέρμανση'] : []),
    ...(amenitiesData?.internetStructuredCabling ? ['Internet/Δομημένη Καλωδίωση'] : []),
    ...(amenitiesData?.alarm ? ['Συναγερμός'] : []),
    ...(amenitiesData?.equipment ? ['Εξοπλισμός'] : []),
    ...(amenitiesData?.energyCertificate ? ['Ενεργειακό Πιστοποιητικό'] : []),
    ...(amenitiesData?.disabledAccess ? ['Πρόσβαση ΑΜΕΑ'] : []),
    ...(amenitiesData?.parking ? ['Στάθμευση'] : []),
  ].filter(Boolean) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-[#ecfdf5] flex justify-center items-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-600"></div>
          <p className="text-gray-600 font-medium">Φόρτωση ακινήτου...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-[#ecfdf5] flex justify-center items-center">
        <div className="bg-white border border-red-200 text-red-700 px-8 py-6 rounded-2xl shadow-xl max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaInfoCircle className="text-red-500 text-2xl" />
          </div>
          <h2 className="text-xl font-bold mb-2">Σφάλμα!</h2>
          <p className="mb-4">{error || 'Το ακίνητο δεν βρέθηκε'}</p>
          <Link href="/properties" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-300 shadow-lg hover:shadow-xl">
            <FaChevronLeft className="mr-2" />
            Επιστροφή στα ακίνητα
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-[#ecfdf5]">
      <main>
        <section className="relative h-screen">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowGalleryModal(true)}>
            <Image
              src={property.images?.length ? property.images[currentImageIndex] : '/images/hero-1.png'}
              alt={property.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>

          {property.images?.length > 1 && (
            <>
              <button onClick={prevImage} className="absolute left-6 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-4 rounded-full shadow-lg transition-all group backdrop-blur-sm z-20" aria-label="Προηγούμενη εικόνα">
                <FaChevronLeft className="text-white text-xl group-hover:scale-110 transition-transform" />
              </button>
              <button onClick={nextImage} className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-4 rounded-full shadow-lg transition-all group backdrop-blur-sm z-20" aria-label="Επόμενη εικόνα">
                <FaChevronRight className="text-white text-xl group-hover:scale-110 transition-transform" />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-3 z-20">
                {property.images.map((_, i) => (
                  <button key={i} onClick={() => setCurrentImageIndex(i)} className={`w-4 h-4 rounded-full transition-all ${i === currentImageIndex ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/80'}`} aria-label={`Εικόνα ${i + 1}`} />
                ))}
              </div>
            </>
          )}

          <div className="absolute top-24 right-6 flex space-x-4 z-20">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleToggleFavorite} className={`p-4 rounded-full shadow-lg transition-all backdrop-blur-sm ${property.isFavorite ? 'bg-red-500 text-white' : 'bg-white/90 hover:bg-white text-gray-700'}`} aria-label={property.isFavorite ? 'Αφαίρεση από αγαπημένα' : 'Προσθήκη στα αγαπημένα'}>
              <FaHeart className="text-xl" />
            </motion.button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 text-white z-10">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">{property.title}</h1>
                  <div className="flex items-center text-white/90 mb-4">
                    <FaMapMarkerAlt className="mr-3 text-green-300 text-xl" />
                    <span className="text-lg">{fullAddress}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                      <FaBed className="mr-2 text-green-300" />
                      <span className="font-medium">{property.bedrooms || 0} Υπνοδωμάτια</span>
                    </div>
                    <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                      <FaBath className="mr-2 text-green-300" />
                      <span className="font-medium">{property.bathrooms || 0} Μπάνια</span>
                    </div>
                    <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                      <FaRuler className="mr-2 text-green-300" />
                      <span className="font-medium">{property.area || 0} m²</span>
                    </div>
                  </div>
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
                  <div className="px-4 py-2 rounded-full text-sm font-medium bg-green-500/90 backdrop-blur-sm">Διαθέσιμο</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <Link href="/properties" className="inline-flex items-center text-green-600 hover:text-green-700 transition-colors text-sm font-medium">
                <FaChevronLeft className="mr-2" />
                Επιστροφή στα ακίνητα
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-700 rounded-lg flex items-center justify-center mr-3">
                      <FaInfoCircle className="text-white text-sm" />
                    </div>
                    Περιγραφή
                  </h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{property.fullDescription}</p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                        <FaCheck className="text-white text-xs" />
                      </div>
                      Χαρακτηριστικά
                    </h2>
                    {propertyFeatures.length > 0 ? (
                      <ul className={propertyFeatures.length > 5 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
                        {propertyFeatures.map((f, i) => (
                          <li key={i} className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                            <FaCheck className="mr-3 text-green-500 text-sm" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-gray-500 text-center py-4">Δεν υπάρχουν χαρακτηριστικά</div>
                    )}
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                        <FaHome className="text-white text-xs" />
                      </div>
                      Παροχές
                    </h2>
                    <ul className="space-y-3">
                      {propertyAmenities.length > 0 ? (
                        propertyAmenities.map((a, i) => (
                          <li key={i} className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                            <FaCheck className="mr-3 text-purple-500 text-sm" />
                            <span>{a}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 text-center py-4">Δεν υπάρχουν παροχές</li>
                      )}
                    </ul>
                  </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mr-3">
                      <FaRuler className="text-white text-xs" />
                    </div>
                    Επιπλέον Πληροφορίες
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {property.yearBuilt && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                        <p className="text-green-600 text-xs font-medium mb-1">Έτος κατασκευής</p>
                        <p className="text-lg font-bold text-gray-900">{property.yearBuilt}</p>
                      </div>
                    )}
                    {property.floor && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                        <p className="text-green-600 text-xs font-medium mb-1">Όροφος</p>
                        <p className="text-lg font-bold text-gray-900">{property.floor}</p>
                      </div>
                    )}
                    {property.heatingType && (
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                        <p className="text-purple-600 text-xs font-medium mb-1">Θέρμανση</p>
                        <p className="text-lg font-bold text-gray-900">{property.heatingType}</p>
                      </div>
                    )}
                    {property.energyClass && (
                      <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-xl border border-orange-100">
                        <p className="text-orange-600 text-xs font-medium mb-1">Ενεργειακή κλάση</p>
                        <p className="text-lg font-bold text-gray-900">{property.energyClass}</p>
                      </div>
                    )}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                      <p className="text-green-600 text-xs font-medium mb-1">Τύπος ακινήτου</p>
                      <p className="text-lg font-bold text-gray-900">{property.propertyType}</p>
                    </div>
                  </div>
                </motion.div>

                {property.stats && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center mr-3">
                        <FaChartBar className="text-white text-xs" />
                      </div>
                      Στατιστικά
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100 text-center">
                        <p className="text-green-600 text-sm font-medium mb-2">Προβολές</p>
                        <p className="text-3xl font-bold text-green-800">{property.stats.views || 0}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100 text-center">
                        <p className="text-green-600 text-sm font-medium mb-2">Αγαπημένα</p>
                        <p className="text-3xl font-bold text-green-800">{property.stats.favorites || 0}</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100 text-center">
                        <p className="text-purple-600 text-sm font-medium mb-2">Ερωτήσεις</p>
                        <p className="text-3xl font-bold text-purple-800">{property.stats.inquiries || 0}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="lg:col-span-1">
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 sticky top-24">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-600 to-emerald-700 rounded-lg flex items-center justify-center mr-3">
                      <FaUser className="text-white text-xs" />
                    </div>
                    Στοιχεία Επικοινωνίας
                  </h2>
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-700 rounded-full flex items-center justify-center">
                      <FaUser className="text-white text-lg" />
                    </div>
                    <div className="ml-3">
                      <p className="text-lg font-bold text-gray-900">{property.user.name}</p>
                      <p className="text-gray-500 text-sm">Ιδιοκτήτης</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    {property.user.phone && (
                      <div className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-lg">
                        <FaPhone className="mr-3 text-green-500" />
                        <span>{property.user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-lg">
                      <FaEnvelope className="mr-3 text-green-500" />
                      <span>{property.user.email}</span>
                    </div>
                  </div>

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowInquiryModal(true)} className="w-full bg-white border-2 border-green-600 text-green-600 py-3 px-4 rounded-xl hover:bg-green-50 transition-colors text-sm font-medium">
                    Στείλτε Ερώτηση
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {showInquiryModal && (
        <PropertyInquiryModal propertyId={property.id} onSave={handleInquiry} onClose={() => setShowInquiryModal(false)} />
      )}

      {showGalleryModal && property?.images?.length > 0 && (
        <ImageGalleryModal isOpen={showGalleryModal} onClose={() => setShowGalleryModal(false)} images={(property.images ?? []).map(getPropertyImageUrl)} currentIndex={currentImageIndex} onImageChange={setCurrentImageIndex} propertyTitle={property.title} />
      )}

      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">RealEstate</span>
              </h3>
              <p className="text-gray-600 leading-relaxed">Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες με ασφάλεια και εμπιστοσύνη.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-3">
                <li><Link href="/properties" className="text-gray-600 hover:text-green-600 transition-colors duration-200">Ακίνητα</Link></li>
                <li><Link href="/buyer/about" className="text-gray-600 hover:text-green-600 transition-colors duration-200">Σχετικά</Link></li>
                <li><Link href="/buyer/contact" className="text-gray-600 hover:text-green-600 transition-colors duration-200">Επικοινωνία</Link></li>
                <li><Link href="/buyer/how-it-works" className="text-gray-600 hover:text-green-600 transition-colors duration-200">Πώς Λειτουργεί</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Επικοινωνία</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center"><FaEnvelope className="mr-2 text-green-500" />info@realestate.com</li>
                <li className="flex items-center"><FaPhone className="mr-2 text-green-500" />+30 210 1234567</li>
                <li className="flex items-center"><FaMapMarkerAlt className="mr-2 text-green-500" />Αθήνα, Ελλάδα</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-green-600 text-white rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors duration-200"><FaFacebook className="w-5 h-5" /></a>
                <a href="#" className="w-10 h-10 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors duration-200"><FaTwitter className="w-5 h-5" /></a>
                <a href="#" className="w-10 h-10 bg-pink-600 text-white rounded-lg flex items-center justify-center hover:bg-pink-700 transition-colors duration-200"><FaInstagram className="w-5 h-5" /></a>
                <a href="#" className="w-10 h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center hover:bg-emerald-700 transition-colors duration-200"><FaLinkedin className="w-5 h-5" /></a>
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
