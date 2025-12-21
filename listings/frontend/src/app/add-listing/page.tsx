'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { FaHome, FaBed, FaBath, FaRuler, FaMapMarkerAlt, FaEuroSign, FaCamera, FaInfo, FaWifi, FaParking, FaSwimmingPool, FaTv, FaImage, FaTrash, FaUser, FaCaretDown, FaCog, FaComments, FaQuestionCircle, FaExchangeAlt, FaSignOutAlt, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaCrown, FaCreditCard, FaExclamationTriangle, FaTimes, FaCheck, FaBuilding } from 'react-icons/fa';
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
  const [showForm, setShowForm] = useState(false);
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
    multipleFloors: false,
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
    plotOwnershipType: '' // Changed from ownershipType to plotOwnershipType
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
    plotOwnershipType: ''
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
    parking: false
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
  const [description, setDescription] = useState({
    title: '',
    shortDescription: '',
    fullDescription: '',
    keywords: [] as string[],
    keywordInput: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    signOut();
  };

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
    { id: 'needsRenovation', label: 'Χρήζει ανακαίνισης' }
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

  const handleDescriptionChange = (key: string, value: any) => {
    setDescription(prev => ({
      ...prev,
      [key]: value
    }));
  };

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
    setBasicDetails(prev => ({
      ...prev,
      [key]: value
    }));
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            </div>

            {(propertyType === 'house' || propertyType === 'villa') && (
              <div className="relative">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={basicDetails.garden}
                      onChange={(e) => handleBasicDetailsChange('garden', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`
                      w-14 h-7 rounded-full transition-colors duration-200 ease-in-out
                      ${basicDetails.garden ? 'bg-blue-600' : 'bg-gray-200'}
                    `}>
                      <div className={`
                        w-5 h-5 rounded-full bg-white transform transition-transform duration-200 ease-in-out
                        ${basicDetails.garden ? 'translate-x-8' : 'translate-x-1'} mt-1
                      `} />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Αυλή/Περιβάλλοντα Χώρος</span>
                </label>
              </div>
            )}

            {propertyType === 'villa' && (
              <div className="relative">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={basicDetails.multipleFloors}
                      onChange={(e) => handleBasicDetailsChange('multipleFloors', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`
                      w-14 h-7 rounded-full transition-colors duration-200 ease-in-out
                      ${basicDetails.multipleFloors ? 'bg-blue-600' : 'bg-gray-200'}
                    `}>
                      <div className={`
                        w-5 h-5 rounded-full bg-white transform transition-transform duration-200 ease-in-out
                        ${basicDetails.multipleFloors ? 'translate-x-8' : 'translate-x-1'} mt-1
                      `} />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Πολλαπλοί όροφοι</span>
                </label>
              </div>
            )}
          </div>
        );

      case 'commercial':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Κατηγορία Επαγγελματικού Χώρου
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {commercialTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleBasicDetailsChange('commercialType', type.id)}
                    className={`
                      px-3 py-2 rounded-lg border-2 transition-all duration-200 text-sm
                      ${basicDetails.commercialType === type.id
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Έτος Κατασκευής
                  </label>
                  <input
                    type="number"
                    value={basicDetails.yearBuilt}
                    onChange={(e) => handleBasicDetailsChange('yearBuilt', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="π.χ. 2010"
                    min="1800"
                    max={new Date().getFullYear()}
                  />
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Εμβαδόν (τ.μ.)
                  </label>
                  <input
                    type="number"
                    value={basicDetails.area}
                    onChange={(e) => handleBasicDetailsChange('area', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="π.χ. 100"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Όροφος
                  </label>
                  <select
                    value={basicDetails.floor}
                    onChange={(e) => handleBasicDetailsChange('floor', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Επιλέξτε όροφο</option>
                    {floorOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Αριθμός Χώρων/Γραφείων
                  </label>
                  <input
                    type="number"
                    value={basicDetails.rooms}
                    onChange={(e) => handleBasicDetailsChange('rooms', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="π.χ. 4"
                    min="1"
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Κατάσταση Ακινήτου
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {propertyConditions.map(condition => (
                    <button
                      key={condition.id}
                      onClick={() => handleBasicDetailsChange('condition', condition.id)}
                      className={`
                        w-full px-3 py-2 rounded-lg border-2 text-left transition-all duration-200 text-sm
                        ${basicDetails.condition === condition.id
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-blue-300 text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      {condition.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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

  const validateStep = (step: TabId) => {
    switch (step) {
      case 'basics':
        if (!propertyType) {
          setErrors({ propertyType: 'Παρακαλώ επιλέξτε τον τύπο ακινήτου' });
          return false;
        }
        break;

      case 'description':
        if (!description.title) {
          setErrors({ title: 'Παρακαλώ συμπληρώστε τον τίτλο της αγγελίας' });
          return false;
        }
        if (!description.fullDescription) {
          setErrors({ description: 'Παρακαλώ συμπληρώστε την περιγραφή της αγγελίας' });
          return false;
        }
        break;

      case 'price':
        if (!pricing.salePrice) {
          setErrors({ price: 'Παρακαλώ συμπληρώστε την τιμή πώλησης' });
          return false;
        }
        break;

      case 'location':
        if (!location.state) {
          setErrors({ state: 'Παρακαλώ συμπληρώστε τον νομό/περιφέρεια' });
          return false;
        }
        if (!location.city) {
          setErrors({ city: 'Παρακαλώ συμπληρώστε την πόλη' });
          return false;
        }
        if (!location.street) {
          setErrors({ street: 'Παρακαλώ συμπληρώστε την οδό' });
          return false;
        }
        if (!location.number) {
          setErrors({ number: 'Παρακαλώ συμπληρώστε τον αριθμό' });
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
        multipleFloors: basicDetails.multipleFloors,
        commercialType: basicDetails.commercialType,
        plotCategory: basicDetails.plotCategory,
        plotOwnershipType: basicDetails.plotOwnershipType
      }));

      // Χαρακτηριστικά και παροχές
      formData.append('features', JSON.stringify(features));
      formData.append('amenities', JSON.stringify(amenities));

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
        negotiable: pricing.negotiable,
        additionalNotes: pricing.additionalNotes
      }));

      // Περιγραφή
      formData.append('description', JSON.stringify({
        title: description.title,
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
      content = (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Επιπλέον Χαρακτηριστικά</h3>
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

            {/* Επιπλέον χαρακτηριστικά */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                  placeholder="π.χ. 2"
                  min="0"
                />
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Κήπος
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={features.garden}
                    onChange={(e) => handleFeatureChange('garden', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Διαθέτει Κήπο
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Πολλαπλοί Όροφοι
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={features.multipleFloors}
                    onChange={(e) => handleFeatureChange('multipleFloors', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Πολλαπλοί Όροφοι
                  </label>
                </div>
              </div>
            </div>

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

    return <div className="space-y-8">{content}</div>;
  };

  const handleNextStep = () => {
    if (validateStep(activeTab)) {
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
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Τιμή Πώλησης</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Συνολική Τιμή Πώλησης (€) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={pricing.salePrice}
                onChange={(e) => handlePricingChange('salePrice', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:ring focus:ring-green-200 transition-all duration-200"
                placeholder="π.χ. 250.000"
                min="0"
                step="1000"
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
                type="number"
                value={pricing.pricePerSquareMeter}
                onChange={(e) => handlePricingChange('pricePerSquareMeter', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:ring focus:ring-green-200 transition-all duration-200"
                placeholder="π.χ. 2.000"
                min="0"
                step="100"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500">€/τ.μ.</span>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Προαιρετικό πεδίο - Υπολογίζεται αυτόματα από τη συνολική τιμή και το εμβαδόν
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Επιπρόσθετες Πληροφορίες Τιμής
            </label>
            <textarea
              value={pricing.additionalNotes}
              onChange={(e) => handlePricingChange('additionalNotes', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:ring focus:ring-green-200 transition-all duration-200"
              rows={4}
              placeholder="π.χ. Στην τιμή συμπεριλαμβάνονται τα έξοδα μεταβίβασης, ειδικές προϋποθέσεις πώλησης κλπ."
            />
          </div>

          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={pricing.negotiable}
                  onChange={(e) => handlePricingChange('negotiable', e.target.checked)}
                  className="sr-only"
                />
                <div className={pricing.negotiable 
                  ? 'w-14 h-7 rounded-full transition-colors duration-200 ease-in-out bg-green-600'
                  : 'w-14 h-7 rounded-full transition-colors duration-200 ease-in-out bg-gray-200'}>
                  <div className={pricing.negotiable 
                    ? 'w-5 h-5 rounded-full bg-white transform transition-transform duration-200 ease-in-out mt-1 translate-x-8'
                    : 'w-5 h-5 rounded-full bg-white transform transition-transform duration-200 ease-in-out mt-1 translate-x-1'} />
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700">Διαπραγματεύσιμη Τιμή</span>
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100">
      {/* Header */}
      <header className="w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left Section - Logo */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center space-x-4"
            >
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg">
                  <FaHome className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    RealEstate
                  </span>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  Seller Mode
                </span>
                </div>
              </Link>
            </motion.div>

            {/* Center Section - Navigation Links */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden md:flex items-center space-x-8"
            >
                <Link
                  href="/seller/properties"
                className="text-gray-600 hover:text-gray-900 transition-all duration-200 font-medium hover:scale-105"
                >
                  Ακίνητα
                </Link>
                <Link
                  href="/about"
                className="text-gray-600 hover:text-gray-900 transition-all duration-200 font-medium hover:scale-105"
                >
                  Σχετικά
                </Link>
                <Link
                  href="/contact"
                className="text-gray-600 hover:text-gray-900 transition-all duration-200 font-medium hover:scale-105"
                >
                  Επικοινωνία
                </Link>
            </motion.div>

            {/* Right Section - Actions */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center space-x-4"
            >
              <Link
                href="/seller"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <FaHome className="w-5 h-5" />
              </Link>
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
                  >
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <FaUser className="w-4 h-4 text-white" />
                  </div>
                  </button>
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                    >
                      <Link
                        href="/dashboard/seller/profile"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                      >
                        <FaCog className="mr-3 text-gray-500" />
                        Ρυθμίσεις
                      </Link>
                      <Link
                        href="/dashboard/seller/messages"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                      >
                        <FaComments className="mr-3 text-gray-500" />
                        Μηνύματα
                      </Link>
                      <Link
                        href="/seller/how-it-works#faq"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                      >
                        <FaQuestionCircle className="mr-3 text-gray-500" />
                        Συχνές Ερωτήσεις
                      </Link>
                      <div className="border-t border-gray-100 my-1"></div>
                      <Link
                        href="/"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                      >
                        <FaExchangeAlt className="mr-3 text-gray-500" />
                        Αλλαγή Ρόλων
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        <FaSignOutAlt className="mr-3" />
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
      <main className="container mx-auto px-4 pt-8 pb-8">
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
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          // Έλεγχος συνδρομής για εταιρείες
                          if (subscriptionCheck.userType === 'COMPANY' && !subscriptionCheck.hasActiveSubscription) {
                            setIsSubscriptionModalOpen(true);
                          } else {
                            setShowForm(true);
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
                <p className="text-green-100 text-sm">Συμπληρώστε τις πληροφορίες του ακινήτου σας</p>
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

          {/* Progress Bar */}
          <div className="px-6 py-4 bg-gray-50/50">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${(tabs.findIndex(tab => tab.id === activeTab) + 1) * (100 / tabs.length)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
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
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Παροχές & Ανέσεις</h3>
                  {propertyType === 'plot' ? (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('electricity', !amenities.electricity)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.electricity
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.electricity ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <GiSolarPower className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Παροχή Ρεύματος</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('water', !amenities.water)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.water
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.water ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <FaHome className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Παροχή Νερού</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('buildingPermit', !amenities.buildingPermit)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.buildingPermit
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.buildingPermit ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <FaHome className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Άδεια Οικοδομής</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('containerPermit', !amenities.containerPermit)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.containerPermit
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.containerPermit ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <FaHome className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Άδεια Τοποθέτησης Κοντέινερ</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('pea', !amenities.pea)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.pea
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.pea ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <FaHome className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">ΠΕΑ</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('fenced', !amenities.fenced)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.fenced
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.fenced ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <FaHome className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Περιφραγμένο</span>
                        </motion.button>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAmenityChange('withinPlan', !amenities.withinPlan)}
                            className={`
                              p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                              transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                              ${amenities.withinPlan
                                ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              amenities.withinPlan ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <FaHome className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold">Εντός Σχεδίου</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAmenityChange('withinSettlement', !amenities.withinSettlement)}
                            className={`
                              p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                              transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                              ${amenities.withinSettlement
                                ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              amenities.withinSettlement ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <FaHome className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold">Εντός Οικισμού / ΠΕΡΠΟ / ΖΟΕ</span>
                          </motion.button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAmenityChange('reforestable', !amenities.reforestable)}
                            className={`
                              p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                              transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                              ${amenities.reforestable
                                ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              amenities.reforestable ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <FaHome className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold">Αναδασωτέο</span>
                          </motion.button>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('threePhaseElectricity', !amenities.threePhaseElectricity)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.threePhaseElectricity
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.threePhaseElectricity ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <GiSolarPower className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Ρεύμα – Τριφασικό</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('waterSupply', !amenities.waterSupply)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.waterSupply
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.waterSupply ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <FaHome className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Ύδρευση</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('falseCeiling', !amenities.falseCeiling)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.falseCeiling
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.falseCeiling ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <FaHome className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Ψευδοροφή</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('airConditioningHeating', !amenities.airConditioningHeating)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.airConditioningHeating
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.airConditioningHeating ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <GiHeatHaze className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Air Condition / Κεντρική Θέρμανση</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('internetStructuredCabling', !amenities.internetStructuredCabling)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.internetStructuredCabling
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.internetStructuredCabling ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <FaWifi className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Internet / Δομημένη καλωδίωση</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('alarm', !amenities.alarm)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.alarm
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.alarm ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <MdSecurity className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Συναγερμός</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('equipment', !amenities.equipment)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.equipment
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.equipment ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <FaHome className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Εξοπλισμός</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('energyCertificate', !amenities.energyCertificate)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.energyCertificate
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.energyCertificate ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <GiSolarPower className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Ενεργειακό Πιστοποιητικό (ΠΕΑ)</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('disabledAccess', !amenities.disabledAccess)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.disabledAccess
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.disabledAccess ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <FaHome className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Πρόσβαση ΑΜΕΑ</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('parking', !amenities.parking)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.parking
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.parking ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <FaParking className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Χώρος Στάθμευσης</span>
                        </motion.button>
                      </div>
                    </div>
                  ) : ['apartment', 'house', 'villa'].includes(propertyType) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {propertyType === 'apartment' && (
                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAmenityChange('storage', !amenities.storage)}
                          className={`
                            p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                            transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                            ${amenities.storage
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            amenities.storage ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <MdStore className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-semibold">Αποθήκη</span>
                        </motion.button>
                      )}

                      {propertyType === 'villa' && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAmenityChange('guestHouse', !amenities.guestHouse)}
                            className={`
                              p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                              transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                              ${amenities.guestHouse
                                ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              amenities.guestHouse ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <FaHome className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold">Ξενώνας</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAmenityChange('jacuzzi', !amenities.jacuzzi)}
                            className={`
                              p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                              transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                              ${amenities.jacuzzi
                                ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              amenities.jacuzzi ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <FaSwimmingPool className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold">Τζακούζι</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAmenityChange('outdoorSports', !amenities.outdoorSports)}
                            className={`
                              p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                              transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                              ${amenities.outdoorSports
                                ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              amenities.outdoorSports ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <FaHome className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold">Αθλητικοί Εξωτερικοί Χώροι</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAmenityChange('gym', !amenities.gym)}
                            className={`
                              p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                              transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                              ${amenities.gym
                                ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              amenities.gym ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <FaHome className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold">Γυμναστήριο</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAmenityChange('sauna', !amenities.sauna)}
                            className={`
                              p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                              transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                              ${amenities.sauna
                                ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              amenities.sauna ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <FaHome className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold">Σάουνα</span>
                          </motion.button>
                        </>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAmenityChange('fireplace', !amenities.fireplace)}
                        className={`
                          p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                          transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                          ${amenities.fireplace
                            ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          amenities.fireplace ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <FaHome className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold">Τζάκι</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAmenityChange('airConditioning', !amenities.airConditioning)}
                        className={`
                          p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                          transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                          ${amenities.airConditioning
                            ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          amenities.airConditioning ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <FaHome className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold">Κλιματισμός</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAmenityChange('solarWaterHeater', !amenities.solarWaterHeater)}
                        className={`
                          p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                          transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                          ${amenities.solarWaterHeater
                            ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          amenities.solarWaterHeater ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <GiSolarPower className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold">Ηλιακός Θερμοσίφωνας</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAmenityChange('smartTv', !amenities.smartTv)}
                        className={`
                          p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                          transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                          ${amenities.smartTv
                            ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          amenities.smartTv ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <FaTv className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold">Smart TV</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAmenityChange('bbq', !amenities.bbq)}
                        className={`
                          p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                          transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                          ${amenities.bbq
                            ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          amenities.bbq ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <MdOutdoorGrill className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold">BBQ</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAmenityChange('electricalAppliances', !amenities.electricalAppliances)}
                        className={`
                          p-6 rounded-2xl border-2 text-center flex flex-col items-center space-y-3
                          transition-all duration-200 ease-in-out shadow-sm hover:shadow-md
                          ${amenities.electricalAppliances
                            ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          amenities.electricalAppliances ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <FaHome className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold">Ηλεκτρικές Συσκευές</span>
                      </motion.button>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Νομός/Περιφέρεια <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={location.state}
                        onChange={(e) => handleLocationChange('state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="π.χ. Αττική, Θεσσαλονίκη"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Πόλη <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={location.city}
                        onChange={(e) => handleLocationChange('city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="π.χ. Αθήνα, Θεσσαλονίκη"
                        required
                      />
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
                        Ταχυδρομικός Κώδικας *
                      </label>
                      <input
                        type="text"
                        value={location.postalCode}
                        onChange={(e) => handleLocationChange('postalCode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="π.χ. 10672"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Περιοχή *
                      </label>
                      <input
                        type="text"
                        value={location.neighborhood}
                        onChange={(e) => handleLocationChange('neighborhood', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="π.χ. Κολωνάκι"
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
                <div>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                              >
                                {keyword}
                                <button
                                  type="button"
                                  onClick={() => removeKeyword(index)}
                                  className="ml-2 text-blue-600 hover:text-blue-800"
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
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Επόμενο
                </motion.button>
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