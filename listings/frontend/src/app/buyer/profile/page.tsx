'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import BuyerNavbar from '@/components/layout/BuyerNavbar';
import { useSession } from 'next-auth/react';
import {
  FaCog,
  FaHeart,
  FaQuestionCircle,
  FaChevronDown,
  FaChevronRight,
  FaUser,
  FaLock,
  FaHome,
  FaSearch,
  FaPhone,
  FaEnvelope,
  FaBell,
  FaExclamationTriangle,
  FaExchangeAlt,
  FaSignOutAlt,
  FaUserCircle,
} from 'react-icons/fa';
import { signOut } from 'next-auth/react';
import { listDeals } from '@/lib/api/deals';
import { motion, AnimatePresence } from 'framer-motion';
import PropertyCard from '@/components/properties/PropertyCard';
import { fetchFromBackend } from '@/lib/api/client';
import { toast } from 'react-hot-toast';

type ProfileTab = 'settings' | 'favorites' | 'faq' | 'roles';

const FAQ_CATEGORIES = [
  {
    title: 'Το Ψηφιακό Deal Room & Η Διαδικασία',
    items: [
      {
        q: 'Τι ακριβώς είναι το Deal Room;',
        a: 'Το Deal Room είναι ο δικός σας κλειστός, ψηφιακός χώρος συναλλαγής. Μόλις εκδηλώσετε ενδιαφέρον για ένα ακίνητο, δημιουργείται αυτόματα αυτό το περιβάλλον. Εκεί μπορείτε να κλείσετε ραντεβού, να κάνετε την προσφορά σας, να ανεβάσετε έγγραφα και να επικοινωνήσετε με τον ιδιοκτήτη και τους δικηγόρους, βλέποντας βήμα-βήμα την πρόοδο της αγοραπωλησίας.',
      },
      {
        q: 'Πώς μπορώ να δω το ακίνητο από κοντά;',
        a: 'Μέσα από το Deal Room, στο tab "Ραντεβού", μπορείτε να δείτε το ψηφιακό ημερολόγιο με τις διαθέσιμες ώρες του ιδιοκτήτη (ή του εκπροσώπου του). Επιλέγετε την ώρα που σας βολεύει ή προτείνετε μια δική σας, και περιμένετε την επιβεβαίωση.',
      },
      {
        q: 'Πώς κάνω επίσημη προσφορά για ένα ακίνητο;',
        a: 'Αφού δείτε το ακίνητο, πατάτε το κουμπί «Κάνε Προσφορά» στο Deal Room. Εισάγετε το ποσό που διαθέτετε (μαζί με ένα προαιρετικό μήνυμα). Ο ιδιοκτήτης μπορεί να την αποδεχτεί, να την απορρίψει ή να σας κάνει μια αντιπρόταση (διαπραγμάτευση) μέχρι να συμφωνήσετε στην τελική τιμή.',
      },
    ],
  },
  {
    title: 'Κόστη, Πληρωμές & Προκαταβολές',
    items: [
      {
        q: 'Πόσο κοστίζει η χρήση της πλατφόρμας; Υπάρχουν κρυφές χρεώσεις;',
        a: 'Η δημιουργία λογαριασμού, η αναζήτηση και τα ραντεβού είναι 100% δωρεάν. Η πλατφόρμα πληρώνεται μόνο εάν η συναλλαγή ολοκληρωθεί με επιτυχία (Success Fee), το οποίο ανέρχεται σε 1% της αξίας του ακινήτου (για αγορά) ή σε 1 μηνιαίο μίσθωμα (για ενοικίαση). Καμία κρυφή χρέωση, κανένα "καπέλο".',
      },
      {
        q: 'Γιατί πρέπει να δώσω προκαταβολή και πώς προστατεύομαι;',
        a: 'Η προκαταβολή δίνεται αφού συμφωνήσετε στην τιμή και αφού ο δικηγόρος κάνει τον πρώτο βασικό νομικό έλεγχο. Καταβάλλοντας την προκαταβολή, δείχνετε το έμπρακτο ενδιαφέρον σας και το ακίνητο "κλειδώνει" (κατεβαίνει από την αγορά), διασφαλίζοντας ότι δεν θα πουληθεί/ενοικιαστεί σε άλλον.',
      },
      {
        q: 'Τι γίνεται με την προκαταβολή αν ο νομικός/τεχνικός έλεγχος βγάλει πρόβλημα;',
        a: 'Εάν οι επαγγελματίες (δικηγόρος, μηχανικός) διαπιστώσουν ανυπέρβλητα νομικά ή πολεοδομικά βάρη στο ακίνητο που εμποδίζουν τη μεταβίβαση, η συναλλαγή ακυρώνεται και η προκαταβολή σας επιστρέφεται στο ακέραιο.',
      },
    ],
  },
  {
    title: 'Επαγγελματίες (Δικηγόροι & Συμβολαιογράφοι)',
    items: [
      {
        q: 'Είμαι υποχρεωμένος να επιλέξω επαγγελματίες μέσα από την πλατφόρμα;',
        a: 'Όχι. Σας παρέχουμε μια λίστα με ελεγμένους επαγγελματίες (με βιογραφικά και κριτικές) για τη διευκόλυνσή σας. Ωστόσο, έχετε την απόλυτη ελευθερία να προσκαλέσετε τον δικό σας έμπιστο δικηγόρο ή συμβολαιογράφο να μπει στο Deal Room σας.',
      },
      {
        q: 'Πώς πληρώνω τον δικηγόρο ή τον συμβολαιογράφο μου;',
        a: 'Η πλατφόρμα δεν εμπλέκεται στις αμοιβές των επαγγελματιών. Η αμοιβή τους συμφωνείται ελεύθερα μεταξύ σας και η πληρωμή γίνεται εκτός πλατφόρμας, σύμφωνα με τους δικούς τους όρους συνεργασίας.',
      },
      {
        q: 'Μπορώ να μιλήσω ιδιωτικά με τον δικηγόρο μου;',
        a: 'Ναι. Στο Deal Room υπάρχει ένα ομαδικό chat για λόγους διαφάνειας με όλους τους συμμετέχοντες, αλλά έχετε και τη δυνατότητα για ιδιωτική (1-on-1) συνομιλία αποκλειστικά με τον δικό σας δικηγόρο.',
      },
    ],
  },
  {
    title: 'Ο Λογαριασμός μου & Ασφάλεια (KYC)',
    items: [
      {
        q: 'Γιατί μου ζητάτε να ανεβάσω την Ταυτότητά μου (KYC);',
        a: 'Η αγοραπωλησία ενός ακινήτου είναι μια νομική και επίσημη διαδικασία. Η ταυτοποίηση δεν είναι απαραίτητη για να ψάξετε σπίτια, αλλά απαιτείται όταν προχωρήσετε στο Deal Room, προκειμένου να συνταχθούν τα ιδιωτικά συμφωνητικά, να καταβληθούν προκαταβολές και να προστατευτούν και τα δύο μέρη από απάτες.',
      },
      {
        q: 'Μπήκα στην πλατφόρμα μέσω link ενός φίλου (Referral Agent). Τι σημαίνει αυτό;',
        a: 'Σημαίνει ότι ο άνθρωπος που σας σύστησε παρακολουθεί γενικά τα βήματα της εξέλιξης της συναλλαγής σας, ώστε να λάβει την προμήθειά του από εμάς όταν υπογράψετε! Δεν έχει καμία απολύτως πρόσβαση στα προσωπικά σας δεδομένα, στα οικονομικά σας στοιχεία ή στις συνομιλίες σας, και αυτό δεν σας επιβαρύνει με κανένα επιπλέον κόστος.',
      },
      {
        q: 'Μπορώ να διαγράψω τα δεδομένα μου;',
        a: 'Φυσικά. Μπορείτε να διαγράψετε οριστικά τον λογαριασμό σας από την ενότητα «Ρυθμίσεις / Προφίλ». Σημειώστε όμως ότι εάν εκκρεμεί κάποια ενεργή συναλλαγή (Deal Room), η διαγραφή μπορεί να ολοκληρωθεί μόνο μετά την ακύρωση ή την ολοκλήρωση της αγοραπωλησίας.',
      },
    ],
  },
];

function BuyerProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const tabFromUrl = (searchParams?.get('tab') as ProfileTab) || 'settings';
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    ['settings', 'favorites', 'faq', 'roles'].includes(tabFromUrl) ? tabFromUrl : 'settings'
  );
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Sync URL -> state
  useEffect(() => {
    const t = searchParams?.get('tab') as ProfileTab;
    if (t && ['settings', 'favorites', 'faq', 'roles'].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams?.get('tab')]);

  const setTab = (t: ProfileTab) => {
    setActiveTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const handleSidebarSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/buyer');
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/buyer/auth/login');
    }
  }, [status, router]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-800 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <BuyerNavbar solidFromStart signOutRedirect="/buyer" />
      <div className="pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - ~25% */}
          <aside className="w-full lg:w-1/4 flex-shrink-0 flex flex-col gap-4">
            <nav className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {[
                { id: 'settings' as const, label: 'Ρυθμίσεις / Προφίλ', icon: FaCog },
                { id: 'favorites' as const, label: 'Αγαπημένα', icon: FaHeart },
                { id: 'faq' as const, label: 'Συχνές Ερωτήσεις', icon: FaQuestionCircle },
                { id: 'roles' as const, label: 'Αλλαγή Ρόλου', icon: FaExchangeAlt },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-blue-50 border-l-4 border-blue-700 text-blue-800'
                      : 'hover:bg-gray-50 text-gray-700 border-l-4 border-transparent'
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      activeTab === item.id ? 'text-blue-700' : 'text-gray-500'
                    }`}
                  />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => void handleSidebarSignOut()}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-medium transition-all duration-200 shadow-md"
            >
              <FaSignOutAlt className="w-5 h-5" />
              Αποσύνδεση
            </button>
          </aside>

          {/* Main Content - ~75% */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {activeTab === 'settings' && (
                <SettingsTab key="settings" session={session} />
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
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
    </div>
  );
}

export default function BuyerProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f5f0e8]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-800 border-t-transparent" /></div>}>
      <BuyerProfileContent />
    </Suspense>
  );
}

const NOTIFICATION_PREFS_KEY = 'buyer_notification_prefs';

function RolesTab() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
    >
      <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
        <FaExchangeAlt className="text-blue-700" /> Αλλαγή Ρόλου
      </h2>
      <p className="text-gray-600 text-sm mb-6">
        Επιλέξτε τον ρόλο που θέλετε να χρησιμοποιήσετε
      </p>
      <div className="space-y-4">
        <Link
          href="/agent"
          className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-slate-50 hover:border-blue-200 transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-800 to-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FaUserCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 group-hover:text-blue-800">Agent Mode</div>
            <div className="text-sm text-gray-500">Διαχείριση πελατών και ακινήτων</div>
          </div>
          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-700" />
        </Link>
        <Link
          href="/seller"
          className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-emerald-50 hover:border-green-200 transition-all group"
        >
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
      <div className="mt-6 px-4 py-3 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-500 text-center">
          Τρέχων: <span className="font-semibold text-blue-800">Buyer Mode</span>
        </p>
      </div>

      <div className="mt-4 px-4 py-3 rounded-xl border border-slate-200 bg-white">
        <p className="text-sm font-semibold text-slate-900">Είστε επαγγελματίας;</p>
        <p className="text-sm text-slate-600 mt-1">
          Αν είστε <span className="font-medium">Δικηγόρος</span>, <span className="font-medium">Συμβολαιογράφος</span>,{' '}
          <span className="font-medium">Μηχανικός</span> ή <span className="font-medium">Λογιστής</span>, μπορείτε να
          χρησιμοποιήσετε το <span className="font-medium">RealEstate Pro</span>.
        </p>
        <Link href="/professionals" className="inline-flex items-center mt-3 text-sm font-semibold text-teal-700 hover:text-teal-600">
          Μετάβαση στο RealEstate Pro
          <FaChevronRight className="ml-1.5 w-3.5 h-3.5" />
        </Link>
        <p className="text-xs text-slate-500 mt-2">
          Σημείωση: αν δεν έχετε επαγγελματικό ρόλο, η πρόσβαση στο Pro δεν είναι διαθέσιμη.
        </p>
      </div>
    </motion.div>
  );
}

function SettingsTab({ session }: { session: any }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Notification prefs (localStorage for now)
  const [dealUpdates, setDealUpdates] = useState(true);
  const [newMessages, setNewMessages] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  // Danger zone
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [hasActiveDeals, setHasActiveDeals] = useState<boolean | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetchFromBackend('/user/profile');
        if (res.ok) {
          const data = await res.json();
          const u = data.user || data;
          const fullName = u.name || session?.user?.name || '';
          const parts = fullName.trim().split(/\s+/);
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
          setEmail(u.email || session?.user?.email || '');
          setPhone(u.phone || '');
          setTaxId(u.taxId || '');
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
        if (raw) {
          const p = JSON.parse(raw);
          setDealUpdates(p.dealUpdates ?? true);
          setNewMessages(p.newMessages ?? true);
          setNewsletter(p.newsletter ?? false);
        }
      } catch (_) {}
    }
  }, []);

  const saveNotificationPrefs = (updates: { dealUpdates?: boolean; newMessages?: boolean; newsletter?: boolean }) => {
    const next = { dealUpdates, newMessages, newsletter, ...updates };
    setDealUpdates(next.dealUpdates ?? true);
    setNewMessages(next.newMessages ?? true);
    setNewsletter(next.newsletter ?? false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
    }
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
      const res = await fetchFromBackend('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: name || undefined, phone, taxId: taxId || undefined }),
      });
      if (res.ok) {
        toast.success('Τα στοιχεία ενημερώθηκαν');
      } else {
        toast.error('Σφάλμα κατά την ενημέρωση');
      }
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
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex justify-center py-16"
      >
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-800 border-t-transparent" />
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
      {/* 1. Προσωπικά Στοιχεία */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FaUser className="text-blue-700" /> Προσωπικά Στοιχεία
        </h2>
        <form onSubmit={handleSavePersonal} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Όνομα</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Όνομα"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Επώνυμο</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <p className="text-xs text-gray-500 mt-1">Το email δεν μπορεί να αλλάξει από εδώ</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Τηλέφωνο</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Τηλέφωνο"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ΑΦΜ (Προαιρετικό προς το παρόν)</label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value.replace(/\D/g, '').slice(0, 9))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="9 ψηφία"
              maxLength={9}
            />
            <p className="text-xs text-gray-500 mt-1">Θα σας ζητηθεί στο Deal Room για τις προκαταβολές και τα συμβόλαια</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-xl font-semibold hover:from-blue-900 hover:to-slate-800 transition-all disabled:opacity-50"
          >
            {loading ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </form>
      </div>

      {/* 2. Ρυθμίσεις Ειδοποιήσεων */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FaBell className="text-blue-700" /> Ρυθμίσεις Ειδοποιήσεων
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-gray-700">Ενημερώσεις Deal Room: Να λαμβάνω email όταν αλλάζει το στάδιο της συναλλαγής μου ή όταν ζητούνται έγγραφα</span>
            <input
              type="checkbox"
              checked={dealUpdates}
              onChange={(e) => saveNotificationPrefs({ dealUpdates: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-gray-700">Νέα Μηνύματα: Να λαμβάνω email όταν έχω νέο μήνυμα στο Chat από τον ιδιοκτήτη ή τον δικηγόρο μου</span>
            <input
              type="checkbox"
              checked={newMessages}
              onChange={(e) => saveNotificationPrefs({ newMessages: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-gray-700">Ενημερωτικά & Προσφορές (προαιρετικό newsletter)</span>
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(e) => saveNotificationPrefs({ newsletter: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* 3. Ασφάλεια */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FaLock className="text-blue-700" /> Αλλαγή Κωδικού Πρόσβασης
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Τρέχων κωδικός</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Τρέχων κωδικός"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Νέος κωδικός</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Νέος κωδικός"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Επιβεβαίωση νέου κωδικού</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Επιβεβαίωση"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-xl font-semibold hover:from-blue-900 hover:to-slate-800 transition-all disabled:opacity-50"
          >
            {loading ? 'Αλλαγή...' : 'Αλλαγή Κωδικού'}
          </button>
        </form>
      </div>

      {/* 4. Ζώνη Κινδύνου */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-red-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FaExclamationTriangle className="text-red-600" /> Ζώνη Κινδύνου
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Η διαγραφή είναι οριστική. Αν συμμετέχετε σε κάποιο ενεργό Deal Room, η διαγραφή δεν μπορεί να πραγματοποιηθεί μέχρι να ακυρωθεί η συναλλαγή.
        </p>
        <button
          onClick={async () => {
            setHasActiveDeals(null);
            try {
              const { items } = await listDeals({ limit: 100 });
              const active = items?.some((d: any) => d.status === 'ACTIVE' || d.status === 'DRAFT') ?? false;
              setHasActiveDeals(active);
              if (active) {
                toast.error('Έχετε ενεργή συναλλαγή. Ακυρώστε πρώτα την συναλλαγή από το Deal Room.');
              } else {
                setShowDeleteModal(true);
              }
            } catch {
              setShowDeleteModal(true);
            }
          }}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
        >
          Διαγραφή Λογαριασμού
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Διαγραφή Λογαριασμού</h3>
            <p className="text-gray-600 text-sm mb-4">
              Η διαγραφή είναι οριστική και ανεπίστρεπτη. Εισάγετε τον κωδικό σας για επιβεβαίωση.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Κωδικός πρόσβασης"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
              >
                Ακύρωση
              </button>
              <button
                onClick={async () => {
                  if (!deletePassword) {
                    toast.error('Εισάγετε τον κωδικό σας');
                    return;
                  }
                  setDeleteLoading(true);
                  try {
                    const res = await fetchFromBackend('/user/delete', {
                      method: 'POST',
                      body: JSON.stringify({ password: deletePassword }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                      toast.success('Ο λογαριασμός διαγράφηκε');
                      setShowDeleteModal(false);
                      window.location.href = '/';
                    } else {
                      toast.error(data.error || data.message || 'Σφάλμα κατά την διαγραφή');
                    }
                  } catch (e) {
                    toast.error('Σφάλμα κατά την διαγραφή');
                  } finally {
                    setDeleteLoading(false);
                  }
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
        const ids = new Set(list.map((f: any) => f.property?.id || f.propertyId).filter(Boolean));
        setFavoriteIds(ids);
      } catch (e) {
        console.error('Fetch favorites:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  const handleFavoriteClick = async (propertyId: string) => {
    try {
      const isFav = favoriteIds.has(propertyId);
      if (isFav) {
        await fetchFromBackend('/favorites', {
          method: 'DELETE',
          body: JSON.stringify({ propertyId }),
        });
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(propertyId);
          return next;
        });
        setFavorites((prev) => prev.filter((f) => (f.property?.id || f.propertyId) !== propertyId));
      } else {
        await fetchFromBackend('/favorites', {
          method: 'POST',
          body: JSON.stringify({ propertyId }),
        });
        setFavoriteIds((prev) => new Set([...prev, propertyId]));
      }
    } catch (e) {
      console.error('Toggle favorite:', e);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex justify-center py-16"
      >
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-800 border-t-transparent" />
      </motion.div>
    );
  }

  const properties = favorites
    .map((f) => f.property)
    .filter(Boolean)
    .map((p: any) => ({
      ...p,
      location: p.location || [p.city, p.street, p.number].filter(Boolean).join(', ') || p.city || '',
    }));

  if (properties.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <FaHeart className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Δεν έχετε αποθηκεύσει ακόμα κάποιο ακίνητο</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Όταν κάνετε like σε ακίνητα από τη σελίδα Ακίνητα, θα εμφανίζονται εδώ.
        </p>
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-xl font-semibold hover:from-blue-900 hover:to-slate-800 transition-all"
        >
          <FaSearch /> Αναζήτηση Ακινήτων
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
    >
      {properties.map((property: any) => (
        <PropertyCard
          key={property.id}
          property={property}
          viewMode="grid"
          onFavoriteClick={handleFavoriteClick}
          isAuthenticated={true}
          isFavorite={favoriteIds.has(property.id)}
          userRole="buyer"
        />
      ))}
    </motion.div>
  );
}

function FaqTab({
  categories,
  expandedFaq,
  setExpandedFaq,
}: {
  categories: typeof FAQ_CATEGORIES;
  expandedFaq: string | null;
  setExpandedFaq: (key: string | null) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="space-y-8"
    >
      {categories.map((category, catIdx) => (
        <div key={catIdx} className="space-y-2">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-sm">
              {catIdx + 1}
            </span>
            {category.title}
          </h3>
          <div className="space-y-2">
            {category.items.map((item, itemIdx) => {
              const key = `${catIdx}-${itemIdx}`;
              const isExpanded = expandedFaq === key;
              return (
                <div
                  key={key}
                  className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : key)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 pr-4">{item.q}</span>
                    <span className="flex-shrink-0 text-gray-500">
                      {isExpanded ? (
                        <FaChevronDown className="w-4 h-4" />
                      ) : (
                        <FaChevronRight className="w-4 h-4" />
                      )}
                    </span>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 pt-0 text-gray-600 border-t border-gray-100">
                          {item.a}
                        </div>
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
