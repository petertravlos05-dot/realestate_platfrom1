'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DealRoom } from '@/lib/api/deals';
import { searchProfessionals, requestProfessional, ProfessionalProfile, cancelProfessionalRequest, getProfessionalAvailability, getProfessionalPublicProfile } from '@/lib/api/professionals';
import { toast } from 'react-hot-toast';
import { FaSpinner, FaUserTie, FaSearch, FaMapMarkerAlt, FaPlus, FaTimes, FaHandshake, FaList, FaEnvelope, FaStar, FaPhone, FaGlobe, FaClock, FaCalendarAlt, FaFileContract, FaChevronLeft, FaChevronRight, FaWrench } from 'react-icons/fa';
import { format, isSameDay, isToday, isPast, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, addDays, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { el } from 'date-fns/locale';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { shouldShowToast } from '@/lib/utils/toastDedupe';
import { debounce } from '@/lib/utils/debounce';
import EmptyState from '../ui/EmptyState';
import CardSection from '../ui/CardSection';
import { isSeller, isAgent } from '@/lib/utils/dealRole';
import { useDealRoomTheme } from '../useDealRoomTheme';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { requestAppointment, cancelAppointment } from '@/lib/api/dealAppointments';

interface ProfessionalsTabProps {
  deal: DealRoom;
  onRefresh: () => void;
  isBuyerFromGreece?: boolean;
}

type InnerTabType = 'requests' | 'list' | 'appointments';

export default function ProfessionalsTab({ deal, onRefresh, isBuyerFromGreece = true }: ProfessionalsTabProps) {
  const { userId } = useCurrentUser();
  const { accentIcon } = useDealRoomTheme();
  const [activeInnerTab, setActiveInnerTab] = useState<InnerTabType>('list');
  const [professionalType, setProfessionalType] = useState<'LAWYER' | 'NOTARY' | 'ENGINEER'>('LAWYER');
  const [lawyers, setLawyers] = useState<ProfessionalProfile[]>([]);
  const [notaries, setNotaries] = useState<ProfessionalProfile[]>([]);
  const [engineers, setEngineers] = useState<ProfessionalProfile[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Check user roles (must be defined before useEffects that depend on them)
  const isBuyer = deal.participants?.some(
    (p) => p.role === 'BUYER' && p.userId === userId
  );
  const isSellerRole = isSeller(deal, userId);
  const isAgentRole = isAgent(deal, userId);

  // Property for sale vs rent: buyer does not see Engineers tab when property is for sale
  const isRent = (() => {
    const a = (deal.property as any)?.amenities;
    return a && typeof a === 'object' && String(a.listingType || a.transactionType || '').toLowerCase() === 'rent';
  })();
  const showEngineersTab = !(isBuyer && !isRent); // Hide Engineers for buyer when property is for sale

  // Log buyer country status for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ProfessionalsTab] Buyer from Greece:', isBuyerFromGreece);
    }
  }, [isBuyerFromGreece]);

  // When seller: NOTARY tab is hidden - switch to LAWYER if NOTARY was selected
  useEffect(() => {
    if (isSellerRole && professionalType === 'NOTARY') {
      setProfessionalType('LAWYER');
    }
  }, [isSellerRole, professionalType]);

  // When buyer + sale: ENGINEER tab is hidden - switch to LAWYER if ENGINEER was selected
  useEffect(() => {
    if (!showEngineersTab && professionalType === 'ENGINEER') {
      setProfessionalType('LAWYER');
    }
  }, [showEngineersTab, professionalType]);

  // Seller: only appointments they booked (with professionals). Buyer/Agent: all appointments.
  const sellerId = deal.sellerId || deal.participants?.find(p => p.role === 'SELLER')?.userId;
  const appointmentsForView = (() => {
    const all = deal.appointments || [];
    if (isSellerRole && sellerId) {
      return all.filter((a) => a.bookedById === sellerId);
    }
    return all;
  })();
  
  // Custom lawyer form state (for seller) - OTP flow
  const [showCustomLawyerModal, setShowCustomLawyerModal] = useState(false);
  const [customLawyerData, setCustomLawyerData] = useState({
    name: '',
    email: '',
    phone: '',
    registrationNumber: '',
  });
  const [lawyerInviteId, setLawyerInviteId] = useState<string | null>(null);
  const [lawyerOtpCode, setLawyerOtpCode] = useState('');
  const [lawyerSendOtpTo, setLawyerSendOtpTo] = useState<'email' | 'phone'>('email');
  const [lawyerSubmitting, setLawyerSubmitting] = useState(false);

  // Custom engineer form state (for seller) - OTP flow
  const [showCustomEngineerModal, setShowCustomEngineerModal] = useState(false);
  const [customEngineerData, setCustomEngineerData] = useState({
    name: '',
    email: '',
    phone: '',
    registrationNumber: '',
  });
  const [engineerInviteId, setEngineerInviteId] = useState<string | null>(null);
  const [engineerOtpCode, setEngineerOtpCode] = useState('');
  const [engineerSendOtpTo, setEngineerSendOtpTo] = useState<'email' | 'phone'>('email');
  const [engineerSubmitting, setEngineerSubmitting] = useState(false);

  // Professional details modal state
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalProfile | null>(null);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [loadingProfessionalDetails, setLoadingProfessionalDetails] = useState(false);
  const professionalDetailsCacheRef = useRef<Map<string, ProfessionalProfile>>(new Map());

  // Appointment booking modal state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentProfessional, setAppointmentProfessional] = useState<ProfessionalProfile | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const [appointmentStartTime, setAppointmentStartTime] = useState('');
  const [appointmentEndTime, setAppointmentEndTime] = useState('');
  const [appointmentType, setAppointmentType] = useState<'ONLINE' | 'IN_PERSON'>('ONLINE');
  const [appointmentNote, setAppointmentNote] = useState('');
  const [appointmentLocation, setAppointmentLocation] = useState('');
  const [submittingAppointment, setSubmittingAppointment] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [professionalAvailability, setProfessionalAvailability] = useState<{
    weeklyRules?: Array<{ weekday: number; start: string; end: string }>;
    meetingTypes?: string[];
  } | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Load professional availability when modal opens
  useEffect(() => {
    if (showAppointmentModal && appointmentProfessional) {
      const loadAvailability = async () => {
        try {
          setLoadingAvailability(true);
          const availability = await getProfessionalAvailability(appointmentProfessional.professionalId);
          setProfessionalAvailability(availability);
          if (!availability || !availability.weeklyRules || availability.weeklyRules.length === 0) {
            setShowCustomDatePicker(true); // Show custom picker if no availability set
          }
        } catch (error) {
          console.error('Error loading availability:', error);
          setShowCustomDatePicker(true); // Show custom picker on error
        } finally {
          setLoadingAvailability(false);
        }
      };
      loadAvailability();
    } else {
      // Reset when modal closes
      setProfessionalAvailability(null);
      setShowCustomDatePicker(false);
    }
  }, [showAppointmentModal, appointmentProfessional]);


  const dealPropertyIdRef = useRef(deal.propertyId);
  useEffect(() => {
    dealPropertyIdRef.current = deal.propertyId;
  }, [deal.propertyId]);

  // Cache for professionals data (5 minutes TTL)
  const professionalsCacheRef = useRef<{
    lawyers: ProfessionalProfile[];
    notaries: ProfessionalProfile[];
    engineers: ProfessionalProfile[];
    timestamp: number;
  } | null>(null);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const isSearchingRef = useRef(false);
  const handleSearch = useCallback(async (type: 'LAWYER' | 'NOTARY' | 'ENGINEER', area?: string | null) => {
    // Prevent multiple simultaneous calls
    if (isSearchingRef.current) {
      return;
    }


    // Check cache first
    const cache = professionalsCacheRef.current;
    const now = Date.now();
    if (cache && (now - cache.timestamp) < CACHE_TTL) {
      // Use cached data
      if (type === 'LAWYER' && cache.lawyers.length > 0) {
        setLawyers(cache.lawyers);
        setLoading(false);
        return;
      } else if (type === 'NOTARY' && cache.notaries.length > 0) {
        setNotaries(cache.notaries);
        setLoading(false);
        return;
      } else if (type === 'ENGINEER' && cache.engineers?.length) {
        setEngineers(cache.engineers);
        setLoading(false);
        return;
      }
    }

    // Always search for all professionals (no area filter)

    try {
      isSearchingRef.current = true;
      setLoading(true);
      // Search without area filter - show all professionals
      const response = await searchProfessionals({
        type,
        propertyId: dealPropertyIdRef.current,
      });
      
      // Update cache
      if (!professionalsCacheRef.current) {
        professionalsCacheRef.current = {
          lawyers: [],
          notaries: [],
          engineers: [],
          timestamp: now,
        };
      }
      if (type === 'LAWYER') {
        professionalsCacheRef.current.lawyers = response.professionals;
        setLawyers(response.professionals);
      } else if (type === 'NOTARY') {
        professionalsCacheRef.current.notaries = response.professionals;
        setNotaries(response.professionals);
      } else {
        professionalsCacheRef.current.engineers = response.professionals;
        setEngineers(response.professionals);
      }
      professionalsCacheRef.current.timestamp = now;
    } catch (error: any) {
      console.error('Error searching professionals:', error);
      
      // Handle errors
      if (shouldShowToast(error.message || 'Αποτυχία αναζήτησης', 'error')) {
        toast.error(error.message || 'Αποτυχία αναζήτησης');
      }
      
      // Try to use cached data if available on any error
      const cache = professionalsCacheRef.current;
      if (cache && (now - cache.timestamp) < CACHE_TTL * 2) { // Use cache even if slightly stale
        if (type === 'LAWYER' && cache.lawyers.length > 0) {
          setLawyers(cache.lawyers);
        } else if (type === 'NOTARY' && cache.notaries.length > 0) {
          setNotaries(cache.notaries);
        } else if (type === 'ENGINEER' && cache.engineers?.length) {
          setEngineers(cache.engineers);
        }
      }
    } finally {
      setLoading(false);
      isSearchingRef.current = false;
    }
  }, []); // No dependencies - use ref for propertyId to prevent infinite loops


  // Auto-load professionals when tab opens (for buyers and sellers)
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    // Only auto-load once when component mounts and user is buyer/seller
    if ((isBuyer || isSellerRole) && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      
      // Check cache first before making API call
      const cache = professionalsCacheRef.current;
      const now = Date.now();
      const type = isBuyer ? professionalType : 'LAWYER';
      
      if (cache && (now - cache.timestamp) < CACHE_TTL) {
        // Use cached data
        const loadType = isBuyer ? professionalType : 'LAWYER';
        if (loadType === 'LAWYER' && cache.lawyers.length > 0) {
          setLawyers(cache.lawyers);
          setHasAutoLoaded(true);
          return;
        } else if (loadType === 'NOTARY' && cache.notaries.length > 0) {
          setNotaries(cache.notaries);
          setHasAutoLoaded(true);
          return;
        } else if (loadType === 'ENGINEER' && cache.engineers?.length) {
          setEngineers(cache.engineers);
          setHasAutoLoaded(true);
          return;
        }
      }
      
      // No cache or cache expired - make API call
      setTimeout(() => {
        const loadType = isBuyer ? professionalType : (isSellerRole ? 'LAWYER' : professionalType);
        handleSearch(loadType, null);
      }, 100);
      
      setHasAutoLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBuyer, isSellerRole, professionalType]); // handleSearch is stable, no need in deps

  // Auto-search when professionalType changes (for buyers only, and only after initial load)
  const prevProfessionalTypeRef = useRef(professionalType);
  useEffect(() => {
    if ((isBuyer || isSellerRole) && hasAutoLoaded && prevProfessionalTypeRef.current !== professionalType) {
      prevProfessionalTypeRef.current = professionalType;
      handleSearch(professionalType, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalType, isBuyer, isSellerRole, hasAutoLoaded]); // handleSearch is stable, no need in deps

  const handleRequest = async (professionalId: string, type: 'LAWYER' | 'NOTARY' | 'ENGINEER') => {
    try {
      const typeLabel = type === 'LAWYER' ? 'δικηγόρο' : type === 'NOTARY' ? 'συμβολαιογράφο' : 'μηχανικό';
      await requestProfessional(deal.id, professionalId, `Αίτημα για ${typeLabel}`);
      toast.success('Το αίτημα στάλθηκε επιτυχώς');
      onRefresh();
    } catch (error: any) {
      console.error('Error requesting professional:', error);
      toast.error(error.message || 'Αποτυχία αποστολής αιτήματος');
    }
  };

  // Handle custom lawyer - Step 1: Send OTP
  const handleCustomLawyerSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLawyerData.name || !customLawyerData.email) {
      toast.error('Παρακαλώ συμπληρώστε όνομα και email');
      return;
    }
    if (lawyerSendOtpTo === 'phone' && !customLawyerData.phone) {
      toast.error('Παρακαλώ εισάγετε τηλέφωνο για αποστολή OTP');
      return;
    }
    try {
      setLawyerSubmitting(true);
      const { data } = await apiClient.post(`/deals/${deal.id}/invite-professional`, {
        type: 'LAWYER',
        name: customLawyerData.name,
        email: customLawyerData.email,
        phone: customLawyerData.phone || undefined,
        registrationNumber: customLawyerData.registrationNumber || undefined,
        sendOtpTo: lawyerSendOtpTo,
      });
      setLawyerInviteId(data.inviteId);
      toast.success('Ο κωδικός OTP στάλθηκε');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Αποτυχία αποστολής OTP');
    } finally {
      setLawyerSubmitting(false);
    }
  };

  // Handle custom lawyer - Step 2: Verify OTP
  const handleCustomLawyerVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lawyerInviteId || !lawyerOtpCode.trim()) {
      toast.error('Παρακαλώ εισάγετε τον κωδικό OTP');
      return;
    }
    try {
      setLawyerSubmitting(true);
      await apiClient.post(`/deals/${deal.id}/invite-professional/verify`, {
        inviteId: lawyerInviteId,
        otpCode: lawyerOtpCode.trim(),
      });
      toast.success('Ο δικηγόρος προστέθηκε επιτυχώς');
      resetLawyerModal();
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Λάθος κωδικός OTP');
    } finally {
      setLawyerSubmitting(false);
    }
  };

  const resetLawyerModal = () => {
    setShowCustomLawyerModal(false);
    setCustomLawyerData({ name: '', email: '', phone: '', registrationNumber: '' });
    setLawyerInviteId(null);
    setLawyerOtpCode('');
  };

  // Handle custom engineer - Step 1: Send OTP
  const handleCustomEngineerSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEngineerData.name || !customEngineerData.email) {
      toast.error('Παρακαλώ συμπληρώστε όνομα και email');
      return;
    }
    if (engineerSendOtpTo === 'phone' && !customEngineerData.phone) {
      toast.error('Παρακαλώ εισάγετε τηλέφωνο για αποστολή OTP');
      return;
    }
    try {
      setEngineerSubmitting(true);
      const { data } = await apiClient.post(`/deals/${deal.id}/invite-professional`, {
        type: 'ENGINEER',
        name: customEngineerData.name,
        email: customEngineerData.email,
        phone: customEngineerData.phone || undefined,
        registrationNumber: customEngineerData.registrationNumber || undefined,
        sendOtpTo: engineerSendOtpTo,
      });
      setEngineerInviteId(data.inviteId);
      toast.success('Ο κωδικός OTP στάλθηκε');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Αποτυχία αποστολής OTP');
    } finally {
      setEngineerSubmitting(false);
    }
  };

  // Handle custom engineer - Step 2: Verify OTP
  const handleCustomEngineerVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!engineerInviteId || !engineerOtpCode.trim()) {
      toast.error('Παρακαλώ εισάγετε τον κωδικό OTP');
      return;
    }
    try {
      setEngineerSubmitting(true);
      await apiClient.post(`/deals/${deal.id}/invite-professional/verify`, {
        inviteId: engineerInviteId,
        otpCode: engineerOtpCode.trim(),
      });
      toast.success('Ο μηχανικός προστέθηκε επιτυχώς');
      resetEngineerModal();
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Λάθος κωδικός OTP');
    } finally {
      setEngineerSubmitting(false);
    }
  };

  const resetEngineerModal = () => {
    setShowCustomEngineerModal(false);
    setCustomEngineerData({ name: '', email: '', phone: '', registrationNumber: '' });
    setEngineerInviteId(null);
    setEngineerOtpCode('');
  };

  // Only consider requests made by current user (buyer sees only their own, seller sees only their own)
  const isRequested = (professionalId: string) => {
    return deal.requests?.some((r) =>
      r.professionalId === professionalId &&
      (isBuyer ? r.requestedById === deal.buyerId : r.requestedById === userId)
    );
  };

  const isAccepted = (professionalId: string) => {
    return deal.requests?.some((r) =>
      r.professionalId === professionalId &&
      r.status === 'ACCEPTED' &&
      (isBuyer ? r.requestedById === deal.buyerId : r.requestedById === userId)
    );
  };

  // Check if current user has already a request for this professional type
  const hasRequestForType = (type: 'LAWYER' | 'NOTARY' | 'ENGINEER') => {
    return deal.requests?.some((r) =>
      r.type === type &&
      (r.status === 'REQUESTED' || r.status === 'ACCEPTED') &&
      (isBuyer ? r.requestedById === deal.buyerId : r.requestedById === userId)
    );
  };

  // Lawyer selected by buyer (seller cannot select this one - it's buyer's)
  const buyerSelectedLawyerId = (() => {
    const r = deal.requests?.find(
      (r) => r.type === 'LAWYER' && (r.status === 'REQUESTED' || r.status === 'ACCEPTED') && r.requestedById === deal.buyerId
    );
    return r?.professionalId || null;
  })();

  // Lawyer selected by seller (buyer cannot request this one - already in deal)
  const sellerSelectedLawyerId = (() => {
    const sid = deal.sellerId || deal.participants?.find((p) => p.role === 'SELLER')?.userId;
    const r = deal.requests?.find(
      (r) => r.type === 'LAWYER' && (r.status === 'REQUESTED' || r.status === 'ACCEPTED') && r.requestedById === sid
    );
    return r?.professionalId || null;
  })();

  // Seller's own lawyer request (seller can only have one - blocks selecting others)
  const hasSellerRequestForLawyer = deal.requests?.some(
    (r) => r.type === 'LAWYER' && (r.status === 'REQUESTED' || r.status === 'ACCEPTED') && r.requestedById === userId
  );

  const getTypeLabel = (type: 'LAWYER' | 'NOTARY' | 'ENGINEER') =>
    type === 'LAWYER' ? 'δικηγόρο' : type === 'NOTARY' ? 'συμβολαιογράφο' : 'μηχανικό';

  const getTypeDisplayLabel = (type: 'LAWYER' | 'NOTARY' | 'ENGINEER') =>
    type === 'LAWYER' ? 'Δικηγόρος' : type === 'NOTARY' ? 'Συμβολαιογράφος' : 'Μηχανικός';

  const weekdayToGreek: Record<number, string> = {
    0: 'Κυριακή',
    1: 'Δευτέρα',
    2: 'Τρίτη',
    3: 'Τετάρτη',
    4: 'Πέμπτη',
    5: 'Παρασκευή',
    6: 'Σάββατο',
  };

  const getTypeStyle = (type: 'LAWYER' | 'NOTARY' | 'ENGINEER') =>
    type === 'LAWYER'
      ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
      : type === 'NOTARY'
        ? 'bg-gradient-to-br from-teal-500 to-cyan-600'
        : 'bg-gradient-to-br from-amber-500 to-orange-600';

  const getTypeIcon = (type: 'LAWYER' | 'NOTARY' | 'ENGINEER') =>
    type === 'LAWYER' ? <FaUserTie /> : type === 'NOTARY' ? <FaHandshake /> : <FaWrench />;

  const openProfessionalDetails = async (professional: ProfessionalProfile) => {
    setSelectedProfessional(professional);
    setShowProfessionalModal(true);

    const cached = professionalDetailsCacheRef.current.get(professional.professionalId);
    if (cached) {
      setSelectedProfessional((prev) =>
        prev?.professionalId === professional.professionalId ? { ...prev, ...cached } : prev
      );
      return;
    }

    try {
      setLoadingProfessionalDetails(true);
      const profileDetails = await getProfessionalPublicProfile(professional.professionalId);
      professionalDetailsCacheRef.current.set(professional.professionalId, profileDetails);
      setSelectedProfessional((prev) =>
        prev?.professionalId === professional.professionalId ? { ...prev, ...profileDetails } : prev
      );
    } catch (error) {
      console.error('Error loading professional public profile:', error);
    } finally {
      setLoadingProfessionalDetails(false);
    }
  };

  // Confirmation modal state
  const [showRequestConfirmation, setShowRequestConfirmation] = useState(false);
  const [pendingRequestProfessional, setPendingRequestProfessional] = useState<{
    id: string;
    type: 'LAWYER' | 'NOTARY' | 'ENGINEER';
    name: string;
  } | null>(null);

  const handleRequestClick = (professionalId: string, type: 'LAWYER' | 'NOTARY' | 'ENGINEER', professionalName: string) => {
    // Seller: cannot request the lawyer already selected by buyer
    if (isSellerRole && type === 'LAWYER' && professionalId === buyerSelectedLawyerId) {
      toast.error('Ο δικηγόρος αυτός έχει ήδη επιλεγεί από τον αγοραστή. Μπορείτε να επιλέξετε άλλον δικηγόρο για εσάς.');
      return;
    }
    // Buyer: cannot request the lawyer already selected by seller (already in deal room)
    if (isBuyer && type === 'LAWYER' && professionalId === sellerSelectedLawyerId) {
      toast.error('Ο δικηγόρος αυτός έχει ήδη επιλεγεί από τον πωλητή.');
      return;
    }

    // Seller: check only their own request (they can add their lawyer even if buyer has one)
    const blocksRequest = isSellerRole && type === 'LAWYER'
      ? hasSellerRequestForLawyer
      : hasRequestForType(type);

    if (blocksRequest) {
      const existingRequest = deal.requests?.find(
        (r) => r.type === type && (r.status === 'REQUESTED' || r.status === 'ACCEPTED') && (isBuyer ? r.requestedById === deal.buyerId : r.requestedById === userId)
      );
      const existingProfessionalName = existingRequest?.professional?.displayName || 'έναν επαγγελματία';
      
      toast.error(
        `Έχετε ήδη κάνει αίτημα σε ${existingProfessionalName}. Μπορείτε να κάνετε αίτημα μόνο σε έναν ${getTypeLabel(type)} τη φορά.`,
        { duration: 5000 }
      );
      return;
    }

    // Show confirmation modal
    setPendingRequestProfessional({ id: professionalId, type, name: professionalName });
    setShowRequestConfirmation(true);
  };

  const confirmRequest = async () => {
    if (!pendingRequestProfessional) return;
    
    try {
      await handleRequest(pendingRequestProfessional.id, pendingRequestProfessional.type);
      setShowRequestConfirmation(false);
      setPendingRequestProfessional(null);
    } catch (error) {
      // Error handling is done in handleRequest
    }
  };

  // Agent can only view, not select professionals
  if (isAgentRole) {
    // Show read-only view of selected professionals
    // Check both requests (ACCEPTED) and participants (LAWYER/NOTARY/ENGINEER role)
    const acceptedLawyerRequest = deal.requests?.find(r => r.status === 'ACCEPTED' && r.type === 'LAWYER');
    const acceptedNotaryRequest = deal.requests?.find(r => r.status === 'ACCEPTED' && r.type === 'NOTARY');
    const acceptedEngineerRequest = deal.requests?.find(r => r.status === 'ACCEPTED' && r.type === 'ENGINEER');
    
    // Also check participants for professionals who are already in the deal room
    const lawyerParticipant = deal.participants?.find(p => p.role === 'LAWYER' && p.user?.professionalProfile);
    const notaryParticipant = deal.participants?.find(p => p.role === 'NOTARY' && p.user?.professionalProfile);
    const engineerParticipant = deal.participants?.find(p => (p.role as string) === 'ENGINEER' && p.user?.professionalProfile);
    
    // Prefer request data if available, otherwise use participant data
    const lawyer = acceptedLawyerRequest?.professional || lawyerParticipant?.user?.professionalProfile;
    const notary = acceptedNotaryRequest?.professional || notaryParticipant?.user?.professionalProfile;
    const engineer = acceptedEngineerRequest?.professional || engineerParticipant?.user?.professionalProfile;
    
    return (
      <div className="space-y-6">
        <CardSection>
          <div className="flex items-center gap-2 mb-4">
            <FaUserTie className="text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">Επαγγελματίες</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Προβολή των επαγγελματιών που έχουν επιλέξει ο αγοραστής και ο πωλητής
          </p>
          
          <div className="grid gap-4">
            {lawyer && (
              <div className="border-2 border-gray-200 rounded-xl p-5 bg-white">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    <FaUserTie />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-base mb-1">Δικηγόρος</h4>
                    <p className="text-sm text-gray-600">{lawyer.displayName || 'N/A'}</p>
                    {acceptedLawyerRequest?.professional?.user?.email && (
                      <p className="text-xs text-gray-500 mt-1">{acceptedLawyerRequest.professional.user.email}</p>
                    )}
                    {lawyerParticipant?.user?.email && !acceptedLawyerRequest && (
                      <p className="text-xs text-gray-500 mt-1">{lawyerParticipant.user.email}</p>
                    )}
                    <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Επιβεβαιωμένος
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {notary && (
              <div className="border-2 border-gray-200 rounded-xl p-5 bg-white">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    <FaHandshake />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-base mb-1">Συμβολαιογράφος</h4>
                    <p className="text-sm text-gray-600">{notary.displayName || 'N/A'}</p>
                    {acceptedNotaryRequest?.professional?.user?.email && (
                      <p className="text-xs text-gray-500 mt-1">{acceptedNotaryRequest.professional.user.email}</p>
                    )}
                    {notaryParticipant?.user?.email && !acceptedNotaryRequest && (
                      <p className="text-xs text-gray-500 mt-1">{notaryParticipant.user.email}</p>
                    )}
                    <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Επιβεβαιωμένος
                    </span>
                  </div>
                </div>
              </div>
            )}

            {engineer && (
              <div className="border-2 border-gray-200 rounded-xl p-5 bg-white">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    <FaWrench />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-base mb-1">Μηχανικός</h4>
                    <p className="text-sm text-gray-600">{engineer.displayName || 'N/A'}</p>
                    {acceptedEngineerRequest?.professional?.user?.email && (
                      <p className="text-xs text-gray-500 mt-1">{acceptedEngineerRequest.professional.user.email}</p>
                    )}
                    {engineerParticipant?.user?.email && !acceptedEngineerRequest && (
                      <p className="text-xs text-gray-500 mt-1">{engineerParticipant.user.email}</p>
                    )}
                    <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Επιβεβαιωμένος
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {!lawyer && !notary && !engineer && (
              <EmptyState
                icon={<FaUserTie className="text-2xl" />}
                title="Δεν έχουν επιλεγεί επαγγελματίες ακόμα"
                description="Ο αγοραστής και ο πωλητής δεν έχουν επιλέξει επαγγελματίες για αυτή τη συναλλαγή."
              />
            )}
          </div>
        </CardSection>
      </div>
    );
  }
  
  // Other roles (lawyer, notary) can only view
  if (!isBuyer && !isSellerRole) {
    return (
      <EmptyState
        icon={<FaUserTie className="text-2xl" />}
        title="Μόνο για Αγοραστές και Πωλητές"
        description="Μόνο ο αγοραστής και ο πωλητής μπορούν να επιλέξουν επαγγελματίες για τη συναλλαγή."
      />
    );
  }

  // Get requests data - filter to show only the current user's requests (buyer sees their own, seller sees their own)
  const allRequests = deal.requests || [];
  const requests = allRequests.filter(r => r.requestedById === userId);
  const pendingRequests = requests.filter(r => r.status === 'REQUESTED');
  const acceptedRequests = requests.filter(r => r.status === 'ACCEPTED');
  const declinedRequests = requests.filter(r => r.status === 'DECLINED');

  return (
    <div className="space-y-6">
      {/* Inner Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6" aria-label="Tabs">
          <button
            onClick={() => setActiveInnerTab('requests')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeInnerTab === 'requests'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FaEnvelope />
              <span>Αιτήματα</span>
              {pendingRequests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                  {pendingRequests.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveInnerTab('list')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeInnerTab === 'list'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FaList />
              <span>Λίστα</span>
            </div>
          </button>
          <button
            onClick={() => setActiveInnerTab('appointments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeInnerTab === 'appointments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FaCalendarAlt />
              <span>Ραντεβού</span>
              {appointmentsForView.filter(a => a.status === 'REQUESTED').length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                  {appointmentsForView.filter(a => a.status === 'REQUESTED').length}
                </span>
              )}
            </div>
          </button>
        </nav>
      </div>

      {/* Requests Tab Content */}
      {activeInnerTab === 'requests' && (
        <div className="space-y-6">
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <CardSection title={`Αιτήματα σε Αναμονή (${pendingRequests.length})`}>
              <div className="grid gap-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="border-2 border-yellow-200 rounded-xl p-5 bg-yellow-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${getTypeStyle(request.type as 'LAWYER' | 'NOTARY' | 'ENGINEER')}`}>
                            {getTypeIcon(request.type as 'LAWYER' | 'NOTARY' | 'ENGINEER')}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-base mb-1">
                              {request.professional?.displayName || 'Επαγγελματίας'}
                            </h4>
                            <p className="text-sm text-gray-600 mb-1">
                              {getTypeDisplayLabel(request.type as 'LAWYER' | 'NOTARY' | 'ENGINEER')}
                            </p>
                            {request.message && (
                              <p className="text-sm text-gray-600 mt-2 italic">"{request.message}"</p>
                            )}
                            <span className="inline-block mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                              ⏳ Σε αναμονή
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={async () => {
                            if (confirm('Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτό το αίτημα;')) {
                              try {
                                await cancelProfessionalRequest(deal.id, request.id);
                                toast.success('Το αίτημα ακυρώθηκε επιτυχώς');
                                onRefresh();
                              } catch (error: any) {
                                console.error('Error cancelling request:', error);
                                toast.error(error.message || 'Αποτυχία ακύρωσης αιτήματος');
                              }
                            }
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors shadow-sm hover:shadow flex items-center gap-2"
                        >
                          <FaTimes />
                          Ακύρωση
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardSection>
          )}

          {/* Accepted Requests */}
          {acceptedRequests.length > 0 && (
            <CardSection title={`Αποδεκτά Αιτήματα (${acceptedRequests.length})`}>
              <div className="grid gap-4">
                {acceptedRequests.map((request) => (
                  <div key={request.id} className="border-2 border-green-200 rounded-xl p-5 bg-green-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${getTypeStyle(request.type as 'LAWYER' | 'NOTARY' | 'ENGINEER')}`}>
                            {getTypeIcon(request.type as 'LAWYER' | 'NOTARY' | 'ENGINEER')}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-base mb-1">
                              {request.professional?.displayName || 'Επαγγελματίας'}
                            </h4>
                            <p className="text-sm text-gray-600 mb-1">
                              {getTypeDisplayLabel(request.type as 'LAWYER' | 'NOTARY' | 'ENGINEER')}
                            </p>
                            <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              ✓ Αποδεκτό
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardSection>
          )}

          {/* Declined Requests */}
          {declinedRequests.length > 0 && (
            <CardSection title={`Απορριφθέντα Αιτήματα (${declinedRequests.length})`}>
              <div className="grid gap-4">
                {declinedRequests.map((request) => (
                  <div key={request.id} className="border-2 border-red-200 rounded-xl p-5 bg-red-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${getTypeStyle(request.type as 'LAWYER' | 'NOTARY' | 'ENGINEER')}`}>
                            {getTypeIcon(request.type as 'LAWYER' | 'NOTARY' | 'ENGINEER')}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-base mb-1">
                              {request.professional?.displayName || 'Επαγγελματίας'}
                            </h4>
                            <p className="text-sm text-gray-600 mb-1">
                              {getTypeDisplayLabel(request.type as 'LAWYER' | 'NOTARY' | 'ENGINEER')}
                            </p>
                            <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                              ✗ Απορριφθέν
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardSection>
          )}

          {/* Empty State for Requests */}
          {requests.length === 0 && (
            <CardSection>
              <EmptyState
                icon={<FaEnvelope className="text-2xl" />}
                title="Δεν υπάρχουν αιτήματα"
                description="Δεν έχουν σταλεί αιτήματα σε επαγγελματίες ακόμα. Μεταβείτε στο tab 'Λίστα' για να αναζητήσετε και να στείλετε αιτήματα."
                action={{
                  label: 'Μετάβαση στη Λίστα',
                  onClick: () => setActiveInnerTab('list'),
                }}
              />
            </CardSection>
          )}
        </div>
      )}

      {/* Appointments Tab Content */}
      {activeInnerTab === 'appointments' && (
        <div className="space-y-6">
          {/* Requested Appointments */}
          {appointmentsForView.filter(a => a.status === 'REQUESTED').length > 0 ? (
            <CardSection title={`Αιτήματα Ραντεβού (${appointmentsForView.filter(a => a.status === 'REQUESTED').length})`}>
              <div className="grid gap-4">
                {appointmentsForView
                  .filter(a => a.status === 'REQUESTED')
                  .map((appointment) => {
                    const startDate = new Date(appointment.startAt);
                    const endDate = new Date(appointment.endAt);
                    const professional = deal.requests?.find(r => r.professionalId === appointment.professionalId)?.professional;
                    
                    // Check if appointment is at least 1 day away
                    // Compare dates only (ignore time) - if appointment is tomorrow or later, allow cancellation
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const appointmentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                    const oneDayFromToday = new Date(today);
                    oneDayFromToday.setDate(oneDayFromToday.getDate() + 1);
                    const canCancel = appointmentDate >= oneDayFromToday;
                    
                    return (
                      <div key={appointment.id} className="border-2 border-yellow-200 rounded-xl p-5 bg-yellow-50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${accentIcon} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                                <FaCalendarAlt />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-base mb-1">
                                  {professional?.displayName || appointment.professional?.user?.name || 'Επαγγελματίας'}
                                </h4>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <p className="flex items-center gap-2">
                                    <FaClock className="text-xs" />
                                    <span>
                                      {startDate.toLocaleDateString('el-GR', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                      })}
                                    </span>
                                  </p>
                                  <p className="flex items-center gap-2">
                                    <FaClock className="text-xs" />
                                    <span>
                                      {startDate.toLocaleTimeString('el-GR', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })} - {endDate.toLocaleTimeString('el-GR', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </span>
                                  </p>
                                  <p className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      appointment.type === 'ONLINE' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {appointment.type === 'ONLINE' ? 'Online' : 'Προσωπική Συνάντηση'}
                                    </span>
                                  </p>
                                </div>
                                <span className="inline-block mt-3 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                  ⏳ Σε αναμονή
                                </span>
                                {!canCancel && (
                                  <p className="text-xs text-gray-500 mt-2 italic">
                                    Δεν μπορείτε να ακυρώσετε αυτό το ραντεβού λόγω του ότι είναι λιγότερο από 1 ημέρα πριν
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          {canCancel && (
                            <div className="flex-shrink-0">
                              <button
                                onClick={async () => {
                                  if (confirm('Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτό το ραντεβού;')) {
                                    try {
                                      await cancelAppointment(appointment.id);
                                      toast.success('Το ραντεβού ακυρώθηκε επιτυχώς');
                                      onRefresh();
                                    } catch (error: any) {
                                      console.error('Error cancelling appointment:', error);
                                      toast.error(error.message || 'Αποτυχία ακύρωσης ραντεβού');
                                    }
                                  }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors shadow-sm hover:shadow flex items-center gap-2"
                              >
                                <FaTimes />
                                Ακύρωση
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardSection>
          ) : null}

          {/* Confirmed Appointments */}
          {appointmentsForView.filter(a => a.status === 'CONFIRMED').length > 0 ? (
            <CardSection title={`Προγραμματισμένα Ραντεβού (${appointmentsForView.filter(a => a.status === 'CONFIRMED').length})`}>
              <div className="grid gap-4">
                {appointmentsForView
                  .filter(a => a.status === 'CONFIRMED')
                  .map((appointment) => {
                    const startDate = new Date(appointment.startAt);
                    const endDate = new Date(appointment.endAt);
                    const professional = deal.requests?.find(r => r.professionalId === appointment.professionalId)?.professional;
                    const isUpcoming = startDate > new Date();
                    
                    return (
                      <div key={appointment.id} className={`border-2 rounded-xl p-5 ${
                        isUpcoming 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                                isUpcoming
                                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
                              }`}>
                                <FaCalendarAlt />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-base mb-1">
                                  {professional?.displayName || appointment.professional?.user?.name || 'Επαγγελματίας'}
                                </h4>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <p className="flex items-center gap-2">
                                    <FaClock className="text-xs" />
                                    <span>
                                      {startDate.toLocaleDateString('el-GR', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                      })}
                                    </span>
                                  </p>
                                  <p className="flex items-center gap-2">
                                    <FaClock className="text-xs" />
                                    <span>
                                      {startDate.toLocaleTimeString('el-GR', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })} - {endDate.toLocaleTimeString('el-GR', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </span>
                                  </p>
                                  <p className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      appointment.type === 'ONLINE' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {appointment.type === 'ONLINE' ? 'Online' : 'Προσωπική Συνάντηση'}
                                    </span>
                                  </p>
                                </div>
                                <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium ${
                                  isUpcoming
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {isUpcoming ? '✓ Προγραμματισμένο' : '✓ Ολοκληρωμένο'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardSection>
          ) : null}

          {/* Empty State for Appointments */}
          {(appointmentsForView.length === 0 || 
            (appointmentsForView.filter(a => a.status === 'REQUESTED').length === 0 && 
             appointmentsForView.filter(a => a.status === 'CONFIRMED').length === 0)) && (
            <CardSection>
              <EmptyState
                icon={<FaCalendarAlt className="text-2xl" />}
                title="Δεν υπάρχουν ραντεβού"
                description="Δεν έχετε προγραμματίσει ραντεβού με επαγγελματίες ακόμα. Μεταβείτε στο tab 'Λίστα' για να αναζητήσετε δικηγόρους ή συμβολαιογράφους και να προγραμματίσετε ραντεβού."
                action={{
                  label: 'Προγραμματίστε Ραντεβού',
                  onClick: () => setActiveInnerTab('list'),
                }}
              />
            </CardSection>
          )}
        </div>
      )}

      {/* List Tab Content */}
      {activeInnerTab === 'list' && (
        <div className="space-y-6">
      {/* Professional Type Tabs - Buyers: all 3, Sellers: only Δικηγόροι and Μηχανικοί (no Συμβολαιογράφοι) */}
      {(isBuyer || isSellerRole) && (
        <CardSection>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 flex-wrap">
            <button
              onClick={() => setProfessionalType('LAWYER')}
              className={`flex-1 min-w-[100px] px-4 py-3 rounded-md text-sm font-semibold transition-all ${
                professionalType === 'LAWYER'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaUserTie />
                <span>Δικηγόροι</span>
              </div>
            </button>
            {!isSellerRole && (
              <button
                onClick={() => setProfessionalType('NOTARY')}
                className={`flex-1 min-w-[100px] px-4 py-3 rounded-md text-sm font-semibold transition-all ${
                  professionalType === 'NOTARY'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FaFileContract />
                  <span>Συμβολαιογράφοι</span>
                </div>
              </button>
            )}
            {showEngineersTab && (
              <button
                onClick={() => setProfessionalType('ENGINEER')}
                className={`flex-1 min-w-[100px] px-4 py-3 rounded-md text-sm font-semibold transition-all ${
                  professionalType === 'ENGINEER'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FaWrench />
                  <span>Μηχανικοί</span>
                </div>
              </button>
            )}
          </div>
        </CardSection>
      )}

      {/* Lawyers - Available for both buyers and sellers when LAWYER tab selected */}
      {professionalType === 'LAWYER' && (
      <>
      {/* Seller-only: Add Custom Lawyer - only visible when seller has not yet selected a lawyer */}
      {isSellerRole && !hasSellerRequestForLawyer && (
        <CardSection>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Ο Δικός μου Δικηγόρος</h3>
              <p className="text-sm text-gray-600">
                Μπορείτε να προσθέσετε τον δικό σας δικηγόρο ή να επιλέξετε έναν από τη λίστα
              </p>
            </div>
            <button
              onClick={() => setShowCustomLawyerModal(true)}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <FaPlus />
              Προσθήκη Δικηγόρου
            </button>
          </div>
        </CardSection>
      )}
      <CardSection title={isSellerRole ? "Δικηγόροι - Επιλογή από τη Λίστα" : "Δικηγόροι"}>
        {loading ? (
          <div className="text-center py-8">
            <FaSpinner className="animate-spin text-2xl text-blue-600 mx-auto" />
          </div>
        ) : lawyers.length === 0 ? (
          <EmptyState
            icon={<FaUserTie className="text-2xl" />}
            title="Δεν βρέθηκαν δικηγόροι"
            description="Δεν υπάρχουν διαθέσιμοι δικηγόροι αυτή τη στιγμή."
            action={undefined}
          />
        ) : (
          <div className="grid gap-4">
            {lawyers.map((lawyer) => (
              <div 
                key={lawyer.professionalId} 
                className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all bg-white cursor-pointer"
                onClick={() => {
                  openProfessionalDetails(lawyer);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {lawyer.displayName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-base mb-1">{lawyer.displayName}</h4>
                        {lawyer.officeName && <p className="text-sm text-gray-600 mb-1">{lawyer.officeName}</p>}
                        {lawyer.city && <p className="text-sm text-gray-500 flex items-center gap-1">
                          <FaMapMarkerAlt className="text-xs" />
                          {lawyer.city}
                        </p>}
                        {lawyer.areaTags && lawyer.areaTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {lawyer.areaTags.map((tag, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {isSellerRole && lawyer.professionalId === buyerSelectedLawyerId ? (
                      <span className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        Επιλεγμένος από αγοραστή
                      </span>
                    ) : isBuyer && lawyer.professionalId === sellerSelectedLawyerId ? (
                      <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                        Επιλεγμένος από πωλητή
                      </span>
                    ) : isAccepted(lawyer.professionalId) ? (
                      <>
                        <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          ✓ Αποδεκτό
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentProfessional(lawyer);
                            setShowAppointmentModal(true);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors shadow-sm hover:shadow flex items-center gap-2"
                        >
                          <FaCalendarAlt />
                          Ραντεβού
                        </button>
                      </>
                    ) : isRequested(lawyer.professionalId) ? (
                      <span className="inline-flex items-center px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        ⏳ Σε αναμονή
                      </span>
                    ) : (isSellerRole ? hasSellerRequestForLawyer : hasRequestForType('LAWYER')) ? (
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        Έχετε ήδη κάνει αίτημα
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestClick(lawyer.professionalId, 'LAWYER', lawyer.displayName);
                          }}
                          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm hover:shadow"
                        >
                          Αίτημα
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentProfessional(lawyer);
                            setShowAppointmentModal(true);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors shadow-sm hover:shadow flex items-center gap-2"
                        >
                          <FaCalendarAlt />
                          Ραντεβού
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardSection>
      </>
      )}

      {/* Notaries - Only for buyers */}
      {professionalType === 'NOTARY' && (
        <CardSection title="Συμβολαιογράφοι">
        {loading ? (
          <div className="text-center py-8">
            <FaSpinner className="animate-spin text-2xl text-blue-600 mx-auto" />
          </div>
        ) : notaries.length === 0 ? (
          <EmptyState
            icon={<FaUserTie className="text-2xl" />}
            title="Δεν βρέθηκαν συμβολαιογράφοι"
            description="Δεν υπάρχουν διαθέσιμοι συμβολαιογράφοι αυτή τη στιγμή."
            action={undefined}
          />
        ) : (
          <div className="grid gap-4">
            {notaries.map((notary) => (
              <div 
                key={notary.professionalId} 
                className="border-2 border-gray-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-md transition-all bg-white cursor-pointer"
                onClick={() => {
                  openProfessionalDetails(notary);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {notary.displayName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-base mb-1">{notary.displayName}</h4>
                        {notary.officeName && <p className="text-sm text-gray-600 mb-1">{notary.officeName}</p>}
                        {notary.city && <p className="text-sm text-gray-500 flex items-center gap-1">
                          <FaMapMarkerAlt className="text-xs" />
                          {notary.city}
                        </p>}
                        {notary.areaTags && notary.areaTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {notary.areaTags.map((tag, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-md text-xs font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {isAccepted(notary.professionalId) ? (
                      <>
                        <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          ✓ Αποδεκτό
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentProfessional(notary);
                            setShowAppointmentModal(true);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors shadow-sm hover:shadow flex items-center gap-2"
                        >
                          <FaCalendarAlt />
                          Ραντεβού
                        </button>
                      </>
                    ) : isRequested(notary.professionalId) ? (
                      <span className="inline-flex items-center px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        ⏳ Σε αναμονή
                      </span>
                    ) : hasRequestForType('NOTARY') ? (
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        Έχετε ήδη κάνει αίτημα
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestClick(notary.professionalId, 'NOTARY', notary.displayName);
                          }}
                          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm hover:shadow"
                        >
                          Αίτημα
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentProfessional(notary);
                            setShowAppointmentModal(true);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors shadow-sm hover:shadow flex items-center gap-2"
                        >
                          <FaCalendarAlt />
                          Ραντεβού
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardSection>
      )}

      {/* Engineers - For sellers; for buyers only when rent (hidden when buyer + sale) */}
      {showEngineersTab && professionalType === 'ENGINEER' && (
      <>
      {/* Seller-only: Add Custom Engineer - only visible when seller has not yet selected an engineer */}
      {isSellerRole && !hasRequestForType('ENGINEER') && (
        <CardSection>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Ο Δικός μου Μηχανικός</h3>
              <p className="text-sm text-gray-600">
                Μπορείτε να προσθέσετε τον δικό σας μηχανικό ή να επιλέξετε έναν από τη λίστα
              </p>
            </div>
            <button
              onClick={() => setShowCustomEngineerModal(true)}
              className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <FaPlus />
              Προσθήκη του δικού μου μηχανικού
            </button>
          </div>
        </CardSection>
      )}
        <CardSection title={isSellerRole ? "Μηχανικοί - Επιλογή από τη Λίστα" : "Μηχανικοί"}>
        {loading ? (
          <div className="text-center py-8">
            <FaSpinner className="animate-spin text-2xl text-blue-600 mx-auto" />
          </div>
        ) : engineers.length === 0 ? (
          <EmptyState
            icon={<FaWrench className="text-2xl" />}
            title="Δεν βρέθηκαν μηχανικοί"
            description="Δεν υπάρχουν διαθέσιμοι μηχανικοί αυτή τη στιγμή."
            action={undefined}
          />
        ) : (
          <div className="grid gap-4">
            {engineers.map((engineer) => (
              <div
                key={engineer.professionalId}
                className="border-2 border-gray-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-md transition-all bg-white cursor-pointer"
                onClick={() => {
                  openProfessionalDetails(engineer);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {engineer.displayName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-base mb-1">{engineer.displayName}</h4>
                        {engineer.officeName && <p className="text-sm text-gray-600 mb-1">{engineer.officeName}</p>}
                        {engineer.city && <p className="text-sm text-gray-500 flex items-center gap-1">
                          <FaMapMarkerAlt className="text-xs" />
                          {engineer.city}
                        </p>}
                        {engineer.areaTags && engineer.areaTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {engineer.areaTags.map((tag, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {isAccepted(engineer.professionalId) ? (
                      <>
                        <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          ✓ Αποδεκτό
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentProfessional(engineer);
                            setShowAppointmentModal(true);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors shadow-sm hover:shadow flex items-center gap-2"
                        >
                          <FaCalendarAlt />
                          Ραντεβού
                        </button>
                      </>
                    ) : isRequested(engineer.professionalId) ? (
                      <span className="inline-flex items-center px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        ⏳ Σε αναμονή
                      </span>
                    ) : hasRequestForType('ENGINEER') ? (
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        Έχετε ήδη κάνει αίτημα
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestClick(engineer.professionalId, 'ENGINEER', engineer.displayName);
                          }}
                          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm hover:shadow"
                        >
                          Αίτημα
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentProfessional(engineer);
                            setShowAppointmentModal(true);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors shadow-sm hover:shadow flex items-center gap-2"
                        >
                          <FaCalendarAlt />
                          Ραντεβού
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardSection>
      </>
      )}
        </div>
      )}

      {/* Custom Lawyer Modal for Seller - OTP flow */}
      {showCustomLawyerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {lawyerInviteId ? 'Επιβεβαίωση OTP' : 'Προσθήκη Δικού σας Δικηγόρου'}
              </h3>
              <button onClick={resetLawyerModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {!lawyerInviteId ? (
              <form onSubmit={handleCustomLawyerSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ονοματεπώνυμο <span className="text-red-500">*</span></label>
                  <input type="text" value={customLawyerData.name} onChange={(e) => setCustomLawyerData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={customLawyerData.email} onChange={(e) => setCustomLawyerData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Τηλέφωνο</label>
                  <input type="tel" value={customLawyerData.phone} onChange={(e) => setCustomLawyerData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="π.χ. 2101234567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Αριθμός Μητρώου</label>
                  <input type="text" value={customLawyerData.registrationNumber} onChange={(e) => setCustomLawyerData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="π.χ. 12345" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Αποστολή OTP σε</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="lawyerOtpTo" checked={lawyerSendOtpTo === 'email'} onChange={() => setLawyerSendOtpTo('email')} />
                      <span>Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="lawyerOtpTo" checked={lawyerSendOtpTo === 'phone'} onChange={() => setLawyerSendOtpTo('phone')} />
                      <span>Κινητό</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={lawyerSubmitting} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
                    {lawyerSubmitting ? 'Αποστολή...' : 'Αποστολή OTP'}
                  </button>
                  <button type="button" onClick={resetLawyerModal} className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">
                    Ακύρωση
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCustomLawyerVerify} className="space-y-4">
                <p className="text-sm text-gray-600">Εισάγετε τον κωδικό OTP που στάλθηκε στο {lawyerSendOtpTo === 'email' ? customLawyerData.email : customLawyerData.phone}</p>
                <input type="text" value={lawyerOtpCode} onChange={(e) => setLawyerOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
                  placeholder="Κωδικός OTP" maxLength={8} />
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={lawyerSubmitting || !lawyerOtpCode.trim()} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
                    {lawyerSubmitting ? 'Επαλήθευση...' : 'Επιβεβαίωση'}
                  </button>
                  <button type="button" onClick={() => { setLawyerInviteId(null); setLawyerOtpCode(''); }} className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">
                    Πίσω
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Custom Engineer Modal for Seller - OTP flow */}
      {showCustomEngineerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {engineerInviteId ? 'Επιβεβαίωση OTP' : 'Προσθήκη Δικού σας Μηχανικού'}
              </h3>
              <button onClick={resetEngineerModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {!engineerInviteId ? (
              <form onSubmit={handleCustomEngineerSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ονοματεπώνυμο <span className="text-red-500">*</span></label>
                  <input type="text" value={customEngineerData.name} onChange={(e) => setCustomEngineerData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={customEngineerData.email} onChange={(e) => setCustomEngineerData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Τηλέφωνο</label>
                  <input type="tel" value={customEngineerData.phone} onChange={(e) => setCustomEngineerData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" placeholder="π.χ. 2101234567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Αριθμός Μητρώου</label>
                  <input type="text" value={customEngineerData.registrationNumber} onChange={(e) => setCustomEngineerData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" placeholder="π.χ. 12345" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Αποστολή OTP σε</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="engineerOtpTo" checked={engineerSendOtpTo === 'email'} onChange={() => setEngineerSendOtpTo('email')} />
                      <span>Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="engineerOtpTo" checked={engineerSendOtpTo === 'phone'} onChange={() => setEngineerSendOtpTo('phone')} />
                      <span>Κινητό</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={engineerSubmitting} className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium disabled:opacity-50">
                    {engineerSubmitting ? 'Αποστολή...' : 'Αποστολή OTP'}
                  </button>
                  <button type="button" onClick={resetEngineerModal} className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">
                    Ακύρωση
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCustomEngineerVerify} className="space-y-4">
                <p className="text-sm text-gray-600">Εισάγετε τον κωδικό OTP που στάλθηκε στο {engineerSendOtpTo === 'email' ? customEngineerData.email : customEngineerData.phone}</p>
                <input type="text" value={engineerOtpCode} onChange={(e) => setEngineerOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-center text-lg tracking-widest"
                  placeholder="Κωδικός OTP" maxLength={8} />
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={engineerSubmitting || !engineerOtpCode.trim()} className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium disabled:opacity-50">
                    {engineerSubmitting ? 'Επαλήθευση...' : 'Επιβεβαίωση'}
                  </button>
                  <button type="button" onClick={() => { setEngineerInviteId(null); setEngineerOtpCode(''); }} className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">
                    Πίσω
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Professional Details Modal */}
      {showProfessionalModal && selectedProfessional && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowProfessionalModal(false);
            setSelectedProfessional(null);
            setLoadingProfessionalDetails(false);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Λεπτομέρειες Επαγγελματία</h3>
              <button
                onClick={() => {
                  setShowProfessionalModal(false);
                  setSelectedProfessional(null);
                  setLoadingProfessionalDetails(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {loadingProfessionalDetails && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 flex items-center gap-2 text-blue-700 text-sm">
                  <FaSpinner className="animate-spin" />
                  Φόρτωση στοιχείων από το δημόσιο προφίλ...
                </div>
              )}

              {/* Header Section */}
              <div className="flex items-start gap-4 pb-6 border-b border-gray-200">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 ${getTypeStyle(selectedProfessional.type as 'LAWYER' | 'NOTARY' | 'ENGINEER')}`}>
                  {selectedProfessional.displayName.charAt(0)}
                </div>
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedProfessional.displayName}
                  </h4>
                  <p className="text-lg text-gray-600 mb-2">
                    {getTypeDisplayLabel(selectedProfessional.type as 'LAWYER' | 'NOTARY' | 'ENGINEER')}
                  </p>
                  {selectedProfessional.officeName && (
                    <p className="text-sm text-gray-500 mb-2">
                      {selectedProfessional.officeName}
                    </p>
                  )}
                  {selectedProfessional.city && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <FaMapMarkerAlt className="text-xs" />
                      {selectedProfessional.city}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  {isAccepted(selectedProfessional.professionalId) ? (
                    <>
                      <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        ✓ Αποδεκτό
                      </span>
                      {(isBuyer || isSellerRole) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentProfessional(selectedProfessional);
                            setShowAppointmentModal(true);
                            setShowProfessionalModal(false);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors shadow-sm hover:shadow flex items-center gap-2"
                        >
                          <FaCalendarAlt />
                          Ραντεβού
                        </button>
                      )}
                    </>
                  ) : isRequested(selectedProfessional.professionalId) ? (
                    <span className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      ⏳ Σε αναμονή
                    </span>
                  ) : isBuyer && selectedProfessional.type === 'LAWYER' && selectedProfessional.professionalId === sellerSelectedLawyerId ? (
                    <span className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      Επιλεγμένος από πωλητή
                    </span>
                  ) : (
                    <>
                      {(isBuyer || isSellerRole) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestClick(selectedProfessional.professionalId, selectedProfessional.type as 'LAWYER' | 'NOTARY' | 'ENGINEER', selectedProfessional.displayName);
                            setShowProfessionalModal(false);
                            setSelectedProfessional(null);
                          }}
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm hover:shadow"
                        >
                          Αίτημα
                        </button>
                      )}
                      {(isBuyer || isSellerRole) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentProfessional(selectedProfessional);
                            setShowAppointmentModal(true);
                            setShowProfessionalModal(false);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors shadow-sm hover:shadow flex items-center gap-2"
                        >
                          <FaCalendarAlt />
                          Ραντεβού
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Bio Section */}
              {selectedProfessional.bio ? (
                <div className="space-y-2">
                  <h5 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FaUserTie className="text-blue-600" />
                    Βιογραφικό
                  </h5>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedProfessional.bio}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h5 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FaUserTie className="text-blue-600" />
                    Βιογραφικό
                  </h5>
                  <p className="text-gray-500 italic">
                    Δεν έχει προσθέσει βιογραφικό ακόμα.
                  </p>
                </div>
              )}

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                {/* Address */}
                {selectedProfessional.address && (
                  <div className="space-y-2">
                    <h6 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-gray-500" />
                      Διεύθυνση Γραφείου
                    </h6>
                    <p className="text-sm text-gray-700">{selectedProfessional.address}</p>
                  </div>
                )}

                {/* Languages */}
                {selectedProfessional.languages && selectedProfessional.languages.length > 0 && (
                  <div className="space-y-2">
                    <h6 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FaGlobe className="text-gray-500" />
                      Γλώσσες
                    </h6>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfessional.languages.map((lang, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Area Tags */}
                {selectedProfessional.areaTags && selectedProfessional.areaTags.length > 0 && (
                  <div className="space-y-2">
                    <h6 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-gray-500" />
                      Περιοχές
                    </h6>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfessional.areaTags.map((tag, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meeting Types */}
                {selectedProfessional.meetingTypes && selectedProfessional.meetingTypes.length > 0 && (
                  <div className="space-y-2">
                    <h6 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FaClock className="text-gray-500" />
                      Τύποι Συναντήσεων
                    </h6>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfessional.meetingTypes.map((type, idx) => (
                        <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 rounded-md text-sm">
                          {type === 'ONLINE' ? 'Online' : 'Προσωπική Συνάντηση'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Availability from Public Profile */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <h5 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FaClock className="text-teal-600" />
                  Διαθεσιμότητα
                </h5>
                {selectedProfessional.weeklyRules && selectedProfessional.weeklyRules.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProfessional.weeklyRules
                      .slice()
                      .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))
                      .map((rule, idx) => (
                        <div key={`${rule.weekday}-${rule.start}-${rule.end}-${idx}`} className="flex items-center justify-between rounded-lg border border-teal-100 bg-teal-50 px-3 py-2">
                          <span className="text-sm font-medium text-teal-900">
                            {weekdayToGreek[rule.weekday] || `Ημέρα ${rule.weekday}`}
                          </span>
                          <span className="text-sm text-teal-800">
                            {rule.start} - {rule.end}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Δεν έχει οριστεί διαθεσιμότητα στο δημόσιο προφίλ.</p>
                )}
              </div>

              {/* Reviews Section (Placeholder) */}
              <div className="pt-4 border-t border-gray-200">
                <h5 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <FaStar className="text-yellow-500" />
                  Αξιολογήσεις
                </h5>
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <FaStar className="text-4xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium mb-1">Δεν υπάρχουν αξιολογήσεις ακόμα</p>
                  <p className="text-sm text-gray-500">
                    Οι πελάτες θα μπορούν να αξιολογήσουν τον επαγγελματία μετά την ολοκλήρωση της συναλλαγής.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Booking Modal */}
      {showAppointmentModal && appointmentProfessional && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAppointmentModal(false);
            setAppointmentProfessional(null);
            setAppointmentDate(null);
            setAppointmentStartTime('');
            setAppointmentEndTime('');
            setAppointmentType('ONLINE');
            setAppointmentNote('');
            setAppointmentLocation('');
            setCalendarMonth(new Date());
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Κράτηση Ραντεβού</h3>
              <button
                onClick={() => {
                  setShowAppointmentModal(false);
                  setAppointmentProfessional(null);
                  setAppointmentDate(null);
                  setAppointmentStartTime('');
                  setAppointmentEndTime('');
                  setAppointmentType('ONLINE');
                  setAppointmentNote('');
                  setAppointmentLocation('');
                  setCalendarMonth(new Date());
                  setShowCustomDatePicker(false);
                  setProfessionalAvailability(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Professional Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${getTypeStyle(appointmentProfessional.type as 'LAWYER' | 'NOTARY' | 'ENGINEER')}`}>
                    {appointmentProfessional.displayName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {appointmentProfessional.displayName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {getTypeDisplayLabel(appointmentProfessional.type as 'LAWYER' | 'NOTARY' | 'ENGINEER')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Loading Availability */}
              {loadingAvailability && (
                <div className="text-center py-4">
                  <FaSpinner className="animate-spin text-blue-600 mx-auto text-xl" />
                  <p className="text-sm text-gray-600 mt-2">Φόρτωση διαθεσιμότητας...</p>
                </div>
              )}

              {/* Show Professional Availability Info */}
              {!loadingAvailability && professionalAvailability && professionalAvailability.weeklyRules && professionalAvailability.weeklyRules.length > 0 && !showCustomDatePicker && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-start gap-3">
                    <FaClock className="text-green-600 text-xl flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">Διαθέσιμες Ημέρες & Ώρες</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Ημέρες:</p>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const dayNumberToGreek: Record<number, string> = {
                                0: 'Κυριακή',
                                1: 'Δευτέρα',
                                2: 'Τρίτη',
                                3: 'Τετάρτη',
                                4: 'Πέμπτη',
                                5: 'Παρασκευή',
                                6: 'Σάββατο',
                              };
                              const availableDays = Array.from(new Set(professionalAvailability.weeklyRules!.map(r => r.weekday)));
                              return availableDays.map((dayNum) => (
                                <span key={dayNum} className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                                  {dayNumberToGreek[dayNum]}
                                </span>
                              ));
                            })()}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Ώρες:</p>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const timeSlots = new Set<string>();
                              professionalAvailability.weeklyRules!.forEach(rule => {
                                // Generate time slots from start to end (hourly)
                                const [startHour, startMin] = rule.start.split(':').map(Number);
                                const [endHour, endMin] = rule.end.split(':').map(Number);
                                let currentHour = startHour;
                                while (currentHour < endHour || (currentHour === endHour && startMin === 0)) {
                                  timeSlots.add(`${currentHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`);
                                  currentHour++;
                                }
                              });
                              return Array.from(timeSlots).sort().map((time) => (
                                <span key={time} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium">
                                  {time}
                                </span>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Date Proposal Button */}
              {!loadingAvailability && professionalAvailability && professionalAvailability.weeklyRules && professionalAvailability.weeklyRules.length > 0 && !showCustomDatePicker && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomDatePicker(true);
                    setAppointmentDate(null);
                    setAppointmentStartTime('');
                    setAppointmentEndTime('');
                  }}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors border-2 border-gray-300 hover:border-gray-400 flex items-center justify-center gap-2"
                >
                  <FaCalendarAlt /> Προσθήκη δικής μου ημερομηνίας/ώρας
                </button>
              )}

              {/* Date Selection with Custom Calendar */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Ημερομηνία <span className="text-red-500">*</span>
                </label>
                
                {/* Quick Date Selection - Only show if custom mode or no availability */}
                {(showCustomDatePicker || !professionalAvailability || !professionalAvailability.weeklyRules || professionalAvailability.weeklyRules.length === 0) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        setAppointmentDate(today);
                        setCalendarMonth(today);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        appointmentDate && isToday(appointmentDate)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Σήμερα
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tomorrow = addDays(new Date(), 1);
                        tomorrow.setHours(0, 0, 0, 0);
                        setAppointmentDate(tomorrow);
                        setCalendarMonth(tomorrow);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        appointmentDate && isSameDay(appointmentDate, addDays(new Date(), 1))
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Αύριο
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextWeek = addDays(new Date(), 7);
                        nextWeek.setHours(0, 0, 0, 0);
                        setAppointmentDate(nextWeek);
                        setCalendarMonth(nextWeek);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        appointmentDate && isSameDay(appointmentDate, addDays(new Date(), 7))
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Σε 7 ημέρες
                    </button>
                  </div>
                )}

                {/* Custom Calendar */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FaChevronLeft className="text-gray-600" />
                    </button>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {format(calendarMonth, 'MMMM yyyy', { locale: el })}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FaChevronRight className="text-gray-600" />
                    </button>
                  </div>

                  {/* Calendar Days Header */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'].map((day, idx) => (
                      <div key={idx} className="text-center text-xs font-semibold text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const monthStart = startOfMonth(calendarMonth);
                      const monthEnd = endOfMonth(calendarMonth);
                      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
                      const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
                      const days = eachDayOfInterval({ start: startDate, end: endDate });
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      return days.map((day, idx) => {
                        const isPastDay = isPast(day) && !isToday(day);
                        const isSelected = appointmentDate && isSameDay(day, appointmentDate);
                        const isTodayDate = isToday(day);
                        const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                        
                        // Check if day is available based on professional availability
                        let isAvailable = true;
                        if (!showCustomDatePicker && professionalAvailability?.weeklyRules && professionalAvailability.weeklyRules.length > 0) {
                          const dayOfWeek = getDay(day);
                          isAvailable = professionalAvailability.weeklyRules.some(rule => rule.weekday === dayOfWeek);
                        }

                        const isDisabled = isPastDay || (!showCustomDatePicker && professionalAvailability?.weeklyRules && professionalAvailability.weeklyRules.length > 0 && !isAvailable);

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (!isDisabled) {
                                const selectedDate = new Date(day);
                                selectedDate.setHours(0, 0, 0, 0);
                                setAppointmentDate(selectedDate);
                              }
                            }}
                            disabled={isDisabled}
                            className={`
                              aspect-square p-2 rounded-lg text-sm font-medium transition-all
                              ${isDisabled
                                ? 'text-gray-300 cursor-not-allowed opacity-50' 
                                : 'hover:bg-blue-50 cursor-pointer'
                              }
                              ${isSelected 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : isTodayDate && !isDisabled
                                  ? 'bg-blue-100 text-blue-700 font-bold' 
                                  : !isCurrentMonth
                                    ? 'text-gray-400 opacity-50'
                                    : 'text-gray-700'
                              }
                            `}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {/* Quick Date Selection - Show available dates when not in custom mode */}
                  {!showCustomDatePicker && professionalAvailability?.weeklyRules && professionalAvailability.weeklyRules.length > 0 && (() => {
                    const availableDayNumbers = Array.from(new Set(professionalAvailability.weeklyRules!.map(r => r.weekday)));
                    const today = new Date();
                    const endDate = addDays(today, 56); // 8 weeks ahead
                    const availableDates: Date[] = [];
                    let currentDate = new Date(today);
                    
                    while (currentDate <= endDate && availableDates.length < 10) {
                      const dayOfWeek = getDay(currentDate);
                      if (availableDayNumbers.includes(dayOfWeek) && !isPast(currentDate)) {
                        availableDates.push(new Date(currentDate));
                      }
                      currentDate = addDays(currentDate, 1);
                    }

                    if (availableDates.length > 0) {
                      return (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Διαθέσιμες ημερομηνίες:</p>
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {availableDates.map((date) => {
                              const isSelected = appointmentDate && isSameDay(date, appointmentDate);
                              return (
                                <button
                                  key={date.toISOString()}
                                  type="button"
                                  onClick={() => {
                                    const selectedDate = new Date(date);
                                    selectedDate.setHours(0, 0, 0, 0);
                                    setAppointmentDate(selectedDate);
                                    setCalendarMonth(date);
                                  }}
                                  className={`
                                    px-3 py-1.5 rounded-lg text-xs font-medium
                                    transition-all duration-200
                                    ${
                                      isSelected
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                                    }
                                  `}
                                >
                                  {format(date, 'd MMM', { locale: el })}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Time Selection with Time Slots */}
              {appointmentDate && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Ώρα <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Time Slots - Use professional availability or default slots */}
                  <div className="grid grid-cols-3 gap-2">
                    {(() => {
                      let availableTimeSlots: string[] = [];
                      
                      if (!showCustomDatePicker && professionalAvailability?.weeklyRules && professionalAvailability.weeklyRules.length > 0 && appointmentDate) {
                        // Get available time slots for selected day
                        const dayOfWeek = getDay(appointmentDate);
                        const dayRules = professionalAvailability.weeklyRules.filter(rule => rule.weekday === dayOfWeek);
                        
                        if (dayRules.length > 0) {
                          const timeSlots = new Set<string>();
                          dayRules.forEach(rule => {
                            // Generate time slots from start to end (hourly)
                            const [startHour, startMin] = rule.start.split(':').map(Number);
                            const [endHour, endMin] = rule.end.split(':').map(Number);
                            let currentHour = startHour;
                            while (currentHour < endHour || (currentHour === endHour && startMin === 0)) {
                              timeSlots.add(`${currentHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`);
                              currentHour++;
                            }
                          });
                          availableTimeSlots = Array.from(timeSlots).sort();
                        } else {
                          // No availability for this day, show default slots
                          availableTimeSlots = [
                            '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
                            '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
                          ];
                        }
                      } else {
                        // Custom mode or no availability - show default slots
                        availableTimeSlots = [
                          '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
                          '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
                        ];
                      }

                      return availableTimeSlots.map((time) => {
                        const isSelected = appointmentStartTime === time;
                        const [hours, minutes] = time.split(':').map(Number);
                        const slotDate = new Date(appointmentDate);
                        slotDate.setHours(hours, minutes, 0, 0);
                        const isPastSlot = slotDate < new Date();

                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => {
                              if (!isPastSlot) {
                                setAppointmentStartTime(time);
                                // Auto-set end time to 1 hour later
                                const endHours = hours + 1;
                                setAppointmentEndTime(`${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
                              }
                            }}
                            disabled={isPastSlot}
                            className={`
                              px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                              ${isPastSlot 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : isSelected
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }
                            `}
                          >
                            {time}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {/* Custom Time Input (Fallback) */}
                  <div className="mt-4">
                    <label className="block text-xs text-gray-600 mb-1">
                      Προσαρμοσμένη ώρα έναρξης
                    </label>
                    <input
                      type="time"
                      value={appointmentStartTime}
                      onChange={(e) => {
                        setAppointmentStartTime(e.target.value);
                        // Auto-set end time to 1 hour later
                        if (e.target.value) {
                          const [hours, minutes] = e.target.value.split(':').map(Number);
                          const endHours = hours + 1;
                          setAppointmentEndTime(`${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Appointment Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Τύπος Ραντεβού <span className="text-red-500">*</span>
                </label>
                {appointmentProfessional.meetingTypes && appointmentProfessional.meetingTypes.length > 0 ? (
                  <div className="space-y-2">
                    {appointmentProfessional.meetingTypes.includes('ONLINE') && (
                      <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="appointmentType"
                          value="ONLINE"
                          checked={appointmentType === 'ONLINE'}
                          onChange={(e) => setAppointmentType(e.target.value as 'ONLINE' | 'IN_PERSON')}
                          className="mr-3"
                        />
                        <div>
                          <span className="font-medium text-gray-900">Online</span>
                          <p className="text-sm text-gray-500">Συνάντηση μέσω video call</p>
                        </div>
                      </label>
                    )}
                    {appointmentProfessional.meetingTypes.includes('IN_PERSON') && (
                      <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="appointmentType"
                          value="IN_PERSON"
                          checked={appointmentType === 'IN_PERSON'}
                          onChange={(e) => setAppointmentType(e.target.value as 'ONLINE' | 'IN_PERSON')}
                          className="mr-3"
                        />
                        <div>
                          <span className="font-medium text-gray-900">Προσωπική Συνάντηση</span>
                          <p className="text-sm text-gray-500">Συνάντηση στο γραφείο</p>
                        </div>
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">
                      Ο επαγγελματίας δεν έχει ορίσει τύπους συναντήσεων. Μπορείτε να επιλέξετε οποιονδήποτε τύπο.
                    </p>
                    <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="appointmentType"
                        value="ONLINE"
                        checked={appointmentType === 'ONLINE'}
                        onChange={(e) => setAppointmentType(e.target.value as 'ONLINE' | 'IN_PERSON')}
                        className="mr-3"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Online</span>
                        <p className="text-sm text-gray-500">Συνάντηση μέσω video call</p>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="appointmentType"
                        value="IN_PERSON"
                        checked={appointmentType === 'IN_PERSON'}
                        onChange={(e) => setAppointmentType(e.target.value as 'ONLINE' | 'IN_PERSON')}
                        className="mr-3"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Προσωπική Συνάντηση</span>
                        <p className="text-sm text-gray-500">Συνάντηση στο γραφείο</p>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Professional Location Info (if IN_PERSON) */}
              {appointmentType === 'IN_PERSON' && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <FaMapMarkerAlt className="text-blue-600 text-lg flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 mb-2">Τοποθεσία Συνάντησης</h5>
                      {appointmentProfessional.officeName && (
                        <p className="text-sm text-gray-700 font-medium mb-1">{appointmentProfessional.officeName}</p>
                      )}
                      {appointmentProfessional.address && (
                        <p className="text-sm text-gray-700 mb-1">{appointmentProfessional.address}</p>
                      )}
                      {appointmentProfessional.city && (
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <FaMapMarkerAlt className="text-xs" />
                          {appointmentProfessional.city}
                          {appointmentProfessional.areaTags && appointmentProfessional.areaTags.length > 0 && (
                            <span className="text-gray-500">• {appointmentProfessional.areaTags.join(', ')}</span>
                          )}
                        </p>
                      )}
                      {!appointmentProfessional.officeName && !appointmentProfessional.address && !appointmentProfessional.city && (
                        <p className="text-sm text-gray-500 italic">Δεν έχει οριστεί τοποθεσία</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Σημείωση (Προαιρετικό)
                </label>
                <textarea
                  value={appointmentNote}
                  onChange={(e) => setAppointmentNote(e.target.value)}
                  placeholder="Προσθέστε οποιαδήποτε επιπλέον πληροφορία..."
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                {/* Location Input (only if note is provided and IN_PERSON) */}
                {appointmentType === 'IN_PERSON' && appointmentNote.trim().length > 0 && (
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Εναλλακτική Τοποθεσία (Προαιρετικό)
                    </label>
                    <input
                      type="text"
                      value={appointmentLocation}
                      onChange={(e) => setAppointmentLocation(e.target.value)}
                      placeholder="Π.χ. Διεύθυνση γραφείου (αν διαφέρει από την προεπιλεγμένη)"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={async () => {
                    if (!appointmentDate || !appointmentStartTime || !appointmentEndTime) {
                      toast.error('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία');
                      return;
                    }

                    // Allow booking even if professional hasn't set meeting types
                    // If they have set types, validate against them
                    if (appointmentProfessional.meetingTypes && appointmentProfessional.meetingTypes.length > 0) {
                      if (!appointmentProfessional.meetingTypes.includes(appointmentType)) {
                        toast.error('Ο επαγγελματίας δεν υποστηρίζει αυτόν τον τύπο συνάντησης');
                        return;
                      }
                    }

                    try {
                      setSubmittingAppointment(true);
                      
                      // Combine date and time
                      const startDateTime = new Date(appointmentDate);
                      const [startHours, startMinutes] = appointmentStartTime.split(':').map(Number);
                      startDateTime.setHours(startHours, startMinutes, 0, 0);

                      const endDateTime = new Date(appointmentDate);
                      const [endHours, endMinutes] = appointmentEndTime.split(':').map(Number);
                      endDateTime.setHours(endHours, endMinutes, 0, 0);

                      if (startDateTime >= endDateTime) {
                        toast.error('Η ώρα έναρξης πρέπει να είναι πριν την ώρα λήξης');
                        setSubmittingAppointment(false);
                        return;
                      }

                      if (startDateTime < new Date()) {
                        toast.error('Δεν μπορείτε να κλείσετε ραντεβού στο παρελθόν');
                        setSubmittingAppointment(false);
                        return;
                      }

                      await requestAppointment(deal.id, {
                        professionalId: appointmentProfessional.professionalId,
                        startAt: startDateTime.toISOString(),
                        endAt: endDateTime.toISOString(),
                        type: appointmentType,
                        note: appointmentNote || undefined,
                        location: appointmentType === 'IN_PERSON' ? appointmentLocation || undefined : undefined,
                      });

                      toast.success('Το ραντεβού ζητήθηκε επιτυχώς');
                      setShowAppointmentModal(false);
                      setAppointmentProfessional(null);
                      setAppointmentDate(null);
                      setAppointmentStartTime('');
                      setAppointmentEndTime('');
                      setAppointmentType('ONLINE');
                      setAppointmentNote('');
                      setAppointmentLocation('');
                      setCalendarMonth(new Date());
                      setShowCustomDatePicker(false);
                      setProfessionalAvailability(null);
                      onRefresh();
                    } catch (error: any) {
                      console.error('Error requesting appointment:', error);
                      toast.error(error.message || 'Αποτυχία κράτησης ραντεβού');
                    } finally {
                      setSubmittingAppointment(false);
                    }
                  }}
                  disabled={submittingAppointment}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submittingAppointment ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Αποστολή...
                    </>
                  ) : (
                    <>
                      <FaCalendarAlt />
                      Κράτηση Ραντεβού
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAppointmentModal(false);
                    setAppointmentProfessional(null);
                    setAppointmentDate(null);
                    setAppointmentStartTime('');
                    setAppointmentEndTime('');
                    setAppointmentType('ONLINE');
                    setAppointmentNote('');
                    setAppointmentLocation('');
                    setCalendarMonth(new Date());
                    setShowCustomDatePicker(false);
                    setProfessionalAvailability(null);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                >
                  Ακύρωση
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Confirmation Modal */}
      {showRequestConfirmation && pendingRequestProfessional && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowRequestConfirmation(false);
            setPendingRequestProfessional(null);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FaEnvelope className="text-blue-600 text-xl" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">Επιβεβαίωση Αιτήματος</h3>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-3">
                  Θέλετε να στείλετε αίτημα στον <strong>{pendingRequestProfessional.name}</strong>;
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm text-blue-900">
                    <strong>Σημαντικό:</strong> Μπορείτε να κάνετε αίτημα μόνο σε έναν {getTypeLabel(pendingRequestProfessional.type)} τη φορά.
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    Αν αυτός ο επαγγελματίας απορρίψει το αίτημά σας, τότε θα μπορείτε να κάνετε αίτημα σε άλλο {getTypeLabel(pendingRequestProfessional.type)}.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmRequest}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <FaEnvelope />
                  Ναι, Στείλε Αίτημα
                </button>
                <button
                  onClick={() => {
                    setShowRequestConfirmation(false);
                    setPendingRequestProfessional(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                >
                  Ακύρωση
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

