'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { FaHome, FaBed, FaBath, FaRuler, FaMapMarkerAlt, FaEuroSign, FaCamera, FaInfo, FaWifi, FaParking, FaSwimmingPool, FaTv, FaImage, FaTrash, FaUser, FaCaretDown, FaChevronDown, FaUserCircle, FaCog, FaComments, FaQuestionCircle, FaExchangeAlt, FaSignOutAlt, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaCrown, FaCreditCard, FaExclamationTriangle, FaTimes, FaCheck, FaBuilding, FaKey, FaMagic, FaSave, FaFolderOpen, FaChartBar } from 'react-icons/fa';
import { MdApartment, MdHouse, MdVilla, MdStore, MdWarehouse, MdLocalLaundryService, MdSecurity, MdBalcony, MdOutdoorGrill } from 'react-icons/md';
import { GiSolarPower, GiRadiations, GiHeatHaze, GiGardeningShears } from 'react-icons/gi';
import { BsWindow } from 'react-icons/bs';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { apiClient, fetchFromBackend, uploadToBackend } from '@/lib/api/client';
import toast from 'react-hot-toast';
import { searchGreekLocations, searchGreekPrefectures } from '@/data/greekLocations';
import SellerNotificationBell from '@/components/notifications/SellerNotificationBell';

// Προσθήκη τύπου για τα tabs
type TabId = 'basics' | 'features' | 'amenities' | 'location' | 'price' | 'photos' | 'description';

const tabs = [
  { id: 'basics' as TabId, label: 'Βασικά', icon: <FaHome /> },
  { id: 'features' as TabId, label: 'Χαρακτηριστικά', icon: <FaBed /> },
  { id: 'amenities' as TabId, label: 'Παροχές', icon: <FaBath /> },
  { id: 'location' as TabId, label: 'Τοποθεσία', icon: <FaMapMarkerAlt /> },
  { id: 'price' as TabId, label: 'Τιμή', icon: <FaEuroSign /> },
  { id: 'photos' as TabId, label: 'Φωτογραφίες', icon: <FaCamera /> },
  { id: 'description' as TabId, label: 'Περιγραφή', icon: <FaInfo /> },
];

interface SelectionCardProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
}

interface FeatureCardProps {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function SelectionCard({ label, value, onChange, options }: SelectionCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
      >
        <option value="">Επιλέξτε</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function FeatureCard({ icon, label, checked, onChange }: FeatureCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onChange(!checked)}
      className={`
        relative w-full p-4 rounded-xl text-center
        transition-all duration-200 ease-in-out
        ${checked 
          ? 'bg-green-50 border-2 border-green-500 shadow-sm' 
          : 'bg-white border border-gray-200 hover:border-green-300 shadow-sm'
        }
      `}
    >
      <div className="flex flex-col items-center space-y-2">
        <div className={`text-2xl ${checked ? 'text-green-500' : 'text-gray-500'}`}>
          {icon}
        </div>
        <span className={`text-sm font-medium ${checked ? 'text-green-700' : 'text-gray-600'}`}>
          {label}
        </span>
      </div>
      {checked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}

interface Features {
  // Θέρμανση & Ενέργεια
  heatingType: string;
  heatingSystem: string;
  windows: string;
  windowsType: string;
  flooring: string;
  energyClass: string;

  // Βασικά χαρακτηριστικά
  elevator: boolean;
  furnished: boolean;
  securityDoor: boolean;
  alarm: boolean;
  disabledAccess: boolean;
  soundproofing: boolean;
  thermalInsulation: boolean;
  pool: string;
  poolType: string; // Προσθήκη τύπου πισίνας
  balconyArea: string;
  hasBalcony: boolean; // Προσθήκη για μπαλκόνι/βεράντα

  // Επαγγελματικοί χώροι
  loadingRamp: boolean;
  truckAccess: boolean;
  fireSafety: boolean;
  freightElevator: boolean;
  toilets: string;
  storeFrontLength: string;
  maxHeight: string;

  // Οικόπεδα
  plotArea: string;
  buildingCoefficient: string;
  coverageRatio: string;
  facadeLength: string;
  sides: string;
  buildableArea: string;
  buildingPermit: boolean;
  roadAccess: string;
  terrain: string;
  shape: string;
  suitability: string;

  // Χαρακτηριστικά επαγγελματικών οικοπέδων
  storageType: string;
  elevatorType: string;
  fireproofDoor: boolean;

  // Επιπλέον χαρακτηριστικά για όλους τους τύπους
  condition: string;
  yearBuilt: string;
  renovationYear: string;
  parkingSpaces: string;
  garden: boolean;
  multipleFloors: boolean;
  commercialType: string;
  rooms: string;
  auxiliarySpaces: string;
  landCategory: string;
  ownershipType: string;
  landArea: string;
  buildingArea: string;
  buildable: boolean;
  morphology: string;
  commercialCategory: string;
  wc: string;
  storefrontLength: string;
  floorDetails: string;
  plotCategory: string;
  plotOwnershipType: string;

  // Κατάστημα (Retail) - Επιπλέον χαρακτηριστικά
  mezzanineArea: string;
  basementArea: string;
  forecourtArea: string;
  healthPermit: boolean | null;

  // Γραφείο (Office) - Επιπλέον χαρακτηριστικά
  structuredCabling: boolean;
  reception: boolean;
  serverRoom: boolean;
  officeFalseCeiling: boolean;

  // Αποθήκη/Βιομηχανικός (Storage/Industrial) - Επιπλέον χαρακτηριστικά
  clearHeight: string;
  industrialFloor: boolean;
  crane: boolean;
  powerKva: string;

  // Ξενοδοχείο/Τουριστικό (Hospitality) - Επιπλέον χαρακτηριστικά
  distanceFromSea: string;
  hospitalityPlotArea: string;
  hospitalityPool: boolean;
  restaurantBar: boolean;
  hospitalityReception: boolean;
  laundryRoom: boolean;

  // Εστίαση/F&B - Επιπλέον χαρακτηριστικά
  ventilationChimney: boolean;
  fbHealthPermit: boolean;
  greenSpaceUse: boolean;
  kitchenArea: string;
  fbStorageSpace: boolean;

  // Parking/Γκαράζ - Επιπλέον χαρακτηριστικά
  parkingSpaceType: string;
  entranceHeight: string;
  parkingBasementArea: string;
  operatingPermit: boolean;
  trafficStudy: string;

  // Ολόκληρο Κτίριο - Επιπλέον χαρακτηριστικά
  remainingBuilding: string;
  buildingUnitsCount: string;
  buildingLandUse: string;
  buildingFacadeLength: string;
  superstructureArea: string;
}

// Προσθήκη επιλογών για την κατηγορία οικοπέδου
const plotCategories: Array<{ id: string; label: string }> = [
  { id: 'plot', label: 'Οικόπεδο' },
  { id: 'field', label: 'Αγροτεμάχιο' },
  { id: 'industrial', label: 'Βιομηχανικό' },
  { id: 'investment', label: 'Επενδυτικό' }
];

// Προσθήκη επιλογών για την κατάσταση ιδιοκτησίας
const ownershipTypes: Array<{ id: string; label: string }> = [
  { id: 'private', label: 'Ιδιωτικό' },
  { id: 'corporate', label: 'Εταιρικό' },
  { id: 'shared', label: 'Εντός συνιδιοκτησίας' }
];

interface Pricing {
  salePrice: number;
  pricePerSquareMeter: number;
  negotiable: boolean;
  additionalNotes: string;
}

export default function AddListing() {
  const { data: session } = useSession();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [showListingTypeSelection, setShowListingTypeSelection] = useState(false);
  const [listingType, setListingType] = useState<'sale' | 'rent' | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('basics');
  
  // State για έλεγχο συνδρομής
  const [subscriptionCheck, setSubscriptionCheck] = useState<{
    isLoading: boolean;
    hasActiveSubscription: boolean;
    userType: string | null;
    subscription: any | null;
    propertiesCount: number;
    maxProperties: number;
  }>({
    isLoading: true,
    hasActiveSubscription: false,
    userType: null,
    subscription: null,
    propertiesCount: 0,
    maxProperties: 0
  });

  // State για subscription plans modal
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');
  const [propertyType, setPropertyType] = useState('');
  const [basicDetails, setBasicDetails] = useState({
    condition: '',
    yearBuilt: '',
    floor: '',
    area: '',
    bedrooms: '',
    bathrooms: '',
    renovationYear: '',
    parkingSpaces: '',
    garden: false,
    gardenArea: '',
    multipleFloors: false,
    floorsCount: '',
    landCategory: '',
    ownershipType: '',
    landArea: '',
    buildingCoefficient: '',
    coverageCoefficient: '',
    facadeLength: '',
    sides: '',
    buildingArea: '',
    buildable: false,
    roadAccess: '',
    terrain: '',
    morphology: '',
    suitability: '',
    commercialCategory: '',
    wc: '',
    storefrontLength: '',
    maxHeight: '',
    storage: false,
    loadingRamp: false,
    truckAccess: false,
    fireSafety: false,
    elevator: false,
    thermalInsulation: false,
    floorDetails: '',
    commercialType: '',
    rooms: '',
    auxiliarySpaces: '',
    plotCategory: '',
    plotOwnershipType: '',
    hospitalityBeds: '',
    hospitalityStars: '',
    buildingFloorsDescription: ''
  });
  const [features, setFeatures] = useState<Features>({
    heatingType: '',
    heatingSystem: '',
    windows: '',
    windowsType: '',
    flooring: '',
    energyClass: '',
    elevator: false,
    furnished: false,
    securityDoor: false,
    alarm: false,
    disabledAccess: false,
    soundproofing: false,
    thermalInsulation: false,
    pool: '',
    poolType: '',
    balconyArea: '',
    hasBalcony: false,
    loadingRamp: false,
    truckAccess: false,
    fireSafety: false,
    freightElevator: false,
    toilets: '',
    storeFrontLength: '',
    maxHeight: '',
    plotArea: '',
    buildingCoefficient: '',
    coverageRatio: '',
    facadeLength: '',
    sides: '',
    buildableArea: '',
    buildingPermit: false,
    roadAccess: '',
    terrain: '',
    shape: '',
    suitability: '',
    storageType: '',
    elevatorType: '',
    fireproofDoor: false,
    condition: '',
    yearBuilt: '',
    renovationYear: '',
    parkingSpaces: '',
    garden: false,
    multipleFloors: false,
    commercialType: '',
    rooms: '',
    auxiliarySpaces: '',
    landCategory: '',
    ownershipType: '',
    landArea: '',
    buildingArea: '',
    buildable: false,
    morphology: '',
    commercialCategory: '',
    wc: '',
    storefrontLength: '',
    floorDetails: '',
    plotCategory: '',
    plotOwnershipType: '',
    mezzanineArea: '',
    basementArea: '',
    forecourtArea: '',
    healthPermit: null as boolean | null,
    structuredCabling: false,
    reception: false,
    serverRoom: false,
    officeFalseCeiling: false,
    clearHeight: '',
    industrialFloor: false,
    crane: false,
    powerKva: '',
    distanceFromSea: '',
    hospitalityPlotArea: '',
    hospitalityPool: false,
    restaurantBar: false,
    hospitalityReception: false,
    laundryRoom: false,
    ventilationChimney: false,
    fbHealthPermit: false,
    greenSpaceUse: false,
    kitchenArea: '',
    fbStorageSpace: false,
    parkingSpaceType: '',
    entranceHeight: '',
    parkingBasementArea: '',
    operatingPermit: false,
    trafficStudy: '',
    remainingBuilding: '',
    buildingUnitsCount: '',
    buildingLandUse: '',
    buildingFacadeLength: '',
    superstructureArea: ''
  });
  const [amenities, setAmenities] = useState({
    // Παροχές Οικοπέδου
    electricity: false,
    water: false,
    buildingPermit: false,
    containerPermit: false,
    pea: false,
    fenced: false,
    landUse: '',
    withinPlan: false,
    withinSettlement: false,
    reforestable: false,
    completeness: '',
    // Παροχές Κατοικίας
    storage: false,
    guestHouse: false,
    jacuzzi: false,
    outdoorSports: false,
    gym: false,
    sauna: false,
    fireplace: false,
    airConditioning: false,
    solarWaterHeater: false,
    smartTv: false,
    bbq: false,
    electricalAppliances: false,
    // Παροχές Επαγγελματικού Χώρου
    threePhaseElectricity: false,
    waterSupply: false,
    falseCeiling: false,
    airConditioningHeating: false,
    internetStructuredCabling: false,
    alarm: false,
    equipment: false,
    energyCertificate: false,
    disabledAccess: false,
    parking: false,
    // Κατάστημα (Retail) - Παροχές
    awnings: false,
    facade: false,
    internalStaircase: false,
    // Γραφείο (Office) - Παροχές
    elevator: false,
    securityDoor: false,
    fiberOptic: false,
    concierge: false,
    // Αποθήκη/Βιομηχανικός - Παροχές
    sprinklers: false,
    security: false,
    // Ξενοδοχείο/Τουριστικό - Παροχές
    wifiAllAreas: false,
    garden: false,
    safe: false,
    satelliteTv: false,
    // Εστίαση/F&B - Παροχές
    forecourt: false,
    // Parking/Γκαράζ - Παροχές
    cctv: false,
    ventilationSystem: false,
    security24: false,
    automaticBarrier: false,
    licensePlateRecognition: false,
    evCharging: false,
    parkingWc: false,
    carElevator: false,
    waitingArea: false,
    generator: false,
    // Ολόκληρο Κτίριο - Παροχές
    autonomousHeatingPerFloor: false,
    elevatorPassengerFreight: false,
    fireEscape: false,
    internalParkingSpaces: '',
    undergroundGarage: false,
    centralSecurity: false,
    roofGarden: false,
    facadeLighting: false,
    surroundingSpace: false
  });
  const [location, setLocation] = useState({
    state: '',
    city: '',
    neighborhood: '',
    street: '',
    number: '',
    postalCode: '',
    floor: '',
    latitude: '',
    longitude: '',
    mapUrl: '',
    coordinates: {
      lat: 37.9838,  // Default to Athens center
      lng: 23.7275
    }
  });
  const [pricing, setPricing] = useState<Pricing>({
    salePrice: 0,
    pricePerSquareMeter: 0,
    negotiable: false,
    additionalNotes: '',
  });
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationStateRef = useRef<HTMLDivElement>(null);
  const locationCityRef = useRef<HTMLDivElement>(null);
  const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showStateSuggestions, setShowStateSuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [description, setDescription] = useState({
    title: '',
    shortDescription: '',
    fullDescription: '',
    keywords: [] as string[],
    keywordInput: ''
  });
  const [aiDescriptionView, setAiDescriptionView] = useState<string[]>([]);
  const [aiDescriptionStyle, setAiDescriptionStyle] = useState<string[]>([]);
  const [aiDescriptionNearby, setAiDescriptionNearby] = useState<string[]>([]);
  const [aiDescriptionSecret, setAiDescriptionSecret] = useState('');
  const [aiDescriptionGenerating, setAiDescriptionGenerating] = useState(false);
  const [dataPreviewOpen, setDataPreviewOpen] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Draft state
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [currentDraftName, setCurrentDraftName] = useState<string | null>(null);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
  const [draftNameInput, setDraftNameInput] = useState('draft-1');
  const [showContinueDraftModal, setShowContinueDraftModal] = useState(false);
  const [drafts, setDrafts] = useState<Array<{ id: string; name: string; progressPercent: number; activeTab: string | null; updatedAt: string }>>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [saveDraftLoading, setSaveDraftLoading] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/seller');
  };

  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'BUYER') router.push('/buyer');
    else if (role === 'AGENT') router.push('/agent');
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (roleMenuRef.current && !roleMenuRef.current.contains(target)) setIsRoleMenuOpen(false);
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) setIsProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Draft helpers
  const getDraftData = useCallback(() => ({
    listingType,
    showForm,
    activeTab,
    propertyType,
    basicDetails,
    features,
    amenities,
    location,
    pricing,
    description,
  }), [listingType, showForm, activeTab, propertyType, basicDetails, features, amenities, location, pricing, description]);

  const applyDraftData = useCallback((data: Record<string, unknown>) => {
    if (data.listingType === 'sale' || data.listingType === 'rent') setListingType(data.listingType);
    if (typeof data.showForm === 'boolean') setShowForm(data.showForm);
    if (typeof data.activeTab === 'string' && ['basics','features','amenities','location','price','photos','description'].includes(data.activeTab)) setActiveTab(data.activeTab as TabId);
    if (typeof data.propertyType === 'string') setPropertyType(data.propertyType);
    if (data.basicDetails && typeof data.basicDetails === 'object') setBasicDetails(prev => ({ ...prev, ...data.basicDetails as Record<string, unknown> }));
    if (data.features && typeof data.features === 'object') setFeatures(prev => ({ ...prev, ...data.features as Partial<Features> }));
    if (data.amenities && typeof data.amenities === 'object') setAmenities(prev => ({ ...prev, ...data.amenities as Record<string, unknown> }));
    if (data.location && typeof data.location === 'object') setLocation(prev => ({ ...prev, ...data.location as Record<string, unknown> }));
    if (data.pricing && typeof data.pricing === 'object') setPricing(prev => ({ ...prev, ...data.pricing as Partial<Pricing> }));
    if (data.description && typeof data.description === 'object') setDescription(prev => ({ ...prev, ...data.description as Record<string, unknown> }));
  }, []);

  const saveDraftWithName = useCallback(async (name: string) => {
    if (!session?.user) {
      toast.error('Παρακαλώ συνδεθείτε για να αποθηκεύσετε draft');
      return;
    }
    const draftName = (name || 'draft-1').trim() || 'draft-1';
    setSaveDraftLoading(true);
    try {
      const data = getDraftData();
      const progressPercent = Math.round(((tabs.findIndex(tab => tab.id === activeTab) + 1) / tabs.length) * 100);
      const res = await fetchFromBackend('/seller/listing-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDraftId || undefined,
          name: draftName,
          progressPercent,
          activeTab,
          data,
        }),
      });
      if (!res.ok) throw new Error('Αποτυχία αποθήκευσης');
      const { draft } = await res.json();
      setCurrentDraftId(draft.id);
      setCurrentDraftName(draft.name || draftName);
      setShowSaveDraftModal(false);
      toast.success('Το draft αποθηκεύτηκε');
      if (showDraftsModal) {
        const listRes = await fetchFromBackend('/seller/listing-drafts');
        if (listRes.ok) {
          const { drafts: list } = await listRes.json();
          setDrafts(list);
        }
      }
    } catch (e) {
      toast.error('Αποτυχία αποθήκευσης draft');
    } finally {
      setSaveDraftLoading(false);
    }
  }, [session, getDraftData, activeTab, currentDraftId, showDraftsModal]);

  const openSaveDraftModal = useCallback(() => {
    if (!session?.user) {
      toast.error('Παρακαλώ συνδεθείτε για να αποθηκεύσετε draft');
      return;
    }
    const defaultName = currentDraftId && currentDraftName
      ? currentDraftName
      : drafts.length > 0
        ? `draft-${drafts.length + 1}`
        : 'draft-1';
    setDraftNameInput(defaultName);
    setShowSaveDraftModal(true);
  }, [session, currentDraftId, currentDraftName, drafts.length]);

  const loadDrafts = useCallback(async () => {
    if (!session?.user) return;
    setDraftsLoading(true);
    try {
      const res = await fetchFromBackend('/seller/listing-drafts');
      if (!res.ok) throw new Error('Αποτυχία φόρτωσης');
      const { drafts: list } = await res.json();
      setDrafts(list);
    } catch {
      toast.error('Αποτυχία φόρτωσης drafts');
    } finally {
      setDraftsLoading(false);
    }
  }, [session]);

  const loadDraft = useCallback(async (id: string) => {
    if (!session?.user) return;
    try {
      const res = await fetchFromBackend(`/seller/listing-drafts/${id}`);
      if (!res.ok) throw new Error('Αποτυχία φόρτωσης');
      const { draft } = await res.json();
      setCurrentDraftId(draft.id);
      setCurrentDraftName(draft.name || null);
      if (draft.data && typeof draft.data === 'object') applyDraftData(draft.data);
      if (typeof draft.activeTab === 'string') setActiveTab(draft.activeTab as TabId);
      setShowForm(true);
      setShowDraftsModal(false);
      setShowContinueDraftModal(false);
      toast.success('Το draft φορτώθηκε');
    } catch {
      toast.error('Αποτυχία φόρτωσης draft');
    }
  }, [session, applyDraftData]);

  const deleteDraft = useCallback(async (id: string) => {
    if (!session?.user) return;
    try {
      const res = await fetchFromBackend(`/seller/listing-drafts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Αποτυχία διαγραφής');
      setDrafts(prev => prev.filter(d => d.id !== id));
      if (currentDraftId === id) {
        setCurrentDraftId(null);
        setCurrentDraftName(null);
      }
      toast.success('Το draft διαγράφηκε');
    } catch {
      toast.error('Αποτυχία διαγραφής draft');
    }
  }, [session, currentDraftId]);

  // Φόρτωση drafts στην είσοδο και εμφάνιση modal "συνεχίσετε;"
  useEffect(() => {
    if (!session?.user) return;
    const fetchAndShowContinue = async () => {
      try {
        const res = await fetchFromBackend('/seller/listing-drafts');
        if (!res.ok) return;
        const { drafts: list } = await res.json();
        setDrafts(list);
        if (list && list.length > 0) {
          setShowContinueDraftModal(true);
        }
      } catch {
        // Αποσιωπητικό - δεν ενοχλούμε τον χρήστη
      }
    };
    fetchAndShowContinue();
  }, [session?.user]);

  // Έλεγχος συνδρομής
  useEffect(() => {
    const checkSubscription = async () => {
      if (!session?.user?.email) {
        setSubscriptionCheck(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // Έλεγχος τύπου χρήστη και συνδρομής
        const [userResponse, subscriptionResponse, propertiesResponse] = await Promise.all([
          fetchFromBackend('/user/profile'),
          fetchFromBackend('/subscriptions'),
          fetchFromBackend('/properties')
        ]);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setSubscriptionCheck(prev => ({ 
            ...prev, 
            userType: userData.userType 
          }));

          // Αν είναι ιδιώτης, επιτρέπουμε προσθήκη ακινήτου
          if (userData.userType === 'INDIVIDUAL') {
            setSubscriptionCheck(prev => ({ 
              ...prev, 
              isLoading: false,
              hasActiveSubscription: true,
              maxProperties: 999 // Απεριόριστα για ιδιώτες
            }));
            return;
          }
        }

        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          setSubscriptionCheck(prev => ({ 
            ...prev, 
            subscription: subscriptionData,
            hasActiveSubscription: subscriptionData?.status === 'ACTIVE'
          }));

          if (subscriptionData?.plan) {
            setSubscriptionCheck(prev => ({ 
              ...prev, 
              maxProperties: subscriptionData.plan.maxProperties 
            }));
          }
        }

        if (propertiesResponse.ok) {
          const propertiesData = await propertiesResponse.json();
          setSubscriptionCheck(prev => ({ 
            ...prev, 
            propertiesCount: propertiesData.length 
          }));
        }

      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setSubscriptionCheck(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSubscription();
  }, [session]);

  // Fetch subscription plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data: plans } = await apiClient.get('/subscription-plans');
        setSubscriptionPlans(plans);
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
      }
    };

    fetchPlans();
  }, []);

  const handleStripeCheckout = async (planId: string) => {
    try {
      const { data } = await apiClient.post('/stripe/create-checkout-session', {
        planId,
        billingCycle,
      });

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Error creating checkout session:', data.error);
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      if (error.response?.data?.error) {
        console.error('Error details:', error.response.data.error);
      }
    }
  };

  const handlePhotoDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );

    const newPhotos = droppedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
  }, []);

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(file => 
        file.type.startsWith('image/')
      );

      const newPhotos = selectedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));

      setPhotos(prev => [...prev, ...newPhotos]);
    }
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  }, []);

  // Clean up object URLs when component unmounts
  React.useEffect(() => {
    return () => {
      photos.forEach(photo => {
        URL.revokeObjectURL(photo.preview);
      });
    };
  }, [photos]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (locationStateRef.current && !locationStateRef.current.contains(target)) {
        setShowStateSuggestions(false);
      }
      if (locationCityRef.current && !locationCityRef.current.contains(target)) {
        setShowCitySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const propertyTypes = [
    { id: 'apartment', label: 'Διαμέρισμα', icon: <MdApartment className="w-6 h-6" /> },
    { id: 'house', label: 'Μονοκατοικία', icon: <MdHouse className="w-6 h-6" /> },
    { id: 'villa', label: 'Βίλα', icon: <MdVilla className="w-6 h-6" /> },
    { id: 'commercial', label: 'Επαγγελματικός Χώρος', icon: <MdStore className="w-6 h-6" /> },
    { id: 'plot', label: 'Οικόπεδο', icon: <FaHome className="w-6 h-6" /> },
  ];

  const commercialTypes = [
    { id: 'store', label: 'Κατάστημα' },
    { id: 'office', label: 'Γραφείο' },
    { id: 'warehouse', label: 'Αποθήκη' },
    { id: 'industrial', label: 'Βιομηχανικός Χώρος' },
    { id: 'building', label: 'Επαγγελματικό Κτίριο' },
    { id: 'studio', label: 'Studio' },
    { id: 'showroom', label: 'Showroom' },
    { id: 'parking', label: 'Parking' }
  ];

  const floorOptions = [
    { id: 'basement', label: 'Υπόγειο' },
    { id: 'ground', label: 'Ισόγειο' },
    { id: 'multistory', label: 'Πολυώροφο κτίριο' },
    { id: '1', label: '1ος' },
    { id: '2', label: '2ος' },
    { id: '3', label: '3ος' },
    { id: '4', label: '4ος' },
    { id: '5', label: '5ος' },
    { id: '6plus', label: '6ος+' }
  ];

  const propertyConditions = [
    { id: 'underConstruction', label: 'Υπό κατασκευή' },
    { id: 'renovated', label: 'Ανακαινισμένο' },
    { id: 'needsRenovation', label: 'Χρήζει ανακαίνισης' },
    { id: 'new', label: 'Άριστη' }
  ];

  // Επιλογές κατάστασης για επαγγελματικό χώρο
  const commercialConditions = [
    { id: 'renovated', label: 'Ανακαινισμένο' },
    { id: 'semiFinished', label: 'Ημιτελές' },
    { id: 'newlyBuilt', label: 'Νεόδμητο' }
  ];

  // Επιλογές κατάστασης για Parking/Γκαράζ
  const parkingConditions = [
    { id: 'inOperation', label: 'Σε λειτουργία' },
    { id: 'empty', label: 'Κενό' },
    { id: 'rented', label: 'Μισθωμένο' }
  ];

  // Τύπος θέσεων για Parking
  const parkingSpaceTypes = [
    { id: 'covered', label: 'Στεγασμένες' },
    { id: 'outdoor', label: 'Υπαίθριες' },
    { id: 'stacker', label: 'Μεταλλικό Σύστημα/Stacker' }
  ];

  // Επιλογές κατάστασης για Ολόκληρο Κτίριο
  const buildingConditions = [
    { id: 'semiFinished', label: 'Ημιτελές' },
    { id: 'leased', label: 'Εκμισθωμένο' },
    { id: 'empty', label: 'Κενό' }
  ];

  // Χρήση γης για κτίριο
  const buildingLandUseTypes = [
    { id: 'general_residential', label: 'Γενική Κατοικία' },
    { id: 'pure_commercial', label: 'Αμιγής Επαγγελματική' },
    { id: 'mixed', label: 'Μικτή' },
    { id: 'other', label: 'Άλλη' }
  ];

  // Κύριες Κατηγορίες επαγγελματικού χώρου
  const COMMERCIAL_MAIN_CATEGORIES = [
    { id: 'retail', label: 'Κατάστημα (Retail)' },
    { id: 'office', label: 'Γραφείο (Office)' },
    { id: 'warehouse', label: 'Αποθήκη (Storage/Warehouse)' },
    { id: 'industrial', label: 'Βιομηχανικός Χώρος / Βιοτεχνία (Industrial)' },
    { id: 'hospitality', label: 'Ξενοδοχείο / Τουριστικό Κατάλυμα (Hospitality)' },
    { id: 'fb', label: 'Εστίαση / Υγειονομικού Ενδιαφέροντος (F&B - π.χ. Εστιατόριο, Καφετέρια)' },
    { id: 'parking', label: 'Parking / Γκαράζ (Επαγγελματικό)' },
    { id: 'commercial_building', label: 'Ολόκληρο Κτίριο (Commercial Building)' }
  ];

  const landTypes = [
    { id: 'residential', label: 'Οικόπεδο' },
    { id: 'agricultural', label: 'Αγροτεμάχιο' },
    { id: 'industrial', label: 'Βιομηχανικό' },
    { id: 'investment', label: 'Επενδυτικό' },
  ];

  const ownershipTypes = [
    { id: 'private', label: 'Ιδιωτικό' },
    { id: 'corporate', label: 'Εταιρικό' },
    { id: 'shared', label: 'Εντός συνιδιοκτησίας' },
  ];

  const roadAccessTypes = [
    { id: 'asphalt', label: 'Ασφαλτοστρωμένος' },
    { id: 'dirt', label: 'Χωματόδρομος' },
    { id: 'municipal', label: 'Δημοτικός' },
    { id: 'rural', label: 'Αγροτικός' },
  ];

  const terrainTypes = [
    { id: 'flat', label: 'Επίπεδο' },
    { id: 'sloped', label: 'Επικλινές' },
    { id: 'amphitheater', label: 'Αμφιθεατρικό' },
  ];

  const morphologyTypes = [
    { id: 'triangular', label: 'Τριγωνικό' },
    { id: 'rectangular', label: 'Παραλληλόγραμμο' },
    { id: 'corner', label: 'Γωνιακό' },
  ];

  const suitabilityTypes = [
    { id: 'residential', label: 'Οικιστική' },
    { id: 'professional', label: 'Επαγγελματική' },
    { id: 'tourist', label: 'Τουριστική' },
    { id: 'industrial', label: 'Βιομηχανική' },
  ];

  interface OptionType {
    id: string;
    label: string;
  }

  const heatingTypes = [
    { id: 'autonomous', label: 'Αυτόνομη' },
    { id: 'central', label: 'Κεντρική' },
    { id: 'heatpump', label: 'Αντλία Θερμότητας' },
  ];

  const heatingSystems = [
    { id: 'gas', label: 'Φυσικό Αέριο' },
    { id: 'oil', label: 'Πετρέλαιο' },
    { id: 'electricity', label: 'Ρεύμα' },
  ];

  const windowTypes = [
    { id: 'pvc', label: 'PVC' },
    { id: 'wooden', label: 'Ξύλινα' },
    { id: 'aluminum', label: 'Αλουμινίου' },
  ];

  const windowInsulation = [
    { id: 'insulated', label: 'Μονωτικά' },
    { id: 'non_insulated', label: 'Μη Μονωτικά' },
  ];

  const flooringTypes = [
    { id: 'tiles', label: 'Πλακάκι' },
    { id: 'wooden', label: 'Παρκέ' },
    { id: 'marble', label: 'Μάρμαρο' },
  ];

  const poolTypes = [
    { id: 'private', label: 'Ιδιωτική' },
    { id: 'shared', label: 'Κοινόχρηστη' },
    { id: 'none', label: 'Χωρίς Πισίνα' }
  ];

  const storageTypes = [
    { id: 'internal', label: 'Εσωτερική' },
    { id: 'external', label: 'Εξωτερική' },
    { id: 'none', label: 'Χωρίς Αποθήκη' },
  ];

  const energyClasses = ['Α+', 'Α', 'Β+', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η'];

  const mapContainerStyle = {
    width: '100%',
    height: '400px'
  };

  const handleFeatureChange = (key: keyof Features, value: any) => {
    setFeatures(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAmenityChange = (key: string, value: boolean | string) => {
    setAmenities(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleLocationChange = (key: string, value: any) => {
    if (key === 'latitude' || key === 'longitude') {
      setLocation(prev => ({
        ...prev,
        [key]: value,
        coordinates: {
          ...prev.coordinates,
          [key === 'latitude' ? 'lat' : 'lng']: parseFloat(value) || (key === 'latitude' ? 37.9838 : 23.7275)
        }
      }));
    } else {
      setLocation(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setLocation(prev => ({
        ...prev,
        coordinates: {
          lat: e.latLng!.lat(),
          lng: e.latLng!.lng()
        }
      }));
    }
  }, []);

  const handlePricingChange = (field: keyof Pricing, value: string | boolean) => {
    setPricing(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatPriceWithCommas = (num: number): string => {
    if (num === 0 || isNaN(num)) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const parsePriceInput = (str: string): number => {
    const digits = str.replace(/\D/g, '');
    return digits === '' ? 0 : parseInt(digits, 10);
  };

  const getAreaNumber = (): number => {
    const areaVal = basicDetails.area;
    if (typeof areaVal === 'string' && areaVal.trim() === '') return 0;
    const num = parseFloat(String(areaVal)) || 0;
    return num > 0 ? num : 0;
  };

  const handleSalePriceChange = (rawInput: string) => {
    const num = parsePriceInput(rawInput);
    const areaNum = getAreaNumber();
    setPricing(prev => {
      const next = { ...prev, salePrice: num };
      if (areaNum > 0 && num > 0) {
        next.pricePerSquareMeter = Math.round(num / areaNum);
      }
      return next;
    });
  };

  const handlePricePerSquareMeterChange = (rawInput: string) => {
    const num = parsePriceInput(rawInput);
    const areaNum = getAreaNumber();
    setPricing(prev => {
      const next = { ...prev, pricePerSquareMeter: num };
      if (areaNum > 0 && num > 0) {
        next.salePrice = num * areaNum;
      }
      return next;
    });
  };

  const handleDescriptionChange = (key: string, value: any) => {
    setDescription(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleChip = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string, max?: number) => {
    setter(prev => {
      const has = prev.includes(value);
      if (has) return prev.filter(v => v !== value);
      if (max && prev.length >= max) return prev;
      return [...prev, value];
    });
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleGenerateAiDescription = async () => {
    setAiDescriptionGenerating(true);
    const propTypeLabels: Record<string, string> = { apartment: 'Διαμέρισμα', house: 'Μονοκατοικία', villa: 'Βίλα', commercial: 'Επαγγελματικός Χώρος', plot: 'Οικόπεδο' };
    const floorLabels: Record<string, string> = { basement: 'Υπόγειο', ground: 'Ισόγειο', multistory: 'Πολυώροφο κτίριο', '1': '1ος', '2': '2ος', '3': '3ος', '4': '4ος', '5': '5ος', '6plus': '6ος+' };
    const conditionLabels: Record<string, string> = { new: 'Άριστη', underConstruction: 'Υπό κατασκευή', renovated: 'Ανακαινισμένο', needsRenovation: 'Χρήζει ανακαίνισης', semiFinished: 'Ημιτελές', newlyBuilt: 'Νεόδμητο', rented: 'Μισθωμένο', free: 'Ελεύθερο', inOperation: 'Σε λειτουργία', empty: 'Κενό' };

    const amenitiesList: string[] = [];
    if (features.elevator) amenitiesList.push('Ανελκυστήρας');
    if (features.furnished) amenitiesList.push('Επιπλωμένο');
    if (features.energyClass) amenitiesList.push(`Ενεργειακή Κλάση ${features.energyClass}`);
    if (features.pool && features.pool !== 'none') amenitiesList.push('Πισίνα');
    if (features.hasBalcony) amenitiesList.push('Μπαλκόνι/Βεράντα');
    if (amenities.fireplace) amenitiesList.push('Τζάκι');
    if (amenities.airConditioning) amenitiesList.push('Κλιματισμός');
    if (amenities.storage) amenitiesList.push('Αποθήκη');

    const photoUrls: string[] = [];
    if (photos.length > 0) {
      const toConvert = photos.slice(0, 4).map((p) => p.file);
      const dataUrls = await Promise.all(toConvert.map(fileToDataUrl));
      photoUrls.push(...dataUrls);
    }

    const locationStr = [location.neighborhood, location.city, location.state].filter(Boolean).join(', ') || '-';

    const payload = {
      propertyType: propertyType ? (propTypeLabels[propertyType] || propertyType) : 'Ακίνητο',
      location: locationStr,
      photoUrls,
      sqm: basicDetails.area ?? '-',
      floor: basicDetails.floor ? (floorLabels[basicDetails.floor] || basicDetails.floor) : '-',
      bedrooms: basicDetails.bedrooms ?? '-',
      bathrooms: basicDetails.bathrooms ?? '-',
      condition: basicDetails.condition ? (conditionLabels[basicDetails.condition] || basicDetails.condition) : '-',
      amenities: amenitiesList.length > 0 ? amenitiesList : ['-'],
      viewTags: aiDescriptionView.length > 0 ? aiDescriptionView : ['-'],
      styleTags: aiDescriptionStyle.length > 0 ? aiDescriptionStyle : ['-'],
      locationTags: aiDescriptionNearby.length > 0 ? aiDescriptionNearby : ['-'],
      secretWeapon: aiDescriptionSecret.trim() || '(δεν δόθηκε)',
    };

    try {
      const res = await fetchFromBackend('/generate-description', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const title = data.title ?? '';
        const shortDesc = data.short_description ?? '';
        const longDesc = data.long_description ?? '';
        setDescription(prev => ({
          ...prev,
          title,
          shortDescription: shortDesc,
          fullDescription: longDesc,
        }));
        toast.success('Η περιγραφή δημιουργήθηκε επιτυχώς!');
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData?.error ?? 'Προέκυψε σφάλμα κατά τη δημιουργία της περιγραφής.';
        toast.error(msg);
      }
    } catch (err) {
      console.error('[generate-description]', err);
      toast.error('Προέκυψε σφάλμα κατά τη σύνδεση με τον διακομιστή. Ελέγξτε τη σύνδεσή σας.');
    } finally {
      setAiDescriptionGenerating(false);
    }
  };

  const getAiDataPreview = useCallback(() => {
    const items: string[] = [];
    if (basicDetails.area) items.push(`${basicDetails.area}τ.μ.`);
    if (basicDetails.bedrooms) items.push(`${basicDetails.bedrooms} Υ/Δ`);
    if (basicDetails.bathrooms) items.push(`${basicDetails.bathrooms} Μπάνιο(α)`);
    if (basicDetails.floor) items.push(`Όροφος ${basicDetails.floor}`);
    if (basicDetails.parkingSpaces) items.push(`${basicDetails.parkingSpaces} Θέση(ες) Στάθμευσης`);
    if (basicDetails.condition) {
      const condMap: Record<string, string> = { new: 'Άριστη', underConstruction: 'Υπό κατασκευή', renovated: 'Ανακαινισμένο', needsRenovation: 'Χρήζει ανακαίνισης', semiFinished: 'Ημιτελές', newlyBuilt: 'Νεόδμητο', rented: 'Μισθωμένο', free: 'Ελεύθερο', inOperation: 'Σε λειτουργία', empty: 'Κενό' };
      items.push(condMap[basicDetails.condition] || basicDetails.condition);
    }
    if (basicDetails.yearBuilt) items.push(`Έτος Κατασκευής ${basicDetails.yearBuilt}`);
    if (basicDetails.renovationYear) items.push(`Έτος Ανακαίνισης ${basicDetails.renovationYear}`);
    if (features.heatingType) {
      const ht: Record<string, string> = { autonomous: 'Αυτόνομη Θέρμανση', central: 'Κεντρική Θέρμανση', heatpump: 'Αντλία Θερμότητας' };
      items.push(ht[features.heatingType] || features.heatingType);
    }
    if (features.elevator) items.push('Ανελκυστήρας');
    if (features.furnished) items.push('Επιπλωμένο');
    if (features.energyClass) items.push(`Ενεργειακή Κλάση ${features.energyClass}`);
    if (features.pool && features.pool !== 'none') items.push('Πισίνα');
    if (features.hasBalcony) items.push('Μπαλκόνι/Βεράντα');
    if (amenities.fireplace) items.push('Τζάκι');
    if (amenities.airConditioning) items.push('Κλιματισμός');
    if (amenities.storage) items.push('Αποθήκη');
    if (location.city) items.push(location.state ? `${location.city}, ${location.state}` : location.city);
    if (pricing.salePrice > 0) items.push(`${formatPriceWithCommas(pricing.salePrice)} €`);
    return { count: items.length, items };
  }, [basicDetails, features, amenities, location, pricing]);

  const getAiPayloadAndPreview = useCallback(() => {
    const propTypeLabels: Record<string, string> = { apartment: 'Διαμέρισμα', house: 'Μονοκατοικία', villa: 'Βίλα', commercial: 'Επαγγελματικός Χώρος', plot: 'Οικόπεδο' };
    const floorLabels: Record<string, string> = { basement: 'Υπόγειο', ground: 'Ισόγειο', multistory: 'Πολυώροφο κτίριο', '1': '1ος', '2': '2ος', '3': '3ος', '4': '4ος', '5': '5ος', '6plus': '6ος+' };
    const heatingTypeLabels: Record<string, string> = { autonomous: 'Αυτόνομη', central: 'Κεντρική', heatpump: 'Αντλία Θερμότητας' };
    const heatingSystemLabels: Record<string, string> = { gas: 'Φυσικό Αέριο', oil: 'Πετρέλαιο', electricity: 'Ρεύμα' };

    const heatingDisplay = features.heatingType
      ? features.heatingSystem
        ? `${heatingTypeLabels[features.heatingType] || features.heatingType} ${heatingSystemLabels[features.heatingSystem] || features.heatingSystem}`
        : heatingTypeLabels[features.heatingType] || features.heatingType
      : null;

    const hardDataDisplay = {
      propertyType: propertyType ? (propTypeLabels[propertyType] || propertyType) : null,
      area: basicDetails.area ? `${basicDetails.area} τ.μ.` : null,
      floor: basicDetails.floor ? (floorLabels[basicDetails.floor] || basicDetails.floor) : null,
      heating: heatingDisplay,
      bedrooms: basicDetails.bedrooms || null,
      bathrooms: basicDetails.bathrooms || null,
      condition: basicDetails.condition ? { new: 'Άριστη', underConstruction: 'Υπό κατασκευή', renovated: 'Ανακαινισμένο', needsRenovation: 'Χρήζει ανακαίνισης', semiFinished: 'Ημιτελές', newlyBuilt: 'Νεόδμητο', rented: 'Μισθωμένο', free: 'Ελεύθερο' }[basicDetails.condition] || basicDetails.condition : null,
      location: location.city ? (location.state ? `${location.city}, ${location.state}` : location.city) : null,
    };

    const softDataDisplay = {
      view: aiDescriptionView,
      style: aiDescriptionStyle,
      location: aiDescriptionNearby,
      secretWeapon: aiDescriptionSecret.trim() || null,
    };

    const payload = {
      hardData: {
        propertyType,
        area: basicDetails.area,
        floor: basicDetails.floor,
        heatingType: features.heatingType,
        heatingSystem: features.heatingSystem,
        bedrooms: basicDetails.bedrooms,
        bathrooms: basicDetails.bathrooms,
        condition: basicDetails.condition,
        yearBuilt: basicDetails.yearBuilt,
        renovationYear: basicDetails.renovationYear,
        parkingSpaces: basicDetails.parkingSpaces,
        location: { city: location.city, state: location.state, neighborhood: location.neighborhood },
        price: pricing.salePrice,
        elevator: features.elevator,
        furnished: features.furnished,
        energyClass: features.energyClass,
        pool: features.pool,
        hasBalcony: features.hasBalcony,
        amenities: { fireplace: amenities.fireplace, airConditioning: amenities.airConditioning, storage: amenities.storage },
      },
      softData: {
        view: aiDescriptionView,
        style: aiDescriptionStyle,
        nearby: aiDescriptionNearby,
        secretWeapon: aiDescriptionSecret.trim() || undefined,
      },
    };

    return { hardDataDisplay, softDataDisplay, payload };
  }, [propertyType, basicDetails, features, amenities, location, pricing, aiDescriptionView, aiDescriptionStyle, aiDescriptionNearby, aiDescriptionSecret]);

  const addKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && description.keywordInput.trim()) {
      e.preventDefault();
      setDescription(prev => ({
        ...prev,
        keywords: [...prev.keywords, prev.keywordInput.trim()],
        keywordInput: ''
      }));
    }
  };

  const removeKeyword = (index: number) => {
    setDescription(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }));
  };

  const handleBasicDetailsChange = (key: string, value: string | boolean) => {
    setBasicDetails(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'garden' && !value) next.gardenArea = '';
      if (key === 'multipleFloors' && !value) next.floorsCount = '';
      return next;
    });
    if (key === 'area') {
      const areaNum = parseFloat(String(value)) || 0;
      if (areaNum > 0) {
        setPricing(prev => {
          if (prev.salePrice > 0) {
            return { ...prev, pricePerSquareMeter: Math.round(prev.salePrice / areaNum) };
          }
          return prev;
        });
      }
    }
  };

  const renderBasicDetailsFields = () => {
    switch (propertyType) {
      case 'apartment':
      case 'house':
      case 'villa':
        return (
          <div className="space-y-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Κατάσταση
                <div className="group relative ml-2">
                  <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                  <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                    Επιλέξτε την τρέχουσα κατάσταση του ακινήτου
                  </div>
                </div>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {propertyConditions.map(condition => (
                  <motion.button
                    key={condition.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleBasicDetailsChange('condition', condition.id)}
                    className={`
                      p-3 rounded-lg border-2 text-center transition-all duration-200
                      ${basicDetails.condition === condition.id
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-blue-300'
                      }
                    `}
                  >
                    {condition.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Έτος Κατασκευής
                <div className="group relative ml-2">
                  <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                  <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                    Συμπληρώστε το έτος κατασκευής του ακινήτου
                  </div>
                </div>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={basicDetails.yearBuilt}
                  onChange={(e) => handleBasicDetailsChange('yearBuilt', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                  placeholder="π.χ. 2010"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500">έτος</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Εμβαδόν
                <div className="group relative ml-2">
                  <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                  <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                    Συμπληρώστε το συνολικό εμβαδόν του ακινήτου σε τετραγωνικά μέτρα
                  </div>
                </div>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={basicDetails.area}
                  onChange={(e) => handleBasicDetailsChange('area', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                  placeholder="π.χ. 120"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500">τ.μ.</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Υπνοδωμάτια
                </label>
                <div className="flex rounded-lg border-2 border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleBasicDetailsChange('bedrooms', String(Math.max(0, Number(basicDetails.bedrooms) - 1)))}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={basicDetails.bedrooms}
                    onChange={(e) => handleBasicDetailsChange('bedrooms', e.target.value)}
                    className="w-full text-center border-0 focus:ring-0"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => handleBasicDetailsChange('bedrooms', String(Number(basicDetails.bedrooms) + 1))}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Μπάνια
                </label>
                <div className="flex rounded-lg border-2 border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleBasicDetailsChange('bathrooms', String(Math.max(0, Number(basicDetails.bathrooms) - 1)))}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={basicDetails.bathrooms}
                    onChange={(e) => handleBasicDetailsChange('bathrooms', e.target.value)}
                    className="w-full text-center border-0 focus:ring-0"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => handleBasicDetailsChange('bathrooms', String(Number(basicDetails.bathrooms) + 1))}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {propertyType === 'apartment' && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Όροφος
                </label>
                <select
                  value={basicDetails.floor}
                  onChange={(e) => handleBasicDetailsChange('floor', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                >
                  <option value="">Επιλέξτε όροφο</option>
                  {floorOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  Θέσεις Στάθμευσης
                  <div className="group relative ml-2">
                    <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                      Αριθμός διαθέσιμων θέσεων στάθμευσης
                    </div>
                  </div>
                </label>
                <div className="flex rounded-lg border-2 border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleBasicDetailsChange('parkingSpaces', String(Math.max(0, Number(basicDetails.parkingSpaces) - 1)))}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={basicDetails.parkingSpaces}
                    onChange={(e) => handleBasicDetailsChange('parkingSpaces', e.target.value)}
                    className="w-full text-center border-0 focus:ring-0"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => handleBasicDetailsChange('parkingSpaces', String(Number(basicDetails.parkingSpaces) + 1))}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {basicDetails.condition === 'renovated' && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Έτος Ανακαίνισης
                  </label>
                  <input
                    type="number"
                    value={basicDetails.renovationYear}
                    onChange={(e) => handleBasicDetailsChange('renovationYear', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                    placeholder="π.χ. 2020"
                  />
                </div>
              )}
            </div>

            {(propertyType === 'house' || propertyType === 'villa') && (
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={basicDetails.garden}
                        onChange={(e) => handleBasicDetailsChange('garden', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`
                        inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5
                        transition-colors duration-200 ease-in-out
                        ${basicDetails.garden ? 'bg-green-600' : 'bg-gray-200'}
                      `}>
                        <span className={`
                          inline-block h-4 w-4 rounded-full bg-white shadow-sm
                          transform transition-transform duration-200 ease-in-out
                          ${basicDetails.garden ? 'translate-x-5' : 'translate-x-0.5'}
                        `} />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Αυλή/Περιβάλλοντα Χώρος</span>
                  </label>
                </div>
                {basicDetails.garden && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={basicDetails.gardenArea}
                      onChange={(e) => handleBasicDetailsChange('gardenArea', e.target.value)}
                      className="w-24 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                      placeholder="τ.μ."
                      min="0"
                      step="1"
                    />
                    <span className="text-sm text-gray-500">τ.μ. (προαιρετικό)</span>
                  </div>
                )}
              </div>
            )}

            {(propertyType === 'house' || propertyType === 'villa') && (
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={basicDetails.multipleFloors}
                        onChange={(e) => handleBasicDetailsChange('multipleFloors', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`
                        inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5
                        transition-colors duration-200 ease-in-out
                        ${basicDetails.multipleFloors ? 'bg-green-600' : 'bg-gray-200'}
                      `}>
                        <span className={`
                          inline-block h-4 w-4 rounded-full bg-white shadow-sm
                          transform transition-transform duration-200 ease-in-out
                          ${basicDetails.multipleFloors ? 'translate-x-5' : 'translate-x-0.5'}
                        `} />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Πολλαπλοί όροφοι</span>
                  </label>
                </div>
                {basicDetails.multipleFloors && (
                  <div className="flex items-center gap-2">
                    <select
                      value={basicDetails.floorsCount}
                      onChange={(e) => handleBasicDetailsChange('floorsCount', e.target.value)}
                      className="px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                    >
                      <option value="">Επιλέξτε όροφους</option>
                      <option value="2">2 όροφοι</option>
                      <option value="3">3 όροφοι</option>
                      <option value="4">4 όροφοι</option>
                      <option value="5">5 όροφοι</option>
                      <option value="6">6+ όροφοι</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'commercial':
        const isRetail = basicDetails.commercialCategory === 'retail';
        const isOffice = basicDetails.commercialCategory === 'office';
        const isStorageIndustrial = basicDetails.commercialCategory === 'warehouse' || basicDetails.commercialCategory === 'industrial';
        const isHospitality = basicDetails.commercialCategory === 'hospitality';
        const isFb = basicDetails.commercialCategory === 'fb';
        const isParking = basicDetails.commercialCategory === 'parking';
        const isCommercialBuilding = basicDetails.commercialCategory === 'commercial_building';
        return (
          <div className="space-y-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Κύριες Κατηγορίες
                <div className="group relative ml-2">
                  <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                  <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                    Επιλέξτε την κύρια κατηγορία του επαγγελματικού χώρου
                  </div>
                </div>
              </label>
              <select
                value={basicDetails.commercialCategory}
                onChange={(e) => handleBasicDetailsChange('commercialCategory', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
              >
                <option value="">Επιλέξτε κατηγορία</option>
                {COMMERCIAL_MAIN_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                {isCommercialBuilding ? 'Συνολικό Εμβαδό (τ.μ.)' : isParking ? 'Συνολικό Εμβαδό (τ.μ.)' : 'Εμβαδόν (τ.μ.)'}
                <div className="group relative ml-2">
                  <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                  <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                    {isParking ? 'Συνολικό εμβαδόν σε τετραγωνικά μέτρα' : 'Συνολικό εμβαδόν σε τετραγωνικά μέτρα'}
                  </div>
                </div>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={basicDetails.area}
                  onChange={(e) => handleBasicDetailsChange('area', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                  placeholder="π.χ. 100"
                  min="1"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500">τ.μ.</span>
                </div>
              </div>
            </div>

            {isCommercialBuilding && (
              <>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    Εμβαδό Οικοπέδου (τ.μ.)
                    <div className="group relative ml-2">
                      <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                      <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                        Συνολικό εμβαδόν οικοπέδου σε τετραγωνικά μέτρα
                      </div>
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={basicDetails.landArea}
                      onChange={(e) => handleBasicDetailsChange('landArea', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                      placeholder="π.χ. 500"
                      min="0"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500">τ.μ.</span>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    Αριθμός Ορόφων
                    <div className="group relative ml-2">
                      <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                      <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                        π.χ. Υπόγειο + Ισόγειο + 5 Όροφοι
                      </div>
                    </div>
                  </label>
                  <input
                    type="text"
                    value={basicDetails.buildingFloorsDescription}
                    onChange={(e) => handleBasicDetailsChange('buildingFloorsDescription', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                    placeholder="π.χ. Υπόγειο + Ισόγειο + 5 Όροφοι"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    Έτος Ανακαίνισης
                    <div className="group relative ml-2">
                      <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                      <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                        Έτος ανακαίνισης (προαιρετικό)
                      </div>
                    </div>
                  </label>
                  <input
                    type="number"
                    value={basicDetails.renovationYear}
                    onChange={(e) => handleBasicDetailsChange('renovationYear', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                    placeholder="π.χ. 2020"
                    min="1800"
                    max={new Date().getFullYear()}
                  />
                </div>
              </>
            )}

            {(isParking || (!isStorageIndustrial && !isHospitality && !isCommercialBuilding)) && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Όροφος
                </label>
                <select
                  value={basicDetails.floor}
                  onChange={(e) => handleBasicDetailsChange('floor', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                >
                  <option value="">Επιλέξτε όροφο</option>
                  {floorOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}

            {isStorageIndustrial && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  Καθαρό Ύψος (μ.)
                  <div className="group relative ml-2">
                    <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                      Καθαρό ύψος σε μέτρα
                    </div>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={features.clearHeight}
                    onChange={(e) => handleFeatureChange('clearHeight', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                    placeholder="π.χ. 6"
                    min="0"
                    step="0.1"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500">μ.</span>
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Έτος Κατασκευής
                <div className="group relative ml-2">
                  <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                  <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                    Έτος κατασκευής του κτιρίου
                  </div>
                </div>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={basicDetails.yearBuilt}
                  onChange={(e) => handleBasicDetailsChange('yearBuilt', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                  placeholder="π.χ. 2010"
                  min="1800"
                  max={new Date().getFullYear()}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500">έτος</span>
                </div>
              </div>
            </div>

            {isParking && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  Αριθμός Θέσεων Στάθμευσης
                  <div className="group relative ml-2">
                    <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                      Το πιο κρίσιμο πεδίο - αριθμός θέσεων
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={basicDetails.parkingSpaces}
                  onChange={(e) => handleBasicDetailsChange('parkingSpaces', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                  placeholder="π.χ. 50"
                  min="1"
                />
              </div>
            )}

            {!isRetail && !isOffice && !isStorageIndustrial && !isHospitality && !isFb && !isParking && !isCommercialBuilding && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  Ενεργειακή Κλάση
                  <div className="group relative ml-2">
                    <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                      Ενεργειακή κλάση του ακινήτου
                    </div>
                  </div>
                </label>
                <select
                  value={features.energyClass}
                  onChange={(e) => handleFeatureChange('energyClass', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                >
                  <option value="">Επιλέξτε</option>
                  {energyClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
            )}

            {isOffice && !isStorageIndustrial && !isHospitality && !isFb && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  Αριθμός Χώρων/Δωματίων
                  <div className="group relative ml-2">
                    <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                      Αριθμός χώρων ή δωματίων του γραφείου
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={basicDetails.rooms}
                  onChange={(e) => handleBasicDetailsChange('rooms', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                  placeholder="π.χ. 5"
                  min="1"
                />
              </div>
            )}

            {isHospitality && (
              <>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    Αριθμός Κλινών
                    <div className="group relative ml-2">
                      <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                      <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                        Συνολικός αριθμός κλινών
                      </div>
                    </div>
                  </label>
                  <input
                    type="number"
                    value={basicDetails.hospitalityBeds}
                    onChange={(e) => handleBasicDetailsChange('hospitalityBeds', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                    placeholder="π.χ. 20"
                    min="1"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    Αριθμός Δωματίων
                    <div className="group relative ml-2">
                      <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                      <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                        Αριθμός δωματίων/διαμερισμάτων
                      </div>
                    </div>
                  </label>
                  <input
                    type="number"
                    value={basicDetails.rooms}
                    onChange={(e) => handleBasicDetailsChange('rooms', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                    placeholder="π.χ. 10"
                    min="1"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    Αστέρια (1-5)
                    <div className="group relative ml-2">
                      <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                      <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                        Κατηγορία αστέρων (1-5)
                      </div>
                    </div>
                  </label>
                  <select
                    value={basicDetails.hospitalityStars}
                    onChange={(e) => handleBasicDetailsChange('hospitalityStars', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                  >
                    <option value="">Επιλέξτε</option>
                    <option value="1">1★</option>
                    <option value="2">2★★</option>
                    <option value="3">3★★★</option>
                    <option value="4">4★★★★</option>
                    <option value="5">5★★★★★</option>
                  </select>
                </div>
              </>
            )}

            {isParking && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  Κατάσταση
                  <div className="group relative ml-2">
                    <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                      Σε λειτουργία, Κενό ή Μισθωμένο
                    </div>
                  </div>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {parkingConditions.map(condition => (
                    <motion.button
                      key={condition.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleBasicDetailsChange('condition', condition.id)}
                      className={`
                        p-3 rounded-lg border-2 text-center transition-all duration-200
                        ${basicDetails.condition === condition.id
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-blue-300'
                        }
                      `}
                    >
                      {condition.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {isCommercialBuilding && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  Κατάσταση
                  <div className="group relative ml-2">
                    <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                      π.χ. Ημιτελές, Εκμισθωμένο, Κενό
                    </div>
                  </div>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {buildingConditions.map(condition => (
                    <motion.button
                      key={condition.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleBasicDetailsChange('condition', condition.id)}
                      className={`
                        p-3 rounded-lg border-2 text-center transition-all duration-200
                        ${basicDetails.condition === condition.id
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-blue-300'
                        }
                      `}
                    >
                      {condition.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {!isRetail && !isHospitality && !isParking && !isCommercialBuilding && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  Κατάσταση
                  <div className="group relative ml-2">
                    <FaQuestionCircle className="h-4 w-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-800 text-white text-sm rounded-md -right-2 transform translate-x-full">
                      Τρέχουσα κατάσταση του επαγγελματικού χώρου
                    </div>
                  </div>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {commercialConditions.map(condition => (
                    <motion.button
                      key={condition.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleBasicDetailsChange('condition', condition.id)}
                      className={`
                        p-3 rounded-lg border-2 text-center transition-all duration-200
                        ${basicDetails.condition === condition.id
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-blue-300'
                        }
                      `}
                    >
                      {condition.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'plot':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Κατηγορία
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {plotCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => handleBasicDetailsChange('plotCategory', category.id)}
                    className={`
                      px-3 py-2 rounded-lg border-2 transition-all duration-200 text-sm
                      ${basicDetails.plotCategory === category.id
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Εμβαδόν (τ.μ.)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={basicDetails.area}
                  onChange={(e) => handleBasicDetailsChange('area', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. 500"
                  min="1"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Κατάσταση ιδιοκτησίας
              </label>
              <div className="grid grid-cols-1 gap-2">
                {ownershipTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleBasicDetailsChange('plotOwnershipType', type.id)}
                    className={`
                      w-full px-3 py-2 rounded-lg border-2 text-left transition-all duration-200 text-sm
                      ${basicDetails.plotOwnershipType === type.id // And here
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center text-gray-600">
            Παρακαλώ επιλέξτε τύπο ακινήτου
          </div>
        );
    }
  };

  const isFilled = (v: unknown) => v !== '' && v !== undefined && v !== null;

  const validateStep = (step: TabId) => {
    switch (step) {
      case 'basics':
        if (!propertyType) {
          setErrors({ propertyType: 'Παρακαλώ επιλέξτε τον τύπο ακινήτου' });
          return false;
        }
        if (['apartment', 'house', 'villa'].includes(propertyType)) {
          if (!isFilled(basicDetails.condition)) {
            setErrors({ condition: 'Παρακαλώ επιλέξτε την κατάσταση' });
            return false;
          }
          if (!isFilled(basicDetails.yearBuilt)) {
            setErrors({ yearBuilt: 'Παρακαλώ συμπληρώστε το έτος κατασκευής' });
            return false;
          }
          if (!isFilled(basicDetails.area) || parseFloat(String(basicDetails.area)) <= 0) {
            setErrors({ area: 'Παρακαλώ συμπληρώστε το εμβαδόν' });
            return false;
          }
          if (!isFilled(basicDetails.bedrooms)) {
            setErrors({ bedrooms: 'Παρακαλώ συμπληρώστε τα υπνοδωμάτια' });
            return false;
          }
          if (!isFilled(basicDetails.bathrooms)) {
            setErrors({ bathrooms: 'Παρακαλώ συμπληρώστε τα μπάνια' });
            return false;
          }
          if (propertyType === 'apartment' && !isFilled(basicDetails.floor)) {
            setErrors({ floor: 'Παρακαλώ επιλέξτε τον όροφο' });
            return false;
          }
          if (!isFilled(basicDetails.parkingSpaces)) {
            setErrors({ parkingSpaces: 'Παρακαλώ συμπληρώστε τις θέσεις στάθμευσης' });
            return false;
          }
          if (basicDetails.condition === 'renovated' && !isFilled(basicDetails.renovationYear)) {
            setErrors({ renovationYear: 'Παρακαλώ συμπληρώστε το έτος ανακαίνισης' });
            return false;
          }
          if (basicDetails.garden && !isFilled(basicDetails.gardenArea)) {
            setErrors({ gardenArea: 'Παρακαλώ συμπληρώστε το εμβαδόν κήπου' });
            return false;
          }
          if (basicDetails.multipleFloors && !isFilled(basicDetails.floorsCount)) {
            setErrors({ floorsCount: 'Παρακαλώ επιλέξτε τον αριθμό ορόφων' });
            return false;
          }
        } else if (propertyType === 'commercial') {
          if (!isFilled(basicDetails.commercialCategory)) {
            setErrors({ commercialCategory: 'Παρακαλώ επιλέξτε την κύρια κατηγορία' });
            return false;
          }
          const cat = basicDetails.commercialCategory;
          if (!isFilled(basicDetails.area) || parseFloat(String(basicDetails.area)) <= 0) {
            setErrors({ area: 'Παρακαλώ συμπληρώστε το εμβαδόν' });
            return false;
          }
          if (cat === 'commercial_building') {
            if (!isFilled(basicDetails.landArea) || parseFloat(String(basicDetails.landArea)) < 0) {
              setErrors({ landArea: 'Παρακαλώ συμπληρώστε το εμβαδόν οικοπέδου' });
              return false;
            }
            if (!isFilled(basicDetails.buildingFloorsDescription)) {
              setErrors({ buildingFloorsDescription: 'Παρακαλώ συμπληρώστε τον αριθμό ορόφων' });
              return false;
            }
            if (!isFilled(basicDetails.condition)) {
              setErrors({ condition: 'Παρακαλώ επιλέξτε την κατάσταση' });
              return false;
            }
          }
          if (['retail', 'office', 'parking', 'hospitality', 'fb'].includes(cat) && !['warehouse', 'industrial'].includes(cat) && cat !== 'commercial_building') {
            if (!isFilled(basicDetails.floor)) {
              setErrors({ floor: 'Παρακαλώ επιλέξτε τον όροφο' });
              return false;
            }
          }
          if (!isFilled(basicDetails.yearBuilt)) {
            setErrors({ yearBuilt: 'Παρακαλώ συμπληρώστε το έτος κατασκευής' });
            return false;
          }
          if (cat === 'parking') {
            if (!isFilled(basicDetails.parkingSpaces) || parseFloat(String(basicDetails.parkingSpaces)) <= 0) {
              setErrors({ parkingSpaces: 'Παρακαλώ συμπληρώστε τον αριθμό θέσεων στάθμευσης' });
              return false;
            }
            if (!isFilled(basicDetails.condition)) {
              setErrors({ condition: 'Παρακαλώ επιλέξτε την κατάσταση' });
              return false;
            }
          }
          if (cat === 'office') {
            if (!isFilled(basicDetails.rooms) || parseFloat(String(basicDetails.rooms)) <= 0) {
              setErrors({ rooms: 'Παρακαλώ συμπληρώστε τον αριθμό χώρων/δωματίων' });
              return false;
            }
          }
          if (cat === 'hospitality') {
            if (!isFilled(basicDetails.hospitalityBeds) || parseFloat(String(basicDetails.hospitalityBeds)) <= 0) {
              setErrors({ hospitalityBeds: 'Παρακαλώ συμπληρώστε τον αριθμό κλινών' });
              return false;
            }
            if (!isFilled(basicDetails.rooms) || parseFloat(String(basicDetails.rooms)) <= 0) {
              setErrors({ rooms: 'Παρακαλώ συμπληρώστε τον αριθμό δωματίων' });
              return false;
            }
            if (!isFilled(basicDetails.hospitalityStars)) {
              setErrors({ hospitalityStars: 'Παρακαλώ επιλέξτε τα αστέρια' });
              return false;
            }
          }
          if (['warehouse', 'industrial'].includes(cat)) {
            if (!isFilled(features.clearHeight) || parseFloat(String(features.clearHeight)) <= 0) {
              setErrors({ clearHeight: 'Παρακαλώ συμπληρώστε το καθαρό ύψος' });
              return false;
            }
          }
          if (['office', 'warehouse', 'industrial', 'fb'].includes(cat)) {
            if (!isFilled(basicDetails.condition)) {
              setErrors({ condition: 'Παρακαλώ επιλέξτε την κατάσταση' });
              return false;
            }
          }
        } else if (propertyType === 'plot') {
          if (!isFilled(basicDetails.plotCategory)) {
            setErrors({ plotCategory: 'Παρακαλώ επιλέξτε την κατηγορία οικοπέδου' });
            return false;
          }
          if (!isFilled(basicDetails.area) || parseFloat(String(basicDetails.area)) <= 0) {
            setErrors({ area: 'Παρακαλώ συμπληρώστε το εμβαδόν' });
            return false;
          }
          if (!isFilled(basicDetails.plotOwnershipType)) {
            setErrors({ plotOwnershipType: 'Παρακαλώ επιλέξτε τον τύπο ιδιοκτησίας' });
            return false;
          }
        }
        break;

      case 'description':
        // Για επαγγελματικό χώρο, ο τίτλος προέρχεται από την κατηγορία (στην καρτέλα Βασικά)
        const hasTitle = description.title?.trim() || (propertyType === 'commercial' && basicDetails.commercialCategory);
        if (!hasTitle) {
          setErrors({ title: 'Παρακαλώ επιλέξτε κατηγορία (Βασικά) ή συμπληρώστε τον τίτλο' });
          return false;
        }
        if (!description.fullDescription) {
          setErrors({ description: 'Παρακαλώ συμπληρώστε την περιγραφή της αγγελίας' });
          return false;
        }
        break;

      case 'price':
        if (!pricing.salePrice) {
          setErrors({ price: listingType === 'rent' ? 'Παρακαλώ συμπληρώστε την τιμή ενοικίασης' : 'Παρακαλώ συμπληρώστε την τιμή πώλησης' });
          return false;
        }
        break;

      case 'location':
        if (!location.state?.trim()) {
          setErrors({ state: 'Παρακαλώ συμπληρώστε τον νομό/περιφέρεια' });
          return false;
        }
        if (!location.city?.trim()) {
          setErrors({ city: 'Παρακαλώ συμπληρώστε την πόλη' });
          return false;
        }
        if (!location.street?.trim()) {
          setErrors({ street: 'Παρακαλώ συμπληρώστε την οδό' });
          return false;
        }
        if (!location.number?.trim()) {
          setErrors({ number: 'Παρακαλώ συμπληρώστε τον αριθμό' });
          return false;
        }
        if (!location.postalCode?.trim()) {
          setErrors({ postalCode: 'Παρακαλώ συμπληρώστε τον ταχυδρομικό κώδικα' });
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrors({});

      // Validate all required fields
      if (!validateStep('basics') || !validateStep('description') || !validateStep('price') || !validateStep('location')) {
        setIsSubmitting(false);
        return;
      }

      // Format the data
      const formData = new FormData();
      
      // Βασικά στοιχεία
      formData.append('propertyType', propertyType);
      formData.append('basicDetails', JSON.stringify({
        condition: basicDetails.condition,
        yearBuilt: basicDetails.yearBuilt,
        renovationYear: basicDetails.renovationYear,
        area: basicDetails.area,
        bedrooms: basicDetails.bedrooms,
        bathrooms: basicDetails.bathrooms,
        floor: basicDetails.floor,
        parkingSpaces: basicDetails.parkingSpaces,
        garden: basicDetails.garden,
        gardenArea: basicDetails.gardenArea,
        multipleFloors: basicDetails.multipleFloors,
        floorsCount: basicDetails.floorsCount,
        commercialType: basicDetails.commercialType,
        commercialCategory: basicDetails.commercialCategory,
        plotCategory: basicDetails.plotCategory,
        plotOwnershipType: basicDetails.plotOwnershipType,
        landArea: basicDetails.landArea,
        buildingFloorsDescription: basicDetails.buildingFloorsDescription
      }));

      // Χαρακτηριστικά και παροχές
      formData.append('features', JSON.stringify(features));
      formData.append('amenities', JSON.stringify({
        ...amenities,
        listingType: listingType || 'sale',
        transactionType: listingType || 'sale',
      }));

      // Τοποθεσία
      formData.append('location', JSON.stringify({
        state: location.state,
        city: location.city,
        neighborhood: location.neighborhood,
        street: location.street,
        number: location.number,
        postalCode: location.postalCode,
        coordinates: location.coordinates
      }));

      // Τιμή
      formData.append('pricing', JSON.stringify({
        price: pricing.salePrice,
        pricePerSquareMeter: pricing.pricePerSquareMeter,
        negotiable: true,
        additionalNotes: ''
      }));

      // Περιγραφή - για επαγγελματικό χώρο χρησιμοποιούμε την κατηγορία ως τίτλο αν λείπει
      const titleForSubmit = description.title?.trim()
        || (propertyType === 'commercial' && basicDetails.commercialCategory
          ? (COMMERCIAL_MAIN_CATEGORIES.find(c => c.id === basicDetails.commercialCategory)?.label ?? '')
          : '');
      formData.append('description', JSON.stringify({
        title: titleForSubmit,
        shortDescription: description.shortDescription,
        fullDescription: description.fullDescription,
        keywords: description.keywords
      }));

      // Φωτογραφίες
      photos.forEach((photo) => {
        formData.append('photos', photo.file);
      });

      const response = await uploadToBackend('/properties', formData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά την καταχώριση του ακινήτου');
      }

      const data = await response.json();
      router.push('/dashboard/seller');
    } catch (err) {
      console.error('Error submitting property:', err);
      setErrors({ 
        submit: err instanceof Error ? err.message : 'Σφάλμα κατά την καταχώριση του ακινήτου'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFeatures = () => {
    if (!propertyType) {
      return (
        <div className="text-center text-gray-600">
          Παρακαλώ επιλέξτε πρώτα τον τύπο ακινήτου στην καρτέλα "Βασικά"
        </div>
      );
    }

    const isResidential = ['apartment', 'house', 'villa'].includes(propertyType);
    let content = null;

    if (propertyType === 'plot') {
      content = (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Χαρακτηριστικά Οικοπέδου</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Εμβαδόν Οικοπέδου (τ.μ.)
              </label>
              <input
                type="number"
                value={features.plotArea || ''}
                onChange={(e) => handleFeatureChange('plotArea', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. 500"
                min="0"
                step="0.1"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Συντελεστής Δόμησης (Σ.Δ.)
              </label>
              <input
                type="number"
                value={features.buildingCoefficient || ''}
                onChange={(e) => handleFeatureChange('buildingCoefficient', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. 0.8"
                min="0"
                max="1"
                step="0.01"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Συντελεστής Κάλυψης
              </label>
              <input
                type="number"
                value={features.coverageRatio || ''}
                onChange={(e) => handleFeatureChange('coverageRatio', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. 0.6"
                min="0"
                max="1"
                step="0.01"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Μήκος πρόσοψης (μ.)
              </label>
              <input
                type="number"
                value={features.facadeLength || ''}
                onChange={(e) => handleFeatureChange('facadeLength', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. 15"
                min="0"
                step="0.1"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Αριθμός Όψεων
              </label>
              <input
                type="number"
                value={features.sides || ''}
                onChange={(e) => handleFeatureChange('sides', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. 2"
                min="1"
                max="4"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Κτίζει (τ.μ.)
              </label>
              <input
                type="number"
                value={features.buildableArea || ''}
                onChange={(e) => handleFeatureChange('buildableArea', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. 200"
                min="0"
                step="0.1"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Δυνατότητα Οικοδομής
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={features.buildingPermit === true}
                    onChange={() => handleFeatureChange('buildingPermit', true)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Ναι</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={features.buildingPermit === false}
                    onChange={() => handleFeatureChange('buildingPermit', false)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Όχι</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Πρόσβαση από δρόμο
              </label>
              <select
                value={features.roadAccess || ''}
                onChange={(e) => handleFeatureChange('roadAccess', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε</option>
                {roadAccessTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Κλίση εδάφους
              </label>
              <select
                value={features.terrain || ''}
                onChange={(e) => handleFeatureChange('terrain', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε</option>
                {terrainTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Μορφολογία
              </label>
              <select
                value={features.shape || ''}
                onChange={(e) => handleFeatureChange('shape', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε</option>
                {morphologyTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Καταλληλότητα
              </label>
              <select
                value={features.suitability || ''}
                onChange={(e) => handleFeatureChange('suitability', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε</option>
                {suitabilityTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      );
    } else if (propertyType === 'commercial') {
      const isRetailFeatures = basicDetails.commercialCategory === 'retail';
      const isOfficeFeatures = basicDetails.commercialCategory === 'office';
      const isStorageIndustrialFeatures = basicDetails.commercialCategory === 'warehouse' || basicDetails.commercialCategory === 'industrial';
      const isHospitalityFeatures = basicDetails.commercialCategory === 'hospitality';
      const isFbFeatures = basicDetails.commercialCategory === 'fb';
      const isParkingFeatures = basicDetails.commercialCategory === 'parking';
      const isCommercialBuildingFeatures = basicDetails.commercialCategory === 'commercial_building';
      content = (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Επιπλέον Χαρακτηριστικά</h3>
          {isRetailFeatures ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Μήκος Βιτρίνας (μ.)
                </label>
                <input
                  type="number"
                  value={features.storefrontLength || features.storeFrontLength || ''}
                  onChange={(e) => handleFeatureChange('storefrontLength', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. 8"
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Εμβαδόν Παταριού (τ.μ.)
                </label>
                <input
                  type="number"
                  value={features.mezzanineArea || ''}
                  onChange={(e) => handleFeatureChange('mezzanineArea', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. 20"
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Εμβαδόν Υπογείου (τ.μ.)
                </label>
                <input
                  type="number"
                  value={features.basementArea || ''}
                  onChange={(e) => handleFeatureChange('basementArea', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. 30"
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Εμβαδόν Προαυλίου (τ.μ.)
                </label>
                <input
                  type="number"
                  value={features.forecourtArea || ''}
                  onChange={(e) => handleFeatureChange('forecourtArea', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. 15"
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Άδεια Υγειονομικού Ενδιαφέροντος
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.healthPermit === true}
                      onChange={() => handleFeatureChange('healthPermit', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.healthPermit === false}
                      onChange={() => handleFeatureChange('healthPermit', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
            </div>
          ) : isOfficeFeatures ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Δομημένη Καλωδίωση
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.structuredCabling === true}
                      onChange={() => handleFeatureChange('structuredCabling', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.structuredCabling === false}
                      onChange={() => handleFeatureChange('structuredCabling', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ψευδοροφή
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.officeFalseCeiling === true}
                      onChange={() => handleFeatureChange('officeFalseCeiling', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.officeFalseCeiling === false}
                      onChange={() => handleFeatureChange('officeFalseCeiling', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reception / Χώρος Υποδοχής
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.reception === true}
                      onChange={() => handleFeatureChange('reception', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.reception === false}
                      onChange={() => handleFeatureChange('reception', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Server Room
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.serverRoom === true}
                      onChange={() => handleFeatureChange('serverRoom', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.serverRoom === false}
                      onChange={() => handleFeatureChange('serverRoom', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Αριθμός WC
                </label>
                <input
                  type="number"
                  value={features.wc || ''}
                  onChange={(e) => handleFeatureChange('wc', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. 2"
                  min="0"
                />
              </div>
            </div>
          ) : isStorageIndustrialFeatures ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ράμπα Φόρτωσης
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.loadingRamp === true}
                      onChange={() => handleFeatureChange('loadingRamp', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.loadingRamp === false}
                      onChange={() => handleFeatureChange('loadingRamp', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Τριφασικό Ρεύμα
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={amenities.threePhaseElectricity === true}
                      onChange={() => handleAmenityChange('threePhaseElectricity', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={amenities.threePhaseElectricity === false}
                      onChange={() => handleAmenityChange('threePhaseElectricity', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Βιομηχανικό Δάπεδο
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.industrialFloor === true}
                      onChange={() => handleFeatureChange('industrialFloor', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.industrialFloor === false}
                      onChange={() => handleFeatureChange('industrialFloor', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Γερανογέφυρα
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.crane === true}
                      onChange={() => handleFeatureChange('crane', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.crane === false}
                      onChange={() => handleFeatureChange('crane', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ισχύς Ρεύματος (KVA)
                </label>
                <input
                  type="number"
                  value={features.powerKva || ''}
                  onChange={(e) => handleFeatureChange('powerKva', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. 100"
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Είσοδος για Φορτηγά
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.truckAccess === true}
                      onChange={() => handleFeatureChange('truckAccess', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.truckAccess === false}
                      onChange={() => handleFeatureChange('truckAccess', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
            </div>
          ) : isHospitalityFeatures ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Απόσταση από Θάλασσα (μ.)
                </label>
                <input
                  type="number"
                  value={features.distanceFromSea || ''}
                  onChange={(e) => handleFeatureChange('distanceFromSea', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. 500"
                  min="0"
                  step="1"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Εμβαδόν Οικοπέδου (τ.μ.)
                </label>
                <input
                  type="number"
                  value={features.hospitalityPlotArea || ''}
                  onChange={(e) => handleFeatureChange('hospitalityPlotArea', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. 1000"
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Πισίνα
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.hospitalityPool === true}
                      onChange={() => handleFeatureChange('hospitalityPool', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.hospitalityPool === false}
                      onChange={() => handleFeatureChange('hospitalityPool', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Εστιατόριο/Bar
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.restaurantBar === true}
                      onChange={() => handleFeatureChange('restaurantBar', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.restaurantBar === false}
                      onChange={() => handleFeatureChange('restaurantBar', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reception
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.hospitalityReception === true}
                      onChange={() => handleFeatureChange('hospitalityReception', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.hospitalityReception === false}
                      onChange={() => handleFeatureChange('hospitalityReception', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Laundry Room
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.laundryRoom === true}
                      onChange={() => handleFeatureChange('laundryRoom', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.laundryRoom === false}
                      onChange={() => handleFeatureChange('laundryRoom', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
            </div>
          ) : isFbFeatures ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Εξαερισμός / Καμινάδα
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.ventilationChimney === true}
                      onChange={() => handleFeatureChange('ventilationChimney', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.ventilationChimney === false}
                      onChange={() => handleFeatureChange('ventilationChimney', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Άδεια Υγειονομικού
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.fbHealthPermit === true}
                      onChange={() => handleFeatureChange('fbHealthPermit', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.fbHealthPermit === false}
                      onChange={() => handleFeatureChange('fbHealthPermit', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Χρήση Πρασιάς (για τραπεζοκαθίσματα)
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.greenSpaceUse === true}
                      onChange={() => handleFeatureChange('greenSpaceUse', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.greenSpaceUse === false}
                      onChange={() => handleFeatureChange('greenSpaceUse', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Εμβαδόν Κουζίνας (τ.μ.)
                </label>
                <input
                  type="number"
                  value={features.kitchenArea || ''}
                  onChange={(e) => handleFeatureChange('kitchenArea', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. 25"
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Αποθηκευτικός Χώρος
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.fbStorageSpace === true}
                      onChange={() => handleFeatureChange('fbStorageSpace', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.fbStorageSpace === false}
                      onChange={() => handleFeatureChange('fbStorageSpace', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
            </div>
          ) : isParkingFeatures ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Τύπος Θέσεων
                </label>
                <select
                  value={features.parkingSpaceType || ''}
                  onChange={(e) => handleFeatureChange('parkingSpaceType', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Επιλέξτε</option>
                  {parkingSpaceTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ύψος Εισόδου (μ.)
                </label>
                <input
                  type="number"
                  value={features.entranceHeight || ''}
                  onChange={(e) => handleFeatureChange('entranceHeight', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. 2.5"
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Εμβαδόν Υπογείου/Ορόφων (τ.μ.)
                </label>
                <input
                  type="number"
                  value={features.parkingBasementArea || ''}
                  onChange={(e) => handleFeatureChange('parkingBasementArea', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. 500"
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Άδεια Λειτουργίας
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.operatingPermit === true}
                      onChange={() => handleFeatureChange('operatingPermit', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ναι</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={features.operatingPermit === false}
                      onChange={() => handleFeatureChange('operatingPermit', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Όχι</span>
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Κυκλοφοριακή Μελέτη / Είσοδος-Έξοδος
                </label>
                <input
                  type="text"
                  value={features.trafficStudy || ''}
                  onChange={(e) => handleFeatureChange('trafficStudy', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Περιγραφή κυκλοφοριακής μελέτης ή εισόδου-εξόδου"
                />
              </div>
            </div>
          ) : isCommercialBuildingFeatures ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Συντελεστής Δόμησης
                </label>
                <input
                  type="text"
                  value={features.buildingCoefficient || ''}
                  onChange={(e) => handleFeatureChange('buildingCoefficient', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. 2.0"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Υπόλοιπο Δόμησης
                </label>
                <input
                  type="text"
                  value={features.remainingBuilding || ''}
                  onChange={(e) => handleFeatureChange('remainingBuilding', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Πολύ κρίσιμο για επενδυτές"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Αριθμός Επιπέδων / Ενοτήτων
                </label>
                <input
                  type="text"
                  value={features.buildingUnitsCount || ''}
                  onChange={(e) => handleFeatureChange('buildingUnitsCount', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="π.χ. Πόσα ανεξάρτητα καταστήματα ή γραφεία"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Χρήση Γης
                </label>
                <select
                  value={features.buildingLandUse || ''}
                  onChange={(e) => handleFeatureChange('buildingLandUse', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Επιλέξτε</option>
                  {buildingLandUseTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Πρόσοψη (μ.)
                </label>
                <input
                  type="number"
                  value={features.buildingFacadeLength || ''}
                  onChange={(e) => handleFeatureChange('buildingFacadeLength', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Συνολικό μήκος πρόσοψης στο δρόμο"
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ανωδομή (τ.μ.)
                </label>
                <input
                  type="number"
                  value={features.superstructureArea || ''}
                  onChange={(e) => handleFeatureChange('superstructureArea', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Συνολικά τ.μ. πάνω από το έδαφος"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
          ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Μήκος Πρόσοψης (μ.)
              </label>
              <input
                type="number"
                value={features.facadeLength || ''}
                onChange={(e) => handleFeatureChange('facadeLength', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. 10"
                min="0"
                step="0.1"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Μέγιστο Ύψος (μ.)
              </label>
              <input
                type="number"
                value={features.maxHeight || ''}
                onChange={(e) => handleFeatureChange('maxHeight', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. 4"
                min="0"
                step="0.1"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Αποθήκη
              </label>
              <SelectionCard
                label="Τύπος Αποθήκης"
                value={features.storageType || ''}
                onChange={(value) => handleFeatureChange('storageType', value)}
                options={[
                  { id: 'internal', label: 'Εσωτερική' },
                  { id: 'external', label: 'Εξωτερική' },
                  { id: 'none', label: 'Χωρίς Αποθήκη' }
                ]}
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ανελκυστήρας
              </label>
              <SelectionCard
                label="Τύπος Ανελκυστήρα"
                value={features.elevatorType || ''}
                onChange={(value) => handleFeatureChange('elevatorType', value)}
                options={[
                  { id: 'passenger', label: 'Κοινού' },
                  { id: 'freight', label: 'Φορτίου' },
                  { id: 'both', label: 'Και τα δύο' },
                  { id: 'none', label: 'Χωρίς Ανελκυστήρα' }
                ]}
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Τύπος Επαγγελματικού Χώρου
              </label>
              <select
                value={features.commercialType || ''}
                onChange={(e) => handleFeatureChange('commercialType', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε</option>
                <option value="office">Γραφείο</option>
                <option value="shop">Κατάστημα</option>
                <option value="warehouse">Αποθήκη</option>
                <option value="industrial">Βιομηχανικός Χώρος</option>
                <option value="restaurant">Εστιατόριο</option>
                <option value="hotel">Ξενοδοχείο</option>
                <option value="clinic">Κλινική</option>
                <option value="gym">Γυμναστήριο</option>
                <option value="other">Άλλο</option>
              </select>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Αριθμός Δωματίων
              </label>
              <input
                type="number"
                value={features.rooms || ''}
                onChange={(e) => handleFeatureChange('rooms', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. 5"
                min="0"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Βοηθητικοί Χώροι
              </label>
              <input
                type="text"
                value={features.auxiliarySpaces || ''}
                onChange={(e) => handleFeatureChange('auxiliarySpaces', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. αποθήκη, κουζίνα"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WC
              </label>
              <input
                type="number"
                value={features.wc || ''}
                onChange={(e) => handleFeatureChange('wc', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. 2"
                min="0"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Κατάσταση
              </label>
              <select
                value={features.condition || ''}
                onChange={(e) => handleFeatureChange('condition', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε</option>
                <option value="excellent">Εξαιρετική</option>
                <option value="very_good">Πολύ Καλή</option>
                <option value="good">Καλή</option>
                <option value="fair">Μέτρια</option>
                <option value="needs_renovation">Χρειάζεται Επισκευή</option>
              </select>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Έτος Κατασκευής
              </label>
              <input
                type="number"
                value={features.yearBuilt || ''}
                onChange={(e) => handleFeatureChange('yearBuilt', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. 2000"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Έτος Ανακαίνισης
              </label>
              <input
                type="number"
                value={features.renovationYear || ''}
                onChange={(e) => handleFeatureChange('renovationYear', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. 2020"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Θέσεις Στάθμευσης
              </label>
              <input
                type="number"
                value={features.parkingSpaces || ''}
                onChange={(e) => handleFeatureChange('parkingSpaces', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="π.χ. 5"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
            <FeatureCard
              icon={<MdStore />}
              label="Ράμπα Φορτοεκφόρτωσης"
              checked={!!features.loadingRamp}
              onChange={(checked) => handleFeatureChange('loadingRamp', checked)}
            />
            <FeatureCard
              icon={<MdStore />}
              label="Πρόσβαση Φορτηγού"
              checked={!!features.truckAccess}
              onChange={(checked) => handleFeatureChange('truckAccess', checked)}
            />
            <FeatureCard
              icon={<MdSecurity />}
              label="Πυρασφάλεια"
              checked={!!features.fireSafety}
              onChange={(checked) => handleFeatureChange('fireSafety', checked)}
            />
            <FeatureCard
              icon={<MdSecurity />}
              label="Πυρασφαλή Πόρτα"
              checked={!!features.fireproofDoor}
              onChange={(checked) => handleFeatureChange('fireproofDoor', checked)}
            />
            <FeatureCard
              icon={<GiHeatHaze />}
              label="Ηχομόνωση"
              checked={!!features.soundproofing}
              onChange={(checked) => handleFeatureChange('soundproofing', checked)}
            />
            <FeatureCard
              icon={<GiHeatHaze />}
              label="Θερμομόνωση"
              checked={!!features.thermalInsulation}
              onChange={(checked) => handleFeatureChange('thermalInsulation', checked)}
            />
            <FeatureCard
              icon={<FaHome />}
              label="Ανελκυστήρας"
              checked={features.elevator}
              onChange={(checked) => handleFeatureChange('elevator', checked)}
            />
            <FeatureCard
              icon={<FaHome />}
              label="Επιπλωμένο"
              checked={features.furnished}
              onChange={(checked) => handleFeatureChange('furnished', checked)}
            />
            <FeatureCard
              icon={<MdSecurity />}
              label="Πόρτα Ασφαλείας"
              checked={features.securityDoor}
              onChange={(checked) => handleFeatureChange('securityDoor', checked)}
            />
            <FeatureCard
              icon={<MdSecurity />}
              label="Συναγερμός"
              checked={features.alarm}
              onChange={(checked) => handleFeatureChange('alarm', checked)}
            />
            <FeatureCard
              icon={<FaUser />}
              label="Φιλικό για ΑΜΕΑ"
              checked={features.disabledAccess}
              onChange={(checked) => handleFeatureChange('disabledAccess', checked)}
            />
          </div>
          </>
          )}
        </div>
      );
    } else if (isResidential) {
      content = (
        <>
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Θέρμανση & Ενέργεια</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SelectionCard
                label="Τύπος Θέρμανσης"
                value={features.heatingType}
                onChange={(value) => handleFeatureChange('heatingType', value)}
                options={heatingTypes}
              />
              <SelectionCard
                label="Σύστημα Θέρμανσης"
                value={features.heatingSystem}
                onChange={(value) => handleFeatureChange('heatingSystem', value)}
                options={heatingSystems}
              />
              <SelectionCard
                label="Κουφώματα"
                value={features.windows}
                onChange={(value) => handleFeatureChange('windows', value)}
                options={windowTypes}
              />
              <SelectionCard
                label="Τύπος Κουφωμάτων"
                value={features.windowsType}
                onChange={(value) => handleFeatureChange('windowsType', value)}
                options={windowInsulation}
              />
              <SelectionCard
                label="Δάπεδο"
                value={features.flooring}
                onChange={(value) => handleFeatureChange('flooring', value)}
                options={flooringTypes}
              />
              <SelectionCard
                label="Ενεργειακή Κλάση"
                value={features.energyClass}
                onChange={(value) => handleFeatureChange('energyClass', value)}
                options={energyClasses.map(cls => ({ id: cls, label: cls }))}
              />
            </div>
          </div>

          <div className="space-y-6 mt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Επιπλέον Χαρακτηριστικά</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Πισίνα
                </label>
                <SelectionCard
                  label="Τύπος Πισίνας"
                  value={features.poolType || ''}
                  onChange={(value) => handleFeatureChange('poolType', value)}
                  options={poolTypes}
                />
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Μπαλκόνι/Βεράντα
                </label>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={features.hasBalcony}
                      onChange={(e) => handleFeatureChange('hasBalcony', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Διαθέτει Μπαλκόνι/Βεράντα
                    </label>
                  </div>
                  {features.hasBalcony && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Εμβαδόν (τ.μ.)
                      </label>
                      <input
                        type="number"
                        value={features.balconyArea || ''}
                        onChange={(e) => handleFeatureChange('balconyArea', e.target.value)}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="π.χ. 20"
                        min="0"
                        step="0.1"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Επιπλέον χαρακτηριστικά - Κατάσταση, Έτος, Στάθμευση, Κήπος, Πολλαπλοί Όροφοι ήδη στο tab Βασικά για διαμέρισμα/μονοκατοικία/βίλα */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <FeatureCard
                icon={<FaHome />}
                label="Ασανσέρ"
                checked={features.elevator}
                onChange={(checked) => handleFeatureChange('elevator', checked)}
              />
              <FeatureCard
                icon={<FaHome />}
                label="Επιπλωμένο"
                checked={features.furnished}
                onChange={(checked) => handleFeatureChange('furnished', checked)}
              />
              <FeatureCard
                icon={<MdSecurity />}
                label="Πόρτα Ασφαλείας"
                checked={features.securityDoor}
                onChange={(checked) => handleFeatureChange('securityDoor', checked)}
              />
              <FeatureCard
                icon={<MdSecurity />}
                label="Συναγερμός"
                checked={features.alarm}
                onChange={(checked) => handleFeatureChange('alarm', checked)}
              />
              <FeatureCard
                icon={<FaUser />}
                label="Φιλικό για ΑΜΕΑ"
                checked={features.disabledAccess}
                onChange={(checked) => handleFeatureChange('disabledAccess', checked)}
              />
              <FeatureCard
                icon={<GiRadiations />}
                label="Ηχομόνωση"
                checked={features.soundproofing}
                onChange={(checked) => handleFeatureChange('soundproofing', checked)}
              />
              <FeatureCard
                icon={<GiHeatHaze />}
                label="Θερμομόνωση"
                checked={features.thermalInsulation}
                onChange={(checked) => handleFeatureChange('thermalInsulation', checked)}
              />
            </div>
          </div>
        </>
      );
    }

    return <div className="space-y-8">{content || null}</div>;
  };

  const handleNextStep = () => {
    if (validateStep(activeTab)) {
      setErrors({});
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1].id);
      }
    }
  };

  const handlePreviousStep = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  const renderPricing = () => {
    const isRent = listingType === 'rent';
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {isRent ? 'Τιμή Ενοικίασης' : 'Τιμή Πώλησης'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isRent ? 'Τιμή ανά μήνα (€)' : 'Συνολική Τιμή Πώλησης (€)'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={formatPriceWithCommas(pricing.salePrice)}
                onChange={(e) => handleSalePriceChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:ring focus:ring-green-200 transition-all duration-200"
                placeholder={isRent ? "π.χ. 800" : "π.χ. 250.000"}
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500">€</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Τιμή ανά τ.μ. (€)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={formatPriceWithCommas(pricing.pricePerSquareMeter)}
                onChange={(e) => handlePricePerSquareMeterChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:ring focus:ring-green-200 transition-all duration-200"
                placeholder="π.χ. 900"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500">€/τ.μ.</span>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Υπολογίζεται αυτόματα από τη συνολική τιμή και το εμβαδόν. Αν αλλάξετε την τιμή ανά τ.μ., η συνολική τιμή ενημερώνεται αυτόματα.
            </p>
          </div>

          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-gray-700">
              Οι ενδιαφερόμενοι θα μπορούν να κάνουν προσφορές με βάση την αρχική τιμή και εσείς θα μπορείτε να τη διαπραγματευτείτε ακριβώς όπως πιστεύετε.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100">
      {/* Header - ακριβώς ίδιο με /seller (scrolled state) */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100">
        <div className="container mx-auto px-6">
          <div className="flex items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center group">
                <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center mr-2 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <FaHome className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">RealEstate</span>
              </Link>
              <div className="relative" ref={roleMenuRef}>
                <button
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className="flex items-center px-4 py-2 text-sm font-medium bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-full shadow-sm hover:from-green-700 hover:to-emerald-800 transition-all duration-300 whitespace-nowrap"
                >
                  <FaUserCircle className="mr-2 w-4 h-4" />
                  Seller Mode
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
                      <div className="px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                          <FaExchangeAlt className="mr-2 text-green-500" />
                          Αλλαγή Ρόλου
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Επιλέξτε τον ρόλο που θέλετε να χρησιμοποιήσετε</p>
                      </div>
                      <div className="py-2">
                        <div
                          onClick={() => handleRoleChange('BUYER')}
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
                          onClick={() => handleRoleChange('AGENT')}
                          className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-200 cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <FaUserCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">Agent Mode</div>
                            <div className="text-xs text-gray-500 mt-1">Διαχείριση πελατών και ακινήτων</div>
                          </div>
                          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                        </div>
                      </div>
                      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs text-gray-500 text-center">
                          Τρέχων: <span className="font-semibold text-green-600">Seller Mode</span>
                        </p>
                        <p className="text-xs text-gray-500 text-center mt-1">
                          Είστε Επαγγελματίας;{' '}
                          <Link
                            href="/professionals"
                            className="font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
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
                <Link href="/seller" className="text-gray-600 hover:text-green-600 transition-all duration-300 font-medium relative group">
                  Αρχική
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all duration-300" />
                </Link>
                <Link href="/about" className="text-gray-600 hover:text-green-600 transition-all duration-300 font-medium relative group">
                  Σχετικά
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all duration-300" />
                </Link>
                <Link href="/contact" className="text-gray-600 hover:text-green-600 transition-all duration-300 font-medium relative group">
                  Επικοινωνία
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all duration-300" />
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              {session ? (
                <>
                  <SellerNotificationBell light={false} />
                  <Link
                    href="/deals?from=seller&tab=deals"
                    className="px-5 py-2.5 rounded-lg transition-all font-semibold text-sm bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800"
                  >
                    Συναλλαγές
                  </Link>
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800"
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
                          <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-600 to-emerald-700 flex items-center justify-center flex-shrink-0">
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
                              href="/dashboard/seller"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center mr-3 group-hover:bg-green-100 group-hover:scale-105 transition-all duration-200">
                                <FaCog className="w-3.5 h-3.5 text-green-700" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-green-800 transition-colors">Ρυθμίσεις / Προφίλ</span>
                            </Link>
                            <Link
                              href="/dashboard/seller"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center mr-3 group-hover:bg-green-100 group-hover:scale-105 transition-all duration-200">
                                <FaChartBar className="w-3.5 h-3.5 text-green-700" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-green-800 transition-colors">Πίνακας Ελέγχου</span>
                            </Link>
                            <Link
                              href="/about#faq"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center mr-3 group-hover:bg-green-100 group-hover:scale-105 transition-all duration-200">
                                <FaQuestionCircle className="w-3.5 h-3.5 text-green-700" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-green-800 transition-colors">Συχνές Ερωτήσεις</span>
                            </Link>
                          </div>
                          <div className="border-t border-gray-100" />
                          <div className="py-1">
                            <Link
                              href="/"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center mr-3 group-hover:bg-gray-200 group-hover:scale-105 transition-all duration-200">
                                <FaExchangeAlt className="w-3.5 h-3.5 text-gray-600" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors">Αλλαγή Ρόλων</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                void handleLogout();
                              }}
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
                  <Link href="/seller/auth/login" className="text-gray-600 hover:text-green-600 transition-all font-medium text-sm">
                    Σύνδεση
                  </Link>
                  <Link
                    href="/seller/auth/register"
                    className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800"
                  >
                    Εγγραφή
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-20 pb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Form Content */}
          <div className="flex-1">
            {!showForm ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 opacity-95"></div>
                <div className="relative px-6 py-12 text-center text-white">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6"
                  >
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FaHome className="w-8 h-8 text-white" />
                    </div>
                  </motion.div>
                  <motion.h2 
                    className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-green-100 bg-clip-text text-transparent"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Καταχώρηση Νέου Ακινήτου
                  </motion.h2>
                  <motion.p 
                    className="text-lg mb-8 text-green-100 max-w-2xl mx-auto leading-relaxed"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    Καλώς ήρθατε στη διαδικασία καταχώρησης του ακινήτου σας. Θα σας καθοδηγήσουμε βήμα-βήμα στη συμπλήρωση όλων των απαραίτητων πληροφοριών για μια επιτυχημένη καταχώρηση.
                  </motion.p>
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                        <motion.div
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                          <FaImage className="w-5 h-5 text-white" />
                      </div>
                        <h3 className="font-semibold mb-2 text-base">Φωτογραφίες</h3>
                        <p className="text-green-100 text-center text-sm">Προσθέστε εντυπωσιακές φωτογραφίες</p>
                      </div>
                    </motion.div>
                        <motion.div
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                          <FaMapMarkerAlt className="w-5 h-5 text-white" />
                      </div>
                        <h3 className="font-semibold mb-2 text-base">Τοποθεσία</h3>
                        <p className="text-green-100 text-center text-sm">Προσδιορίστε την ακριβή τοποθεσία</p>
                      </div>
                    </motion.div>
                        <motion.div
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                          <FaInfo className="w-5 h-5 text-white" />
                      </div>
                        <h3 className="font-semibold mb-2 text-base">Λεπτομέρειες</h3>
                        <p className="text-green-100 text-center text-sm">Περιγράψτε τα χαρακτηριστικά</p>
                    </div>
                    </motion.div>
                  </motion.div>
                    {/* Έλεγχος συνδρομής */}
                    {subscriptionCheck.isLoading ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center py-4"
                      >
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        <span className="ml-3 text-white">Έλεγχος συνδρομής...</span>
                      </motion.div>
                    ) : !subscriptionCheck.hasActiveSubscription && subscriptionCheck.userType === 'COMPANY' ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"
                      >
                        <FaExclamationTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-red-800 mb-2">
                          Απαιτείται Συνδρομή
                        </h3>
                        <p className="text-red-600 mb-4">
                          Για να καταχωρήσετε ακίνητα ως μεσιτική εταιρεία, χρειάζεται να έχετε ενεργή συνδρομή.
                        </p>
                        <div className="space-y-3">
                          <Link
                            href="/seller/auth/register"
                            className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            <FaCrown className="mr-2" />
                            Επιλέξτε Συνδρομητικό Πλάνο
                          </Link>
                          <p className="text-sm text-red-500">
                            Ή <Link href="/dashboard/seller" className="underline hover:no-underline">επιστρέψτε στο dashboard</Link>
                          </p>
                        </div>
                      </motion.div>
                    ) : subscriptionCheck.propertiesCount >= subscriptionCheck.maxProperties && subscriptionCheck.userType === 'COMPANY' ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center"
                      >
                        <FaExclamationTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                          Έχετε φτάσει το όριο ακινήτων
                        </h3>
                        <p className="text-yellow-600 mb-4">
                          Έχετε καταχωρήσει {subscriptionCheck.propertiesCount} από {subscriptionCheck.maxProperties} επιτρεπόμενα ακίνητα.
                        </p>
                        <div className="space-y-3">
                          <Link
                            href="/seller/auth/register"
                            className="inline-flex items-center px-6 py-3 bg-yellow-600 text-white font-semibold rounded-xl hover:bg-yellow-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            <FaCrown className="mr-2" />
                            Αναβάθμιση Πλάνου
                          </Link>
                          <p className="text-sm text-yellow-500">
                            Ή <Link href="/dashboard/seller" className="underline hover:no-underline">επιστρέψτε στο dashboard</Link>
                          </p>
                        </div>
                      </motion.div>
                    ) : showListingTypeSelection ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <h3 className="text-xl font-semibold text-white text-center">
                          Επιλέξτε τον τύπο ακινήτου
                        </h3>
                        <p className="text-green-100 text-center text-sm">
                          Το ακίνητό σας θα εμφανίζεται στην αντίστοιχη κατηγορία
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setListingType('sale');
                              setShowListingTypeSelection(false);
                              setShowForm(true);
                            }}
                            className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl border-2 border-transparent hover:border-green-400 transition-all duration-200"
                          >
                            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                              <FaHome className="w-8 h-8 text-green-600" />
                            </div>
                            <div className="text-center">
                              <h4 className="text-lg font-bold text-gray-900">Προς Πώληση</h4>
                              <p className="text-sm text-gray-600 mt-1">Καταχωρήστε ακίνητο για πώληση</p>
                            </div>
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setListingType('rent');
                              setShowListingTypeSelection(false);
                              setShowForm(true);
                            }}
                            className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl border-2 border-transparent hover:border-teal-400 transition-all duration-200"
                          >
                            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center">
                              <FaKey className="w-8 h-8 text-teal-600" />
                            </div>
                            <div className="text-center">
                              <h4 className="text-lg font-bold text-gray-900">Προς Ενοικίαση</h4>
                              <p className="text-sm text-gray-600 mt-1">Καταχωρήστε ακίνητο για ενοικίαση</p>
                            </div>
                          </motion.button>
                        </div>
                        <button
                          onClick={() => setShowListingTypeSelection(false)}
                          className="block mx-auto text-sm text-green-200 hover:text-white transition-colors"
                        >
                          ← Πίσω
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          // Έλεγχος συνδρομής για εταιρείες
                          if (subscriptionCheck.userType === 'COMPANY' && !subscriptionCheck.hasActiveSubscription) {
                            setIsSubscriptionModalOpen(true);
                          } else {
                            setShowListingTypeSelection(true);
                          }
                        }}
                        className="px-6 py-3 bg-white text-green-600 font-semibold rounded-xl hover:bg-green-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Ξεκινήστε την Καταχώρηση
                      </motion.button>
                    )}
                </div>
              </div>
            </div>
            </motion.div>
        ) : (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          {/* Page Title */}
          <div className="bg-gradient-to-r from-green-600 via-emerald-700 to-teal-800 text-white px-6 py-4">
            <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Καταχώρηση Νέου Ακινήτου</h1>
                <p className="text-green-100 text-sm flex items-center gap-2">
                  {listingType === 'rent' ? (
                    <><FaKey className="inline" /> Προς ενοικίαση</>
                  ) : (
                    <><FaHome className="inline" /> Προς πώληση</>
                  )}
                  {' · '}Συμπληρώστε τις πληροφορίες του ακινήτου σας
                </p>
              </div>
              <div className="hidden md:block">
                <div className="text-right">
                  <div className="text-xs text-green-200 mb-1">Πρόοδος</div>
                  <div className="text-xl font-bold">
                    {Math.round(((tabs.findIndex(tab => tab.id === activeTab) + 1) / tabs.length) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar + Draft Button */}
          <div className="px-6 py-4 bg-gray-50/50">
            <div className="flex items-center gap-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  setShowDraftsModal(true);
                  await loadDrafts();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 border border-gray-200 hover:border-green-400 hover:bg-green-50/80 transition-all shadow-sm"
                title="Προσχέδια"
              >
                <FaFolderOpen className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  {Math.round(((tabs.findIndex(tab => tab.id === activeTab) + 1) / tabs.length) * 100)}%
                </span>
              </motion.button>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${(tabs.findIndex(tab => tab.id === activeTab) + 1) * (100 / tabs.length)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="border-b border-gray-200 bg-white/50">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`${
                    activeTab === tab.id
                      ? 'border-green-600 text-green-600 bg-green-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm flex items-center transition-all duration-200 min-w-fit`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 transition-all duration-200 ${
                    activeTab === tab.id 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {tab.icon}
                  </div>
                  <span className="hidden sm:inline">{tab.label}</span>
                </motion.button>
              ))}
            </nav>
          </div>

          {/* Form Content */}
          <div className="p-6 bg-white/50 max-h-[70vh] overflow-y-auto">
            {activeTab === 'basics' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Τύπος Ακινήτου</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { id: 'apartment', label: 'Διαμέρισμα', icon: <MdApartment className="w-6 h-6" /> },
                      { id: 'house', label: 'Μονοκατοικία', icon: <MdHouse className="w-6 h-6" /> },
                      { id: 'villa', label: 'Βίλα', icon: <MdVilla className="w-6 h-6" /> },
                      { id: 'commercial', label: 'Επαγγελματικός Χώρος', icon: <MdStore className="w-6 h-6" /> },
                      { id: 'plot', label: 'Οικόπεδο', icon: <FaHome className="w-6 h-6" /> },
                    ].map((type) => (
                      <motion.button
                        key={type.id}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPropertyType(type.id)}
                        className={`p-4 border-2 rounded-xl text-center transition-all duration-200 ${
                          propertyType === type.id 
                            ? 'border-green-600 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg' 
                            : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`flex justify-center mb-2 ${propertyType === type.id ? 'text-green-600' : 'text-gray-500'}`}>
                          {type.icon}
                        </div>
                        <span className={`text-xs font-semibold ${propertyType === type.id ? 'text-green-700' : 'text-gray-700'}`}>
                          {type.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {propertyType && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Βασικά Χαρακτηριστικά</h3>
                    {renderBasicDetailsFields()}
                  </motion.div>
                )}
              </div>
            )}

            {activeTab === 'features' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                {renderFeatures()}
              </motion.div>
            )}

            {activeTab === 'amenities' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Παροχές & Ανέσεις</h3>
                  {propertyType === 'plot' ? (
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        <FeatureCard
                          icon={<GiSolarPower />}
                          label="Παροχή Ρεύματος"
                          checked={!!amenities.electricity}
                          onChange={(checked) => handleAmenityChange('electricity', checked)}
                        />
                        <FeatureCard
                          icon={<FaBath />}
                          label="Παροχή Νερού"
                          checked={!!amenities.water}
                          onChange={(checked) => handleAmenityChange('water', checked)}
                        />
                        <FeatureCard
                          icon={<FaBuilding />}
                          label="Άδεια Οικοδομής"
                          checked={!!amenities.buildingPermit}
                          onChange={(checked) => handleAmenityChange('buildingPermit', checked)}
                        />
                        <FeatureCard
                          icon={<MdStore />}
                          label="Άδεια Τοποθέτησης Κοντέινερ"
                          checked={!!amenities.containerPermit}
                          onChange={(checked) => handleAmenityChange('containerPermit', checked)}
                        />
                        <FeatureCard
                          icon={<GiSolarPower />}
                          label="ΠΕΑ"
                          checked={!!amenities.pea}
                          onChange={(checked) => handleAmenityChange('pea', checked)}
                        />
                        <FeatureCard
                          icon={<GiGardeningShears />}
                          label="Περιφραγμένο"
                          checked={!!amenities.fenced}
                          onChange={(checked) => handleAmenityChange('fenced', checked)}
                        />
                      </div>

                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Χρήση Γης
                          </label>
                          <input
                            type="text"
                            value={amenities.landUse}
                            onChange={(e) => handleAmenityChange('landUse', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            placeholder="π.χ. Ζώνη Γ, οικιστική, αγροτική κ.λπ."
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          <FeatureCard
                            icon={<FaMapMarkerAlt />}
                            label="Εντός Σχεδίου"
                            checked={!!amenities.withinPlan}
                            onChange={(checked) => handleAmenityChange('withinPlan', checked)}
                          />
                          <FeatureCard
                            icon={<FaMapMarkerAlt />}
                            label="Εντός Οικισμού / ΠΕΡΠΟ / ΖΟΕ"
                            checked={!!amenities.withinSettlement}
                            onChange={(checked) => handleAmenityChange('withinSettlement', checked)}
                          />
                          <FeatureCard
                            icon={<GiGardeningShears />}
                            label="Αναδασωτέο"
                            checked={!!amenities.reforestable}
                            onChange={(checked) => handleAmenityChange('reforestable', checked)}
                          />

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              Αρτιότητα & Οικοδομησιμότητα
                            </label>
                            <input
                              type="text"
                              value={amenities.completeness}
                              onChange={(e) => handleAmenityChange('completeness', e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="Περιγραφή αρτιότητας & οικοδομησιμότητας"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : propertyType === 'commercial' ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {basicDetails.commercialCategory === 'retail' ? (
                          <>
                            <FeatureCard
                              icon={<GiHeatHaze />}
                              label="Κλιματισμός (A/C)"
                              checked={!!amenities.airConditioningHeating}
                              onChange={(checked) => handleAmenityChange('airConditioningHeating', checked)}
                            />
                            <FeatureCard
                              icon={<BsWindow />}
                              label="Ψευδοροφή"
                              checked={!!amenities.falseCeiling}
                              onChange={(checked) => handleAmenityChange('falseCeiling', checked)}
                            />
                            <FeatureCard
                              icon={<FaHome />}
                              label="Τέντες"
                              checked={!!amenities.awnings}
                              onChange={(checked) => handleAmenityChange('awnings', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Συναγερμός"
                              checked={!!amenities.alarm}
                              onChange={(checked) => handleAmenityChange('alarm', checked)}
                            />
                            <FeatureCard
                              icon={<FaUser />}
                              label="WC ΑμεΑ"
                              checked={!!amenities.disabledAccess}
                              onChange={(checked) => handleAmenityChange('disabledAccess', checked)}
                            />
                            <FeatureCard
                              icon={<FaBuilding />}
                              label="Πρόσοψη"
                              checked={!!amenities.facade}
                              onChange={(checked) => handleAmenityChange('facade', checked)}
                            />
                            <FeatureCard
                              icon={<FaHome />}
                              label="Εσωτερική Σκάλα"
                              checked={!!amenities.internalStaircase}
                              onChange={(checked) => handleAmenityChange('internalStaircase', checked)}
                            />
                          </>
                        ) : basicDetails.commercialCategory === 'office' ? (
                          <>
                            <FeatureCard
                              icon={<FaHome />}
                              label="Ανελκυστήρας"
                              checked={!!amenities.elevator}
                              onChange={(checked) => handleAmenityChange('elevator', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Πόρτα Ασφαλείας"
                              checked={!!amenities.securityDoor}
                              onChange={(checked) => handleAmenityChange('securityDoor', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Συναγερμός"
                              checked={!!amenities.alarm}
                              onChange={(checked) => handleAmenityChange('alarm', checked)}
                            />
                            <FeatureCard
                              icon={<FaWifi />}
                              label="Οπτική Ίνα"
                              checked={!!amenities.fiberOptic}
                              onChange={(checked) => handleAmenityChange('fiberOptic', checked)}
                            />
                            <FeatureCard
                              icon={<GiHeatHaze />}
                              label="Κλιματισμός (Ψύξη/Θέρμανση)"
                              checked={!!amenities.airConditioningHeating}
                              onChange={(checked) => handleAmenityChange('airConditioningHeating', checked)}
                            />
                            <FeatureCard
                              icon={<FaUser />}
                              label="Θυρωρείο"
                              checked={!!amenities.concierge}
                              onChange={(checked) => handleAmenityChange('concierge', checked)}
                            />
                          </>
                        ) : (basicDetails.commercialCategory === 'warehouse' || basicDetails.commercialCategory === 'industrial') ? (
                          <>
                            <FeatureCard
                              icon={<MdStore />}
                              label="Ανελκυστήρας Φορτίων"
                              checked={!!features.freightElevator}
                              onChange={(checked) => handleFeatureChange('freightElevator', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Πυρόσβεση (Sprinklers)"
                              checked={!!amenities.sprinklers}
                              onChange={(checked) => handleAmenityChange('sprinklers', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Συναγερμός"
                              checked={!!amenities.alarm}
                              onChange={(checked) => handleAmenityChange('alarm', checked)}
                            />
                            <FeatureCard
                              icon={<FaParking />}
                              label="Parking (Πολλών θέσεων)"
                              checked={!!amenities.parking}
                              onChange={(checked) => handleAmenityChange('parking', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Φύλαξη (Security)"
                              checked={!!amenities.security}
                              onChange={(checked) => handleAmenityChange('security', checked)}
                            />
                          </>
                        ) : basicDetails.commercialCategory === 'hospitality' ? (
                          <>
                            <FeatureCard
                              icon={<FaWifi />}
                              label="WiFi (σε όλους τους χώρους)"
                              checked={!!amenities.wifiAllAreas}
                              onChange={(checked) => handleAmenityChange('wifiAllAreas', checked)}
                            />
                            <FeatureCard
                              icon={<GiGardeningShears />}
                              label="Κήπος"
                              checked={!!amenities.garden}
                              onChange={(checked) => handleAmenityChange('garden', checked)}
                            />
                            <FeatureCard
                              icon={<FaParking />}
                              label="Parking"
                              checked={!!amenities.parking}
                              onChange={(checked) => handleAmenityChange('parking', checked)}
                            />
                            <FeatureCard
                              icon={<GiSolarPower />}
                              label="Ηλιακός Θερμοσίφωνας"
                              checked={!!amenities.solarWaterHeater}
                              onChange={(checked) => handleAmenityChange('solarWaterHeater', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Χρηματοκιβώτιο"
                              checked={!!amenities.safe}
                              onChange={(checked) => handleAmenityChange('safe', checked)}
                            />
                            <FeatureCard
                              icon={<FaTv />}
                              label="Δορυφορική TV"
                              checked={!!amenities.satelliteTv}
                              onChange={(checked) => handleAmenityChange('satelliteTv', checked)}
                            />
                          </>
                        ) : basicDetails.commercialCategory === 'parking' ? (
                          <>
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Κάμερες (CCTV)"
                              checked={!!amenities.cctv}
                              onChange={(checked) => handleAmenityChange('cctv', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Πυρόσβεση (Sprinklers)"
                              checked={!!amenities.sprinklers}
                              onChange={(checked) => handleAmenityChange('sprinklers', checked)}
                            />
                            <FeatureCard
                              icon={<GiHeatHaze />}
                              label="Σύστημα εξαερισμού"
                              checked={!!amenities.ventilationSystem}
                              onChange={(checked) => handleAmenityChange('ventilationSystem', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Φύλαξη/Security 24/7"
                              checked={!!amenities.security24}
                              onChange={(checked) => handleAmenityChange('security24', checked)}
                            />
                            <FeatureCard
                              icon={<FaHome />}
                              label="Αυτόματη Μπάρα"
                              checked={!!amenities.automaticBarrier}
                              onChange={(checked) => handleAmenityChange('automaticBarrier', checked)}
                            />
                            <FeatureCard
                              icon={<FaWifi />}
                              label="Σύστημα Αναγνώρισης Πινακίδων"
                              checked={!!amenities.licensePlateRecognition}
                              onChange={(checked) => handleAmenityChange('licensePlateRecognition', checked)}
                            />
                            <FeatureCard
                              icon={<GiSolarPower />}
                              label="Φόρτιση Ηλεκτρικών Αυτοκινήτων"
                              checked={!!amenities.evCharging}
                              onChange={(checked) => handleAmenityChange('evCharging', checked)}
                            />
                            <FeatureCard
                              icon={<FaBath />}
                              label="WC"
                              checked={!!amenities.parkingWc}
                              onChange={(checked) => handleAmenityChange('parkingWc', checked)}
                            />
                            <FeatureCard
                              icon={<FaHome />}
                              label="Ασανσέρ Αυτοκινήτων"
                              checked={!!amenities.carElevator}
                              onChange={(checked) => handleAmenityChange('carElevator', checked)}
                            />
                            <FeatureCard
                              icon={<FaUser />}
                              label="Χώρος Αναμονής"
                              checked={!!amenities.waitingArea}
                              onChange={(checked) => handleAmenityChange('waitingArea', checked)}
                            />
                            <FeatureCard
                              icon={<GiSolarPower />}
                              label="Γεννήτρια"
                              checked={!!amenities.generator}
                              onChange={(checked) => handleAmenityChange('generator', checked)}
                            />
                          </>
                        ) : basicDetails.commercialCategory === 'fb' ? (
                          <>
                            <FeatureCard
                              icon={<FaUser />}
                              label="WC ΑμεΑ"
                              checked={!!amenities.disabledAccess}
                              onChange={(checked) => handleAmenityChange('disabledAccess', checked)}
                            />
                            <FeatureCard
                              icon={<GiHeatHaze />}
                              label="Κλιματισμός"
                              checked={!!amenities.airConditioningHeating}
                              onChange={(checked) => handleAmenityChange('airConditioningHeating', checked)}
                            />
                            <FeatureCard
                              icon={<MdWarehouse />}
                              label="Εξοπλισμός (αν δίνεται επιπλωμένο)"
                              checked={!!amenities.equipment}
                              onChange={(checked) => handleAmenityChange('equipment', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Συναγερμός"
                              checked={!!amenities.alarm}
                              onChange={(checked) => handleAmenityChange('alarm', checked)}
                            />
                            <FeatureCard
                              icon={<MdBalcony />}
                              label="Προαύλιο"
                              checked={!!amenities.forecourt}
                              onChange={(checked) => handleAmenityChange('forecourt', checked)}
                            />
                          </>
                        ) : basicDetails.commercialCategory === 'commercial_building' ? (
                          <>
                            <div className="col-span-full text-sm font-semibold text-gray-700 mt-2">Υποδομές</div>
                            <FeatureCard
                              icon={<GiHeatHaze />}
                              label="Αυτόνομη Θέρμανση ανά επίπεδο"
                              checked={!!amenities.autonomousHeatingPerFloor}
                              onChange={(checked) => handleAmenityChange('autonomousHeatingPerFloor', checked)}
                            />
                            <FeatureCard
                              icon={<FaHome />}
                              label="Ανελκυστήρας (Ατόμων & Φορτίων)"
                              checked={!!amenities.elevatorPassengerFreight}
                              onChange={(checked) => handleAmenityChange('elevatorPassengerFreight', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Κλιμακοστάσιο Πυρασφάλειας"
                              checked={!!amenities.fireEscape}
                              onChange={(checked) => handleAmenityChange('fireEscape', checked)}
                            />
                            <div className="col-span-full text-sm font-semibold text-gray-700 mt-2">Parking</div>
                            <div className="col-span-2 flex items-center gap-2">
                              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Εσωτερικό Parking (θέσεις):</label>
                              <input
                                type="number"
                                value={amenities.internalParkingSpaces || ''}
                                onChange={(e) => handleAmenityChange('internalParkingSpaces', e.target.value)}
                                className="w-20 px-2 py-1 rounded border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="0"
                                min="0"
                              />
                            </div>
                            <FeatureCard
                              icon={<FaParking />}
                              label="Υπόγειο Garage"
                              checked={!!amenities.undergroundGarage}
                              onChange={(checked) => handleAmenityChange('undergroundGarage', checked)}
                            />
                            <div className="col-span-full text-sm font-semibold text-gray-700 mt-2">Ασφάλεια</div>
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Κεντρικό Σύστημα Φύλαξης"
                              checked={!!amenities.centralSecurity}
                              onChange={(checked) => handleAmenityChange('centralSecurity', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="CCTV"
                              checked={!!amenities.cctv}
                              onChange={(checked) => handleAmenityChange('cctv', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Συναγερμός"
                              checked={!!amenities.alarm}
                              onChange={(checked) => handleAmenityChange('alarm', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Πυρόσβεση (Sprinklers)"
                              checked={!!amenities.sprinklers}
                              onChange={(checked) => handleAmenityChange('sprinklers', checked)}
                            />
                            <div className="col-span-full text-sm font-semibold text-gray-700 mt-2">Εξωτερικά</div>
                            <FeatureCard
                              icon={<GiGardeningShears />}
                              label="Roof Garden"
                              checked={!!amenities.roofGarden}
                              onChange={(checked) => handleAmenityChange('roofGarden', checked)}
                            />
                            <FeatureCard
                              icon={<FaHome />}
                              label="Φωτισμός Πρόσοψης"
                              checked={!!amenities.facadeLighting}
                              onChange={(checked) => handleAmenityChange('facadeLighting', checked)}
                            />
                            <FeatureCard
                              icon={<GiGardeningShears />}
                              label="Περιβάλλον Χώρος"
                              checked={!!amenities.surroundingSpace}
                              onChange={(checked) => handleAmenityChange('surroundingSpace', checked)}
                            />
                          </>
                        ) : (
                          <>
                            <FeatureCard
                              icon={<GiSolarPower />}
                              label="Ρεύμα – Τριφασικό"
                              checked={!!amenities.threePhaseElectricity}
                              onChange={(checked) => handleAmenityChange('threePhaseElectricity', checked)}
                            />
                            <FeatureCard
                              icon={<FaBath />}
                              label="Ύδρευση"
                              checked={!!amenities.waterSupply}
                              onChange={(checked) => handleAmenityChange('waterSupply', checked)}
                            />
                            <FeatureCard
                              icon={<BsWindow />}
                              label="Ψευδοροφή"
                              checked={!!amenities.falseCeiling}
                              onChange={(checked) => handleAmenityChange('falseCeiling', checked)}
                            />
                            <FeatureCard
                              icon={<GiHeatHaze />}
                              label="Air Condition / Κεντρική Θέρμανση"
                              checked={!!amenities.airConditioningHeating}
                              onChange={(checked) => handleAmenityChange('airConditioningHeating', checked)}
                            />
                            <FeatureCard
                              icon={<FaWifi />}
                              label="Internet / Δομημένη καλωδίωση"
                              checked={!!amenities.internetStructuredCabling}
                              onChange={(checked) => handleAmenityChange('internetStructuredCabling', checked)}
                            />
                            <FeatureCard
                              icon={<MdSecurity />}
                              label="Συναγερμός"
                              checked={!!amenities.alarm}
                              onChange={(checked) => handleAmenityChange('alarm', checked)}
                            />
                            <FeatureCard
                              icon={<MdWarehouse />}
                              label="Εξοπλισμός"
                              checked={!!amenities.equipment}
                              onChange={(checked) => handleAmenityChange('equipment', checked)}
                            />
                            <FeatureCard
                              icon={<GiSolarPower />}
                              label="Ενεργειακό Πιστοποιητικό (ΠΕΑ)"
                              checked={!!amenities.energyCertificate}
                              onChange={(checked) => handleAmenityChange('energyCertificate', checked)}
                            />
                            <FeatureCard
                              icon={<FaUser />}
                              label="Πρόσβαση ΑΜΕΑ"
                              checked={!!amenities.disabledAccess}
                              onChange={(checked) => handleAmenityChange('disabledAccess', checked)}
                            />
                            <FeatureCard
                              icon={<FaParking />}
                              label="Χώρος Στάθμευσης"
                              checked={!!amenities.parking}
                              onChange={(checked) => handleAmenityChange('parking', checked)}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  ) : ['apartment', 'house', 'villa'].includes(propertyType) ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {propertyType === 'apartment' && (
                        <FeatureCard
                          icon={<MdStore />}
                          label="Αποθήκη"
                          checked={!!amenities.storage}
                          onChange={(checked) => handleAmenityChange('storage', checked)}
                        />
                      )}
                      {propertyType === 'villa' && (
                        <>
                          <FeatureCard
                            icon={<FaHome />}
                            label="Ξενώνας"
                            checked={!!amenities.guestHouse}
                            onChange={(checked) => handleAmenityChange('guestHouse', checked)}
                          />
                          <FeatureCard
                            icon={<FaSwimmingPool />}
                            label="Τζακούζι"
                            checked={!!amenities.jacuzzi}
                            onChange={(checked) => handleAmenityChange('jacuzzi', checked)}
                          />
                          <FeatureCard
                            icon={<MdBalcony />}
                            label="Αθλητικοί Εξωτερικοί Χώροι"
                            checked={!!amenities.outdoorSports}
                            onChange={(checked) => handleAmenityChange('outdoorSports', checked)}
                          />
                          <FeatureCard
                            icon={<FaHome />}
                            label="Γυμναστήριο"
                            checked={!!amenities.gym}
                            onChange={(checked) => handleAmenityChange('gym', checked)}
                          />
                          <FeatureCard
                            icon={<FaBath />}
                            label="Σάουνα"
                            checked={!!amenities.sauna}
                            onChange={(checked) => handleAmenityChange('sauna', checked)}
                          />
                        </>
                      )}
                      <FeatureCard
                        icon={<FaHome />}
                        label="Τζάκι"
                        checked={!!amenities.fireplace}
                        onChange={(checked) => handleAmenityChange('fireplace', checked)}
                      />
                      <FeatureCard
                        icon={<GiHeatHaze />}
                        label="Κλιματισμός"
                        checked={!!amenities.airConditioning}
                        onChange={(checked) => handleAmenityChange('airConditioning', checked)}
                      />
                      <FeatureCard
                        icon={<GiSolarPower />}
                        label="Ηλιακός Θερμοσίφωνας"
                        checked={!!amenities.solarWaterHeater}
                        onChange={(checked) => handleAmenityChange('solarWaterHeater', checked)}
                      />
                      <FeatureCard
                        icon={<FaTv />}
                        label="Smart TV"
                        checked={!!amenities.smartTv}
                        onChange={(checked) => handleAmenityChange('smartTv', checked)}
                      />
                      <FeatureCard
                        icon={<MdOutdoorGrill />}
                        label="BBQ"
                        checked={!!amenities.bbq}
                        onChange={(checked) => handleAmenityChange('bbq', checked)}
                      />
                      <FeatureCard
                        icon={<MdLocalLaundryService />}
                        label="Ηλεκτρικές Συσκευές"
                        checked={!!amenities.electricalAppliances}
                        onChange={(checked) => handleAmenityChange('electricalAppliances', checked)}
                      />
                    </div>
                  ) : (
                    <div className="text-center text-gray-600">
                      Παρακαλώ επιλέξτε πρώτα τον τύπο ακινήτου στην καρτέλα "Βασικά"
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'location' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Τοποθεσία Ακινήτου</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div ref={locationStateRef} className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Νομός/Περιφέρεια <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
                        <input
                          type="text"
                          value={location.state}
                          onChange={(e) => {
                            const v = e.target.value;
                            handleLocationChange('state', v);
                            if (v.trim().length > 0) {
                              setStateSuggestions(searchGreekPrefectures(v, 8));
                              setShowStateSuggestions(true);
                            } else {
                              setStateSuggestions([]);
                              setShowStateSuggestions(false);
                            }
                          }}
                          onFocus={() => {
                            if (location.state.trim()) {
                              const s = searchGreekPrefectures(location.state, 8);
                              setStateSuggestions(s);
                              setShowStateSuggestions(s.length > 0);
                            }
                          }}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="π.χ. Αττική, Θεσσαλονίκη"
                          autoComplete="off"
                          required
                        />
                      </div>
                      <AnimatePresence>
                        {showStateSuggestions && stateSuggestions.length > 0 && (
                          <motion.ul
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 max-h-60 overflow-y-auto"
                          >
                            {stateSuggestions.map((loc) => (
                              <li key={loc}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleLocationChange('state', loc);
                                    setShowStateSuggestions(false);
                                    setStateSuggestions([]);
                                  }}
                                  className="w-full text-left px-4 py-3 pl-10 hover:bg-blue-50 flex items-center gap-2 text-gray-700"
                                >
                                  <FaMapMarkerAlt className="text-blue-600 text-sm flex-shrink-0" />
                                  {loc}
                                </button>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>

                    <div ref={locationCityRef} className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Πόλη <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
                        <input
                          type="text"
                          value={location.city}
                          onChange={(e) => {
                            const v = e.target.value;
                            handleLocationChange('city', v);
                            if (v.trim().length > 0) {
                              setCitySuggestions(searchGreekLocations(v, 8));
                              setShowCitySuggestions(true);
                            } else {
                              setCitySuggestions([]);
                              setShowCitySuggestions(false);
                            }
                          }}
                          onFocus={() => {
                            if (location.city.trim()) {
                              const s = searchGreekLocations(location.city, 8);
                              setCitySuggestions(s);
                              setShowCitySuggestions(s.length > 0);
                            }
                          }}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="π.χ. Αθήνα, Θεσσαλονίκη"
                          autoComplete="off"
                          required
                        />
                      </div>
                      <AnimatePresence>
                        {showCitySuggestions && citySuggestions.length > 0 && (
                          <motion.ul
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 max-h-60 overflow-y-auto"
                          >
                            {citySuggestions.map((loc) => (
                              <li key={loc}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleLocationChange('city', loc);
                                    setShowCitySuggestions(false);
                                    setCitySuggestions([]);
                                  }}
                                  className="w-full text-left px-4 py-3 pl-10 hover:bg-blue-50 flex items-center gap-2 text-gray-700"
                                >
                                  <FaMapMarkerAlt className="text-blue-600 text-sm flex-shrink-0" />
                                  {loc}
                                </button>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Οδός <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={location.street}
                          onChange={(e) => handleLocationChange('street', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="π.χ. Σόλωνος"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Αριθμός <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={location.number}
                          onChange={(e) => handleLocationChange('number', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="π.χ. 45"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ταχυδρομικός Κώδικας <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={location.postalCode}
                        onChange={(e) => handleLocationChange('postalCode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="π.χ. 10672"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Τοποθεσία στον Χάρτη</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Κάντε κλικ στον χάρτη για να επιλέξετε την ακριβή τοποθεσία του ακινήτου
                  </p>
                  <div className="rounded-lg overflow-hidden shadow-md">
                    <LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY">
                      <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={location.coordinates}
                        zoom={13}
                        onClick={handleMapClick}
                      >
                        <Marker
                          position={location.coordinates}
                          draggable={true}
                          onDragEnd={(e) => {
                            if (e.latLng) {
                              handleLocationChange('coordinates', {
                                lat: e.latLng.lat(),
                                lng: e.latLng.lng()
                              });
                            }
                          }}
                        />
                      </GoogleMap>
                    </LoadScript>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'description' && (
              <div className="space-y-8">
                {/* AI Banner */}
                <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <FaMagic className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">🪄 Αφήστε το γράψιμο σε εμάς!</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Απαντήστε σε 4 γρήγορες ερωτήσεις για την αίσθηση του χώρου, και η Τεχνητή Νοημοσύνη θα δημιουργήσει αυτόματα τον τέλειο Τίτλο και την Περιγραφή.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Smart Questions */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Τι θέα ή προσανατολισμό έχει το ακίνητο;
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Ανεμπόδιστη Θέα', 'Αστικό Τοπίο', 'Πάρκο / Πράσινο', 'Εσωτερική Αυλή', 'Φωτεινό / Διαμπερές'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleChip(setAiDescriptionView, opt)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${aiDescriptionView.includes(opt) ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ποιο είναι το Στυλ ή η Αισθητική του;
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Μοντέρνο / Minimal', 'Κλασικό / Αρχοντικό', 'Πολυτελές', 'Ζεστό / Cozy', 'Βιομηχανικό', 'Παραδοσιακό'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleChip(setAiDescriptionStyle, opt)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${aiDescriptionStyle.includes(opt) ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Τι βρίσκεται σε απόσταση αναπνοής; (Επιλέξτε έως 3)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Σταθμός Μετρό/ΗΣΑΠ', 'Σχολεία / Πάρκα', 'Εμπορικό Κέντρο', 'Πανεπιστήμια', 'Θάλασσα', 'Κεντρική Οδική Αρτηρία'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleChip(setAiDescriptionNearby, opt, 3)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${aiDescriptionNearby.includes(opt) ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Το κρυφό σας υπερόπλο <span className="text-gray-500 font-normal">(Προαιρετικό)</span>
                    </label>
                    <textarea
                      value={aiDescriptionSecret}
                      onChange={(e) => setAiDescriptionSecret(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                      placeholder="Π.χ. Το τεράστιο μπαλκόνι που βλέπει ηλιοβασίλεμα..."
                    />
                  </div>

                  {/* Προεπισκόπηση Δεδομένων (Τι θα διαβάσει το AI) */}
                  {(() => {
                    const { hardDataDisplay, softDataDisplay } = getAiPayloadAndPreview();
                    const hardEntries = Object.entries(hardDataDisplay).filter(([, v]) => v != null && v !== '');
                    const hasSoft = softDataDisplay.view.length > 0 || softDataDisplay.style.length > 0 || softDataDisplay.location.length > 0 || softDataDisplay.secretWeapon;
                    return (
                      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                        <button
                          type="button"
                          onClick={() => setDataPreviewOpen(prev => !prev)}
                          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm font-medium text-gray-800">
                            👁️ Προεπισκόπηση Δεδομένων (Τι θα διαβάσει το AI)
                          </span>
                          <FaCaretDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${dataPreviewOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {dataPreviewOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 pt-0 border-t border-gray-100 space-y-5">
                                {/* Hard Data */}
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Σταθερά Δεδομένα (από προηγούμενα βήματα)</h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {hardEntries.map(([key, val]) => {
                                      const labels: Record<string, string> = { propertyType: 'Τύπος Ακινήτου', area: 'Εμβαδόν', floor: 'Όροφος', heating: 'Θέρμανση', bedrooms: 'Υ/Δ', bathrooms: 'Μπάνια', condition: 'Κατάσταση', location: 'Τοποθεσία' };
                                      return (
                                        <div key={key} className="rounded-lg bg-gray-50 px-3 py-2 border border-gray-100">
                                          <span className="text-xs text-gray-500 block">{labels[key] || key}</span>
                                          <span className="text-sm font-medium text-gray-900">{String(val)}</span>
                                        </div>
                                      );
                                    })}
                                    {hardEntries.length === 0 && (
                                      <span className="text-gray-500 text-sm col-span-full">Δεν έχετε συμπληρώσει ακόμα στοιχεία στα Βασικά / Χαρακτηριστικά.</span>
                                    )}
                                  </div>
                                </div>
                                {/* Soft Data */}
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Επιλογές Αισθητικής (από τις 4 ερωτήσεις)</h4>
                                  <div className="space-y-2">
                                    {softDataDisplay.view.length > 0 && (
                                      <div>
                                        <span className="text-xs text-gray-500">Θέα:</span>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                          {softDataDisplay.view.map((v, i) => (
                                            <span key={i} className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{v}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {softDataDisplay.style.length > 0 && (
                                      <div>
                                        <span className="text-xs text-gray-500">Στυλ:</span>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                          {softDataDisplay.style.map((v, i) => (
                                            <span key={i} className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">{v}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {softDataDisplay.location.length > 0 && (
                                      <div>
                                        <span className="text-xs text-gray-500">Κοντά:</span>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                          {softDataDisplay.location.map((v, i) => (
                                            <span key={i} className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">{v}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {softDataDisplay.secretWeapon && (
                                      <div>
                                        <span className="text-xs text-gray-500">Κρυφό Υπερόπλο:</span>
                                        <p className="text-sm text-gray-700 mt-1 italic">&quot;{softDataDisplay.secretWeapon}&quot;</p>
                                      </div>
                                    )}
                                    {!hasSoft && (
                                      <span className="text-gray-500 text-sm">Δεν έχετε επιλέξει ακόμα από τις 4 ερωτήσεις.</span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => { setActiveTab('basics'); setDataPreviewOpen(false); }}
                                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                                >
                                  → Επεξεργασία δεδομένων
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={handleGenerateAiDescription}
                    disabled={aiDescriptionGenerating}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                  >
                    {aiDescriptionGenerating ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Δημιουργία...
                      </>
                    ) : (
                      <>
                        <FaMagic className="w-5 h-5" />
                        Δημιουργία Περιγραφής με AI
                      </>
                    )}
                  </button>
                </div>

                {/* Output Fields */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Τίτλος & Περιγραφή</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Τίτλος Αγγελίας *
                      </label>
                      <input
                        type="text"
                        value={description.title}
                        onChange={(e) => handleDescriptionChange('title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        placeholder="π.χ. Μοντέρνο διαμέρισμα στο κέντρο της Αθήνας"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Ένας ελκυστικός τίτλος που περιγράφει το ακίνητό σας (μέχρι 100 χαρακτήρες)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Σύντομη Περιγραφή *
                      </label>
                      <textarea
                        value={description.shortDescription}
                        onChange={(e) => handleDescriptionChange('shortDescription', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        placeholder="Γράψτε μια σύντομη περιγραφή που θα εμφανίζεται στα αποτελέσματα αναζήτησης"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Σύντομη περίληψη των βασικών χαρακτηριστικών (μέχρι 250 χαρακτήρες)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Αναλυτική Περιγραφή *
                      </label>
                      <textarea
                        value={description.fullDescription}
                        onChange={(e) => handleDescriptionChange('fullDescription', e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        placeholder="Περιγράψτε αναλυτικά το ακίνητό σας..."
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Λεπτομερής περιγραφή του ακινήτου, της περιοχής και των παροχών
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Λέξεις-κλειδιά
                      </label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={description.keywordInput}
                          onChange={(e) => handleDescriptionChange('keywordInput', e.target.value)}
                          onKeyDown={addKeyword}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                          placeholder="Προσθέστε λέξεις-κλειδιά και πατήστε Enter"
                        />
                        {description.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {description.keywords.map((keyword, index) => (
                              <motion.span
                                key={index}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-700"
                              >
                                {keyword}
                                <button
                                  type="button"
                                  onClick={() => removeKeyword(index)}
                                  className="ml-2 text-green-600 hover:text-green-800"
                                >
                                  ×
                                </button>
                              </motion.span>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-gray-500">
                          Προσθέστε σχετικές λέξεις-κλειδιά για καλύτερη εμφάνιση στα αποτελέσματα αναζήτησης
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'price' && (
              <div className="space-y-8">
                {renderPricing()}
              </div>
            )}

            {activeTab === 'photos' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Φωτογραφίες Ακινήτου</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Προσθέστε φωτογραφίες του ακινήτου. Μπορείτε να μεταφέρετε τις εικόνες εδώ ή να κάνετε κλικ για να τις επιλέξετε.
                  </p>

                  <div
                    className={`
                      border-2 border-dashed rounded-lg p-8
                      transition-all duration-200 ease-in-out
                      ${isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400'
                      }
                    `}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handlePhotoDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <motion.div
                        animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <FaImage className="w-12 h-12 text-gray-400" />
                      </motion.div>
                      <div className="text-center">
                        <p className="text-gray-600">
                          Σύρετε και αφήστε τις φωτογραφίες εδώ ή
                        </p>
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-700 font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          επιλέξτε από τον υπολογιστή σας
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">
                        Υποστηριζόμενοι τύποι: JPG, PNG, WEBP
                      </p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoSelect}
                    />
                  </div>

                  {photos.length > 0 && (
                    <div className="mt-8">
                      <h4 className="text-md font-medium text-gray-900 mb-4">
                        Προεπισκόπηση Φωτογραφιών ({photos.length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {photos.map((photo, index) => (
                          <motion.div
                            key={photo.preview}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="relative group aspect-square rounded-lg overflow-hidden shadow-md"
                          >
                            <img
                              src={photo.preview}
                              alt={`Φωτογραφία ${index + 1}`}
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePhoto(index);
                                }}
                                className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                              >
                                <FaTrash className="w-4 h-4" />
                              </motion.button>
                            </div>
                            {index === 0 && (
                              <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-md shadow">
                                Κύρια Φωτογραφία
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-6 flex justify-between items-center">
              {activeTab === 'basics' ? (
                <Link
                    href="/seller"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Πίσω στην Αρχική
                </Link>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handlePreviousStep}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Πίσω
                </motion.button>
              )}

              {activeTab === 'description' ? (
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={openSaveDraftModal}
                    disabled={!session?.user}
                    className="px-4 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition-all duration-200 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaSave className="w-4 h-4" />
                    {saveDraftLoading ? 'Αποθήκευση...' : 'Αποθήκευση Draft'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? 'Γίνεται Καταχώρηση...' : 'Ολοκλήρωση Καταχώρησης'}
                  </motion.button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={openSaveDraftModal}
                    disabled={!session?.user}
                    className="px-4 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition-all duration-200 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaSave className="w-4 h-4" />
                    {saveDraftLoading ? 'Αποθήκευση...' : 'Αποθήκευση Draft'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Επόμενο
                  </motion.button>
                </div>
              )}
            </div>

            {/* Error Messages */}
            {Object.keys(errors).length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <h3 className="text-sm font-medium text-red-800 mb-2">Παρακαλώ συμπληρώστε τα απαραίτητα πεδία:</h3>
                <ul className="space-y-1 text-sm text-red-700">
                  {Object.entries(errors).map(([key, message]) => (
                    <li key={key} className="flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                      {message}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>
        </div>
        )}
        </div>
        </div>

        {/* Save Draft Modal - όνομα draft */}
        <AnimatePresence>
          {showSaveDraftModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => !saveDraftLoading && setShowSaveDraftModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Αποθήκευση Draft</h3>
                <p className="text-sm text-gray-600 mb-3">Δώστε όνομα στο draft σας:</p>
                <input
                  type="text"
                  value={draftNameInput}
                  onChange={(e) => setDraftNameInput(e.target.value)}
                  placeholder="draft-1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-4"
                  disabled={saveDraftLoading}
                />
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => !saveDraftLoading && setShowSaveDraftModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    Ακύρωση
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => saveDraftWithName(draftNameInput)}
                    disabled={saveDraftLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saveDraftLoading ? 'Αποθήκευση...' : 'Αποθήκευση'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue Draft Modal - στην είσοδο στη σελίδα */}
        <AnimatePresence>
          {showContinueDraftModal && drafts.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setShowContinueDraftModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Έχετε αποθηκευμένα προσχέδια</h3>
                  <p className="text-sm text-gray-600 mt-1">Θέλετε να συνεχίσετε κάποιο από τα draft σας;</p>
                </div>
                <div className="p-4 overflow-y-auto max-h-[50vh]">
                  <ul className="space-y-3">
                    {drafts.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{d.name || 'draft'} · {d.progressPercent}%</div>
                          <div className="text-sm text-gray-500">{new Date(d.updatedAt).toLocaleString('el-GR')}</div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => loadDraft(d.id)}
                          className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 flex items-center gap-1"
                        >
                          <FaFolderOpen className="w-4 h-4" />
                          Φόρτωση
                        </motion.button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-6 py-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowContinueDraftModal(false)}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Ξεκινήστε νέα καταχώρηση
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drafts Modal */}
        <AnimatePresence>
          {showDraftsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setShowDraftsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Προσχέδια</h3>
                  <button
                    type="button"
                    onClick={() => setShowDraftsModal(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                  {draftsLoading ? (
                    <div className="py-8 text-center text-gray-500">Φόρτωση...</div>
                  ) : drafts.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">Δεν έχετε αποθηκευμένα προσχέδια</div>
                  ) : (
                    <ul className="space-y-3">
                      {drafts.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100"
                        >
                          <div>
                            <div className="font-medium text-gray-900">{d.name || 'draft'} · {d.progressPercent}% ολοκληρωμένο</div>
                            <div className="text-sm text-gray-500">
                              {new Date(d.updatedAt).toLocaleString('el-GR')}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              onClick={() => loadDraft(d.id)}
                              className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 flex items-center gap-1"
                            >
                              <FaFolderOpen className="w-4 h-4" />
                              Φόρτωση
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              onClick={() => deleteDraft(d.id)}
                              className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 flex items-center gap-1"
                            >
                              <FaTrash className="w-4 h-4" />
                              Διαγραφή
                            </motion.button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="bg-gradient-to-r from-gray-900 via-green-900 to-emerald-900 text-white py-12 mt-16"
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <FaHome className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">RealEstate</span>
              </div>
              <p className="text-gray-300 leading-relaxed">
                Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες με την καλύτερη εμπειρία.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <h3 className="text-xl font-bold mb-6 text-white">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/properties" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center group">
                    <div className="w-1 h-1 bg-green-400 rounded-full mr-3 group-hover:bg-green-300 transition-colors"></div>
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center group">
                    <div className="w-1 h-1 bg-green-400 rounded-full mr-3 group-hover:bg-green-300 transition-colors"></div>
                    Σχετικά
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center group">
                    <div className="w-1 h-1 bg-green-400 rounded-full mr-3 group-hover:bg-green-300 transition-colors"></div>
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
              <h3 className="text-xl font-bold mb-6 text-white">Επικοινωνία</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center">
                  <div className="w-1 h-1 bg-green-400 rounded-full mr-3"></div>
                  info@realestate.com
                </li>
                <li className="flex items-center">
                  <div className="w-1 h-1 bg-green-400 rounded-full mr-3"></div>
                  +30 210 1234567
                </li>
                <li className="flex items-center">
                  <div className="w-1 h-1 bg-green-400 rounded-full mr-3"></div>
                  Αθήνα, Ελλάδα
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
            >
              <h3 className="text-xl font-bold mb-6 text-white">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <motion.a 
                  whileHover={{ scale: 1.2, y: -2 }}
                  href="#" 
                  className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center hover:from-green-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <FaFacebook className="w-5 h-5 text-white" />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.2, y: -2 }}
                  href="#" 
                  className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center hover:from-green-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <FaTwitter className="w-5 h-5 text-white" />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.2, y: -2 }}
                  href="#" 
                  className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center hover:from-green-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <FaInstagram className="w-5 h-5 text-white" />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.2, y: -2 }}
                  href="#" 
                  className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center hover:from-green-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <FaLinkedin className="w-5 h-5 text-white" />
                </motion.a>
              </div>
            </motion.div>
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400"
          >
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </motion.div>
        </div>
      </motion.footer>

      {/* Subscription Plans Modal */}
      <AnimatePresence>
        {isSubscriptionModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsSubscriptionModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Επιλέξτε Συνδρομητικό Πλάνο</h2>
                    <p className="text-gray-600">Απαιτείται συνδρομή για καταχώρηση ακινήτων ως μεσιτική εταιρεία</p>
                  </div>
                  <button
                    onClick={() => setIsSubscriptionModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                  >
                    <FaTimes className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                {/* Billing Cycle Toggle */}
                <div className="flex items-center justify-center mb-8">
                  <div className="bg-gray-100 p-1 rounded-xl flex">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('MONTHLY')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        billingCycle === 'MONTHLY'
                          ? 'bg-white text-green-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Μηνιαία
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('QUARTERLY')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        billingCycle === 'QUARTERLY'
                          ? 'bg-white text-green-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Τριμηνιαία (10% έκπτωση)
                    </button>
                  </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  {subscriptionPlans.map((plan, index) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={`relative bg-white border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl ${
                        selectedPlan === plan.id
                          ? 'border-green-500 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {plan.name === 'Pro' && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                            Δημοφιλές
                          </span>
                        </div>
                      )}
                      
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                        <div className="mb-4">
                          <span className="text-4xl font-bold text-gray-900">
                            €{billingCycle === 'MONTHLY' ? plan.price : plan.priceQuarterly}
                          </span>
                          <span className="text-gray-600 ml-1">
                            /{billingCycle === 'MONTHLY' ? 'μήνα' : 'τρίμηνο'}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">{plan.description}</p>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center">
                          <FaCheck className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                          <span className="text-gray-700">Μέχρι {plan.maxProperties} ακίνητα</span>
                        </div>
                        {plan.benefits.map((benefit: string, benefitIndex: number) => (
                          <div key={benefitIndex} className="flex items-center">
                            <FaCheck className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                            <span className="text-gray-700">{benefit}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                          selectedPlan === plan.id
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {selectedPlan === plan.id ? '✓ Επιλεγμένο' : 'Επιλογή'}
                      </button>
                    </motion.div>
                  ))}
                </div>

                {/* Payment Section */}
                {selectedPlan && (
                  <div className="bg-gray-50 rounded-2xl p-8 text-center">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Έτοιμοι να ξεκινήσετε;
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                      <button
                        type="button"
                        onClick={() => handleStripeCheckout(selectedPlan)}
                        className="inline-flex items-center px-8 py-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                      >
                        <FaCreditCard className="mr-3" />
                        Πληρωμή με Stripe
                      </button>
                      <div className="text-center sm:text-left">
                        <p className="text-sm text-gray-600">
                          Ασφαλής πληρωμή με Stripe
                        </p>
                        <p className="text-xs text-gray-500">
                          Μπορείτε να ακυρώσετε οποιαδήποτε στιγμή
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 