'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FaSpinner, FaExchangeAlt } from 'react-icons/fa';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { apiClient, fetchFromBackend } from '@/lib/api/client';
import { listDeals } from '@/lib/api/deals';
import ForbiddenState from '@/components/common/ForbiddenState';
import PropertyListPanel, { Property } from '@/components/deals/PropertyListPanel';
import InterestedBuyersPanel from '@/components/deals/InterestedBuyersPanel';
import SelectPropertyModal from '@/components/deals/SelectPropertyModal';
import SellerLeadsList, { Lead } from '@/components/deals/SellerLeadsList';
import { shouldShowToast } from '@/lib/utils/toastDedupe';
import { debounce } from '@/lib/utils/debounce';

interface PropertyWithLeads extends Property {
  leads: Lead[];
}

export default function SellerDealsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { userId, role, status: authStatus, isAuthenticated } = useCurrentUser();
  const [properties, setProperties] = useState<PropertyWithLeads[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectPropertyModal, setSelectPropertyModal] = useState<{
    isOpen: boolean;
    buyerName: string;
    buyerId: string;
    properties: Property[];
  }>({
    isOpen: false,
    buyerName: '',
    buyerId: '',
    properties: [],
  });
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Authentication check only (no role restriction)
  useEffect(() => {
    if (authStatus === 'loading') return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [authStatus, isAuthenticated, router]);

  // Debounced fetch function
  const debouncedFetchProperties = useRef(
    debounce(async () => {
      await fetchProperties();
    }, 500)
  ).current;

  // Fetch properties with leads
  const fetchProperties = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);
      setRateLimitMessage(null);
      
      const response = await fetchFromBackend('/seller/leads', {
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          setRateLimitMessage('Πολλά αιτήματα. Περίμενε λίγο και δοκίμασε ξανά.');
          if (shouldShowToast('Πολλά αιτήματα. Περίμενε λίγο και δοκίμασε ξανά.', 'error')) {
            toast.error('Πολλά αιτήματα. Περίμενε λίγο και δοκίμασε ξανά.');
          }
          return;
        }
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch properties' }));
        throw new Error(errorData.error || 'Αποτυχία φόρτωσης ακινήτων');
      }

      const data = await response.json();
      setProperties(data || []);
      
      // Auto-select first property if none selected
      if (!selectedPropertyId && data && data.length > 0) {
        setSelectedPropertyId(data[0].id || data[0]._id);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      console.error('Error fetching properties:', err);
      const errorMessage = err.message || 'Αποτυχία φόρτωσης ακινήτων';
      setError(errorMessage);
      
      if (shouldShowToast(errorMessage, 'error')) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProperties();
    }
  }, [isAuthenticated, fetchProperties]);

  // Handle property selection
  const handlePropertySelect = useCallback((propertyId: string) => {
    setSelectedPropertyId(propertyId);
    // Debounce any additional fetches
    debouncedFetchProperties();
  }, [debouncedFetchProperties]);

  // Handle lead click - navigate to deal room
  const handleLeadClick = useCallback(async (lead: Lead, propertyTitle: string) => {
    if (!lead.buyer?.id || !lead.property?.id) {
      toast.error('Λείπουν στοιχεία για το deal room');
      return;
    }

    // Check if buyer has interest in multiple properties
    const buyerProperties = properties
      .flatMap(prop => prop.leads || [])
      .filter(l => l.buyer?.id === lead.buyer.id)
      .map(l => l.property)
      .filter(p => p && p.id); // Filter out undefined/null properties

    const uniqueProperties = Array.from(
      new Map(buyerProperties.map(p => [p.id, p])).values()
    ).filter(p => p); // Filter out any undefined entries

    if (uniqueProperties.length > 1) {
      // Show modal to select property
      setSelectPropertyModal({
        isOpen: true,
        buyerName: lead.buyer.name,
        buyerId: lead.buyer.id,
        properties: uniqueProperties.map(p => {
          const propertyId = p.id;
          const fullProperty = properties.find(prop => prop.id === propertyId);
          return {
            id: propertyId,
            title: p.title || '',
            location: p.location || '',
            price: fullProperty?.price || 0,
            images: fullProperty?.images || [],
            city: fullProperty?.city || '',
            street: fullProperty?.street || '',
            number: fullProperty?.number || '',
            status: fullProperty?.status || 'DRAFT',
          };
        }),
      });
      return;
    }

    // Single property - go directly to deal room
    await navigateToDealRoom(lead.property.id, lead.buyer.id);
  }, [properties]);

  // Navigate to deal room (find existing deal room)
  // Deal rooms are created when buyer expresses interest, and seller should see them via listDeals
  const navigateToDealRoom = useCallback(async (propertyId: string, buyerId: string) => {
    try {
      // Fetch seller's deals - this should include all deals where seller is a participant
      const dealsData = await listDeals({ limit: 100 }); // Get more deals to ensure we find it
      
      console.log('Fetched deals for seller:', {
        total: dealsData.items?.length || 0,
        propertyId,
        buyerId,
        deals: dealsData.items?.map(d => ({ id: d.id, propertyId: d.propertyId, buyerId: d.buyerId }))
      });
      
      // Find deal room matching propertyId and buyerId
      const matchingDeal = dealsData.items?.find((deal) => 
        deal.propertyId === propertyId && deal.buyerId === buyerId
      );
      
      if (matchingDeal) {
        console.log('Found matching deal room:', matchingDeal.id);
        router.push(`/deals/${matchingDeal.id}?tab=overview`);
        return;
      }
      
      // If not found in first page, try pagination
      let cursor = dealsData.nextCursor;
      let pageCount = 0;
      while (cursor && pageCount < 10) { // Limit to 10 pages to avoid infinite loop
        try {
          const nextPage = await listDeals({ cursor, limit: 100 });
          const foundDeal = nextPage.items?.find((deal) => 
            deal.propertyId === propertyId && deal.buyerId === buyerId
          );
          
          if (foundDeal) {
            console.log('Found matching deal room in pagination:', foundDeal.id);
            router.push(`/deals/${foundDeal.id}?tab=overview`);
            return;
          }
          
          cursor = nextPage.nextCursor;
          pageCount++;
        } catch (pageError) {
          console.error('Error fetching next page:', pageError);
          break;
        }
      }
      
      // If still not found, try to create/get it using createDeal
      // This will return existing deal room if it exists (based on propertyId + current user as buyer)
      // But since we're seller, this won't work. Instead, we need to check if deal room exists
      // by trying to access it directly via a backend endpoint that finds by propertyId + buyerId
      
      console.warn('Deal room not found in seller deals list', { 
        propertyId, 
        buyerId,
        searchedDeals: dealsData.items?.length || 0,
        pagesSearched: pageCount + 1
      });
      
      // Try one more time with a fresh fetch in case it was just created
      try {
        const freshDeals = await listDeals({ limit: 100 });
        const freshMatch = freshDeals.items?.find((deal) => 
          deal.propertyId === propertyId && deal.buyerId === buyerId
        );
        
        if (freshMatch) {
          router.push(`/deals/${freshMatch.id}?tab=overview`);
          return;
        }
      } catch (freshError) {
        console.error('Error in fresh fetch:', freshError);
      }
      
      // If still not found, show error
      if (shouldShowToast('Το deal room δεν βρέθηκε. Μπορεί να μην έχει δημιουργηθεί ακόμα ή να μην έχετε πρόσβαση.', 'error')) {
        toast.error('Το deal room δεν βρέθηκε. Μπορεί να μην έχει δημιουργηθεί ακόμα ή να μην έχετε πρόσβαση.');
      }
    } catch (error: any) {
      console.error('Error navigating to deal room:', error);
      if (shouldShowToast(error.message || 'Αποτυχία πρόσβασης στο deal room', 'error')) {
        toast.error(error.message || 'Αποτυχία πρόσβασης στο deal room');
      }
    }
  }, [router]);

  // Handle property selection from modal
  const handlePropertySelectFromModal = useCallback(async (propertyId: string) => {
    await navigateToDealRoom(propertyId, selectPropertyModal.buyerId);
  }, [selectPropertyModal.buyerId, navigateToDealRoom]);

  // Get all leads (flattened from all properties)
  const allLeads = properties.flatMap(prop => 
    (prop.leads || []).map(lead => ({
      ...lead,
      property: {
        id: prop.id || prop._id!,
        title: prop.title,
        location: prop.location || `${prop.city}, ${prop.street} ${prop.number}`,
      },
    }))
  );

  // Loading state
  if (authStatus === 'loading' || (isAuthenticated && loading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-green-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!isAuthenticated) {
    return null; // Will redirect
  }

  // Error state
  if (error && !properties.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Σφάλμα</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => fetchProperties()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Δοκίμασε Ξανά
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Οι Συναλλαγές μου</h1>
              <p className="text-sm text-gray-600 mt-1">
                Διαχειρίσου τα ακίνητά σου και τους ενδιαφερόμενους
              </p>
            </div>
            <div className="flex items-center gap-3">
              {rateLimitMessage && (
                <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  {rateLimitMessage}
                </div>
              )}
              <button
                onClick={() => router.push('/dashboard/seller')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-all flex items-center gap-2"
              >
                <FaExchangeAlt className="text-xs" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile: Tabs */}
        <div className="lg:hidden mb-6">
          <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-2 flex gap-2">
            <button
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPropertyId
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-green-600 text-white'
              }`}
              onClick={() => setSelectedPropertyId(null)}
            >
              Ακίνητα
            </button>
            <button
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPropertyId
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
              onClick={() => {
                if (properties.length > 0) {
                  setSelectedPropertyId(properties[0].id || properties[0]._id!);
                }
              }}
            >
              Ενδιαφερόμενοι
            </button>
          </div>
        </div>

        {/* Desktop: Split Layout */}
        <div className="hidden lg:grid lg:grid-cols-[35%_65%] gap-6">
          {/* Left: Properties */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <PropertyListPanel
              properties={properties}
              selectedPropertyId={selectedPropertyId}
              onPropertySelect={handlePropertySelect}
              loading={loading}
            />
          </motion.div>

          {/* Right: Interested Buyers */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <InterestedBuyersPanel
              leads={allLeads}
              selectedPropertyId={selectedPropertyId}
              properties={properties.map(p => ({ id: p.id || p._id!, title: p.title }))}
              onLeadClick={handleLeadClick}
              loading={loading}
            />
          </motion.div>
        </div>

        {/* Mobile: Stacked View */}
        <div className="lg:hidden space-y-6">
          {!selectedPropertyId ? (
            <PropertyListPanel
              properties={properties}
              selectedPropertyId={selectedPropertyId}
              onPropertySelect={handlePropertySelect}
              loading={loading}
            />
          ) : (
            <InterestedBuyersPanel
              leads={allLeads}
              selectedPropertyId={selectedPropertyId}
              properties={properties.map(p => ({ id: p.id || p._id!, title: p.title }))}
              onLeadClick={handleLeadClick}
              loading={loading}
            />
          )}
        </div>
      </div>

      {/* Select Property Modal */}
      <SelectPropertyModal
        isOpen={selectPropertyModal.isOpen}
        onClose={() => setSelectPropertyModal({ ...selectPropertyModal, isOpen: false })}
        properties={selectPropertyModal.properties}
        buyerName={selectPropertyModal.buyerName}
        onSelect={handlePropertySelectFromModal}
      />
    </div>
  );
}

