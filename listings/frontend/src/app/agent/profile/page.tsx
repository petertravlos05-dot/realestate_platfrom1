"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from '@/lib/api/client';
import { 
  FaUserEdit, 
  FaEnvelope, 
  FaPhone, 
  FaBuilding, 
  FaMapMarkerAlt, 
  FaCheckCircle,
  FaHome,
  FaBuilding as FaProperties,
  FaCalendarAlt,
  FaComments,
  FaUser,
  FaExchangeAlt,
  FaHeart,
  FaGift,
  FaCog,
  FaSignOutAlt,
  FaChevronRight,
  FaStar,
  FaClock,
  FaMapPin,
  FaChevronDown,
  FaTachometerAlt,
  FaBell,
  FaUserTie,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaCopy,
  FaShare,
  FaInfoCircle,
  FaCheck,
  FaExternalLinkAlt,
  FaTrophy
} from "react-icons/fa";
import { useRouter } from "next/navigation";

interface Agent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  businessAddress?: string;
  role: string;
  image?: string;
  createdAt?: string;
}



export default function AgentProfilePage() {
  const { data: session } = useSession();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [referralLink, setReferralLink] = useState<string>('');
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [showReferralInfo, setShowReferralInfo] = useState(false);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAgent = async () => {
      if (!session?.user?.id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/agents/${session.user.id}`);
        const data = await res.json();
        setAgent(data.agent);
      } catch (error) {
        console.error('Error fetching agent:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAgent();
  }, [session?.user?.id]);



  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'BUYER') {
      router.push('/buyer');
    } else if (role === 'SELLER') {
      router.push('/seller');
    }
  };

  const generateReferralLink = async () => {
    try {
      const { data } = await apiClient.post('/referrals/generate-link');
      setReferralLink(data.referralLink);
    } catch (error) {
      console.error('Error generating referral link:', error);
    }
  };

  const copyReferralLink = async () => {
    if (referralLink) {
      try {
        await navigator.clipboard.writeText(referralLink);
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share && referralLink) {
      try {
        await navigator.share({
          title: 'Εγγραφείτε στην πλατφόρμα μας',
          text: 'Χρησιμοποιήστε τον προσωπικό μου σύνδεσμο για εγγραφή!',
          url: referralLink,
        });
      } catch (err) {
        console.error('Failed to share:', err);
      }
    } else {
      copyReferralLink();
    }
  };

  const fetchReferralStats = async () => {
    if (!session?.user?.id) {
      console.log('No session user ID available');
      return;
    }
    
    setLoadingStats(true);
    try {
      console.log('=== Fetching referral stats ===');
      console.log('User ID:', session.user.id);
      console.log('User role:', session.user.role);
      
      const url = `/api/referrals/stats?userId=${session.user.id}`;
      console.log('Request URL:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('Stats data received:', data);
        console.log('Total points:', data.totalPoints);
        console.log('Points array length:', data.points?.length || 0);
        console.log('Referrals array length:', data.referrals?.length || 0);
        setReferralStats(data);
      } else {
        console.error('Stats response not ok:', response.status);
        const errorData = await response.json();
        console.error('Stats error data:', errorData);
      }
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoadingStats(false);
      console.log('=== Fetch referral stats completed ===');
    }
  };

  const fetchLeaderboard = async () => {
    if (!session?.user?.id) {
      console.log('No session user ID available for leaderboard');
      return;
    }
    
    setLoadingLeaderboard(true);
    try {
      console.log('=== Fetching leaderboard ===');
      
      const { data } = await apiClient.get('/referrals/leaderboard');
      console.log('Leaderboard data received:', data);
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoadingLeaderboard(false);
      console.log('=== Fetch leaderboard completed ===');
    }
  };

  // Fetch referral stats when referrals tab is active
  useEffect(() => {
    if (activeTab === 'referrals') {
      fetchReferralStats();
      fetchLeaderboard();
    }
  }, [activeTab, session?.user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001f3f] mx-auto mb-4"></div>
          <p className="text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>Δεν βρέθηκαν στοιχεία προφίλ.</p>
        </div>
      </div>
    );
  }

  // Helper functions for rewards tiers
  const getCurrentTier = (points: number) => {
    if (points >= 7000) return 'Platinum';
    if (points >= 3000) return 'Gold';
    if (points >= 1000) return 'Silver';
    return 'Bronze';
  };

  const getCurrentTierIcon = (points: number) => {
    if (points >= 7000) return '💎';
    if (points >= 3000) return '🥇';
    if (points >= 1000) return '🥈';
    return '🥉';
  };

  const getCurrentTierDescription = (points: number) => {
    if (points >= 7000) return 'Elite Agent - Πρόσβαση σε όλα τα VIP rewards';
    if (points >= 3000) return 'Premium Agent - Πρόσβαση σε χρυσά rewards';
    if (points >= 1000) return 'Advanced Agent - Πρόσβαση σε ασημένια rewards';
    return 'Starter Agent - Πρόσβαση σε βασικά rewards';
  };

  const getNextTierThreshold = (points: number) => {
    if (points >= 7000) return '∞';
    if (points >= 3000) return '7,000';
    if (points >= 1000) return '3,000';
    return '1,000';
  };

  const getProgressPercentage = (points: number) => {
    if (points >= 7000) return 100;
    if (points >= 3000) return Math.min(((points - 3000) / 4000) * 100, 100);
    if (points >= 1000) return Math.min(((points - 1000) / 2000) * 100, 100);
    return Math.min((points / 1000) * 100, 100);
  };

  const getProgressMessage = (points: number) => {
    if (points >= 7000) return 'Έχετε φτάσει στο ανώτατο επίπεδο! 🎉';
    if (points >= 3000) return `${Math.max(7000 - points, 0)} πόντους ακόμα για Platinum`;
    if (points >= 1000) return `${Math.max(3000 - points, 0)} πόντους ακόμα για Gold`;
    return `${Math.max(1000 - points, 0)} πόντους ακόμα για Silver`;
  };

  const getProgressBarColors = (points: number) => {
    if (points >= 7000) return 'from-purple-400 via-purple-500 to-purple-600'; // Platinum
    if (points >= 3000) return 'from-yellow-400 via-yellow-500 to-yellow-600'; // Gold
    if (points >= 1000) return 'from-gray-400 via-gray-500 to-gray-600'; // Silver
    return 'from-amber-400 via-amber-500 to-amber-600'; // Bronze
  };

  const getProgressBarBackground = (points: number) => {
    if (points >= 7000) return 'bg-purple-200 bg-opacity-30'; // Platinum
    if (points >= 3000) return 'bg-yellow-200 bg-opacity-30'; // Gold
    if (points >= 1000) return 'bg-gray-200 bg-opacity-30'; // Silver
    return 'bg-amber-200 bg-opacity-30'; // Bronze
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Τα στοιχεία μου</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FaEnvelope className="text-[#001f3f] mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{agent.email}</p>
                    </div>
                  </div>
                  <button className="text-[#001f3f] text-sm font-medium hover:text-[#003366] transition-colors">Επεξεργασία</button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FaPhone className="text-[#001f3f] mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Τηλέφωνο</p>
                      <p className="font-medium">{agent.phone || 'Δεν έχει δηλωθεί'}</p>
                    </div>
                  </div>
                  <button className="text-[#001f3f] text-sm font-medium hover:text-[#003366] transition-colors">Επεξεργασία</button>
                </div>
                {agent.companyName && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <FaBuilding className="text-[#001f3f] mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Εταιρεία</p>
                        <p className="font-medium">{agent.companyName}</p>
                      </div>
                    </div>
                    <button className="text-[#001f3f] text-sm font-medium hover:text-[#003366] transition-colors">Επεξεργασία</button>
                  </div>
                )}
                {agent.businessAddress && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="text-[#001f3f] mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Διεύθυνση</p>
                        <p className="font-medium">{agent.businessAddress}</p>
                      </div>
                    </div>
                    <button className="text-[#001f3f] text-sm font-medium hover:text-[#003366] transition-colors">Επεξεργασία</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );



      case 'referrals':
        return (
          <div className="space-y-6">
            {/* Main Rewards Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">🏆 Rewards & Achievements</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      fetchReferralStats();
                      fetchLeaderboard();
                    }}
                    disabled={loadingStats || loadingLeaderboard}
                    className="bg-[#001f3f] text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-[#003366] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loadingStats || loadingLeaderboard ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Φόρτωση...
                      </>
                    ) : (
                      <>
                        <FaExternalLinkAlt className="mr-2" />
                        Ανανέωση
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowReferralInfo(!showReferralInfo)}
                    className="text-[#001f3f] hover:text-[#003366] transition-colors"
                    title="Πληροφορίες για το σύστημα rewards"
                  >
                    <FaInfoCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Current Tier & Progress */}
              <div className="bg-gradient-to-r from-[#001f3f] to-[#003366] rounded-xl p-8 text-white mb-8 relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <FaGift className="text-5xl text-blue-200 opacity-80" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-3xl font-bold">Πόντοι σας</h4>
                    <div className="text-right">
                      <p className="text-5xl font-bold">
                        {loadingStats ? '...' : (referralStats?.totalPoints || 0).toLocaleString()}
                      </p>
                      <p className="text-xl font-semibold text-blue-100">
                        Αξία: €{loadingStats ? '...' : ((referralStats?.totalPoints || 0) * 0.1).toFixed(0)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Dynamic Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-blue-100 mb-2">
                      <span>Πρόοδος προς επόμενο επίπεδο</span>
                      <span>
                        {loadingStats ? '...' : (referralStats?.totalPoints || 0)} / {getNextTierThreshold(referralStats?.totalPoints || 0)}
                      </span>
                    </div>
                    <div className={`w-full ${getProgressBarBackground(referralStats?.totalPoints || 0)} rounded-full h-4`}>
                      <motion.div
                        className={`bg-gradient-to-r ${getProgressBarColors(referralStats?.totalPoints || 0)} h-4 rounded-full relative overflow-hidden`}
                        initial={{ width: 0 }}
                        animate={{ 
                          width: loadingStats ? '0%' : `${getProgressPercentage(referralStats?.totalPoints || 0)}%` 
                        }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                      </motion.div>
                    </div>
                    <p className="text-sm text-blue-100 mt-2">
                      {loadingStats ? 'Φόρτωση...' : getProgressMessage(referralStats?.totalPoints || 0)}
                    </p>
                  </div>

                  {/* Current Tier Badge */}
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getCurrentTierIcon(referralStats?.totalPoints || 0)}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-blue-100">
                        Επίπεδο: {getCurrentTier(referralStats?.totalPoints || 0)}
                      </p>
                      <p className="text-sm text-blue-200">
                        {getCurrentTierDescription(referralStats?.totalPoints || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Referral Link Section */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-lg font-semibold text-gray-800">Προσωπικός σύνδεσμος</h5>
                  <div className="flex space-x-2">
                    <button
                      onClick={generateReferralLink}
                      className="bg-[#001f3f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#003366] transition-colors flex items-center"
                    >
                      <FaExternalLinkAlt className="mr-2" />
                      Δημιουργία συνδέσμου
                    </button>
                  </div>
                </div>
                
                {referralLink && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-gray-200">
                      <input
                        type="text"
                        value={referralLink}
                        readOnly
                        className="flex-1 text-sm text-gray-600 bg-transparent outline-none"
                      />
                      <button
                        onClick={copyReferralLink}
                        className={`p-2 rounded-lg transition-colors ${
                          isLinkCopied 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={isLinkCopied ? 'Αντιγράφηκε!' : 'Αντιγραφή συνδέσμου'}
                      >
                        {isLinkCopied ? <FaCheck className="w-4 h-4" /> : <FaCopy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={shareReferralLink}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Μοιρασμός συνδέσμου"
                      >
                        <FaShare className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Μοιραστείτε αυτόν τον σύνδεσμο με φίλους και κερδίστε πόντους όταν εγγραφούν!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Rewards Tiers */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">🎁 Rewards ανά Επίπεδο</h3>
                <button className="bg-[#001f3f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#003366] transition-colors flex items-center">
                  <FaTrophy className="mr-2" />
                  See Top Agents
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bronze Tier */}
                <div className={`border-2 rounded-xl p-6 transition-all duration-300 ${
                  getCurrentTier(referralStats?.totalPoints || 0) === 'Bronze' 
                    ? 'border-amber-500 bg-amber-50 shadow-lg' 
                    : 'border-gray-200 hover:border-amber-300'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">🥉</span>
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">Bronze</h4>
                        <p className="text-sm text-gray-600">0 - 999 πόντοι</p>
                      </div>
                    </div>
                    {getCurrentTier(referralStats?.totalPoints || 0) === 'Bronze' && (
                      <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Ενεργό
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Δυνατότητα συμμετοχής σε βασικές κληρώσεις</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Εμφάνιση referral badge στο προφίλ</span>
                    </div>
                  </div>
                </div>

                {/* Silver Tier */}
                <div className={`border-2 rounded-xl p-6 transition-all duration-300 ${
                  getCurrentTier(referralStats?.totalPoints || 0) === 'Silver' 
                    ? 'border-gray-400 bg-gray-50 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">🥈</span>
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">Silver</h4>
                        <p className="text-sm text-gray-600">1,000 - 2,999 πόντοι</p>
                      </div>
                    </div>
                    {getCurrentTier(referralStats?.totalPoints || 0) === 'Silver' && (
                      <span className="bg-gray-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Ενεργό
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Επιλογή για εμφάνιση δικού του ακινήτου σε καλύτερη θέση</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Έκπτωση σε συνεργαζόμενους δικηγόρους</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Πρόσβαση σε AI εργαλεία αξιολόγησης</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Συμμετοχή σε πιο "δυνατές" κληρώσεις</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Προσωπική στατιστική ανάλυση επιδόσεων</span>
                    </div>
                  </div>
                </div>

                {/* Gold Tier */}
                <div className={`border-2 rounded-xl p-6 transition-all duration-300 ${
                  getCurrentTier(referralStats?.totalPoints || 0) === 'Gold' 
                    ? 'border-yellow-500 bg-yellow-50 shadow-lg' 
                    : 'border-gray-200 hover:border-yellow-300'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">🥇</span>
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">Gold</h4>
                        <p className="text-sm text-gray-600">3,000 - 6,999 πόντοι</p>
                      </div>
                    </div>
                    {getCurrentTier(referralStats?.totalPoints || 0) === 'Gold' && (
                      <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Ενεργό
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Χρηματικό ποσό bonus (π.χ. 50€)</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Verified badge στο προφίλ</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Τυχαία μετοχή όπως στο Robinhood</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Δωρεάν συμμετοχή σε newsletter για επαγγελματική ανάπτυξη</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Πρόσβαση σε ειδικές προσφορές</span>
                    </div>
                  </div>
                </div>

                {/* Platinum Tier */}
                <div className={`border-2 rounded-xl p-6 transition-all duration-300 ${
                  getCurrentTier(referralStats?.totalPoints || 0) === 'Platinum' 
                    ? 'border-purple-500 bg-purple-50 shadow-lg' 
                    : 'border-gray-200 hover:border-purple-300'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">💎</span>
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">Platinum</h4>
                        <p className="text-sm text-gray-600">7,000+ πόντοι</p>
                      </div>
                    </div>
                    {getCurrentTier(referralStats?.totalPoints || 0) === 'Platinum' && (
                      <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Ενεργό
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Μεγαλύτερη προμήθεια από τις αγοραπωλησίες που φέρνει</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Δικαίωμα διαφήμισης της εταιρίας του μέσα στην πλατφόρμα</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Συμμετοχή σε VIP ταξιδιωτικές/βιωματικές κληρώσεις</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Προβολή στο monthly leaderboard</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Αυτόματη συμμετοχή σε μηνιαία & ετήσια elite κληρώσεις</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Summary */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-800 mb-6">📊 Σύνοψη Referrals</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100">Συνολικές Εγγραφές</p>
                      <p className="text-3xl font-bold">
                        {loadingStats ? '...' : (referralStats?.totalRegistrations || 0)}
                      </p>
                    </div>
                    <FaUser className="text-4xl text-green-200 opacity-80" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-100">Καταχωρήσεις Ακινήτων</p>
                      <p className="text-3xl font-bold">
                        {loadingStats ? '...' : (referralStats?.totalProperties || 0)}
                      </p>
                    </div>
                    <FaBuilding className="text-4xl text-blue-200 opacity-80" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-100">Αγοραπωλησίες</p>
                      <p className="text-3xl font-bold">
                        {loadingStats ? '...' : (referralStats?.totalSales || 0)}
                      </p>
                    </div>
                    <FaExchangeAlt className="text-4xl text-purple-200 opacity-80" />
                  </div>
                </div>
              </div>
            </div>

            {/* Points History */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-lg font-semibold text-gray-800">Ιστορικό πόντων</h5>
                <button className="text-[#001f3f] text-sm font-medium hover:text-[#003366] transition-colors">
                  Προβολή όλων
                </button>
              </div>
              <div className="space-y-4">
                {loadingStats ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#001f3f] mx-auto mb-4"></div>
                    <p className="text-gray-500">Φόρτωση ιστορικού...</p>
                  </div>
                ) : referralStats?.points?.length > 0 ? (
                  referralStats.points.map((point: any) => (
                    <div key={point.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                          point.reason === 'registration' ? 'bg-green-100' : 
                          point.reason === 'property_added' ? 'bg-blue-100' :
                          point.reason === 'admin_bonus' ? 'bg-purple-100' :
                          point.reason === 'compensation' ? 'bg-yellow-100' :
                          point.reason === 'promotion' ? 'bg-indigo-100' :
                          point.reason === 'correction' ? 'bg-orange-100' :
                          point.reason === 'penalty' ? 'bg-red-100' :
                          point.reason === 'refund' ? 'bg-teal-100' :
                          'bg-gray-100'
                        }`}>
                          {point.reason === 'registration' ? (
                            <FaUser className="text-green-600" />
                          ) : point.reason === 'property_added' ? (
                            <FaBuilding className="text-blue-600" />
                          ) : point.reason === 'admin_bonus' ? (
                            <FaGift className="text-purple-600" />
                          ) : point.reason === 'compensation' ? (
                            <FaGift className="text-yellow-600" />
                          ) : point.reason === 'promotion' ? (
                            <FaGift className="text-indigo-600" />
                          ) : point.reason === 'correction' ? (
                            <FaGift className="text-orange-600" />
                          ) : point.reason === 'penalty' ? (
                            <FaGift className="text-red-600" />
                          ) : point.reason === 'refund' ? (
                            <FaGift className="text-teal-600" />
                          ) : (
                            <FaGift className="text-gray-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {point.reason === 'registration' 
                              ? 'Εγγραφή φίλου'
                              : point.reason === 'property_added'
                              ? 'Προσθήκη ακινήτου'
                              : point.reason === 'admin_bonus'
                              ? 'Admin Bonus'
                              : point.reason === 'compensation'
                              ? 'Αποζημίωση'
                              : point.reason === 'promotion'
                              ? 'Προώθηση'
                              : point.reason === 'correction'
                              ? 'Διόρθωση'
                              : point.reason === 'penalty'
                              ? 'Ποινή'
                              : point.reason === 'refund'
                              ? 'Επιστροφή'
                              : 'Άλλο'
                            }
                            {point.propertyId && ` • Property ID: ${point.propertyId}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(point.createdAt).toLocaleDateString('el-GR')}
                          </p>
                        </div>
                      </div>
                      <span className={`font-semibold ${point.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {point.points > 0 ? '+' : ''}{point.points} πόντους
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FaGift className="text-4xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Δεν υπάρχουν ακόμα πόντους</p>
                    <p className="text-sm text-gray-400 mt-2">Μοιραστείτε τον σύνδεσμό σας για να ξεκινήσετε!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Leaderboard Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">🏆 Top 10 Referral Champions</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={fetchLeaderboard}
                    disabled={loadingLeaderboard}
                    className="bg-[#001f3f] text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-[#003366] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loadingLeaderboard ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Φόρτωση...
                      </>
                    ) : (
                      <>
                        <FaExternalLinkAlt className="mr-2" />
                        Ανανέωση
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Current User Position */}
              {leaderboardData?.currentUser ? (
                <div className="bg-gradient-to-r from-[#001f3f] to-[#003366] rounded-xl p-4 mb-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl font-bold">#{leaderboardData.currentUser.rank}</div>
                      <div>
                        <p className="font-semibold">Η θέση σας</p>
                        <p className="text-sm text-blue-100">
                          {leaderboardData.currentUser.totalPoints.toLocaleString()} πόντους • {leaderboardData.currentUser.totalReferrals} referrals
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-100">Από {leaderboardData.totalUsers} χρήστες</p>
                      <p className="text-lg font-bold">
                        {leaderboardData.currentUser.rank === 1 ? '🥇 1η θέση!' :
                         leaderboardData.currentUser.rank === 2 ? '🥈 2η θέση!' :
                         leaderboardData.currentUser.rank === 3 ? '🥉 3η θέση!' :
                         `${leaderboardData.currentUser.rank}η θέση`}
                      </p>
                    </div>
                  </div>
                </div>
              ) : leaderboardData && (
                <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl p-4 mb-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl font-bold">-</div>
                      <div>
                        <p className="font-semibold">Η θέση σας</p>
                        <p className="text-sm text-gray-200">
                          Δεν έχετε ακόμα πόντους
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-200">Από {leaderboardData.totalAgents} agents</p>
                      <p className="text-lg font-bold">
                        Ξεκινήστε να κερδίζετε πόντους!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard List */}
              <div className="space-y-3">
                {loadingLeaderboard ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#001f3f] mx-auto mb-4"></div>
                    <p className="text-gray-500">Φόρτωση leaderboard...</p>
                  </div>
                ) : leaderboardData?.leaderboard?.length > 0 ? (
                  leaderboardData.leaderboard.map((agent: any, index: number) => (
                    <div 
                      key={agent.id} 
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200 shadow-lg' :
                        index === 1 ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 shadow-md' :
                        index === 2 ? 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 shadow-sm' :
                        'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        {/* Rank Badge */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                          index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                          index === 2 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                          'bg-[#001f3f]'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : agent.rank}
                        </div>
                        
                        {/* User Info */}
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-[#001f3f] text-white flex items-center justify-center font-semibold">
                            {agent.image ? (
                              <Image
                                src={agent.image}
                                alt={agent.name}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              agent.name?.[0] || 'A'
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{agent.name}</p>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm text-gray-500">{agent.email}</p>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                agent.totalPoints >= 1000 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                agent.totalPoints >= 500 ? 'bg-gray-100 text-gray-800 border border-gray-300' :
                                agent.totalPoints >= 200 ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {agent.totalPoints >= 1000 ? '🥇 Platinum' :
                                 agent.totalPoints >= 500 ? '🥈 Gold' :
                                 agent.totalPoints >= 200 ? '🥉 Silver' :
                                 '🏅 Bronze'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-800">
                          {agent.totalPoints.toLocaleString()} πόντους
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{agent.totalReferrals} referrals</span>
                          <span>•</span>
                          <span>{agent.propertiesAdded} ακίνητα</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FaTrophy className="text-4xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Δεν υπάρχουν ακόμα χρήστες με πόντους</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Ξεκινήστε να κερδίζετε πόντους για να εμφανιστείτε στο leaderboard!
                    </p>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                          <p className="text-sm text-blue-800">
                      <strong>Πώς να κερδίσετε πόντους:</strong>
                    </p>
                    <ul className="text-xs text-blue-700 mt-2 space-y-1">
                      <li>• Εγγραφή φίλου: +100 πόντους</li>
                      <li>• Προσθήκη ακινήτου: +50-500 πόντους (ανάλογα με την έκταση)</li>
                      <li>• Admin bonus: +300 πόντους</li>
                      <li>• Όλοι οι χρήστες μπορούν να κερδίσουν πόντους!</li>
                    </ul>
                    <p className="text-sm text-blue-800 mt-3">
                      <strong>Κατηγορίες:</strong>
                    </p>
                    <ul className="text-xs text-blue-700 mt-1 space-y-1">
                      <li>• 🏅 Bronze: 0-199 πόντους</li>
                      <li>• 🥉 Silver: 200-499 πόντους</li>
                      <li>• 🥈 Gold: 500-999 πόντους</li>
                      <li>• 🥇 Platinum: 1000+ πόντους</li>
                    </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Leaderboard Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <FaInfoCircle className="text-blue-500 mt-1 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Πώς λειτουργεί το Leaderboard:</p>
                    <ul className="space-y-1">
                      <li>• Κατατάσσεται με βάση τους συνολικούς πόντους</li>
                      <li>• Σε περίπτωση ισοπαλίας, προηγείται αυτός με περισσότερα referrals</li>
                      <li>• Ενημερώνεται σε πραγματικό χρόνο</li>
                      <li>• Όλοι οι χρήστες με τουλάχιστον 1 πόντο εμφανίζονται</li>
                      <li>• Εμφανίζονται οι κατηγορίες (Bronze, Silver, Gold, Platinum)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Ρυθμίσεις & Απόρρητο</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center">
                    <FaCog className="text-[#001f3f] mr-3" />
                    <div>
                      <p className="font-medium text-gray-800">Γενικές ρυθμίσεις</p>
                      <p className="text-sm text-gray-500">Επεξεργασία προφίλ και προτιμήσεων</p>
                    </div>
                  </div>
                  <FaChevronRight className="text-gray-400" />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center">
                    <FaUser className="text-[#001f3f] mr-3" />
                    <div>
                      <p className="font-medium text-gray-800">Απόρρητο</p>
                      <p className="text-sm text-gray-500">Διαχείριση δεδομένων και ασφάλειας</p>
                    </div>
                  </div>
                  <FaChevronRight className="text-gray-400" />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center">
                    <FaExchangeAlt className="text-[#001f3f] mr-3" />
                    <div>
                      <p className="font-medium text-gray-800">Αλλαγή ρόλου</p>
                      <p className="text-sm text-gray-500">Μετάβαση σε άλλο ρόλο</p>
                    </div>
                  </div>
                  <FaChevronRight className="text-gray-400" />
                </div>
                <button 
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="w-full flex items-center justify-center p-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <FaSignOutAlt className="mr-3" />
                  Αποσύνδεση
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md' : 'bg-transparent'}`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/agent" className="text-2xl font-bold text-[#001f3f]">
                RealEstate
              </Link>
              <div className="relative" ref={roleMenuRef}>
                <button
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className={`px-2 py-1 text-xs font-semibold ${isScrolled ? 'bg-[#001f3f] text-white' : 'bg-white/20 text-white'} rounded-full hover:bg-[#003366] transition-all duration-300 flex items-center space-x-1`}
                >
                  <span>Agent Mode</span>
                  <FaChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {isRoleMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2 border border-gray-100 z-50"
                    >
                      <div 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                        onClick={() => handleRoleChange('BUYER')}
                      >
                        <FaExchangeAlt className="mr-2 text-green-500" />
                        <span className="text-green-500 font-medium">Buyer Mode</span>
                      </div>
                      <div 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                        onClick={() => handleRoleChange('SELLER')}
                      >
                        <FaExchangeAlt className="mr-2 text-blue-500" />
                        <span className="text-blue-500 font-medium">Seller Mode</span>
                      </div>
                      <div className="border-t border-gray-100 my-1"></div>
                      <Link
                        href="/"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      >
                        <FaExchangeAlt className="mr-2 text-gray-500" />
                        Επιλογή Ρόλου
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                href="/dashboard/agent"
                className="text-gray-700 hover:text-[#001f3f] font-medium flex items-center"
              >
                <FaTachometerAlt className="mr-2" />
                Dashboard
              </Link>
              <Link
                href="/agent/properties"
                className="text-gray-700 hover:text-[#001f3f] font-medium flex items-center"
              >
                <FaBuilding className="mr-2" />
                Ακίνητα
              </Link>
              <Link 
                href="/agent/contact"
                className="text-gray-700 hover:text-[#001f3f] font-medium flex items-center"
              >
                <FaEnvelope className="mr-2" />
                Επικοινωνία
              </Link>
              <div className="relative">
                <button className="text-gray-500 hover:text-gray-700">
                  <FaBell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                    3
                  </span>
                </button>
              </div>
              <div className="relative" ref={profileMenuRef}>
                <button 
                  className="flex items-center space-x-2 text-gray-700 hover:text-[#001f3f]"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                >
                  <div className="h-8 w-8 rounded-full bg-[#001f3f] text-white flex items-center justify-center">
                    <span className="font-medium text-sm">{session?.user?.name?.[0] || 'A'}</span>
                  </div>
                  <span className="font-medium">{session?.user?.name}</span>
                  <FaChevronDown className={`w-3 h-3 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200"
                    >
                      <Link 
                        href="/agent/profile" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <FaUser className="mr-2" />
                        Προφίλ
                      </Link>
                      <Link 
                        href="/agent/settings" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <FaCog className="mr-2" />
                        Ρυθμίσεις
                      </Link>
                      <Link 
                        href="/" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <FaUserTie className="mr-2" />
                        Αλλαγή Ρόλου
                      </Link>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button 
                        onClick={() => {
                          signOut({ callbackUrl: '/' });
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                      >
                        <FaSignOutAlt className="mr-2" />
                        Αποσύνδεση
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-16">
        <div className="container mx-auto px-4 py-8">
          {/* Profile Header */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <div className="flex items-center space-x-6">
              <div className="relative">
                {agent.image ? (
                  <Image
                    src={agent.image}
                    alt="Profile"
                    width={80}
                    height={80}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#001f3f] flex items-center justify-center text-2xl text-white font-semibold">
                    {agent.name?.[0] || "A"}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-1">
                  <FaCheckCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-800 mb-1">{agent.name}</h1>
                <p className="text-gray-500 mb-2">{agent.email}</p>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{agent.role}</span>
                  <span className="text-xs bg-[#001f3f] text-white px-2 py-1 rounded-full">Verified Agent</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {[
                { id: 'personal', label: 'Τα στοιχεία μου', icon: FaUser },
                { id: 'referrals', label: 'Rewards', icon: FaGift },
                { id: 'settings', label: 'Ρυθμίσεις', icon: FaCog }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center py-3 px-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-[#001f3f] shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <tab.icon className="w-5 h-5 mb-1" />
                  <span className="text-xs">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-4xl mx-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#001f3f] text-white py-12 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Σχετικά με εμάς</h3>
              <p className="text-gray-300">
                Η πλατφόρμα που συνδέει agents με αγοραστές και πωλητές ακινήτων.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Σύνδεσμοι</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/agent/properties" className="text-gray-300 hover:text-white transition-colors">
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/agent/about" className="text-gray-300 hover:text-white transition-colors">
                    Σχετικά
                  </Link>
                </li>
                <li>
                  <Link href="/agent/contact" className="text-gray-300 hover:text-white transition-colors">
                    Επικοινωνία
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Επικοινωνία</h3>
              <ul className="space-y-2 text-gray-300">
                <li>Email: info@realestate.com</li>
                <li>Τηλέφωνο: +30 210 1234567</li>
                <li>Διεύθυνση: Αθήνα, Ελλάδα</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Social Media</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <FaFacebook className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <FaTwitter className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <FaInstagram className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <FaLinkedin className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 