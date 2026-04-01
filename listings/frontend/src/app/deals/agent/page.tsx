'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FaSpinner, FaExchangeAlt, FaUsers, FaSearch, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { apiClient } from '@/lib/api/client';
import { listDeals } from '@/lib/api/deals';
import { shouldShowToast } from '@/lib/utils/toastDedupe';

interface TransactionNotification {
  id: string;
  message: string;
  recipient: 'buyer' | 'seller' | 'agent';
  stage: string;
  category: 'appointment' | 'payment' | 'contract' | 'completion' | 'general' | 'offer';
  createdAt: string;
  isUnread: boolean;
}

interface Client {
  id: string;
  buyerId?: string;
  name: string;
  email: string;
  phone: string | null;
  connectionDate: string;
  lastContact: string;
  property: {
    id: string;
    title: string;
    price: number;
    location: string;
    type: string;
    status: string;
    images: string[];
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    features?: string[];
  };
  status: string;
  transactionId: string;
  notes: string | null;
  transaction?: {
    id: string;
    createdAt: string;
    agent?: {
      name: string;
      email: string;
      phone?: string;
    };
    progress: {
      stage: string;
      updatedAt: string;
      notifications: TransactionNotification[];
    };
  };
}

export default function AgentDealsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { userId, status: authStatus, isAuthenticated } = useCurrentUser();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Authentication check
  useEffect(() => {
    if (authStatus === 'loading') return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [authStatus, isAuthenticated, router]);

  // Fetch clients (same as agent dashboard)
  const fetchClients = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);
      
      if (!session?.user) {
        console.log('No session found');
        setLoading(false);
        return;
      }

      console.log('Fetching clients for user:', session.user);
      const { data } = await apiClient.get('/agents/clients');
      
      if (!Array.isArray(data)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }
      
      setClients(deduplicateClients(data));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      console.error('Error fetching clients:', err);
      const errorMessage = err.message || 'Αποτυχία φόρτωσης πελατών';
      setError(errorMessage);
      setClients([]);
      
      if (shouldShowToast(errorMessage, 'error')) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (isAuthenticated && session?.user) {
      fetchClients();
    }
  }, [isAuthenticated, session, fetchClients]);

  // Deduplicate clients (same logic as agent dashboard)
  function deduplicateClients(clients: Client[]): Client[] {
    const sorted = [...clients].sort((a, b) => 
      new Date(b.transaction?.createdAt || b.connectionDate).getTime() - 
      new Date(a.transaction?.createdAt || a.connectionDate).getTime()
    );
    const seen = new Set();
    const unique: Client[] = [];
    for (const client of sorted) {
      const key = `${client.property.id}_${client.email}`;
      if (!seen.has(key)) {
        unique.push(client);
        seen.add(key);
      }
    }
    return unique;
  }

  // Helper function to check if client is new (connected within last 7 days)
  const isNewClient = (connectionDate: string) => {
    return new Date(connectionDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  };

  // Sort clients function
  const sortClients = (clients: Client[]) => {
    if (!sortConfig) return clients;
    
    return [...clients].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortConfig.key) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'stage':
          aValue = a.transaction?.progress?.stage || a.status;
          bValue = b.transaction?.progress?.stage || b.status;
          break;
        case 'connectionDate':
          aValue = new Date(a.connectionDate);
          bValue = new Date(b.connectionDate);
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Handle sort click
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') {
          return { key, direction: 'desc' };
        } else {
          return null; // Remove sorting
        }
      } else {
        return { key, direction: 'asc' };
      }
    });
  };

  // Get sort icon
  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) {
      return <FaSort className="ml-1 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <FaSortUp className="ml-1 text-blue-600" />
      : <FaSortDown className="ml-1 text-blue-600" />;
  };

  // Filter and sort clients
  const filteredAndSortedClients = sortClients(
    clients.filter(client => 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Navigate to deal room (find existing deal room)
  const navigateToDealRoom = useCallback(async (propertyId: string, buyerId: string) => {
    try {
      // Fetch agent's deals - this should include all deals where agent is a participant
      const dealsData = await listDeals({ limit: 100 });
      
      console.log('Fetched deals for agent:', {
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
      while (cursor && pageCount < 10) {
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

  // Handle client click - navigate to deal room
  const handleClientClick = useCallback(async (client: Client) => {
    if (!client.property?.id) {
      toast.error('Λείπουν στοιχεία για το deal room');
      return;
    }

    // Use buyerId if available, otherwise fall back to email matching
    const buyerId = client.buyerId;
    
    if (buyerId) {
      // Use the same navigation logic as seller page
      await navigateToDealRoom(client.property.id, buyerId);
    } else {
      // Fallback: search deals by propertyId and match by email
      try {
        const dealsData = await listDeals({ limit: 100 });
        
        // Find deals matching propertyId where agent is participant
        const propertyDeals = dealsData.items?.filter((deal) => 
          deal.propertyId === client.property.id &&
          deal.agentId === userId
        ) || [];
        
        // Try to find deal by matching buyer email from participants
        const matchingDeal = propertyDeals.find((deal) => {
          const buyerParticipant = deal.participants?.find((p: any) => p.role === 'BUYER');
          return buyerParticipant?.user?.email === client.email;
        });
        
        if (matchingDeal) {
          router.push(`/deals/${matchingDeal.id}?tab=overview`);
          return;
        }
        
        // If not found, try pagination
        let cursor = dealsData.nextCursor;
        let pageCount = 0;
        while (cursor && pageCount < 10) {
          try {
            const nextPage = await listDeals({ cursor, limit: 100 });
            const propertyDealsNext = nextPage.items?.filter((deal) => 
              deal.propertyId === client.property.id &&
              deal.agentId === userId
            ) || [];
            
            const foundDeal = propertyDealsNext.find((deal) => {
              const buyerParticipant = deal.participants?.find((p: any) => p.role === 'BUYER');
              return buyerParticipant?.user?.email === client.email;
            });
            
            if (foundDeal) {
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
        
        // If still not found, show error
        if (shouldShowToast('Το deal room δεν βρέθηκε. Μπορεί να μην έχει δημιουργηθεί ακόμα.', 'error')) {
          toast.error('Το deal room δεν βρέθηκε. Μπορεί να μην έχει δημιουργηθεί ακόμα.');
        }
      } catch (error: any) {
        console.error('Error navigating to deal room:', error);
        if (shouldShowToast(error.message || 'Αποτυχία πρόσβασης στο deal room', 'error')) {
          toast.error(error.message || 'Αποτυχία πρόσβασης στο deal room');
        }
      }
    }
  }, [router, userId, navigateToDealRoom]);

  // Loading state
  if (authStatus === 'loading' || (isAuthenticated && loading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
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
  if (error && !clients.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Σφάλμα</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => fetchClients()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                Διαχειρίσου τους πελάτες σου
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard/agent')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-all flex items-center gap-2"
              >
                <FaExchangeAlt className="text-xs" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          {/* Search Controls */}
          <div className="p-6 border-b border-gray-200">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="Αναζήτηση πελατών..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          {/* Clients List */}
          {filteredAndSortedClients.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center border border-dashed border-gray-300 m-6">
              <FaUsers className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Δεν έχετε πελάτες ακόμα</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Οι πελάτες σας θα εμφανίζονται εδώ όταν συνδεθούν μαζί σας
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Όνομα
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Τηλέφωνο
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('stage')}
                    >
                      <div className="flex items-center">
                        Στάδιο Συναλλαγής
                        {getSortIcon('stage')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('connectionDate')}
                    >
                      <div className="flex items-center">
                        Ημερομηνία Σύνδεσης
                        {getSortIcon('connectionDate')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedClients.map((client: Client) => (
                    <tr 
                      key={client.id}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                        isNewClient(client.connectionDate) ? 'bg-yellow-50 hover:bg-yellow-100' : ''
                      }`}
                      onClick={() => handleClientClick(client)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium">{client.name?.[0]?.toUpperCase() || '?'}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              {client.name}
                              {isNewClient(client.connectionDate) && (
                                <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-200 text-yellow-800 rounded-full">
                                  Νέος
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{client.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{client.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const stage = client.transaction?.progress?.stage || client.status;
                          let label = '';
                          let color = '';
                          switch (stage) {
                            case 'PENDING':
                            case 'pending':
                              label = 'Αναμονή για ραντεβού';
                              color = 'bg-yellow-100 text-yellow-800';
                              break;
                            case 'MEETING_SCHEDULED':
                            case 'viewing_scheduled':
                              label = 'Έγινε ραντεβού';
                              color = 'bg-blue-100 text-blue-800';
                              break;
                            case 'DEPOSIT_PAID':
                              label = 'Έγινε προκαταβολή';
                              color = 'bg-green-100 text-green-800';
                              break;
                            case 'FINAL_SIGNING':
                            case 'offer_made':
                              label = 'Τελική υπογραφή';
                              color = 'bg-indigo-100 text-indigo-800';
                              break;
                            case 'COMPLETED':
                            case 'completed':
                              label = 'Ολοκληρώθηκε';
                              color = 'bg-purple-100 text-purple-800';
                              break;
                            case 'CANCELLED':
                            case 'rejected':
                              label = 'Ακυρώθηκε';
                              color = 'bg-red-100 text-red-800';
                              break;
                            case 'accepted':
                              label = 'Αποδεκτή';
                              color = 'bg-green-100 text-green-800';
                              break;
                            default:
                              label = stage;
                              color = 'bg-gray-100 text-gray-800';
                          }
                          return (
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${color}`}>
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(client.connectionDate).toLocaleDateString('el-GR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

