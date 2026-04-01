'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AgentNavbar from '@/components/layout/AgentNavbar';
import AgentFooter from '@/components/layout/AgentFooter';
import { useSession } from 'next-auth/react';
import {
  FaCog,
  FaHeart,
  FaQuestionCircle,
  FaChevronDown,
  FaChevronRight,
  FaUser,
  FaLock,
  FaPhone,
  FaEnvelope,
  FaBell,
  FaExclamationTriangle,
  FaExchangeAlt,
  FaSignOutAlt,
  FaUserCircle,
  FaGift,
  FaBuilding,
  FaMapMarkerAlt,
  FaCopy,
  FaShare,
  FaInfoCircle,
  FaCheck,
  FaExternalLinkAlt,
  FaTrophy,
  FaSearch,
} from 'react-icons/fa';
import { signOut } from 'next-auth/react';
import { listDeals } from '@/lib/api/deals';
import { motion, AnimatePresence } from 'framer-motion';
import PropertyCard from '@/components/properties/PropertyCard';
import { fetchFromBackend } from '@/lib/api/client';
import { apiClient } from '@/lib/api/client';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

type ProfileTab = 'settings' | 'favorites' | 'faq' | 'roles' | 'rewards';

const FAQ_CATEGORIES = [
  {
    title: '💰 Κέρδη & Πληρωμές',
    items: [
      {
        q: 'Πόσα χρήματα ακριβώς κερδίζω από κάθε συναλλαγή;',
        a: 'Το μοντέλο μας είναι απλό: Μοιραζόμαστε τα κέρδη 50-50. Στις πωλήσεις, η πλατφόρμα λαμβάνει προμήθεια 1% από τον αγοραστή. Εσείς κερδίζετε το 50% αυτής της προμήθειας (δηλαδή το 0,5% της συνολικής αξίας του ακινήτου). Παράδειγμα: Για ακίνητο 200.000€, κερδίζετε 1.000€. Στις ενοικιάσεις, η πλατφόρμα λαμβάνει προμήθεια το 50% του πρώτου ενοικίου. Εσείς κερδίζετε το μισό αυτής της προμήθειας (δηλαδή το 25% ενός ενοικίου). Παράδειγμα: Για ενοίκιο 1.000€, κερδίζετε 250€.',
      },
      {
        q: 'Πότε μπαίνουν τα χρήματα στον λογαριασμό μου;',
        a: 'Η πληρωμή σας "κλειδώνει" και καταβάλλεται τη στιγμή που ολοκληρώνεται επιτυχώς η συναλλαγή. Δηλαδή, όταν υπογραφούν τα τελικά συμβόλαια ή το ιδιωτικό συμφωνητικό μίσθωσης και τα δύο μέρη (ιδιοκτήτης και αγοραστής/ενοικιαστής) πατήσουν "Επιβεβαίωση Ολοκλήρωσης" μέσα στο Deal Room.',
      },
      {
        q: 'Υπάρχει κάποια συνδρομή ή κρυφό κόστος για εμένα;',
        a: 'Απολύτως κανένα. Ο λογαριασμός σας ως Referral Agent είναι και θα παραμείνει 100% δωρεάν. Εμείς σας πληρώνουμε, δεν μας πληρώνετε.',
      },
    ],
  },
  {
    title: '🔗 Πώς συνδέω πελάτες',
    items: [
      {
        q: 'Πώς ακριβώς στέλνω έναν πελάτη σε ένα ακίνητο;',
        a: 'Έχετε 2 τρόπους: Τρόπος 1 (Smart Link): Βρίσκετε το ακίνητο στην πλατφόρμα, πατάτε "Προώθηση" και στέλνετε το link στον πελάτη. Μόλις πατήσει το link, του ζητείται να κάνει εγγραφή. Αμέσως μετά, ερωτάται αν θέλει να συνδεθεί μαζί σας για το συγκεκριμένο ακίνητο. Αν πατήσει "Ναι", ανοίγει το Deal Room. Τρόπος 2 (OTP Κωδικός): Αν έχετε τον πελάτη δίπλα σας ή στο τηλέφωνο, πατάτε "Προσθήκη Ενδιαφερόμενου" στο Dashboard σας. Συμπληρώνετε τα στοιχεία του και το ακίνητο. Ο πελάτης λαμβάνει έναν κωδικό (OTP) στο κινητό ή το email του. Τον καταχωρείτε, και η σύνδεση ολοκληρώνεται άμεσα.',
      },
      {
        q: 'Μπορώ να στείλω το ίδιο link σε πολλούς πελάτες;',
        a: 'Φυσικά! Μπορείτε να μοιραστείτε το link ενός ακινήτου με όσους ενδιαφερόμενους θέλετε. Ο πρώτος που θα προχωρήσει σε επιτυχή συμφωνία μέσω του Deal Room, είναι αυτός που θα σας φέρει την προμήθεια.',
      },
    ],
  },
  {
    title: '⚖️ Ευθύνες & Διαδικαστικά',
    items: [
      {
        q: 'Χρειάζομαι άδεια μεσίτη;',
        a: 'Όχι. Λειτουργείτε αποκλειστικά ως Affiliate Marketer (Εισαγωγέας Πελατών) για την πλατφόρμα μας. Τη νομική και διαχειριστική διαδικασία της συναλλαγής την αναλαμβάνει πλήρως η πλατφόρμα μέσω του ψηφιακού Deal Room.',
      },
      {
        q: 'Πρέπει να πηγαίνω να δείχνω τα ακίνητα στους πελάτες;',
        a: 'Σε καμία περίπτωση! Εσείς κάνετε απλώς το "matchmaking" ψηφιακά. Τα ραντεβού για την υπόδειξη του ακινήτου τα κλείνουν οι πελάτες απευθείας με τον ιδιοκτήτη μέσα από το αυτοματοποιημένο ημερολόγιο της πλατφόρμας.',
      },
      {
        q: 'Τι γίνεται αν υπάρξει πρόβλημα με τα χαρτιά του ακινήτου;',
        a: 'Δεν έχετε καμία νομική ή τεχνική ευθύνη. Ο έλεγχος των εγγράφων, η Ηλεκτρονική Ταυτότητα Κτιρίου και τα συμβόλαια είναι αποκλειστική ευθύνη του πωλητή, του αγοραστή και των μηχανικών/δικηγόρων τους μέσα στο Deal Room.',
      },
    ],
  },
];

function AgentProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const tabFromUrl = (searchParams?.get('tab') as ProfileTab) || 'settings';
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    ['settings', 'favorites', 'faq', 'roles', 'rewards'].includes(tabFromUrl) ? tabFromUrl : 'settings'
  );
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams?.get('tab') as ProfileTab;
    if (t && ['settings', 'favorites', 'faq', 'roles', 'rewards'].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams?.get('tab')]);

  const setTab = (t: ProfileTab) => {
    setActiveTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/agent/auth/login');
    }
  }, [status, router]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AgentNavbar solidFromStart />
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - same as buyer */}
            <aside className="w-full lg:w-1/4 flex-shrink-0 flex flex-col gap-4">
              <nav className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {[
                  { id: 'settings' as const, label: 'Ρυθμίσεις / Προφίλ', icon: FaCog },
                  { id: 'favorites' as const, label: 'Αγαπημένα', icon: FaHeart },
                  { id: 'faq' as const, label: 'Συχνές Ερωτήσεις', icon: FaQuestionCircle },
                  { id: 'rewards' as const, label: 'Rewards', icon: FaGift },
                  { id: 'roles' as const, label: 'Αλλαγή Ρόλου', icon: FaExchangeAlt },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-all duration-200 ${
                      activeTab === item.id
                        ? 'bg-indigo-50 border-l-4 border-indigo-600 text-indigo-800'
                        : 'hover:bg-gray-50 text-gray-700 border-l-4 border-transparent'
                    }`}
                  >
                    <item.icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        activeTab === item.id ? 'text-indigo-600' : 'text-gray-500'
                      }`}
                    />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
              <button
                type="button"
                onClick={async () => {
                  await signOut({ redirect: false });
                  router.push('/agent');
                }}
                className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-medium transition-all duration-200 shadow-md"
              >
                <FaSignOutAlt className="w-5 h-5" />
                Αποσύνδεση
              </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {activeTab === 'settings' && (
                  <AgentSettingsTab key="settings" session={session} />
                )}
                {activeTab === 'favorites' && (
                  <FavoritesTab key="favorites" />
                )}
                {activeTab === 'faq' && (
                  <FaqTab
                    key="faq"
                    categories={FAQ_CATEGORIES}
                    expandedFaq={expandedFaq}
                    setExpandedFaq={setExpandedFaq}
                  />
                )}
                {activeTab === 'roles' && (
                  <RolesTab key="roles" />
                )}
                {activeTab === 'rewards' && (
                  <RewardsTab key="rewards" session={session} />
                )}
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>
      <AgentFooter />
    </div>
  );
}

export default function AgentProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" /></div>}>
      <AgentProfileContent />
    </Suspense>
  );
}

function AgentSettingsTab({ session }: { session: any }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [dealUpdates, setDealUpdates] = useState(true);
  const [newMessages, setNewMessages] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [hasActiveDeals, setHasActiveDeals] = useState<boolean | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [userRes, agentRes] = await Promise.all([
          fetchFromBackend('/user/profile'),
          fetch(`/api/agents/${session?.user?.id}`).catch(() => null),
        ]);
        if (userRes.ok) {
          const data = await userRes.json();
          const u = data.user || data;
          const fullName = u.name || session?.user?.name || '';
          const parts = fullName.trim().split(/\s+/);
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
          setEmail(u.email || session?.user?.email || '');
          setPhone(u.phone || '');
          setTaxId(u.taxId || '');
        }
        if (agentRes?.ok) {
          const agentData = await agentRes.json();
          if (agentData.agent) {
            setCompanyName(agentData.agent.companyName || '');
            setBusinessAddress(agentData.agent.businessAddress || '');
          }
        }
      } catch (e) {
        console.error(e);
        const fullName = session?.user?.name || '';
        const parts = fullName.trim().split(/\s+/);
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
        setEmail(session?.user?.email || '');
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, [session]);

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
      await fetchFromBackend('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: name || undefined, phone, taxId: taxId || undefined }),
      });
      toast.success('Τα στοιχεία ενημερώθηκαν');
    } catch (e) {
      toast.error('Σφάλμα κατά την ενημέρωση');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Οι κωδικοί δεν ταιριάζουν');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες');
      return;
    }
    setLoading(true);
    try {
      const res = await fetchFromBackend('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        toast.success('Ο κωδικός άλλαξε επιτυχώς');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Σφάλμα κατά την αλλαγή κωδικού');
      }
    } catch (e) {
      toast.error('Σφάλμα κατά την αλλαγή κωδικού');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FaUser className="text-indigo-600" /> Προσωπικά Στοιχεία
        </h2>
        <form onSubmit={handleSavePersonal} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Όνομα</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Όνομα"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Επώνυμο</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Επώνυμο"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
              placeholder="Email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Τηλέφωνο</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Τηλέφωνο"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Εταιρεία (προαιρετικό)</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Εταιρεία"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Διεύθυνση Εργασίας (προαιρετικό)</label>
            <input
              type="text"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Διεύθυνση"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ΑΦΜ (Προαιρετικό)</label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value.replace(/\D/g, '').slice(0, 9))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="9 ψηφία"
              maxLength={9}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50"
          >
            {loading ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FaBell className="text-indigo-600" /> Ρυθμίσεις Ειδοποιήσεων
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-gray-700">Ενημερώσεις Deal Room</span>
            <input type="checkbox" checked={dealUpdates} onChange={(e) => setDealUpdates(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          </label>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-gray-700">Νέα Μηνύματα</span>
            <input type="checkbox" checked={newMessages} onChange={(e) => setNewMessages(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          </label>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-gray-700">Newsletter</span>
            <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FaLock className="text-indigo-600" /> Αλλαγή Κωδικού
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Τρέχων κωδικός</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Τρέχων κωδικός" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Νέος κωδικός</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Νέος κωδικός" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Επιβεβαίωση</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Επιβεβαίωση" />
          </div>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50">
            {loading ? 'Αλλαγή...' : 'Αλλαγή Κωδικού'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border-2 border-red-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FaExclamationTriangle className="text-red-600" /> Ζώνη Κινδύνου
        </h2>
        <p className="text-gray-600 text-sm mb-4">Η διαγραφή είναι οριστική.</p>
        <button
          onClick={async () => {
            setHasActiveDeals(null);
            try {
              const { items } = await listDeals({ limit: 100 });
              const active = items?.some((d: any) => d.status === 'ACTIVE' || d.status === 'DRAFT') ?? false;
              setHasActiveDeals(active);
              if (active) toast.error('Έχετε ενεργή συναλλαγή.');
              else setShowDeleteModal(true);
            } catch {
              setShowDeleteModal(true);
            }
          }}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
        >
          Διαγραφή Λογαριασμού
        </button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Διαγραφή Λογαριασμού</h3>
            <p className="text-gray-600 text-sm mb-4">Εισάγετε τον κωδικό σας για επιβεβαίωση.</p>
            <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Κωδικός πρόσβασης" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Ακύρωση</button>
              <button
                onClick={async () => {
                  if (!deletePassword) { toast.error('Εισάγετε τον κωδικό σας'); return; }
                  setDeleteLoading(true);
                  try {
                    const res = await fetchFromBackend('/user/delete', { method: 'POST', body: JSON.stringify({ password: deletePassword }) });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                      toast.success('Ο λογαριασμός διαγράφηκε');
                      window.location.href = '/agent';
                    } else toast.error(data.error || 'Σφάλμα');
                  } catch (e) { toast.error('Σφάλμα'); }
                  finally { setDeleteLoading(false); }
                }}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {deleteLoading ? 'Διαγραφή...' : 'Διαγραφή'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function FavoritesTab() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await fetchFromBackend('/favorites');
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setFavorites(list);
        setFavoriteIds(new Set(list.map((f: any) => f.property?.id || f.propertyId).filter(Boolean)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchFavorites();
  }, []);

  const handleFavoriteClick = async (propertyId: string) => {
    try {
      const isFav = favoriteIds.has(propertyId);
      if (isFav) {
        await fetchFromBackend('/favorites', { method: 'DELETE', body: JSON.stringify({ propertyId }) });
        setFavoriteIds((prev) => { const n = new Set(prev); n.delete(propertyId); return n; });
        setFavorites((prev) => prev.filter((f) => (f.property?.id || f.propertyId) !== propertyId));
      } else {
        await fetchFromBackend('/favorites', { method: 'POST', body: JSON.stringify({ propertyId }) });
        setFavoriteIds((prev) => new Set([...prev, propertyId]));
      }
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
      </motion.div>
    );
  }

  const properties = favorites.map((f) => f.property).filter(Boolean).map((p: any) => ({
    ...p,
    location: p.location || [p.city, p.street, p.number].filter(Boolean).join(', ') || p.city || '',
  }));

  if (properties.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <FaHeart className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Δεν έχετε αποθηκεύσει ακόμα κάποιο ακίνητο</h3>
        <Link href="/properties" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all">
          <FaSearch /> Αναζήτηση Ακινήτων
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {properties.map((property: any) => (
        <PropertyCard key={property.id} property={property} viewMode="grid" onFavoriteClick={handleFavoriteClick} isAuthenticated={true} isFavorite={favoriteIds.has(property.id)} userRole="buyer" />
      ))}
    </motion.div>
  );
}

function FaqTab({ categories, expandedFaq, setExpandedFaq }: { categories: typeof FAQ_CATEGORIES; expandedFaq: string | null; setExpandedFaq: (k: string | null) => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
      {categories.map((category, catIdx) => (
        <div key={catIdx} className="space-y-2">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center text-sm">{catIdx + 1}</span>
            {category.title}
          </h3>
          <div className="space-y-2">
            {category.items.map((item, itemIdx) => {
              const key = `${catIdx}-${itemIdx}`;
              const isExpanded = expandedFaq === key;
              return (
                <div key={key} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                  <button onClick={() => setExpandedFaq(isExpanded ? null : key)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors">
                    <span className="font-semibold text-gray-900 pr-4">{item.q}</span>
                    <span className="flex-shrink-0 text-gray-500">{isExpanded ? <FaChevronDown className="w-4 h-4" /> : <FaChevronRight className="w-4 h-4" />}</span>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-5 pb-4 pt-0 text-gray-600 border-t border-gray-100">{item.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function RolesTab() {
  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
        <FaExchangeAlt className="text-indigo-600" /> Αλλαγή Ρόλου
      </h2>
      <p className="text-gray-600 text-sm mb-6">Επιλέξτε τον ρόλο που θέλετε να χρησιμοποιήσετε</p>
      <div className="space-y-4">
        <Link href="/buyer" className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-slate-50 hover:border-indigo-200 transition-all group">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FaUserCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 group-hover:text-indigo-800">Buyer Mode</div>
            <div className="text-sm text-gray-500">Αναζήτηση και αγορά ακινήτων</div>
          </div>
          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
        </Link>
        <Link href="/seller" className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-emerald-50 hover:border-green-200 transition-all group">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FaUserCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 group-hover:text-green-600">Seller Mode</div>
            <div className="text-sm text-gray-500">Διαχείριση ακινήτων και πωλήσεων</div>
          </div>
          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-green-500" />
        </Link>
      </div>
      <div className="mt-6 px-4 py-3 bg-indigo-50 rounded-xl">
        <p className="text-xs text-gray-500 text-center">Τρέχων: <span className="font-semibold text-indigo-800">Referral Agent</span></p>
      </div>
    </motion.div>
  );
}

function RewardsTab({ session }: { session: any }) {
  const [referralLink, setReferralLink] = useState('');
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const generateReferralLink = async () => {
    try {
      const { data } = await apiClient.post('/referrals/generate-link');
      setReferralLink(data.referralLink);
    } catch (e) { console.error(e); }
  };

  const copyReferralLink = async () => {
    if (referralLink) {
      try {
        await navigator.clipboard.writeText(referralLink);
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2000);
      } catch (e) { console.error(e); }
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share && referralLink) {
      try {
        await navigator.share({ title: 'Εγγραφείτε στην πλατφόρμα μας', text: 'Χρησιμοποιήστε τον προσωπικό μου σύνδεσμο!', url: referralLink });
      } catch (e) { copyReferralLink(); }
    } else copyReferralLink();
  };

  const fetchReferralStats = async () => {
    if (!session?.user?.id) return;
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/referrals/stats?userId=${session.user.id}`);
      if (res.ok) setReferralStats(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingStats(false); }
  };

  const fetchLeaderboard = async () => {
    if (!session?.user?.id) return;
    setLoadingLeaderboard(true);
    try {
      const { data } = await apiClient.get('/referrals/leaderboard');
      setLeaderboardData(data);
    } catch (e) { console.error(e); }
    finally { setLoadingLeaderboard(false); }
  };

  useEffect(() => {
    fetchReferralStats();
    fetchLeaderboard();
  }, [session?.user?.id]);

  const getCurrentTier = (p: number) => (p >= 7000 ? 'Platinum' : p >= 3000 ? 'Gold' : p >= 1000 ? 'Silver' : 'Bronze');
  const getCurrentTierIcon = (p: number) => (p >= 7000 ? '💎' : p >= 3000 ? '🥇' : p >= 1000 ? '🥈' : '🥉');
  const getCurrentTierDesc = (p: number) => (p >= 7000 ? 'Elite Agent' : p >= 3000 ? 'Premium Agent' : p >= 1000 ? 'Advanced Agent' : 'Starter Agent');
  const getNextTier = (p: number) => (p >= 7000 ? '∞' : p >= 3000 ? '7,000' : p >= 1000 ? '3,000' : '1,000');
  const getProgress = (p: number) => (p >= 7000 ? 100 : p >= 3000 ? Math.min(((p - 3000) / 4000) * 100, 100) : p >= 1000 ? Math.min(((p - 1000) / 2000) * 100, 100) : Math.min((p / 1000) * 100, 100));
  const getProgressMsg = (p: number) => (p >= 7000 ? 'Έχετε φτάσει στο ανώτατο επίπεδο! 🎉' : p >= 3000 ? `${Math.max(7000 - p, 0)} πόντους ακόμα για Platinum` : p >= 1000 ? `${Math.max(3000 - p, 0)} πόντους ακόμα για Gold` : `${Math.max(1000 - p, 0)} πόντους ακόμα για Silver`);
  const getBarColors = (p: number) => (p >= 7000 ? 'from-violet-400 to-violet-600' : p >= 3000 ? 'from-amber-400 to-amber-600' : p >= 1000 ? 'from-slate-400 to-slate-600' : 'from-amber-400 to-amber-600');
  const getBarBg = (p: number) => (p >= 7000 ? 'bg-violet-100' : p >= 3000 ? 'bg-amber-100' : p >= 1000 ? 'bg-slate-100' : 'bg-amber-100');

  const pts = referralStats?.totalPoints || 0;

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
      {/* Rewards Hero - Indigo design */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-t-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-4 right-4 opacity-30">
            <FaGift className="text-6xl" />
          </div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold">🏆 Rewards & Achievements</h3>
            <button
              onClick={() => { fetchReferralStats(); fetchLeaderboard(); }}
              disabled={loadingStats || loadingLeaderboard}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loadingStats || loadingLeaderboard ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <FaExternalLinkAlt />}
              Ανανέωση
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm mb-1">Πόντοι σας</p>
              <p className="text-5xl font-bold">{loadingStats ? '...' : pts.toLocaleString()}</p>
              <p className="text-indigo-200 mt-1">Αξία: €{loadingStats ? '...' : (pts * 0.1).toFixed(0)}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl mb-1">{getCurrentTierIcon(pts)}</div>
              <p className="font-semibold text-indigo-100">{getCurrentTier(pts)}</p>
              <p className="text-sm text-indigo-200">{getCurrentTierDesc(pts)}</p>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-sm text-indigo-200 mb-2">
              <span>Πρόοδος προς επόμενο επίπεδο</span>
              <span>{loadingStats ? '...' : `${pts} / ${getNextTier(pts)}`}</span>
            </div>
            <div className={`w-full ${getBarBg(pts)} rounded-full h-3`}>
              <motion.div
                className={`bg-gradient-to-r ${getBarColors(pts)} h-3 rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${getProgress(pts)}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </div>
            <p className="text-sm text-indigo-200 mt-2">{loadingStats ? 'Φόρτωση...' : getProgressMsg(pts)}</p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="p-6 border-t border-gray-100">
          <h5 className="text-lg font-semibold text-gray-800 mb-4">Προσωπικός σύνδεσμος</h5>
          <div className="flex gap-2">
            <button onClick={generateReferralLink} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
              <FaExternalLinkAlt /> Δημιουργία συνδέσμου
            </button>
          </div>
          {referralLink && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-gray-200">
              <input type="text" value={referralLink} readOnly className="flex-1 text-sm text-gray-600 bg-transparent outline-none" />
              <button onClick={copyReferralLink} className={`p-2 rounded-lg transition-colors ${isLinkCopied ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-gray-600 hover:bg-slate-200'}`}>
                {isLinkCopied ? <FaCheck className="w-4 h-4" /> : <FaCopy className="w-4 h-4" />}
              </button>
              <button onClick={shareReferralLink} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors">
                <FaShare className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards - Indigo/violet palette */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
          <p className="text-emerald-100 text-sm">Συνολικές Εγγραφές</p>
          <p className="text-3xl font-bold">{loadingStats ? '...' : (referralStats?.totalRegistrations || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white">
          <p className="text-indigo-100 text-sm">Καταχωρήσεις Ακινήτων</p>
          <p className="text-3xl font-bold">{loadingStats ? '...' : (referralStats?.totalProperties || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-6 text-white">
          <p className="text-violet-100 text-sm">Αγοραπωλησίες</p>
          <p className="text-3xl font-bold">{loadingStats ? '...' : (referralStats?.totalSales || 0)}</p>
        </div>
      </div>

      {/* Tiers - Indigo theme */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">🎁 Rewards ανά Επίπεδο</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            { name: 'Bronze', range: '0 - 999', emoji: '🥉', active: getCurrentTier(pts) === 'Bronze' },
            { name: 'Silver', range: '1,000 - 2,999', emoji: '🥈', active: getCurrentTier(pts) === 'Silver' },
            { name: 'Gold', range: '3,000 - 6,999', emoji: '🥇', active: getCurrentTier(pts) === 'Gold' },
            { name: 'Platinum', range: '7,000+', emoji: '💎', active: getCurrentTier(pts) === 'Platinum' },
          ].map((t) => (
            <div key={t.name} className={`border-2 rounded-xl p-6 transition-all ${t.active ? 'border-indigo-500 bg-indigo-50 shadow-lg' : 'border-gray-200 hover:border-indigo-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{t.emoji}</span>
                  <div>
                    <h4 className="text-lg font-bold text-gray-800">{t.name}</h4>
                    <p className="text-sm text-gray-600">{t.range} πόντοι</p>
                  </div>
                </div>
                {t.active && <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">Ενεργό</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Points History */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h5 className="text-lg font-semibold text-gray-800 mb-4">Ιστορικό πόντων</h5>
        {loadingStats ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-500">Φόρτωση...</p>
          </div>
        ) : referralStats?.points?.length > 0 ? (
          <div className="space-y-4">
            {referralStats.points.map((point: any) => (
              <div key={point.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <FaGift className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {point.reason === 'registration' ? 'Εγγραφή φίλου' : point.reason === 'property_added' ? 'Προσθήκη ακινήτου' : point.reason === 'admin_bonus' ? 'Admin Bonus' : 'Άλλο'}
                    </p>
                    <p className="text-sm text-gray-500">{new Date(point.createdAt).toLocaleDateString('el-GR')}</p>
                  </div>
                </div>
                <span className={`font-semibold ${point.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {point.points > 0 ? '+' : ''}{point.points} πόντους
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FaGift className="text-4xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Δεν υπάρχουν ακόμα πόντους</p>
            <p className="text-sm text-gray-400 mt-2">Μοιραστείτε τον σύνδεσμό σας για να ξεκινήσετε!</p>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">🏆 Top 10 Referral Champions</h3>
        {leaderboardData?.currentUser ? (
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-4 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">#{leaderboardData.currentUser.rank} - Η θέση σας</p>
                <p className="text-sm text-indigo-200">{leaderboardData.currentUser.totalPoints.toLocaleString()} πόντους • {leaderboardData.currentUser.totalReferrals} referrals</p>
              </div>
              <p className="text-lg font-bold">
                {leaderboardData.currentUser.rank === 1 ? '🥇 1η θέση!' : leaderboardData.currentUser.rank === 2 ? '🥈 2η θέση!' : leaderboardData.currentUser.rank === 3 ? '🥉 3η θέση!' : `${leaderboardData.currentUser.rank}η θέση`}
              </p>
            </div>
          </div>
        ) : leaderboardData && (
          <div className="bg-slate-200 rounded-xl p-4 mb-6 text-slate-700">
            <p className="font-semibold">Δεν έχετε ακόμα πόντους</p>
            <p className="text-sm">Ξεκινήστε να κερδίζετε πόντους!</p>
          </div>
        )}
        {loadingLeaderboard ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-500">Φόρτωση leaderboard...</p>
          </div>
        ) : leaderboardData?.leaderboard?.length > 0 ? (
          <div className="space-y-3">
            {leaderboardData.leaderboard.map((agent: any, idx: number) => (
              <div key={agent.id} className={`flex items-center justify-between p-4 rounded-xl border ${idx < 3 ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-gray-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-600' : 'bg-indigo-600'}`}>
                    {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : agent.rank}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold">
                    {agent.image ? <Image src={agent.image} alt={agent.name} width={40} height={40} className="rounded-full object-cover" /> : agent.name?.[0] || 'A'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{agent.name}</p>
                    <p className="text-sm text-gray-500">{agent.totalReferrals} referrals • {agent.propertiesAdded} ακίνητα</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-800">{agent.totalPoints.toLocaleString()} πόντους</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FaTrophy className="text-4xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Δεν υπάρχουν ακόμα χρήστες με πόντους</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
