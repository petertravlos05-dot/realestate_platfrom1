'use client';

import { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaSpinner, FaExclamationCircle, FaCalendarAlt, FaFileAlt, FaUser, FaCheckCircle, FaTimes, FaClock, FaBuilding, FaTasks, FaEnvelope, FaHome, FaPhone, FaMapMarkerAlt, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaUserCircle, FaShareAlt, FaCopy } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { getMyProfessionalProfile } from '@/lib/api/professionalsOnboarding';
import { getMyRequests, ProfessionalRequest, getMyAppointments } from '@/lib/api/professionals';
import { listDeals, DealRoom } from '@/lib/api/deals';
import { DealAppointment } from '@/lib/api/dealAppointments';
import { DealDocument, listDocuments } from '@/lib/api/dealDocuments';
import ForbiddenState from '@/components/common/ForbiddenState';
import ProfessionalKpiCards from '@/components/professional/ProfessionalKpiCards';
import NextActionPanel from '@/components/professional/NextActionPanel';
import CalendarWidget from '@/components/professional/CalendarWidget';
import ActivityFeed from '@/components/professional/ActivityFeed';
import AppointmentsTab from '@/components/professional/tabs/AppointmentsTab';
import DealRoomsTab from '@/components/professional/tabs/DealRoomsTab';
import TasksTab from '@/components/professional/tabs/TasksTab';
import PricingTab from '@/components/professional/tabs/PricingTab';
import RequestsTab from '@/components/professional/tabs/RequestsTab';
import { createProfessionalSSEClient, SSEEvent, SSESnapshot } from '@/lib/realtime/sseClient';
import { clearAuthStorage } from '@/lib/api/client';
import { throttle } from '@/lib/utils/throttle';
import DynamicNavbar from '@/components/navigation/DynamicNavbar';

const ROLE_LABELS: Record<string, string> = {
  LAWYER: 'Δικηγόρος',
  NOTARY: 'Συμβολαιογράφος',
  ENGINEER: 'Πολιτικός Μηχανικός',
  ACCOUNTANT: 'Λογιστής',
};

const VERIFICATION_BADGES: Record<string, { label: string; color: string }> = {
  UNVERIFIED: { label: 'Μη Επαληθευμένος', color: 'bg-slate-100 text-slate-700 border border-slate-200' },
  PENDING: { label: 'Σε Εκκρεμότητα', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  VERIFIED: { label: 'Επαληθευμένος', color: 'bg-teal-50 text-teal-700 border border-teal-200' },
  REJECTED: { label: 'Απορρίφθηκε', color: 'bg-slate-100 text-slate-700 border border-slate-200' },
};

const filterOutAvailabilitySlots = (items: any[] = []) =>
  items.filter((apt) => apt?.note !== 'AVAILABLE_SLOT');

type TabType = 'overview' | 'appointments' | 'deals' | 'tasks' | 'requests' | 'pricing';

function ProfessionalDashboardContent() {
  const { userId, role, status, isAuthenticated } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get tab from URL or default to overview
  const tabFromUrl = searchParams?.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(
    tabFromUrl && ['overview', 'appointments', 'deals', 'tasks', 'requests', 'pricing'].includes(tabFromUrl)
      ? tabFromUrl
      : 'overview'
  );
  
  // Sync tab with URL
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.replace(url.pathname + url.search, { scroll: false });
  };
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [deals, setDeals] = useState<DealRoom[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<DealDocument[]>([]);
  const [requests, setRequests] = useState<ProfessionalRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sseClientRef = useRef<ReturnType<typeof createProfessionalSSEClient> | null>(null);
  
  // Pricing state
  const [pricing, setPricing] = useState({
    hourlyRate: '',
    consultationFee: '',
    onlineFee: '',
    inPersonFee: '',
  });
  const [pricingLoading, setPricingLoading] = useState(false);
  const [selectedOverviewDate, setSelectedOverviewDate] = useState(new Date());
  const [isShareProfileModalOpen, setIsShareProfileModalOpen] = useState(false);
  const [isCopyingShareLink, setIsCopyingShareLink] = useState(false);

  // Check if user is a professional
  const isProfessional = role === 'LAWYER' || role === 'NOTARY' || role === 'ENGINEER' || role === 'ACCOUNTANT';

  // Throttled refresh function for SSE events (max once per 5 seconds)
  const throttledRefreshRequests = useRef(
    throttle(async () => {
      try {
        console.log('[Professional Dashboard] Refreshing requests via SSE event...');
        const requestsData = await getMyRequests();
        console.log(`[Professional Dashboard] Received ${requestsData.requests?.length || 0} requests`);
        setRequests(requestsData.requests || []);
      } catch (err: any) {
        console.error('Error refreshing requests:', err);
      }
    }, 5000)
  ).current;

  useEffect(() => {
    if (status === 'unauthenticated') {
      setDeals([]);
      setRequests([]);
      setAppointments([]);
      router.push('/professionals');
      return;
    }

    // Check if redirected here due to professional account restriction
    const logoutParam = searchParams?.get('logout');
    const reason = searchParams?.get('reason');
    if (logoutParam === 'true' && reason === 'professional_account') {
      // Show message and sign out
      import('next-auth/react').then(({ signOut }) => {
        clearAuthStorage();
        signOut({
          callbackUrl: '/professional/join',
          redirect: true
        });
      });
      return;
    }

    if (isAuthenticated && isProfessional) {
      fetchDashboardData();
    }
  }, [status, isAuthenticated, role, userId, searchParams]);

  // Setup SSE connection for professional events
  useEffect(() => {
    if (!isAuthenticated || !isProfessional || !userId) {
      return;
    }

    const client = createProfessionalSSEClient(
      (event: SSEEvent | SSESnapshot) => {
        // Handle snapshot events
        if (event.type === 'snapshot') {
          return; // Initial snapshot - no action needed
        }

        // Handle different event types
        const sseEvent = event as SSEEvent;
        switch (sseEvent.type) {
          case 'request_received':
            // Refresh requests when new request is received
            console.log('[Professional Dashboard] SSE event: request_received', sseEvent);
            throttledRefreshRequests();
            // Show toast notification
            toast.success('Νέο αίτημα λήφθηκε!', {
              icon: '📨',
            });
            break;
          case 'appointment_requested':
          case 'appointment_confirmed':
          case 'appointment_cancelled':
            // Refresh appointments
            getMyAppointments()
              .then((data) => setAppointments(filterOutAvailabilitySlots(data.appointments || [])))
              .catch((err) => console.error('Error refreshing appointments:', err));
            break;
        }
      },
      {
        onConnect: () => {
          console.log('[Professional Dashboard] SSE connected');
        },
        onError: (error) => {
          console.error('[Professional Dashboard] SSE error:', error);
        },
        onDisconnect: () => {
          console.log('[Professional Dashboard] SSE disconnected');
        },
      }
    );

    sseClientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      sseClientRef.current = null;
    };
  }, [isAuthenticated, isProfessional, userId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [profileRes, dealsRes, requestsRes, appointmentsRes] = await Promise.allSettled([
        getMyProfessionalProfile(),
        listDeals({ limit: 50 }),
        getMyRequests().catch(() => ({ requests: [] })),
        getMyAppointments().catch(() => ({ appointments: [] })),
      ]);

      // Handle profile
      if (profileRes.status === 'fulfilled') {
        const profileData = profileRes.value;
        console.log('Profile data:', profileData); // Debug log
        if (profileData.exists && profileData.profile) {
          console.log('Setting profile:', profileData.profile); // Debug log
          setProfile(profileData.profile);
          // Load pricing from services
          const services = profileData.profile.services || {};
          if (services.pricing) {
            setPricing({
              hourlyRate: services.pricing.hourlyRate?.toString() || '',
              consultationFee: services.pricing.consultationFee?.toString() || '',
              onlineFee: services.pricing.onlineFee?.toString() || '',
              inPersonFee: services.pricing.inPersonFee?.toString() || '',
            });
          }
        } else {
          // Profile doesn't exist yet - set to null but don't block dashboard access
          console.log('Profile does not exist or is null'); // Debug log
          setProfile(null);
        }
      } else {
        // If profile fetch failed, log error but don't block dashboard
        console.error('Failed to fetch professional profile:', profileRes.reason);
        setProfile(null);
      }

      // Handle deals
      if (dealsRes.status === 'fulfilled') {
        const dealsData = dealsRes.value;
        setDeals(dealsData.items || []);
        
        // Fetch documents for each deal
        const documentsPromises: Promise<DealDocument[]>[] = [];
        
        dealsData.items?.forEach(deal => {
          documentsPromises.push(
            listDocuments(deal.id).catch(() => [])
          );
        });

        const documentsResults = await Promise.allSettled(documentsPromises);
        if (documentsResults.every(r => r.status === 'fulfilled')) {
          setDocuments(documentsResults.map(r => (r as PromiseFulfilledResult<DealDocument[]>).value).flat());
        }
      }

      // Handle requests
      if (requestsRes.status === 'fulfilled') {
        const requestsData = requestsRes.value as { requests: ProfessionalRequest[] };
        setRequests(requestsData.requests || []);
      }

      // Handle appointments
      if (appointmentsRes.status === 'fulfilled') {
        const appointmentsData = appointmentsRes.value as { appointments: any[] };
        setAppointments(filterOutAvailabilitySlots(appointmentsData.appointments || []));
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      if (err.message?.includes('403') || err.message?.includes('Access denied')) {
        setError('403');
      } else if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        router.push('/login?callbackUrl=/professional/dashboard');
        return;
      } else if (err.message?.includes('429')) {
        toast.error('Πολλές προσπάθειες, δοκίμασε σε λίγο');
      } else {
        setError(err.message || 'Αποτυχία φόρτωσης δεδομένων');
      }
    } finally {
      setLoading(false);
    }
  };

  // Merge deal rooms from accepted requests into deals list (ensure professionals see deals they accepted)
  const dealsForDisplay = useMemo(() => {
    const dealIds = new Set(deals.map(d => d.id));
    const acceptedWithDealRoom = requests.filter(
      (r): r is typeof r & { dealRoom: NonNullable<typeof r.dealRoom> } =>
        r.status === 'ACCEPTED' && !!r.dealRoom && !!r.dealRoom.id
    );
    const fromRequests = acceptedWithDealRoom
      .filter(r => !dealIds.has(r.dealRoom.id))
      .map(r => ({
        ...r.dealRoom,
        id: r.dealRoom.id,
        propertyId: r.dealRoom.property?.id ?? '',
        buyerId: (r.dealRoom as { buyerId?: string }).buyerId ?? '',
        status: (r.dealRoom as { status?: string }).status ?? 'ACTIVE',
        updatedAt: (r.dealRoom as { updatedAt?: string }).updatedAt ?? r.createdAt,
        createdAt: (r.dealRoom as { createdAt?: string }).createdAt ?? r.createdAt,
      })) as DealRoom[];
    return [...deals, ...fromRequests];
  }, [deals, requests]);

  // Compute stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const completedStatuses = new Set(['COMPLETED', 'CLOSED', 'CLOSED_PROPERTY_SOLD']);
    const activeDeals = dealsForDisplay.filter(
      (d) => d.status !== 'CANCELLED' && !completedStatuses.has(d.status)
    ).length;
    const completedDeals = dealsForDisplay.filter((d) => completedStatuses.has(d.status)).length;
    const cancelledDeals = dealsForDisplay.filter((d) => d.status === 'CANCELLED').length;
    const assignedDeals = dealsForDisplay.filter((d) => d.status !== 'CANCELLED').length;
    const completionRate =
      completedDeals + cancelledDeals > 0
        ? Math.round((completedDeals / (completedDeals + cancelledDeals)) * 100)
        : 0;
    const appointmentsToday = appointments.filter(apt => {
      const start = new Date(apt.startAt);
      return start >= now && start <= todayEnd && apt.status === 'CONFIRMED';
    }).length;
    const appointments7Days = appointments.filter(apt => {
      const start = new Date(apt.startAt);
      return start >= now && start <= sevenDaysFromNow && apt.status === 'CONFIRMED';
    }).length;
    const pendingRequests = requests.filter(r => r.status === 'REQUESTED').length;
    const documentsPendingReview = documents.filter(d => 
      d.status === 'UPLOADED' || d.status === 'CHANGES_REQUESTED'
    ).length;
    const tasksCount = 
      documentsPendingReview +
      appointments.filter(apt => apt.status === 'CONFIRMED' && new Date(apt.startAt) >= now).length +
      pendingRequests;

    return {
      activeDeals,
      completedDeals,
      cancelledDeals,
      assignedDeals,
      completionRate,
      appointmentsToday,
      appointments7Days,
      pendingRequests,
      documentsPendingReview,
      tasksCount,
    };
  }, [dealsForDisplay, appointments, requests, documents]);
  
  // Check profile completeness
  const hasProfile = !!profile;
  const hasAvailability = !!profile?.availability;
  const publicProfileSvc = profile?.services?.publicProfile || {};
  const hasPublicBio = !!(profile?.bio && String(profile.bio).trim().length > 0);
  const hasPublicAvatar = !!(
    publicProfileSvc.avatarDataUrl && String(publicProfileSvc.avatarDataUrl).trim().length > 0
  );
  const hasPublicSocial = !!(
    (publicProfileSvc.website && String(publicProfileSvc.website).trim()) ||
    (publicProfileSvc.linkedin && String(publicProfileSvc.linkedin).trim())
  );
  const needsPublicProfileExtras =
    !!profile && (!hasPublicBio || !hasPublicAvatar || !hasPublicSocial);

  // Keep tasks tab badge aligned with TasksTab logic.
  const tasksTabCount = useMemo(() => {
    const now = new Date();
    const hasValidDealId = (value?: string | null) =>
      !!value && value.trim().length > 0 && value !== 'undefined' && value !== 'null';
    const normalizedRole = (role || '').toUpperCase();

    let count = 0;

    // Documents pending review
    count += documents.filter((doc) => hasValidDealId(doc.dealRoomId) && (doc.status === 'UPLOADED' || doc.status === 'CHANGES_REQUESTED')).length;

    // Future confirmed appointments (preparation only for future)
    count += appointments.filter((apt) => {
      if (apt.status !== 'CONFIRMED' || !hasValidDealId(apt.dealRoomId)) return false;
      const start = new Date(apt.startAt);
      return !Number.isNaN(start.getTime()) && start >= now;
    }).length;

    // Appointment requests requiring action
    count += appointments.filter((apt) => apt.status === 'REQUESTED' && hasValidDealId(apt.dealRoomId)).length;

    // Pending professional requests
    count += requests.filter((req) => req.status === 'REQUESTED' && hasValidDealId(req.dealRoomId)).length;

    // Role-specific workflow actions
    dealsForDisplay.forEach((deal) => {
      if (!hasValidDealId(deal.id)) return;
      if (deal.status === 'CANCELLED' || deal.status === 'CLOSED' || deal.status === 'COMPLETED') return;

      const acceptedByRole = (deal.requests || []).some((r) => {
        if (r.status !== 'ACCEPTED' || r.type !== normalizedRole) return false;
        if (r.professional?.user?.id && userId) return r.professional.user.id === userId;
        return true;
      });
      if (!acceptedByRole) return;

      if (normalizedRole === 'NOTARY') {
        if (!deal.notaryApprovedDocumentsAt) count += 1;
        const hasSigningProposal = (deal.appointments || []).some((a) => {
          const isRequestedInPerson = a.status === 'REQUESTED' && a.type === 'IN_PERSON';
          const isAvailabilitySlot = a.note === 'AVAILABLE_SLOT';
          const proposedByOtherUser = !!a.bookedById && (!!userId ? a.bookedById !== userId : true);
          return isRequestedInPerson && !isAvailabilitySlot && proposedByOtherUser;
        });
        if (hasSigningProposal) count += 1;
      }

      if (normalizedRole === 'ENGINEER' && !deal.engineerApprovedSellerDocumentsAt) count += 1;
      if (normalizedRole === 'LAWYER' && !deal.lawyerApprovedSellerDocumentsAt) count += 1;
    });

    // Setup tasks
    if (!hasProfile) count += 1;
    if (!hasAvailability) count += 1;
    if (hasProfile) {
      if (!hasPublicBio) count += 1;
      if (!hasPublicAvatar) count += 1;
      if (!hasPublicSocial) count += 1;
    }

    return count;
  }, [
    appointments,
    dealsForDisplay,
    documents,
    hasAvailability,
    hasProfile,
    hasPublicAvatar,
    hasPublicBio,
    hasPublicSocial,
    requests,
    role,
    userId,
  ]);
  
  // Get upcoming appointments for NextActionPanel
  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return appointments.filter(apt => {
      const start = new Date(apt.startAt);
      return start >= now && start <= weekFromNow && apt.status === 'CONFIRMED';
    }).length;
  }, [appointments]);

  // Get next appointment
  const nextAppointment = useMemo(() => {
    const now = new Date();
    const upcoming = appointments
      .filter(apt => {
        const start = new Date(apt.startAt);
        return start >= now && apt.status === 'CONFIRMED';
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [appointments]);

  // Filter appointments by status
  const requestedAppointments = useMemo(() => {
    return appointments.filter(apt => apt.status === 'REQUESTED');
  }, [appointments]);

  const confirmedAppointments = useMemo(() => {
    return appointments.filter(apt => apt.status === 'CONFIRMED');
  }, [appointments]);
  
  // Get top 3 upcoming appointments for overview
  const topAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter(apt => {
        const start = new Date(apt.startAt);
        return start >= now && apt.status === 'CONFIRMED';
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 3);
  }, [appointments]);

  const sharedProfileUrl = useMemo(() => {
    if (!profile?.id) return '';

    const shareParams = new URLSearchParams();
    const displayName = profile?.displayName || '';
    const roleLabel = ROLE_LABELS[role || ''] || role || '';
    const city = typeof profile?.city === 'string' ? profile.city : '';
    const officeName = typeof profile?.officeName === 'string' ? profile.officeName : '';
    const bio = typeof profile?.bio === 'string' ? profile.bio : '';
    const website = typeof profile?.services?.publicProfile?.website === 'string' ? profile.services.publicProfile.website : '';
    const linkedin = typeof profile?.services?.publicProfile?.linkedin === 'string' ? profile.services.publicProfile.linkedin : '';

    if (displayName) shareParams.set('name', displayName);
    if (roleLabel) shareParams.set('role', roleLabel);
    if (city) shareParams.set('city', city);
    if (officeName) shareParams.set('office', officeName);
    if (bio) shareParams.set('bio', bio);
    if (website) shareParams.set('website', website);
    if (linkedin) shareParams.set('linkedin', linkedin);

    const basePath = `/professionals/profile/${profile.id}`;
    const queryString = shareParams.toString();
    const fullPath = queryString ? `${basePath}?${queryString}` : basePath;

    if (typeof window !== 'undefined') {
      return `${window.location.origin}${fullPath}`;
    }
    return fullPath;
  }, [profile, role]);

  const handleCopySharedProfileUrl = async () => {
    if (!sharedProfileUrl) {
      toast.error('Δεν βρέθηκε σύνδεσμος κοινοποίησης προφίλ');
      return;
    }
    try {
      setIsCopyingShareLink(true);
      await navigator.clipboard.writeText(sharedProfileUrl);
      toast.success('Ο σύνδεσμος προφίλ αντιγράφηκε');
    } catch {
      toast.error('Αποτυχία αντιγραφής συνδέσμου');
    } finally {
      setIsCopyingShareLink(false);
    }
  };

  const selectedDateAppointments = useMemo(() => {
    const selectedKey = selectedOverviewDate.toDateString();
    return appointments
      .filter((apt) => new Date(apt.startAt).toDateString() === selectedKey)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [appointments, selectedOverviewDate]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-teal-600" />
      </div>
    );
  }

  // Role gating
  if (!isProfessional) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaExclamationCircle className="text-3xl text-slate-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Δεν έχετε πρόσβαση</h2>
          <p className="text-slate-500 mb-6">
            Αυτή η σελίδα είναι διαθέσιμη μόνο για επαγγελματίες (Δικηγόρους, Συμβολαιογράφους, Πολιτικούς Μηχανικούς, Λογιστές).
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Επιστροφή στην Αρχική
            </Link>
            <Link
              href="/professional/join"
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Γίνε Επαγγελματίας
            </Link>
          </div>
        </div>
      </div>
    );
  }


  // Error state
  if (error === '403') {
    return (
      <ForbiddenState
        title="Δεν έχετε πρόσβαση"
        subtitle="Δεν έχετε τα απαραίτητα δικαιώματα για να δείτε αυτή τη σελίδα."
        backHref="/"
        backLabel="Επιστροφή στην Αρχική"
      />
    );
  }

  if (error && error !== '403') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaExclamationCircle className="text-3xl text-slate-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Σφάλμα</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Δοκίμασε Ξανά
          </button>
        </div>
      </div>
    );
  }

  const verificationStatus = profile?.verificationStatus || 'UNVERIFIED';
  const verificationBadge = VERIFICATION_BADGES[verificationStatus] || VERIFICATION_BADGES.UNVERIFIED;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Επαγγελματικό Dashboard</h1>
              <div className="mt-2 flex items-center gap-3">
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                  {ROLE_LABELS[role || ''] || role}
                </span>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${verificationBadge.color}`}>
                  {verificationBadge.label}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsShareProfileModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
              >
                <FaShareAlt className="text-xs" />
                Κοινοποίηση Προφίλ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 overflow-x-auto border-b border-slate-200">
            <button
              onClick={() => handleTabChange('overview')}
              className={`relative py-4 px-6 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'text-teal-700 font-semibold border-b-2 border-teal-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <FaHome className="text-xs" />
                Επισκόπηση
              </span>
            </button>
            <button
              onClick={() => handleTabChange('appointments')}
              className={`relative py-4 px-6 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'appointments'
                  ? 'text-teal-700 font-semibold border-b-2 border-teal-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <FaCalendarAlt className="text-xs" />
                Ραντεβού
                {requestedAppointments.length > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    activeTab === 'appointments'
                      ? 'bg-slate-800 text-white'
                      : 'bg-teal-100 text-teal-800'
                  }`}>
                    {requestedAppointments.length}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('deals')}
              className={`relative py-4 px-6 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'deals'
                  ? 'text-teal-700 font-semibold border-b-2 border-teal-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <FaBuilding className="text-xs" />
                Deal Rooms
              </span>
            </button>
            <button
              onClick={() => handleTabChange('tasks')}
              className={`relative py-4 px-6 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'tasks'
                  ? 'text-teal-700 font-semibold border-b-2 border-teal-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <FaTasks className="text-xs" />
                Εκκρεμότητες
                {tasksTabCount > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    activeTab === 'tasks'
                      ? 'bg-slate-800 text-white'
                      : 'bg-teal-100 text-teal-800'
                  }`}>
                    {tasksTabCount}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('requests')}
              className={`relative py-4 px-6 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'requests'
                  ? 'text-teal-700 font-semibold border-b-2 border-teal-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <FaEnvelope className="text-xs" />
                Αιτήματα
                {stats.pendingRequests > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    activeTab === 'requests'
                      ? 'bg-slate-800 text-white'
                      : 'bg-teal-100 text-teal-800'
                  }`}>
                    {stats.pendingRequests}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('pricing')}
              className={`relative py-4 px-6 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'pricing'
                  ? 'text-teal-700 font-semibold border-b-2 border-teal-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <FaUserCircle className="text-xs" />
                Δημόσιο Προφίλ
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Next Action Panel */}
            <NextActionPanel
              pendingRequests={stats.pendingRequests}
              upcomingAppointments={upcomingAppointments}
              pendingTasks={tasksTabCount}
              hasProfile={hasProfile}
              hasAvailability={hasAvailability}
              needsPublicProfileExtras={needsPublicProfileExtras}
            />

            {/* KPI Cards */}
            <ProfessionalKpiCards stats={stats} loading={loading} />

            {/* Grid Layout - 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Calendar + Recent Activity */}
              <div className="space-y-6">
                <CalendarWidget
                  appointments={appointments}
                  loading={loading}
                  onDateClick={setSelectedOverviewDate}
                  showDayAppointments={false}
                />

                {/* Recent Activity */}
                <ActivityFeed
                  deals={dealsForDisplay}
                  requests={requests}
                  userId={userId ?? undefined}
                  role={role}
                  loading={loading}
                />
              </div>

              {/* Right Column: Day Appointments + Upcoming Appointments */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Ραντεβού ημέρας</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {selectedOverviewDate.toLocaleDateString('el-GR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>

                  {selectedDateAppointments.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <FaCalendarAlt className="text-3xl mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">Δεν υπάρχουν ραντεβού για την επιλεγμένη ημερομηνία</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {selectedDateAppointments.map((appointment) => {
                        const deal = deals.find((d) => d.id === appointment.dealRoomId);
                        const startDate = new Date(appointment.startAt);
                        const endDate = new Date(appointment.endAt);
                        return (
                          <Link
                            key={appointment.id}
                            href={`/deals/${appointment.dealRoomId}?tab=appointments`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <h4 className="font-medium text-slate-900 text-sm">
                                  {deal?.property?.title || 'Άγνωστο ακίνητο'}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                  {startDate.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })} -{' '}
                                  {endDate.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {appointment.type || 'Ραντεβού'} - {appointment.status || 'CONFIRMED'}
                                </p>
                              </div>
                              <FaClock className="text-teal-600 shrink-0" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Mini Upcoming Appointments */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Επερχόμενα Ραντεβού</h3>
                  {topAppointments.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <FaCalendarAlt className="text-3xl mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">Δεν υπάρχουν επερχόμενα ραντεβού</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topAppointments.map((appointment) => {
                        const deal = deals.find(d => d.id === appointment.dealRoomId);
                        const startDate = new Date(appointment.startAt);
                        return (
                          <Link
                            key={appointment.id}
                            href={`/deals/${appointment.dealRoomId}?tab=appointments`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-slate-900 text-sm">
                                  {deal?.property?.title || 'Άγνωστο ακίνητο'}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                  {startDate.toLocaleDateString('el-GR', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              <FaCalendarAlt className="text-teal-600" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <AppointmentsTab
            appointments={appointments}
            deals={dealsForDisplay}
            loading={loading}
            onRefresh={fetchDashboardData}
          />
        )}

        {activeTab === 'deals' && (
          <DealRoomsTab deals={dealsForDisplay} loading={loading} />
        )}

        {activeTab === 'tasks' && (
          <TasksTab
            deals={dealsForDisplay}
            appointments={appointments}
            documents={documents}
            requests={requests}
            hasProfile={hasProfile}
            hasAvailability={hasAvailability}
            profile={profile}
            role={role}
            userId={userId}
            loading={loading}
          />
        )}

        {activeTab === 'requests' && (
          <RequestsTab
            requests={requests}
            loading={loading}
            onRefresh={fetchDashboardData}
          />
        )}

        {activeTab === 'pricing' && (
          <PricingTab
            initialPricing={pricing}
            profile={profile}
            role={role}
            loading={loading}
            focusSection={searchParams?.get('section') ?? null}
            onUpdate={fetchDashboardData}
          />
        )}
      </div>

      {isShareProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Κοινοποίηση Προφίλ</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Στείλε τον σύνδεσμο για να δουν το δημόσιο προφίλ σου και πληροφορίες για την πλατφόρμα.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsShareProfileModalOpen(false)}
                className="w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors flex items-center justify-center"
                aria-label="Κλείσιμο"
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-slate-700">Σύνδεσμος Προφίλ</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={sharedProfileUrl}
                  className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 text-sm"
                />
                <button
                  type="button"
                  onClick={handleCopySharedProfileUrl}
                  disabled={isCopyingShareLink || !sharedProfileUrl}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  <FaCopy className="text-xs" />
                  {isCopyingShareLink ? 'Αντιγραφή...' : 'Αντιγραφή'}
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsShareProfileModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors text-sm font-medium"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfessionalDashboardPage() {
  return (
    <>
      <DynamicNavbar />
      <div className="pt-16">
        <Suspense fallback={
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <FaSpinner className="animate-spin text-4xl text-teal-600" />
          </div>
        }>
          <ProfessionalDashboardContent />
        </Suspense>
      </div>

      <footer className="bg-slate-100 border-t border-slate-300/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-sm" />
                </div>
                <span className="text-xl font-bold text-slate-800">RealEstate</span>
              </div>
              <p className="text-slate-600">
                Η πλατφόρμα που συνδέει Δικηγόρους, Συμβολαιογράφους και Μηχανικούς με πελάτες σε οργανωμένο Deal
                Room.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/professionals" className="text-slate-600 hover:text-teal-700 transition-colors duration-200">
                    Επαγγελματίες
                  </Link>
                </li>
                <li>
                  <Link href="/professionals#role-section" className="text-slate-600 hover:text-teal-700 transition-colors duration-200">
                    Πώς λειτουργεί
                  </Link>
                </li>
                <li>
                  <Link href="/professional/join" className="text-slate-600 hover:text-teal-700 transition-colors duration-200">
                    Εγγραφή
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Επικοινωνία</h3>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-center">
                  <FaEnvelope className="mr-2 text-teal-700" />
                  info@realestate.com
                </li>
                <li className="flex items-center">
                  <FaPhone className="mr-2 text-teal-700" />
                  +30 210 1234567
                </li>
                <li className="flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-teal-700" />
                  Αθήνα, Ελλάδα
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-teal-50 text-teal-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200">
                  <FaFacebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-teal-50 text-teal-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200">
                  <FaTwitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-teal-50 text-teal-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200">
                  <FaInstagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-teal-50 text-teal-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200">
                  <FaLinkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-300 mt-8 pt-8 text-center text-slate-600">
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
