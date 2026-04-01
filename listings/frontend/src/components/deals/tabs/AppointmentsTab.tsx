'use client';

import { useState, useEffect, useMemo } from 'react';
import { DealRoom } from '@/lib/api/deals';
import {
  DealAppointment,
  cancelAppointment,
  notifyDealSigningAppointmentsChanged,
} from '@/lib/api/dealAppointments';
import { toast } from 'react-hot-toast';
import { FaSpinner, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaClock, FaTimes, FaChevronLeft, FaChevronRight, FaMapMarkerAlt, FaInfoCircle, FaUser, FaArrowRight } from 'react-icons/fa';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { useSession } from 'next-auth/react';
import EmptyState from '../ui/EmptyState';
import CardSection from '../ui/CardSection';
import { format, isSameDay, isToday, isPast, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, setHours, setMinutes, addMinutes, addDays, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { el } from 'date-fns/locale';
import { apiClient } from '@/lib/api/client';
import { VisitSettings } from '@/types/visit-settings';
import { AnimatePresence, motion } from 'framer-motion';
import { Appointment as SellerAppointment } from '../SellerAppointmentsList';
import { AppointmentDetailsModal } from '@/components/appointments/AppointmentDetailsModal';
import { isBuyer, isSeller, isAgent, isNotary } from '@/lib/utils/dealRole';
import { useDealRoomTheme } from '../useDealRoomTheme';
import { fetchFromBackend } from '@/lib/api/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { getMyProfessionalProfile } from '@/lib/api/professionalsOnboarding';
import DealConfirmDialog from '../ui/DealConfirmDialog';

interface AppointmentsTabProps {
  deal: DealRoom;
  onRefresh: () => void;
  isBuyerFromGreece?: boolean;
  openModal?: string; // από header CTA: requestAppointment
}

interface ViewingRequest {
  id: string;
  propertyId: string;
  buyerId: string;
  date: string;
  time: string;
  endTime: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  comment?: string;
  createdAt: string;
  updatedAt: string;
  property: {
    id: string;
    title: string;
    street: string;
    number: string;
    city: string;
    state: string;
    price: number;
    images: string[];
    user?: {
      id: string;
      name: string;
      email: string;
      phone?: string;
    };
  };
  buyer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export default function AppointmentsTab({ deal, onRefresh, isBuyerFromGreece = true, openModal }: AppointmentsTabProps) {
  const { userId } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accentGradient, accentHover, accentIcon, isProfessionalContext } = useDealRoomTheme();
  const { data: session } = useSession();
  const [appointments, setAppointments] = useState<DealAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Άνοιγμα modal αιτήματος ραντεβού από header CTA (openModal param)
  useEffect(() => {
    if (openModal === 'requestAppointment' && searchParams) {
      setShowRequestModal(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('openModal');
      const qs = params.toString();
      router.replace(`/deals/${deal.id}${qs ? `?${qs}` : ''}`, { scroll: false });
    }
  }, [openModal, deal.id, router, searchParams]);

  // Log buyer country status for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AppointmentsTab] Buyer from Greece:', isBuyerFromGreece);
    }
  }, [isBuyerFromGreece]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [visitSettings, setVisitSettings] = useState<VisitSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [lastAppointment, setLastAppointment] = useState<ViewingRequest | null>(null);
  const [sellerAppointments, setSellerAppointments] = useState<SellerAppointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<SellerAppointment | null>(null);
  const [isAppointmentDetailsModalOpen, setIsAppointmentDetailsModalOpen] = useState(false);
  const [dealAppointments, setDealAppointments] = useState<any[]>([]);
  const [loadingDealAppointments, setLoadingDealAppointments] = useState(false);
  const [showNotaryAvailabilityModal, setShowNotaryAvailabilityModal] = useState(false);
  const [notaryAvailableSlots, setNotaryAvailableSlots] = useState<Array<{ date: string; startTime: string; endTime: string }>>([]);
  const [isSavingNotaryAvailability, setIsSavingNotaryAvailability] = useState(false);
  const [isLoadingProfileAvailability, setIsLoadingProfileAvailability] = useState(false);
  const [notaryAvailabilityMonth, setNotaryAvailabilityMonth] = useState<Date>(new Date());
  const [selectedNotaryAvailabilityDate, setSelectedNotaryAvailabilityDate] = useState<Date>(new Date());
  const [isNotaryConfirming, setIsNotaryConfirming] = useState<string | null>(null);
  const [isNotaryRejecting, setIsNotaryRejecting] = useState<string | null>(null);
  const [withdrawingOwnSigningId, setWithdrawingOwnSigningId] = useState<string | null>(null);
  const [sellerWithdrawConfirmId, setSellerWithdrawConfirmId] = useState<string | null>(null);
  const [buyerTabRejectSellerConfirmId, setBuyerTabRejectSellerConfirmId] = useState<string | null>(null);
  const [buyerTabApprovingSellerId, setBuyerTabApprovingSellerId] = useState<string | null>(null);
  const [buyerTabRejectingSellerId, setBuyerTabRejectingSellerId] = useState<string | null>(null);

  // Check user role based on property ownership
  const isBuyerRole = isBuyer(deal, userId);
  const isSellerRole = isSeller(deal, userId);
  const isAgentRole = isAgent(deal, userId);
  const isNotaryRole = isNotary(deal, userId);

  // Buyer ID for this deal - from deal.buyerId or participants (backend may omit buyerId)
  const dealBuyerId = deal.buyerId || deal.participants?.find(p => p.role === 'BUYER')?.userId;
  const dealSellerUserId =
    deal.sellerId || deal.participants?.find((p) => p.role === 'SELLER')?.userId;

  const buyerSigningDealRows = useMemo(
    () =>
      dealAppointments.filter(
        (a: any) =>
          a.type === 'IN_PERSON' &&
          a.note !== 'AVAILABLE_SLOT' &&
          (a.status === 'REQUESTED' || a.status === 'CONFIRMED')
      ),
    [dealAppointments]
  );

  const buyerSigningConfirmedApt = useMemo(
    () => buyerSigningDealRows.find((a: any) => a.status === 'CONFIRMED'),
    [buyerSigningDealRows]
  );
  const buyerSigningPendingList = useMemo(
    () => buyerSigningDealRows.filter((a: any) => a.status === 'REQUESTED'),
    [buyerSigningDealRows]
  );

  // Fetch seller appointments - ONLY for this deal's buyer (not from other deal rooms)
  const fetchSellerAppointments = async () => {
    if (!deal.propertyId || !dealBuyerId) return;
    try {
      setLoading(true);
      const { data } = await apiClient.get('/seller/appointments', {
        params: {
          propertyId: deal.propertyId,
          buyerId: dealBuyerId, // Only appointments from the buyer in THIS deal room
        },
      });
      
      if (data.appointments) {
        const mappedAppointments: SellerAppointment[] = data.appointments
          .filter((a: any) => a.buyerId === dealBuyerId) // Client-side safety filter
          .map((a: any) => ({
          _id: a.id || a._id,
          id: a.id || a._id,
          propertyId: a.propertyId,
          propertyTitle: a.property?.title || deal.property?.title || '',
          buyerId: a.buyerId,
          buyer: {
            name: a.buyer?.name || '',
            email: a.buyer?.email || ''
          },
          date: a.date,
          time: a.time || (a.date ? new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
          status: a.status?.toLowerCase() === 'accepted' ? 'accepted' : a.status?.toLowerCase() === 'rejected' ? 'rejected' : 'pending',
          notes: a.comment || a.notes || '',
          submittedByBuyer: true,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt
        }));
        
        setSellerAppointments(mappedAppointments);
      }
    } catch (err: any) {
      console.error('Error fetching seller appointments:', err);
      toast.error(err.response?.data?.error || err.message || 'Αποτυχία φόρτωσης ραντεβού');
      setSellerAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDealAppointments = async () => {
    if (!deal.id) return;
    setLoadingDealAppointments(true);
    try {
      const res = await fetchFromBackend(`/deals/${deal.id}/appointments`);
      if (res.ok) {
        const d = await res.json();
        setDealAppointments(d.appointments || []);
      }
    } catch (e) {
      console.error(e);
      setDealAppointments([]);
    } finally {
      setLoadingDealAppointments(false);
    }
  };

  const executeSellerWithdrawSigningProposal = async (appointmentId: string) => {
    setWithdrawingOwnSigningId(appointmentId);
    try {
      await cancelAppointment(appointmentId);
      toast.success('Η πρόταση αποσύρθηκε.');
      notifyDealSigningAppointmentsChanged(deal.id);
      await fetchDealAppointments();
      onRefresh();
      setSellerWithdrawConfirmId(null);
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα');
    } finally {
      setWithdrawingOwnSigningId(null);
    }
  };

  const handleBuyerTabApproveSellerSigning = async (appointmentId: string) => {
    setBuyerTabApprovingSellerId(appointmentId);
    try {
      const res = await fetchFromBackend(`/deals/${deal.id}/appointments/${appointmentId}/buyer-approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Σφάλμα');
      }
      toast.success('Η πρόταση εγκρίθηκε. Ο συμβολαιογράφος θα την επιβεβαιώσει.');
      notifyDealSigningAppointmentsChanged(deal.id);
      await fetchDealAppointments();
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα');
    } finally {
      setBuyerTabApprovingSellerId(null);
    }
  };

  const executeBuyerTabRejectSellerSigning = async (appointmentId: string) => {
    setBuyerTabRejectingSellerId(appointmentId);
    try {
      const res = await fetchFromBackend(`/deals/${deal.id}/appointments/${appointmentId}/buyer-reject`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Σφάλμα');
      }
      toast.success('Η πρόταση απορρίφθηκε.');
      setBuyerTabRejectSellerConfirmId(null);
      notifyDealSigningAppointmentsChanged(deal.id);
      await fetchDealAppointments();
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα');
    } finally {
      setBuyerTabRejectingSellerId(null);
    }
  };

  useEffect(() => {
    if (deal.propertyId && (isBuyerRole || isSellerRole || isAgentRole)) {
      if (isBuyerRole) {
        fetchAppointments();
        fetchVisitSettings();
        fetchLastAppointment();
      } else if ((isSellerRole || isAgentRole) && dealBuyerId) {
        fetchSellerAppointments();
      }
    }
    if ((isNotaryRole || isSellerRole || isAgentRole || isBuyerRole) && deal.id) {
      fetchDealAppointments();
    }
  }, [deal.id, deal.propertyId, dealBuyerId, userId, isBuyerRole, isSellerRole, isAgentRole, isNotaryRole]);

  useEffect(() => {
    const onSigningChanged = (e: Event) => {
      const ce = e as CustomEvent<{ dealId?: string }>;
      if (ce.detail?.dealId !== deal.id) return;
      if (isNotaryRole || isSellerRole || isAgentRole || isBuyerRole) {
        fetchDealAppointments();
      }
    };
    if (typeof window === 'undefined') return;
    window.addEventListener('dealSigningAppointmentsChanged', onSigningChanged);
    return () => window.removeEventListener('dealSigningAppointmentsChanged', onSigningChanged);
  }, [deal.id, isNotaryRole, isSellerRole, isAgentRole, isBuyerRole]);

  const fetchVisitSettings = async () => {
    if (!deal.propertyId) return;
    setLoadingSettings(true);
    try {
      const response = await apiClient.get(`/seller/properties/${deal.propertyId}/visit-settings`);
      setVisitSettings(response.data);
    } catch (error: any) {
      console.error('Error fetching visit settings:', error);
      // If visit settings don't exist, that's okay - we'll allow custom date proposals
      setVisitSettings(null);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchLastAppointment = async () => {
    if (!session?.user?.id || !deal.propertyId) return;
    try {
      const response = await apiClient.get(`/seller/appointments`, {
        params: {
          buyerId: session.user.id,
          propertyId: deal.propertyId,
        },
      });
      
      if (response.data.appointments && response.data.appointments.length > 0) {
        // Find the most recent appointment
        const lastApp = response.data.appointments.reduce((latest: ViewingRequest, current: ViewingRequest) => {
          return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
        });
        setLastAppointment(lastApp);
      } else {
        setLastAppointment(null);
      }
    } catch (error: any) {
      console.error('Error fetching last appointment:', error);
      setLastAppointment(null);
    }
  };

  const fetchAppointments = async () => {
    if (!deal.propertyId || !userId) return;
    try {
      setLoading(true);
      const response = await apiClient.get(`/seller/appointments`, {
        params: {
          propertyId: deal.propertyId,
          buyerId: userId,
        },
      });

      // Transform ViewingRequest to DealAppointment format
      const transformedAppointments: DealAppointment[] = (response.data.appointments || []).map((apt: ViewingRequest) => {
        const [startHour, startMinute] = apt.time.split(':').map(Number);
        const [endHour, endMinute] = apt.endTime.split(':').map(Number);

        const startDate = setMinutes(setHours(new Date(apt.date), startHour), startMinute);
        const endDate = setMinutes(setHours(new Date(apt.date), endHour), endMinute);

        let status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' = 'REQUESTED';
        if (apt.status === 'ACCEPTED') status = 'CONFIRMED';
        if (apt.status === 'REJECTED' || apt.status === 'CANCELLED') status = 'CANCELLED';

        return {
          id: apt.id,
          dealRoomId: deal.id,
          professionalId: '',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          type: 'Επίσκεψη Ακινήτου',
          status: status,
          note: apt.comment || '',
          createdAt: apt.createdAt,
          professional: undefined,
        };
      });

      setAppointments(transformedAppointments);
      
      // Trigger a custom event to notify other components about appointment changes
      // This helps BuyersPurchaseGuide and DealNextActionCard update immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appointmentsUpdated', {
          detail: { propertyId: deal.propertyId, appointments: transformedAppointments }
        }));
      }
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      toast.error(error.response?.data?.error || error.message || 'Αποτυχία φόρτωσης ραντεβού');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (date: Date, comment?: string) => {
    try {
      // Use the same API endpoint as buyer dashboard
      await apiClient.post(`/appointments/${deal.propertyId}`, {
        status: 'custom_date',
        date: date.toISOString(),
        comment: comment || '',
      });

      toast.success('Το αίτημα ραντεβού στάλθηκε επιτυχώς!');
      setShowRequestModal(false);
      await fetchAppointments();
      await fetchLastAppointment();
      onRefresh();
    } catch (error: any) {
      console.error('Error requesting appointment:', error);
      toast.error(error.response?.data?.error || error.message || 'Αποτυχία αποστολής αιτήματος');
    }
  };

  const handleCancel = async (appointmentId: string) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτό το ραντεβού;')) {
      return;
    }
    try {
      await apiClient.put(`/appointments/buyer/${appointmentId}/status`, {
        status: 'CANCELLED',
      });

      toast.success('Το ραντεβού ακυρώθηκε');
      await fetchAppointments();
      await fetchLastAppointment();
      onRefresh();
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      toast.error(error.response?.data?.error || error.message || 'Αποτυχία ακύρωσης');
    }
  };

  // Seller appointment handlers
  const handleSellerAppointmentAction = async (appointmentId: string, action: 'approve' | 'reject') => {
    try {
      const { data } = await apiClient.put(`/seller/appointments/${appointmentId}/status`, { 
        status: action === 'approve' ? 'ACCEPTED' : 'REJECTED' 
      });

      setSellerAppointments(prevAppointments =>
        prevAppointments.map(app =>
          (app.id === appointmentId || app._id === appointmentId)
            ? { ...app, status: action === 'approve' ? 'accepted' : 'rejected' }
            : app
        )
      );

      toast.success(`Το ραντεβού ${action === 'approve' ? 'εγκρίθηκε' : 'απορρίφθηκε'} επιτυχώς`);
      fetchSellerAppointments();
      onRefresh();
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast.error(error.response?.data?.error || error.message || 'Σφάλμα κατά την ενημέρωση του ραντεβού');
    }
  };

  const handleViewSellerAppointment = (appointment: SellerAppointment) => {
    setSelectedAppointment(appointment);
    setIsAppointmentDetailsModalOpen(true);
  };

  // Group appointments by status
  const upcomingAppointment = appointments.find(
    (a) => a.status === 'CONFIRMED' && new Date(a.startAt) > new Date()
  );
  const requestedAppointments = appointments.filter((a) => a.status === 'REQUESTED');
  const confirmedAppointments = appointments.filter(
    (a) => a.status === 'CONFIRMED' && (!upcomingAppointment || a.id !== upcomingAppointment.id)
  );
  const cancelledAppointments = appointments.filter((a) => a.status === 'CANCELLED');

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.startAt);
      return isSameDay(aptDate, date);
    });
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeForInput = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const parseInputDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  };

  const buildSlotsFromProfileAvailability = (weeklyRules: Array<{ weekday?: number; start?: string; end?: string }>) => {
    const today = new Date();
    const targetAvailableDates = 20;
    const maxSearchDays = 180;
    const slots: Array<{ date: string; startTime: string; endTime: string }> = [];
    const selectedDateKeys = new Set<string>();

    for (let offset = 0; offset < maxSearchDays; offset++) {
      const currentDate = addDays(today, offset);
      const weekday = currentDate.getDay();
      const dateKey = formatDateForInput(currentDate);
      const shouldContinueForDate = selectedDateKeys.has(dateKey) || selectedDateKeys.size < targetAvailableDates;
      if (!shouldContinueForDate) break;

      const dayRules = weeklyRules.filter((rule) => rule?.weekday === weekday);
      if (dayRules.length === 0) continue;

      if (!selectedDateKeys.has(dateKey) && selectedDateKeys.size >= targetAvailableDates) continue;
      selectedDateKeys.add(dateKey);

      dayRules.forEach((rule) => {
        const startTime = (rule.start || '').slice(0, 5);
        const endTime = (rule.end || '').slice(0, 5);
        if (!startTime || !endTime || startTime >= endTime) return;

        slots.push({
          date: dateKey,
          startTime,
          endTime,
        });
      });
    }

    return slots;
  };

  const openAvailabilityFromProfile = async () => {
    setIsLoadingProfileAvailability(true);
    try {
      const dealAvailabilityRes = await fetchFromBackend(`/deals/${deal.id}/notary/availability`);
      let dealSlots: Array<{ date: string; startTime: string; endTime: string }> = [];
      if (dealAvailabilityRes.ok) {
        const dealAvailabilityData = await dealAvailabilityRes.json();
        dealSlots = (dealAvailabilityData?.slots || []).map((slot: any) => {
          const startDate = new Date(slot.startAt);
          const endDate = new Date(slot.endAt);
          return {
            date: formatDateForInput(startDate),
            startTime: formatTimeForInput(startDate),
            endTime: formatTimeForInput(endDate),
          };
        });
      }

      if (dealSlots.length > 0) {
        setNotaryAvailableSlots(dealSlots);
        const firstDate = parseInputDate(dealSlots[0].date);
        setSelectedNotaryAvailabilityDate(firstDate);
        setNotaryAvailabilityMonth(firstDate);
      } else {
        const profileResponse = await getMyProfessionalProfile();
        const weeklyRules = profileResponse?.profile?.availability?.weeklyRules || [];
        const generatedSlots = buildSlotsFromProfileAvailability(weeklyRules);

        if (generatedSlots.length === 0) {
          toast('Δεν βρέθηκαν διαθέσιμες ώρες στο δημόσιο προφίλ. Μπορείς να ορίσεις χειροκίνητα.');
          setNotaryAvailableSlots([{ date: '', startTime: '', endTime: '' }]);
          setSelectedNotaryAvailabilityDate(new Date());
          setNotaryAvailabilityMonth(new Date());
        } else {
          setNotaryAvailableSlots(generatedSlots);
          const firstDate = parseInputDate(generatedSlots[0].date);
          setSelectedNotaryAvailabilityDate(firstDate);
          setNotaryAvailabilityMonth(firstDate);
        }
      }

      setShowNotaryAvailabilityModal(true);
    } catch (err: any) {
      console.error('Error loading profile availability:', err);
      toast.error('Δεν ήταν δυνατή η φόρτωση των διαθέσιμων ωρών από το προφίλ');
      setNotaryAvailableSlots([{ date: '', startTime: '', endTime: '' }]);
      setSelectedNotaryAvailabilityDate(new Date());
      setNotaryAvailabilityMonth(new Date());
      setShowNotaryAvailabilityModal(true);
    } finally {
      setIsLoadingProfileAvailability(false);
    }
  };

  const notarySlotsByDate = useMemo(() => {
    const map = new Map<string, Array<{ index: number; startTime: string; endTime: string }>>();
    notaryAvailableSlots.forEach((slot, index) => {
      if (!slot.date) return;
      if (!map.has(slot.date)) map.set(slot.date, []);
      map.get(slot.date)!.push({ index, startTime: slot.startTime, endTime: slot.endTime });
    });
    return map;
  }, [notaryAvailableSlots]);

  const notaryConfirmedAppointmentsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    dealAppointments.forEach((apt: any) => {
      const isConfirmedSigning = apt?.status === 'CONFIRMED' && apt?.type === 'IN_PERSON' && apt?.note !== 'AVAILABLE_SLOT';
      if (!isConfirmedSigning || !apt?.startAt) return;

      const dateKey = formatDateForInput(new Date(apt.startAt));
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(apt);
    });
    return map;
  }, [dealAppointments]);

  // Render appointment row
  const renderAppointmentRow = (appointment: DealAppointment) => (
    <div key={appointment.id} className="p-5 bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
          {deal.property?.title.charAt(0) || 'A'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h4 className="font-bold text-lg text-gray-900 mb-1">
                {deal.property?.title || 'Ακίνητο'}
              </h4>
              <p className="text-sm text-gray-600 font-medium">{appointment.type}</p>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 ${
                appointment.status === 'CONFIRMED'
                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                  : appointment.status === 'REQUESTED'
                  ? 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800'
                  : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
              }`}
            >
              {appointment.status === 'CONFIRMED' ? (
                <>
                  <FaCheckCircle className="mr-1.5" /> Επιβεβαιωμένο
                </>
              ) : appointment.status === 'REQUESTED' ? (
                <>
                  <FaSpinner className="mr-1.5 animate-spin" /> Σε αναμονή
                </>
              ) : (
                <>
                  <FaTimesCircle className="mr-1.5" /> Ακυρωμένο
                </>
              )}
            </span>
          </div>

          {/* Date & Time */}
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg">
              <FaCalendarAlt className="text-blue-600" />
              <span className="font-semibold">
                {format(new Date(appointment.startAt), 'EEEE, d MMMM yyyy', { locale: el })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg">
              <FaClock className="text-indigo-600" />
              <span className="font-semibold">
                {format(new Date(appointment.startAt), 'HH:mm', { locale: el })}
              </span>
            </div>
          </div>

          {/* Note */}
          {appointment.note && (
            <p className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
              <span className="font-medium">Σημείωση:</span> {appointment.note}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {isBuyerRole && appointment.status !== 'CANCELLED' && (
            <button
              onClick={() => handleCancel(appointment.id)}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <FaTimesCircle /> Ακύρωση
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (loading && !isNotaryRole) {
    return (
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-12 text-center">
        <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Φόρτωση ραντεβού...</p>
      </div>
    );
  }

  // Notary view - proposed signing appointments + availability
  if (isNotaryRole) {
    const notaryDealBuyerId = deal.buyerId || deal.participants?.find(p => p.role === 'BUYER')?.userId;
    const notaryDealSellerId = deal.sellerId || deal.participants?.find(p => p.role === 'SELLER')?.userId;
    const proposedSigningAppointments = dealAppointments.filter(
      (a: any) => a.status === 'REQUESTED' && a.type === 'IN_PERSON' && a.note !== 'AVAILABLE_SLOT'
    );
    const confirmedSigning = dealAppointments.find(
      (a: any) => a.status === 'CONFIRMED' && a.type === 'IN_PERSON'
    );

    return (
      <div className="space-y-6">
        <CardSection>
          {loadingDealAppointments && (
            <div className="text-center py-8 mb-4">
              <FaSpinner className={`animate-spin text-2xl mx-auto ${isProfessionalContext ? 'text-teal-600' : 'text-purple-600'}`} />
            </div>
          )}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${isProfessionalContext ? accentIcon : 'from-purple-500 to-indigo-600'} flex items-center justify-center text-white shadow-lg`}>
                <FaCalendarAlt className="text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Ραντεβού Υπογραφής Συμβολαίων</h2>
                <p className="text-sm text-gray-600">
                  Προτάσεις από αγοραστή ή πωλητή και ορισμός διαθεσίμων ωρών
                </p>
              </div>
            </div>
            <button
              onClick={openAvailabilityFromProfile}
              disabled={isLoadingProfileAvailability}
              className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${isProfessionalContext ? `${accentGradient} ${accentHover}` : 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'} text-white font-semibold rounded-lg transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {isLoadingProfileAvailability ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Φόρτωση...
                </>
              ) : (
                <>
                  Διαθέσιμες Ώρες
                  <FaArrowRight />
                </>
              )}
            </button>
          </div>

          {confirmedSigning && (
            <div className="mb-6 p-5 bg-green-50 border-2 border-green-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <FaCheckCircle className="text-green-600 text-xl" />
                <h3 className="font-bold text-green-900">Επιβεβαιωμένο Ραντεβού</h3>
              </div>
              <p className="text-green-800 font-medium">
                {format(new Date(confirmedSigning.startAt), "EEEE, d MMMM yyyy 'στις' HH:mm", { locale: el })}
              </p>
            </div>
          )}

          {proposedSigningAppointments.length > 0 && !confirmedSigning && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-900">Προτεινόμενα Ραντεβού</h4>
              {proposedSigningAppointments.map((apt: any) => {
                const sentByBuyer = apt.bookedById === notaryDealBuyerId;
                const sentBySeller = apt.bookedById === notaryDealSellerId;
                const senderName = sentByBuyer ? 'Αγοραστής' : sentBySeller ? 'Πωλητής' : (apt.bookedBy?.name || 'Άγνωστο');
                const sellerApproved = !!apt.sellerApprovedAt;
                const buyerApprovedSellerProposal = !!apt.buyerApprovedAt;
                const canNotaryConfirmSigning =
                  (sentByBuyer && sellerApproved) ||
                  (sentBySeller && buyerApprovedSellerProposal) ||
                  (!sentByBuyer && !sentBySeller);
                return (
                  <div key={apt.id} className="p-5 bg-white rounded-xl shadow-sm border-2 border-amber-200 bg-amber-50/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FaUser className="text-amber-600" />
                          <span className="font-semibold text-gray-900">Έστειλε: {senderName}</span>
                        </div>
                        {sellerApproved && (
                          <div className="flex items-center gap-2 mb-2 text-sm text-green-700">
                            <FaCheckCircle className="text-green-600" />
                            <span>Εγκρίθηκε από πωλητή</span>
                          </div>
                        )}
                        {buyerApprovedSellerProposal && sentBySeller && (
                          <div className="flex items-center gap-2 mb-2 text-sm text-green-700">
                            <FaCheckCircle className="text-green-600" />
                            <span>Εγκρίθηκε από αγοραστή</span>
                          </div>
                        )}
                        {sentByBuyer && !sellerApproved && (
                          <p className="text-xs text-amber-800 mb-2">Αναμονή έγκρισης πωλητή πριν την επιβεβαίωσή σας.</p>
                        )}
                        {sentBySeller && !buyerApprovedSellerProposal && (
                          <p className="text-xs text-amber-800 mb-2">Αναμονή έγκρισης αγοραστή πριν την επιβεβαίωσή σας.</p>
                        )}
                        <p className="font-semibold text-gray-900">
                          {format(new Date(apt.startAt), "EEEE, d MMMM yyyy 'στις' HH:mm", { locale: el })}
                        </p>
                        {apt.location && (
                          <p className="text-sm text-gray-600 mt-1">{apt.location}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={async () => {
                            setIsNotaryConfirming(apt.id);
                            try {
                              const res = await fetchFromBackend(`/appointments/${apt.id}/confirm`, { method: 'POST' });
                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}));
                                throw new Error(err.error || 'Σφάλμα');
                              }
                              toast.success('Το ραντεβού επιβεβαιώθηκε');
                              fetchDealAppointments();
                              onRefresh();
                            } catch (e: any) {
                              toast.error(e.message || 'Σφάλμα');
                            } finally {
                              setIsNotaryConfirming(null);
                            }
                          }}
                          disabled={!!isNotaryConfirming || !canNotaryConfirmSigning}
                          title={
                            !canNotaryConfirmSigning
                              ? 'Απαιτείται πρώτα έγκριση από τον άλλον συμβαλλόμενο'
                              : undefined
                          }
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {isNotaryConfirming === apt.id ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                          Έγκριση
                        </button>
                        <button
                          onClick={async () => {
                            setIsNotaryRejecting(apt.id);
                            try {
                              const res = await fetchFromBackend(`/appointments/${apt.id}/reject`, { method: 'POST' });
                              if (!res.ok) throw new Error('Σφάλμα');
                              toast.success('Η πρόταση απορρίφθηκε');
                              fetchDealAppointments();
                              onRefresh();
                            } catch (e: any) {
                              toast.error(e.message || 'Σφάλμα');
                            } finally {
                              setIsNotaryRejecting(null);
                            }
                          }}
                          disabled={!!isNotaryRejecting}
                          className="px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg font-semibold hover:bg-red-200 disabled:opacity-50 flex items-center gap-2"
                        >
                          {isNotaryRejecting === apt.id ? <FaSpinner className="animate-spin" /> : <FaTimes />}
                          Απόρριψη
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {proposedSigningAppointments.length === 0 && !confirmedSigning && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <FaInfoCircle className="text-4xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Δεν υπάρχουν προτάσεις ραντεβού ακόμα</p>
              <p className="text-sm text-gray-500 mt-2">Ο αγοραστής ή ο πωλητής θα στείλει πρόταση όταν είναι έτοιμοι</p>
            </div>
          )}
        </CardSection>

        {/* Notary Availability Modal */}
        {showNotaryAvailabilityModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Διαθέσιμες Ώρες</h3>
                <button onClick={() => setShowNotaryAvailabilityModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Οι ώρες προ-συμπληρώνονται από το Δημόσιο Προφίλ σου (tab Προφίλ) και μπορείς να τις προσαρμόσεις για αυτό το deal.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => setNotaryAvailabilityMonth(subMonths(notaryAvailabilityMonth, 1))}
                      className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                    >
                      <FaChevronLeft className="text-slate-600" />
                    </button>
                    <h4 className="text-sm font-semibold text-slate-900 capitalize">
                      {format(notaryAvailabilityMonth, 'MMMM yyyy', { locale: el })}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setNotaryAvailabilityMonth(addMonths(notaryAvailabilityMonth, 1))}
                      className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                    >
                      <FaChevronRight className="text-slate-600" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'].map((day) => (
                      <div key={day} className="text-[11px] font-semibold text-slate-500 text-center py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const start = startOfMonth(notaryAvailabilityMonth);
                      const end = endOfMonth(notaryAvailabilityMonth);
                      const days = eachDayOfInterval({ start, end });
                      const leadingEmpty = Array.from({ length: start.getDay() }, (_, i) => (
                        <div key={`empty-${i}`} className="h-10" />
                      ));

                      return (
                        <>
                          {leadingEmpty}
                          {days.map((day) => {
                            const dateKey = formatDateForInput(day);
                            const slotsCount = (notarySlotsByDate.get(dateKey) || []).length;
                            const bookedCount = (notaryConfirmedAppointmentsByDate.get(dateKey) || []).length;
                            const hasSlots = slotsCount > 0;
                            const hasBooked = bookedCount > 0;
                            const isSelected = isSameDay(day, selectedNotaryAvailabilityDate);
                            const isTodayDate = isToday(day);

                            return (
                              <button
                                key={dateKey}
                                type="button"
                                onClick={() => setSelectedNotaryAvailabilityDate(day)}
                                className={`h-10 rounded-lg text-xs font-semibold border transition-all relative ${
                                  isSelected
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : hasBooked
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                    : hasSlots
                                    ? 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                } ${isTodayDate ? 'ring-1 ring-offset-1 ring-slate-300' : ''}`}
                              >
                                {format(day, 'd')}
                                {(hasSlots || hasBooked) && (
                                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1">
                                    {hasSlots && (
                                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-teal-500'}`} />
                                    )}
                                    {hasBooked && (
                                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-teal-100 border border-teal-300" />
                      Διαθέσιμες ώρες
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
                      Εγκεκριμένο ραντεβού
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-white border border-slate-300" />
                      Χωρίς ώρες
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {format(selectedNotaryAvailabilityDate, 'EEEE, d MMMM', { locale: el })}
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const selectedKey = formatDateForInput(selectedNotaryAvailabilityDate);
                          setNotaryAvailableSlots((prev) => prev.filter((slot) => slot.date !== selectedKey));
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        Αφαίρεση ημέρας
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const key = formatDateForInput(selectedNotaryAvailabilityDate);
                          setNotaryAvailableSlots((prev) => [...prev, { date: key, startTime: '09:00', endTime: '17:00' }]);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                          isProfessionalContext
                            ? 'border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100'
                            : 'border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100'
                        } transition-colors`}
                      >
                        + Προσθήκη Ώρας
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const selectedKey = formatDateForInput(selectedNotaryAvailabilityDate);
                    const selectedDaySlots = notarySlotsByDate.get(selectedKey) || [];
                    const selectedDayConfirmedAppointments = notaryConfirmedAppointmentsByDate.get(selectedKey) || [];

                    if (selectedDaySlots.length === 0 && selectedDayConfirmedAppointments.length === 0) {
                      return (
                        <div className="text-center py-8 rounded-lg border border-dashed border-slate-300 bg-slate-50">
                          <p className="text-sm text-slate-600">Δεν έχουν οριστεί διαθέσιμες ώρες για αυτή την ημέρα.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                        {selectedDayConfirmedAppointments.map((apt: any) => (
                          <div key={`confirmed-${apt.id}`} className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-xs font-semibold text-amber-900 mb-1">Εγκεκριμένο Ραντεβού</p>
                            <p className="text-sm text-amber-800 font-medium">
                              {format(new Date(apt.startAt), 'HH:mm', { locale: el })} - {format(new Date(apt.endAt), 'HH:mm', { locale: el })}
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              {apt.bookedBy?.name ? `Από: ${apt.bookedBy.name}` : 'Υπάρχει ήδη επιβεβαιωμένη κράτηση σε αυτή την ημέρα.'}
                            </p>
                          </div>
                        ))}
                        {selectedDaySlots.map((slot) => (
                          <div key={slot.index} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Έναρξη</label>
                                <input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) => {
                                    const next = [...notaryAvailableSlots];
                                    next[slot.index].startTime = e.target.value;
                                    setNotaryAvailableSlots(next);
                                  }}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Λήξη</label>
                                <input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(e) => {
                                    const next = [...notaryAvailableSlots];
                                    next[slot.index].endTime = e.target.value;
                                    setNotaryAvailableSlots(next);
                                  }}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setNotaryAvailableSlots(notaryAvailableSlots.filter((_, i) => i !== slot.index))}
                                className="h-10 px-3 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 text-sm"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowNotaryAvailabilityModal(false)} className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Ακύρωση</button>
                <button
                  onClick={async () => {
                    setIsSavingNotaryAvailability(true);
                    try {
                      const res = await fetchFromBackend(`/deals/${deal.id}/notary/availability`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ availableSlots: notaryAvailableSlots }) });
                      if (!res.ok) throw new Error('Σφάλμα');
                      toast.success('Οι διαθέσιμες ώρες αποθηκεύτηκαν');
                      setShowNotaryAvailabilityModal(false);
                      onRefresh();
                    } catch (e: any) {
                      toast.error(e.message || 'Σφάλμα');
                    } finally {
                      setIsSavingNotaryAvailability(false);
                    }
                  }}
                  disabled={isSavingNotaryAvailability || notaryAvailableSlots.length === 0}
                  className={`flex-1 px-4 py-2 bg-gradient-to-r ${isProfessionalContext ? `${accentGradient} ${accentHover}` : 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'} text-white rounded-lg disabled:opacity-50`}
                >
                  {isSavingNotaryAvailability ? 'Αποθηκεύεται...' : 'Αποθήκευση'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Agent view - read-only view of appointments
  if (isAgentRole) {
    return (
      <div className="space-y-6">
        <CardSection>
          <div className="flex items-center gap-2 mb-4">
            <FaCalendarAlt className="text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">Ραντεβού</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Προβολή των ραντεβού που έχουν προγραμματιστεί μεταξύ του αγοραστή και του πωλητή
          </p>
          
          {loading ? (
            <div className="text-center py-8">
              <FaSpinner className="animate-spin text-2xl text-purple-600 mx-auto" />
            </div>
          ) : sellerAppointments.length === 0 ? (
            <EmptyState
              icon={<FaCalendarAlt className="text-3xl" />}
              title="Δεν υπάρχουν ραντεβού"
              description="Δεν έχουν προγραμματιστεί ραντεβού ακόμα για αυτό το ακίνητο."
            />
          ) : (
            <div className="space-y-4">
              {sellerAppointments.map((appointment) => (
                <div key={appointment.id} className="p-5 bg-white rounded-xl shadow-sm border-2 border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      <FaCalendarAlt />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h4 className="font-bold text-lg text-gray-900 mb-1">
                            {appointment.propertyTitle || deal.property?.title || 'Ακίνητο'}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Αγοραστής: {appointment.buyer.name} ({appointment.buyer.email})
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 ${
                            appointment.status === 'accepted'
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                              : appointment.status === 'pending'
                              ? 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800'
                              : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                          }`}
                        >
                          {appointment.status === 'accepted' ? (
                            <>
                              <FaCheckCircle className="mr-1.5" /> Επιβεβαιωμένο
                            </>
                          ) : appointment.status === 'pending' ? (
                            <>
                              <FaClock className="mr-1.5" /> Σε αναμονή
                            </>
                          ) : (
                            <>
                              <FaTimesCircle className="mr-1.5" /> Απορριφθέν
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg">
                          <FaCalendarAlt className="text-purple-600" />
                          <span className="font-semibold">
                            {new Date(appointment.date).toLocaleDateString('el-GR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        {appointment.time && (
                          <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg">
                            <FaClock className="text-indigo-600" />
                            <span className="font-semibold">{appointment.time}</span>
                          </div>
                        )}
                      </div>
                      {appointment.notes && (
                        <p className="text-sm text-gray-600 bg-purple-50 px-3 py-2 rounded-lg border border-purple-100 mt-3">
                          <span className="font-medium">Σημείωση:</span> {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardSection>
      </div>
    );
  }

  // Seller view - appointments from THIS deal's buyer only (approve/reject)
  if (isSellerRole) {
    const buyerParticipant = deal.participants?.find(p => p.role === 'BUYER' && p.userId === dealBuyerId);
    const buyerName = buyerParticipant?.user?.name || 'Αγοραστής';
    const dealSellerIdForSigning =
      deal.sellerId || deal.participants?.find((p) => p.role === 'SELLER')?.userId;
    const signingDealAppts = dealAppointments.filter(
      (a: any) =>
        a.type === 'IN_PERSON' &&
        a.note !== 'AVAILABLE_SLOT' &&
        (a.status === 'REQUESTED' || a.status === 'CONFIRMED')
    );
    const confirmedSigningSeller = signingDealAppts.find((a: any) => a.status === 'CONFIRMED');
    const pendingSigningSeller = signingDealAppts.filter((a: any) => a.status === 'REQUESTED');
    const pendingAppointments = sellerAppointments.filter(a => a.status === 'pending');
    const acceptedAppointments = sellerAppointments.filter(a => a.status === 'accepted');
    const rejectedAppointments = sellerAppointments.filter(a => a.status === 'rejected');

    return (
      <div className="space-y-6">
        <CardSection title="Ραντεβού υπογραφής συμβολαίων">
          {loadingDealAppointments ? (
            <div className="text-center py-8">
              <FaSpinner className="animate-spin text-2xl text-emerald-600 mx-auto" />
              <p className="text-sm text-gray-600 mt-2">Φόρτωση...</p>
            </div>
          ) : confirmedSigningSeller ? (
            <div className="p-5 bg-green-50 border-2 border-green-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <FaCheckCircle className="text-green-600 text-xl" />
                <h3 className="font-bold text-green-900">Επιβεβαιωμένο ραντεβού υπογραφής</h3>
              </div>
              <p className="text-green-800 font-medium">
                {format(new Date(confirmedSigningSeller.startAt), "EEEE, d MMMM yyyy 'στις' HH:mm", { locale: el })}
              </p>
              {confirmedSigningSeller.note && (
                <p className="text-sm text-green-700 mt-2">{confirmedSigningSeller.note}</p>
              )}
            </div>
          ) : pendingSigningSeller.length === 0 ? (
            <p className="text-sm text-gray-600 py-2">
              Δεν υπάρχει προγραμματισμένο ή εκκρεμές ραντεβού υπογραφής. Μπορείτε να προτείνετε ημερομηνία από την Επισκόπηση (βήμα υπογραφής).
            </p>
          ) : (
            <div className="space-y-4">
              {pendingSigningSeller.map((apt: any) => {
                const fromSeller = dealSellerIdForSigning && apt.bookedById === dealSellerIdForSigning;
                const fromBuyer = dealBuyerId && apt.bookedById === dealBuyerId;
                const sellerApproved = !!apt.sellerApprovedAt;
                return (
                  <div
                    key={apt.id}
                    className="p-5 bg-white rounded-xl shadow-sm border-2 border-amber-200 bg-amber-50/40"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FaUser className="text-amber-600" />
                      <span className="font-semibold text-gray-900">
                        {fromSeller ? 'Δική σας πρόταση' : fromBuyer ? `Πρόταση από ${buyerName}` : 'Πρόταση υπογραφής'}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {format(new Date(apt.startAt), "EEEE, d MMMM yyyy 'στις' HH:mm", { locale: el })}
                    </p>
                    {apt.note && apt.note !== 'AVAILABLE_SLOT' && (
                      <p className="text-sm text-gray-600 mt-1">{apt.note}</p>
                    )}
                    {fromSeller && (
                      <div className="mt-3 space-y-3">
                        <p className="text-sm text-amber-900 bg-amber-100/80 rounded-lg px-3 py-2 border border-amber-200">
                          <strong>Σε αναμονή.</strong> Η πρότασή σας περιμένει έγκριση από τον αγοραστή και τον συμβολαιογράφο.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSellerWithdrawConfirmId(apt.id)}
                          disabled={!!withdrawingOwnSigningId || !!sellerWithdrawConfirmId}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 border-red-200 bg-red-50 text-red-800 hover:bg-red-100 disabled:opacity-50"
                        >
                          <FaTimesCircle />
                          Απόσυρση πρότασης
                        </button>
                      </div>
                    )}
                    {fromBuyer && !sellerApproved && (
                      <p className="text-sm text-blue-900 mt-3 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                        Εκκρεμεί η δική σας έγκριση ή απόρριψη (από το κουμπί «Κανονίστε υπογραφή» στην επισκόπηση).
                      </p>
                    )}
                    {fromBuyer && sellerApproved && (
                      <p className="text-sm text-green-800 mt-3 flex items-center gap-2">
                        <FaCheckCircle className="text-green-600 flex-shrink-0" />
                        Έχετε εγκρίνει· αναμονή για έγκριση από συμβολαιογράφο.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardSection>

        {/* Header */}
        <CardSection>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
              <FaCalendarAlt className="text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Ραντεβού Προβολής</h2>
              <p className="text-sm text-gray-600">
                Αιτήματα ραντεβού από τον αγοραστή <strong>{buyerName}</strong> για αυτή τη συναλλαγή
              </p>
            </div>
          </div>
        </CardSection>

        {/* Pending - needs action */}
        {pendingAppointments.length > 0 && (
          <CardSection title={`Σε Αναμονή (${pendingAppointments.length})`}>
            <p className="text-sm text-gray-600 mb-4">
              Ο αγοραστής πρότεινε τις παρακάτω ημερομηνίες. Εγκρίνετε ή απορρίψτε.
            </p>
            <div className="space-y-4">
              {pendingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-5 bg-white rounded-xl shadow-sm border-2 border-amber-200 hover:border-amber-300 bg-gradient-to-br from-amber-50/50 to-orange-50/50 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {buyerName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                        <div>
                          <h4 className="font-bold text-lg text-gray-900 mb-1">
                            {deal.property?.title || appointment.propertyTitle || 'Ακίνητο'}
                          </h4>
                          <p className="text-sm text-gray-600">Από: {appointment.buyer.name}</p>
                        </div>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex-shrink-0">
                          <FaClock className="mr-1.5 animate-pulse" /> Σε Αναμονή
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg">
                          <FaCalendarAlt className="text-amber-600" />
                          <span className="font-semibold">
                            {new Date(appointment.date).toLocaleDateString('el-GR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        {appointment.time && (
                          <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg">
                            <FaClock className="text-indigo-600" />
                            <span className="font-semibold">{appointment.time}</span>
                          </div>
                        )}
                      </div>
                      {appointment.notes && (
                        <p className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 mb-3">
                          <span className="font-medium">Σημείωση:</span> {appointment.notes}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleSellerAppointmentAction(appointment.id, 'approve')}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <FaCheckCircle /> Έγκριση
                        </button>
                        <button
                          onClick={() => handleSellerAppointmentAction(appointment.id, 'reject')}
                          className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <FaTimesCircle /> Απόρριψη
                        </button>
                        <button
                          onClick={() => handleViewSellerAppointment(appointment)}
                          className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-semibold transition-all flex items-center gap-2"
                        >
                          <FaInfoCircle /> Λεπτομέρειες
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardSection>
        )}

        {/* Accepted */}
        {acceptedAppointments.length > 0 && (
          <CardSection title={`Εγκεκριμένα (${acceptedAppointments.length})`}>
            <div className="space-y-4">
              {acceptedAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-5 bg-white rounded-xl shadow-sm border-2 border-green-200 hover:border-green-300 bg-gradient-to-br from-green-50/30 to-emerald-50/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      <FaCheckCircle />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                        <h4 className="font-bold text-lg text-gray-900">
                          {deal.property?.title || appointment.propertyTitle || 'Ακίνητο'}
                        </h4>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-800 flex-shrink-0">
                          <FaCheckCircle className="mr-1.5" /> Εγκεκριμένο
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span>
                          {new Date(appointment.date).toLocaleDateString('el-GR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                        {appointment.time && <span>• {appointment.time}</span>}
                      </div>
                      <button
                        onClick={() => handleViewSellerAppointment(appointment)}
                        className="mt-3 text-sm text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
                      >
                        <FaInfoCircle /> Λεπτομέρειες
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardSection>
        )}

        {/* Rejected */}
        {rejectedAppointments.length > 0 && (
          <CardSection title={`Απορριφθέντα (${rejectedAppointments.length})`}>
            <div className="space-y-4">
              {rejectedAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-5 bg-white rounded-xl shadow-sm border-2 border-gray-200 opacity-75"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                      <FaTimesCircle />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                        <h4 className="font-bold text-lg text-gray-700">
                          {deal.property?.title || appointment.propertyTitle || 'Ακίνητο'}
                        </h4>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-800 flex-shrink-0">
                          Απορριφθέν
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(appointment.date).toLocaleDateString('el-GR')} {appointment.time && `• ${appointment.time}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardSection>
        )}

        {/* Empty state */}
        {sellerAppointments.length === 0 && (
          <CardSection>
            <EmptyState
              icon={<FaCalendarAlt className="text-4xl text-emerald-500" />}
              title="Δεν υπάρχουν αιτήματα ραντεβού"
              description="Ο αγοραστής δεν έχει στείλει ακόμα αίτημα ραντεβού για προβολή του ακινήτου. Όταν στείλει, θα εμφανιστεί εδώ για έγκριση ή απόρριψη."
            />
          </CardSection>
        )}

        {/* Appointment Details Modal */}
        {selectedAppointment && isAppointmentDetailsModalOpen && (
          <AppointmentDetailsModal
            onClose={() => {
              setIsAppointmentDetailsModalOpen(false);
              setSelectedAppointment(null);
            }}
            appointment={{
              _id: selectedAppointment.id,
              propertyId: selectedAppointment.propertyId,
              buyerId: selectedAppointment.buyerId,
              date: selectedAppointment.date,
              time: selectedAppointment.time,
              status: selectedAppointment.status as 'pending' | 'accepted' | 'rejected' | 'completed' | 'approved',
              submittedByBuyer: selectedAppointment.submittedByBuyer,
              createdAt: selectedAppointment.createdAt,
            }}
            property={{
              _id: selectedAppointment.propertyId,
              title: selectedAppointment.propertyTitle,
              price: deal.property?.price || 0,
              location: deal.property ? `${deal.property.city}, ${deal.property.street} ${deal.property.number}` : '',
            }}
            buyer={{
              _id: selectedAppointment.buyerId,
              name: selectedAppointment.buyer.name,
              email: selectedAppointment.buyer.email,
            }}
            onStatusChange={async (appointmentId: string, status: 'accepted' | 'rejected') => {
              await handleSellerAppointmentAction(appointmentId, status === 'accepted' ? 'approve' : 'reject');
            }}
          />
        )}

        <DealConfirmDialog
          open={!!sellerWithdrawConfirmId}
          title="Απόσυρση πρότασης υπογραφής"
          message="Να αποσυρθεί αυτή η πρόταση υπογραφής; Θα μπορείτε να στείλετε νέα από την επισκόπηση."
          confirmLabel="Απόσυρση"
          cancelLabel="Άκυρο"
          confirmVariant="danger"
          isLoading={
            !!sellerWithdrawConfirmId && withdrawingOwnSigningId === sellerWithdrawConfirmId
          }
          onCancel={() => !withdrawingOwnSigningId && setSellerWithdrawConfirmId(null)}
          onConfirm={() => {
            if (!sellerWithdrawConfirmId || withdrawingOwnSigningId) return;
            void executeSellerWithdrawSigningProposal(sellerWithdrawConfirmId);
          }}
        />
      </div>
    );
  }

  // Buyer view - existing buyer appointments UI
  const sellerNameForSigningTab =
    deal.participants?.find((p) => p.role === 'SELLER')?.user?.name || 'Πωλητής';

  return (
    <div className="space-y-6">
      {isBuyerRole && !isAgentRole && (
        <>
          <CardSection title="Ραντεβού υπογραφής συμβολαίων">
            {loadingDealAppointments ? (
              <div className="text-center py-8">
                <FaSpinner className="animate-spin text-2xl text-blue-600 mx-auto" />
                <p className="text-sm text-gray-600 mt-2">Φόρτωση...</p>
              </div>
            ) : buyerSigningConfirmedApt ? (
              <div className="p-5 bg-green-50 border-2 border-green-200 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <FaCheckCircle className="text-green-600 text-xl" />
                  <h3 className="font-bold text-green-900">Επιβεβαιωμένο ραντεβού υπογραφής</h3>
                </div>
                <p className="text-green-800 font-medium">
                  {format(new Date(buyerSigningConfirmedApt.startAt), "EEEE, d MMMM yyyy 'στις' HH:mm", {
                    locale: el,
                  })}
                </p>
                {buyerSigningConfirmedApt.note && (
                  <p className="text-sm text-green-700 mt-2">{buyerSigningConfirmedApt.note}</p>
                )}
              </div>
            ) : buyerSigningPendingList.length === 0 ? (
              <p className="text-sm text-gray-600 py-2">
                Δεν υπάρχει εκκρεμές ή επιβεβαιωμένο ραντεβού υπογραφής. Μπορείτε να προτείνετε ημερομηνία από την Επισκόπηση
                (βήμα υπογραφής).
              </p>
            ) : (
              <div className="space-y-4">
                {buyerSigningPendingList.map((apt: any) => {
                  const fromSeller = dealSellerUserId && apt.bookedById === dealSellerUserId;
                  const fromBuyer = dealBuyerId && apt.bookedById === dealBuyerId;
                  const sellerApproved = !!apt.sellerApprovedAt;
                  const buyerApprovedSeller = !!apt.buyerApprovedAt;
                  return (
                    <div
                      key={apt.id}
                      className="p-5 bg-white rounded-xl shadow-sm border-2 border-amber-200 bg-amber-50/40"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FaUser className="text-amber-600" />
                        <span className="font-semibold text-gray-900">
                          {fromSeller
                            ? `Πρόταση από ${sellerNameForSigningTab}`
                            : fromBuyer
                              ? 'Δικό σας αίτημα υπογραφής'
                              : 'Πρόταση υπογραφής'}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {format(new Date(apt.startAt), "EEEE, d MMMM yyyy 'στις' HH:mm", { locale: el })}
                      </p>
                      {apt.note && apt.note !== 'AVAILABLE_SLOT' && (
                        <p className="text-sm text-gray-600 mt-1">{apt.note}</p>
                      )}
                      {fromSeller && !buyerApprovedSeller && (
                        <div className="mt-3 space-y-3">
                          <p className="text-sm text-amber-900 bg-amber-100/80 rounded-lg px-3 py-2 border border-amber-200">
                            Εγκρίνετε ή απορρίψτε την πρόταση του πωλητή. Μετά την έγκρισή σας, ο συμβολαιογράφος θα
                            επιβεβαιώσει το ραντεβού.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleBuyerTabApproveSellerSigning(apt.id)}
                              disabled={
                                !!buyerTabApprovingSellerId ||
                                !!buyerTabRejectingSellerId ||
                                !!buyerTabRejectSellerConfirmId
                              }
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {buyerTabApprovingSellerId === apt.id ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaCheckCircle />
                              )}
                              Έγκριση
                            </button>
                            <button
                              type="button"
                              onClick={() => setBuyerTabRejectSellerConfirmId(apt.id)}
                              disabled={
                                !!buyerTabApprovingSellerId ||
                                !!buyerTabRejectingSellerId ||
                                !!buyerTabRejectSellerConfirmId
                              }
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 border-red-200 bg-red-50 text-red-800 hover:bg-red-100 disabled:opacity-50"
                            >
                              <FaTimesCircle />
                              Απόρριψη
                            </button>
                          </div>
                        </div>
                      )}
                      {fromSeller && buyerApprovedSeller && (
                        <p className="text-sm text-green-800 mt-3 flex items-center gap-2">
                          <FaCheckCircle className="text-green-600 flex-shrink-0" />
                          Έχετε εγκρίνει· αναμονή για έγκριση από συμβολαιογράφο.
                        </p>
                      )}
                      {fromBuyer && !sellerApproved && (
                        <p className="text-sm text-blue-900 mt-3 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                          Αναμονή έγκρισης από τον πωλητή και τον συμβολαιογράφο.
                        </p>
                      )}
                      {fromBuyer && sellerApproved && (
                        <p className="text-sm text-green-800 mt-3 flex items-center gap-2">
                          <FaCheckCircle className="text-green-600 flex-shrink-0" />
                          Ο πωλητής έχει εγκρίνει· αναμονή για έγκριση από συμβολαιογράφο.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardSection>

          <DealConfirmDialog
            open={!!buyerTabRejectSellerConfirmId}
            title="Απόρριψη πρότασης πωλητή"
            message="Να απορριφθεί αυτή η προτεινόμενη ημερομηνία υπογραφής; Ο πωλητής θα μπορεί να στείλει νέα πρόταση αργότερα."
            confirmLabel="Απόρριψη"
            cancelLabel="Άκυρο"
            confirmVariant="danger"
            isLoading={!!buyerTabRejectingSellerId}
            onCancel={() => !buyerTabRejectingSellerId && setBuyerTabRejectSellerConfirmId(null)}
            onConfirm={() => {
              if (!buyerTabRejectSellerConfirmId || buyerTabRejectingSellerId) return;
              void executeBuyerTabRejectSellerSigning(buyerTabRejectSellerConfirmId);
            }}
          />
        </>
      )}

      {/* Upcoming Appointment Card */}
      {upcomingAppointment && (
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl shadow-lg p-6 border-2 border-blue-300">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${accentIcon} flex items-center justify-center shadow-lg`}>
                  <FaCalendarAlt className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xl">Επερχόμενο Ραντεβού</h3>
                  <p className="text-sm text-gray-600">Το επόμενο προγραμματισμένο ραντεβού</p>
                </div>
              </div>
              <div className="space-y-3 bg-white/60 rounded-xl p-4 border border-white/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {deal.property?.title.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">
                      {deal.property?.title || 'Ακίνητο'}
                    </p>
                    <p className="text-sm text-gray-600">{upcomingAppointment.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-base font-semibold text-blue-700">
                  <FaCalendarAlt className="text-blue-600" />
                  <span>
                    {format(new Date(upcomingAppointment.startAt), 'EEEE, d MMMM yyyy', { locale: el })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-base font-semibold text-indigo-700">
                  <FaClock className="text-indigo-600" />
                  <span>
                    {format(new Date(upcomingAppointment.startAt), 'HH:mm', { locale: el })}
                  </span>
                </div>
              </div>
            </div>
            <FaCalendarAlt className="text-5xl text-blue-600 opacity-20 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* View Toggle & Request Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              viewMode === 'list'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Λίστα
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              viewMode === 'calendar'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Ημερολόγιο
          </button>
        </div>
        {isBuyerRole && !isAgentRole && (
          <button
            onClick={() => setShowRequestModal(true)}
            className={`px-6 py-3 bg-gradient-to-r ${accentGradient} text-white rounded-xl ${accentHover} font-semibold text-base shadow-lg hover:shadow-xl transition-all flex items-center gap-2`}
          >
            <FaCalendarAlt /> + Αίτημα Ραντεβού
          </button>
        )}
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CardSection title="Ημερολόγιο Ραντεβού">
              <div className="space-y-4">
                {/* Calendar Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-all hover:scale-110 active:scale-95"
                  >
                    <FaChevronLeft className="text-gray-700 hover:text-blue-600" />
                  </button>
                  <h3 className="text-xl font-bold text-gray-900 capitalize">
                    {format(calendarMonth, 'MMMM yyyy', { locale: el })}
                  </h3>
                  <button
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-all hover:scale-110 active:scale-95"
                  >
                    <FaChevronRight className="text-gray-700 hover:text-blue-600" />
                  </button>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-600"></div>
                    <span className="text-xs font-medium text-gray-700">Σε Αναμονή</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-700"></div>
                    <span className="text-xs font-medium text-gray-700">Εγκεκριμένο</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-300 border-2 border-green-500"></div>
                    <span className="text-xs font-medium text-gray-700">Ολοκληρωμένο</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-300 border-2 border-red-500"></div>
                    <span className="text-xs font-medium text-gray-700">Ακυρωμένο</span>
                  </div>
                </div>

                {/* Custom Calendar */}
                <div className="border-2 border-gray-200 rounded-2xl p-6 bg-gradient-to-br from-white to-gray-50 shadow-lg">
                  {/* Week Days Header */}
                  <div className="grid grid-cols-7 gap-2 mb-3">
                    {['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'].map((day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-bold text-gray-700 py-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-2">
                    {(() => {
                      const start = startOfMonth(calendarMonth);
                      const end = endOfMonth(calendarMonth);
                      const days = eachDayOfInterval({ start, end });
                      const startDayOfWeek = start.getDay();
                      
                      // Add empty cells for days before month start
                      const emptyDays = Array.from({ length: startDayOfWeek }, (_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                      ));

                      // Group appointments by date and status
                      const appointmentsByDate = new Map<string, {
                        requested: number;
                        confirmed: number;
                        cancelled: number;
                        completed: number;
                      }>();

                      appointments.forEach((apt) => {
                        const dateKey = format(new Date(apt.startAt), 'yyyy-MM-dd');
                        const isCompleted = apt.status === 'CONFIRMED' && new Date(apt.startAt) < new Date();
                        
                        if (!appointmentsByDate.has(dateKey)) {
                          appointmentsByDate.set(dateKey, {
                            requested: 0,
                            confirmed: 0,
                            cancelled: 0,
                            completed: 0,
                          });
                        }

                        const stats = appointmentsByDate.get(dateKey)!;
                        if (isCompleted) {
                          stats.completed++;
                        } else if (apt.status === 'CONFIRMED') {
                          stats.confirmed++;
                        } else if (apt.status === 'REQUESTED') {
                          stats.requested++;
                        } else if (apt.status === 'CANCELLED') {
                          stats.cancelled++;
                        }
                      });

                      return (
                        <>
                          {emptyDays}
                          {days.map((day) => {
                            const isPastDate = isPast(day) && !isToday(day);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isTodayDate = isToday(day);
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const dayStats = appointmentsByDate.get(dateKey);

                            // Determine the main status color
                            let bgColor = 'bg-white';
                            let borderColor = 'border-gray-200';
                            let textColor = 'text-gray-700';
                            let dotColor = '';

                            if (dayStats) {
                              if (dayStats.completed > 0) {
                                bgColor = 'bg-green-100';
                                borderColor = 'border-green-400';
                                textColor = 'text-green-800';
                                dotColor = 'bg-green-300 border-green-500';
                              } else if (dayStats.confirmed > 0) {
                                bgColor = 'bg-green-50';
                                borderColor = 'border-green-500';
                                textColor = 'text-green-700';
                                dotColor = 'bg-green-500 border-green-700';
                              } else if (dayStats.requested > 0) {
                                bgColor = 'bg-yellow-50';
                                borderColor = 'border-yellow-400';
                                textColor = 'text-yellow-800';
                                dotColor = 'bg-yellow-400 border-yellow-600';
                              } else if (dayStats.cancelled > 0) {
                                bgColor = 'bg-red-50';
                                borderColor = 'border-red-300';
                                textColor = 'text-red-700';
                                dotColor = 'bg-red-300 border-red-500';
                              }
                            }

                            const totalAppointments = dayStats 
                              ? dayStats.requested + dayStats.confirmed + dayStats.completed + dayStats.cancelled 
                              : 0;

                            return (
                              <button
                                key={day.toISOString()}
                                onClick={() => {
                                  if (!isPastDate || isTodayDate) {
                                    setSelectedDate(day);
                                  }
                                }}
                                disabled={isPastDate && !isTodayDate}
                                className={`
                                  aspect-square rounded-xl font-semibold text-sm
                                  transition-all duration-200 transform hover:scale-105 active:scale-95
                                  border-2 flex flex-col items-center justify-center relative
                                  ${isPastDate && !isTodayDate
                                    ? 'text-gray-300 cursor-not-allowed bg-gray-50 border-gray-100'
                                    : isSelected
                                    ? `${bgColor} ${textColor} ${borderColor} shadow-lg scale-110 ring-2 ring-blue-300 ring-offset-2`
                                    : isTodayDate
                                    ? `${bgColor} ${textColor} ${borderColor} border-blue-500 border-2 font-bold`
                                    : `${bgColor} ${textColor} ${borderColor} hover:shadow-md`
                                  }
                                `}
                              >
                                <span className="text-base">{format(day, 'd')}</span>
                                {dayStats && totalAppointments > 0 && (
                                  <div className="absolute bottom-1 flex items-center gap-1">
                                    {dayStats.completed > 0 && (
                                      <div className="w-2 h-2 rounded-full bg-green-300 border border-green-500" title="Ολοκληρωμένο"></div>
                                    )}
                                    {dayStats.confirmed > 0 && dayStats.completed === 0 && (
                                      <div className="w-2 h-2 rounded-full bg-green-500 border border-green-700" title="Εγκεκριμένο"></div>
                                    )}
                                    {dayStats.requested > 0 && (
                                      <div className="w-2 h-2 rounded-full bg-yellow-400 border border-yellow-600" title="Σε Αναμονή"></div>
                                    )}
                                    {dayStats.cancelled > 0 && (
                                      <div className="w-2 h-2 rounded-full bg-red-300 border border-red-500" title="Ακυρωμένο"></div>
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </CardSection>
          </div>

          {/* Selected Date Appointments */}
          <div>
            <CardSection title={selectedDate ? format(selectedDate, 'EEEE, d MMMM', { locale: el }) : 'Επιλέξτε Ημερομηνία'}>
              {selectedDate ? (
                (() => {
                  const dayAppointments = getAppointmentsForDate(selectedDate);
                  return dayAppointments.length > 0 ? (
                    <div className="space-y-3">
                      {dayAppointments.map((apt) => (
                        <div key={apt.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${
                              apt.status === 'CONFIRMED' ? 'bg-green-500' :
                              apt.status === 'REQUESTED' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                            <p className="font-semibold text-sm text-gray-900">{deal.property?.title || 'Ακίνητο'}</p>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{apt.type}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(apt.startAt), 'HH:mm', { locale: el })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<FaCalendarAlt className="text-2xl" />}
                      title="Δεν υπάρχουν ραντεβού"
                      description="Δεν υπάρχουν ραντεβού για αυτή την ημερομηνία."
                    />
                  );
                })()
              ) : (
                <EmptyState
                  icon={<FaCalendarAlt className="text-2xl" />}
                  title="Επιλέξτε Ημερομηνία"
                  description="Επιλέξτε μια ημερομηνία από το ημερολόγιο για να δείτε τα ραντεβού."
                />
              )}
            </CardSection>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {appointments.length === 0 ? (
            <EmptyState
              icon={<FaCalendarAlt className="text-3xl" />}
              title="Δεν υπάρχουν ραντεβού"
              description={
                isBuyerRole
                  ? 'Κλείσε ραντεβού για το ακίνητο για να προχωρήσει η συναλλαγή.'
                  : 'Δεν έχουν προγραμματιστεί ραντεβού ακόμα για αυτό το ακίνητο.'
              }
              action={
                isBuyerRole && !isAgentRole
                  ? {
                      label: 'Αίτημα Ραντεβού',
                      onClick: () => setShowRequestModal(true),
                    }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-5">
              {/* Requested Section */}
              {requestedAppointments.length > 0 && (
                <CardSection title={`Σε Αναμονή (${requestedAppointments.length})`}>
                  <div className="space-y-4">
                    {requestedAppointments.map(renderAppointmentRow)}
                  </div>
                </CardSection>
              )}

              {/* Confirmed Section */}
              {confirmedAppointments.length > 0 && (
                <CardSection title={`Επιβεβαιωμένα (${confirmedAppointments.length})`}>
                  <div className="space-y-4">
                    {confirmedAppointments.map(renderAppointmentRow)}
                  </div>
                </CardSection>
              )}

              {/* Cancelled Section */}
              {cancelledAppointments.length > 0 && (
                <CardSection title={`Ακυρωμένα (${cancelledAppointments.length})`}>
                  <div className="space-y-4">
                    {cancelledAppointments.map(renderAppointmentRow)}
                  </div>
                </CardSection>
              )}
            </div>
          )}
        </>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <AppointmentRequestModal
          deal={deal}
          onClose={() => setShowRequestModal(false)}
          onRequest={handleRequest}
          visitSettings={visitSettings}
          lastAppointment={lastAppointment}
        />
      )}
    </div>
  );
}

// Appointment Request Modal Component
interface AppointmentRequestModalProps {
  deal: DealRoom;
  onClose: () => void;
  onRequest: (date: Date, comment?: string) => void;
  visitSettings: VisitSettings | null;
  lastAppointment: ViewingRequest | null;
}

function AppointmentRequestModal({ deal, onClose, onRequest, visitSettings, lastAppointment }: AppointmentRequestModalProps) {
  const { accentGradient, accentHover, accentIcon } = useDealRoomTheme();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Map English day names to day numbers (0 = Sunday, 1 = Monday, etc.)
  const dayNameToNumber: Record<string, number> = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
  };

  const dayNumberToGreek: Record<number, string> = {
    0: 'Κυριακή',
    1: 'Δευτέρα',
    2: 'Τρίτη',
    3: 'Τετάρτη',
    4: 'Πέμπτη',
    5: 'Παρασκευή',
    6: 'Σάββατο',
  };

  // Get available day numbers from visitSettings
  const availableDayNumbers = visitSettings?.availability?.days
    ?.map(day => dayNameToNumber[day])
    .filter(num => num !== undefined) || [];

  const TIME_SLOTS = visitSettings?.availability?.timeSlots || [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  // Generate all available dates for the next 8 weeks
  const getAvailableDates = (): Date[] => {
    if (showCustomDatePicker || !visitSettings?.availability?.days || availableDayNumbers.length === 0) {
      return [];
    }

    const dates: Date[] = [];
    const today = new Date();
    const endDate = addDays(today, 56); // 8 weeks ahead
    let currentDate = new Date(today);

    while (currentDate <= endDate) {
      const dayOfWeek = getDay(currentDate);
      if (availableDayNumbers.includes(dayOfWeek) && !isPast(currentDate)) {
        dates.push(new Date(currentDate));
      }
      currentDate = addDays(currentDate, 1);
    }

    return dates;
  };

  const availableDates = getAvailableDates();

  // Check if a date is available
  const isDateAvailable = (date: Date): boolean => {
    if (showCustomDatePicker) return true;
    if (!visitSettings?.availability?.days || availableDayNumbers.length === 0) return true;
    return availableDates.some(d => isSameDay(d, date));
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      toast.error('Επιλέξτε ημερομηνία');
      return;
    }

    if (!selectedTime && !showCustomDatePicker) {
      toast.error('Επιλέξτε ώρα');
      return;
    }

    // Combine date and time
    let appointmentDateTime: Date;
    if (showCustomDatePicker && selectedDate) {
      // Custom date/time picker - selectedDate already has time
      appointmentDateTime = selectedDate;
    } else if (selectedDate && selectedTime) {
      appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);
    } else {
      toast.error('Επιλέξτε ημερομηνία και ώρα');
      return;
    }

    if (appointmentDateTime < new Date()) {
      toast.error('Η ημερομηνία και ώρα πρέπει να είναι στο μέλλον');
      return;
    }

    setSubmitting(true);
    try {
      await onRequest(appointmentDateTime, comment || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  // Show pending/accepted appointment info
  const showPendingInfo = lastAppointment && (lastAppointment.status === 'PENDING' || lastAppointment.status === 'ACCEPTED');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className={`sticky top-0 bg-gradient-to-r ${accentGradient} text-white p-6 rounded-t-2xl flex items-center justify-between z-10`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <FaCalendarAlt className="text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Αίτημα Ραντεβού</h2>
                <p className="text-sm text-blue-100">Συμπληρώστε τα στοιχεία για να ζητήσετε ραντεβού</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Κλείσιμο"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Property Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${accentIcon} flex items-center justify-center text-white font-bold text-lg`}>
                  {deal.property?.title.charAt(0) || 'A'}
                </div>
                <div>
                  <p className="text-xs text-blue-800 uppercase font-semibold">Ακίνητο</p>
                  <p className="text-base font-bold text-gray-900">{deal.property?.title || 'N/A'}</p>
                  {deal.property && (
                    <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                      <FaMapMarkerAlt className="text-[10px]" />
                      {deal.property.street} {deal.property.number}, {deal.property.city}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Pending/Accepted Appointment Info */}
            {showPendingInfo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl p-4 border ${
                  lastAppointment.status === 'ACCEPTED'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {lastAppointment.status === 'ACCEPTED' ? (
                    <FaCheckCircle className="text-green-600 text-xl flex-shrink-0 mt-0.5" />
                  ) : (
                    <FaSpinner className="text-yellow-600 text-xl flex-shrink-0 mt-0.5 animate-spin" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {lastAppointment.status === 'ACCEPTED' ? 'Ραντεβού Εγκεκριμένο' : 'Ραντεβού σε Αναμονή'}
                    </h3>
                    <p className="text-sm text-gray-700 mb-2">
                      {lastAppointment.status === 'ACCEPTED'
                        ? `Το ραντεβού σας για τις ${format(new Date(lastAppointment.date), 'EEEE, d MMMM yyyy', { locale: el })} στις ${lastAppointment.time} έχει εγκριθεί.`
                        : `Έχετε ήδη ένα ραντεβού σε αναμονή για τις ${format(new Date(lastAppointment.date), 'EEEE, d MMMM yyyy', { locale: el })} στις ${lastAppointment.time}.`}
                    </p>
                    {lastAppointment.comment && (
                      <p className="text-xs text-gray-600 italic">"{lastAppointment.comment}"</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Calendar & Time Selection */}
            {!showPendingInfo && (
              <div className="space-y-6">
                {/* Show seller availability info if exists and not in custom mode */}
                {visitSettings?.availability?.days && visitSettings.availability.days.length > 0 && !showCustomDatePicker && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-start gap-3">
                      <FaInfoCircle className="text-green-600 text-xl flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">Διαθέσιμες Ημέρες & Ώρες</h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Ημέρες:</p>
                            <div className="flex flex-wrap gap-2">
                              {visitSettings.availability.days.map((day) => {
                                const greekDays: Record<string, string> = {
                                  Monday: 'Δευτέρα',
                                  Tuesday: 'Τρίτη',
                                  Wednesday: 'Τετάρτη',
                                  Thursday: 'Πέμπτη',
                                  Friday: 'Παρασκευή',
                                  Saturday: 'Σάββατο',
                                  Sunday: 'Κυριακή',
                                };
                                return (
                                  <span key={day} className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                                    {greekDays[day] || day}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Ώρες:</p>
                            <div className="flex flex-wrap gap-2">
                              {TIME_SLOTS.map((time) => (
                                <span key={time} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium">
                                  {time}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Date Proposal Button */}
                {visitSettings?.availability?.days && visitSettings.availability.days.length > 0 && !showCustomDatePicker && (
                  <button
                    onClick={() => {
                      setShowCustomDatePicker(true);
                      setSelectedDate(undefined);
                      setSelectedTime('');
                    }}
                    className="w-full px-4 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors border-2 border-gray-300 hover:border-gray-400 flex items-center justify-center gap-2"
                  >
                    <FaCalendarAlt /> Προσθήκη δικής μου ημερομηνίας/ώρας
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Enhanced Calendar */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Ημερομηνία <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-gray-200 rounded-2xl p-5 bg-gradient-to-br from-white to-gray-50 shadow-lg">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-all hover:scale-110 active:scale-95"
                        aria-label="Προηγούμενος μήνας"
                      >
                        <FaChevronLeft className="text-gray-700 hover:text-blue-600" />
                      </button>
                      <h3 className="text-lg font-bold text-gray-900 capitalize">
                        {format(calendarMonth, 'MMMM yyyy', { locale: el })}
                      </h3>
                      <button
                        onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-all hover:scale-110 active:scale-95"
                        aria-label="Επόμενος μήνας"
                      >
                        <FaChevronRight className="text-gray-700 hover:text-blue-600" />
                      </button>
                    </div>

                    {/* Week Days Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'].map((day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-bold text-gray-600 py-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const start = startOfMonth(calendarMonth);
                        const end = endOfMonth(calendarMonth);
                        const days = eachDayOfInterval({ start, end });
                        const startDayOfWeek = start.getDay();
                        
                        // Add empty cells for days before month start
                        const emptyDays = Array.from({ length: startDayOfWeek }, (_, i) => (
                          <div key={`empty-${i}`} className="aspect-square" />
                        ));

                        return (
                          <>
                            {emptyDays}
                            {days.map((day) => {
                              const isPastDate = isPast(day) && !isToday(day);
                              const isSelected = selectedDate && isSameDay(day, selectedDate);
                              const isTodayDate = isToday(day);
                              const isAvailable = isDateAvailable(day);
                              const isDisabled = isPastDate || (!showCustomDatePicker && !isAvailable);

                              return (
                                <button
                                  key={day.toISOString()}
                                  onClick={() => {
                                    if (!isDisabled) {
                                      setSelectedDate(day);
                                    }
                                  }}
                                  disabled={isDisabled}
                                  className={`
                                    aspect-square rounded-xl font-semibold text-sm
                                    transition-all duration-200 transform hover:scale-110 active:scale-95
                                    ${
                                      isDisabled
                                        ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                        : isSelected
                                        ? `bg-gradient-to-br ${accentIcon} text-white shadow-lg scale-110 ring-2 ring-blue-300 ring-offset-2`
                                        : isTodayDate
                                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-400 font-bold'
                                        : isAvailable
                                        ? 'text-gray-700 bg-white hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300'
                                        : 'text-gray-400 bg-gray-50 border border-gray-100 cursor-not-allowed'
                                    }
                                  `}
                                >
                                  {format(day, 'd')}
                                </button>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>

                    {/* Quick Date Selection - Only show available dates */}
                    {!showCustomDatePicker && availableDates.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Διαθέσιμες ημερομηνίες:</p>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {availableDates.slice(0, 10).map((date) => {
                            const isSelected = selectedDate && isSameDay(date, selectedDate);
                            return (
                              <button
                                key={date.toISOString()}
                                onClick={() => {
                                  setSelectedDate(date);
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
                    )}

                    {/* Quick Date Selection for custom mode */}
                    {showCustomDatePicker && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Γρήγορη επιλογή:</p>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const today = new Date();
                            const tomorrow = new Date(today);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            const nextWeek = new Date(today);
                            nextWeek.setDate(nextWeek.getDate() + 7);
                            const nextMonth = new Date(today);
                            nextMonth.setMonth(nextMonth.getMonth() + 1);

                            return [
                              { label: 'Σήμερα', date: today },
                              { label: 'Αύριο', date: tomorrow },
                              { label: 'Σε 7 μέρες', date: nextWeek },
                              { label: 'Σε 1 μήνα', date: nextMonth },
                            ].map(({ label, date }) => {
                              const isSelected = selectedDate && isSameDay(date, selectedDate);
                              return (
                                <button
                                  key={label}
                                  onClick={() => {
                                    setSelectedDate(date);
                                    setCalendarMonth(date);
                                  }}
                                  className={`
                                    px-3 py-1.5 rounded-lg text-xs font-medium
                                    transition-all duration-200
                                    ${
                                      isSelected
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                                    }
                                  `}
                                >
                                  {label}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Selection */}
                <div className="space-y-4">
                  {!showCustomDatePicker ? (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Ώρα <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                          {TIME_SLOTS.map((time) => (
                            <button
                              key={time}
                              onClick={() => setSelectedTime(time)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                                selectedTime === time
                                  ? 'bg-blue-600 text-white shadow-md border-blue-700'
                                  : 'bg-gray-100 text-gray-800 hover:bg-blue-50 hover:text-blue-700 border-gray-200'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Date Option */}
                      {visitSettings && (
                        <button
                          onClick={() => setShowCustomDatePicker(true)}
                          className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-200"
                        >
                          Προσθήκη δικής μου ημερομηνίας/ώρας
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Ώρα <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-2">
                          {(() => {
                            // Generate all hours of the day (00:00 to 23:00)
                            const allHours: string[] = [];
                            for (let hour = 0; hour < 24; hour++) {
                              for (let minute = 0; minute < 60; minute += 30) {
                                const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                                allHours.push(timeString);
                              }
                            }
                            return allHours;
                          })().map((time) => {
                            // Check if this time is selected (compare hours and minutes)
                            const isSelected = selectedDate && (() => {
                              const selectedHours = selectedDate.getHours();
                              const selectedMinutes = selectedDate.getMinutes();
                              const [timeHours, timeMinutes] = time.split(':').map(Number);
                              return selectedHours === timeHours && selectedMinutes === timeMinutes;
                            })();

                            return (
                              <button
                                key={time}
                                onClick={() => {
                                  if (selectedDate) {
                                    const [hours, minutes] = time.split(':').map(Number);
                                    const newDate = new Date(selectedDate);
                                    newDate.setHours(hours, minutes, 0, 0);
                                    setSelectedDate(newDate);
                                  }
                                }}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-md border-blue-700'
                                    : 'bg-gray-100 text-gray-800 hover:bg-blue-50 hover:text-blue-700 border-gray-200'
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowCustomDatePicker(false);
                          setSelectedDate(undefined);
                          setSelectedTime('');
                        }}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-200"
                      >
                        Επιστροφή σε διαθέσιμες ώρες
                      </button>
                    </div>
                  )}

                  {/* Preview */}
                  {selectedDate && (selectedTime || showCustomDatePicker) && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
                        <FaInfoCircle /> Προεπισκόπηση:
                      </p>
                      <p className="text-sm text-blue-700">
                        {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: el })}
                      </p>
                      {selectedTime && (
                        <p className="text-sm text-blue-700">{selectedTime}</p>
                      )}
                      {showCustomDatePicker && (
                        <p className="text-sm text-blue-700">
                          {format(selectedDate, 'HH:mm', { locale: el })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                </div>
              </div>
            )}

            {/* Comment */}
            {!showPendingInfo && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Σχόλιο (Προαιρετικό)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Προσθέστε οποιαδήποτε επιπλέον πληροφορία για το ραντεβού..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base resize-none"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-2xl flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition-colors disabled:opacity-50"
            >
              {showPendingInfo ? 'Κλείσιμο' : 'Ακύρωση'}
            </button>
            {!showPendingInfo && (
              <button
                onClick={handleSubmit}
                disabled={
                  submitting || 
                  !selectedDate || 
                  (!showCustomDatePicker && !selectedTime) ||
                  (showCustomDatePicker && selectedDate && selectedDate.getHours() === 0 && selectedDate.getMinutes() === 0)
                }
                className={`px-6 py-3 bg-gradient-to-r ${accentGradient} text-white rounded-xl ${accentHover} font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin" /> Αποστολή...
                  </>
                ) : (
                  <>
                    <FaCalendarAlt /> Υποβολή Αιτήματος
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
