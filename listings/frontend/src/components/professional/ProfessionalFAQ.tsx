'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, X, LifeBuoy, ShieldCheck } from 'lucide-react';

type FaqTab = 'general' | 'lawyers' | 'notaries' | 'engineers';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_CONTENT: Record<FaqTab, FaqItem[]> = {
  general: [
    {
      id: 'general-1',
      question: 'Ποιο είναι το κόστος χρήσης της πλατφόρμας;',
      answer:
        'Η δημιουργία προφίλ, η συμμετοχή στο δίκτυο επαγγελματιών και η χρήση του ψηφιακού Deal Room είναι 100% δωρεάν για εσάς. Η πλατφόρμα δεν παρακρατεί καμία προμήθεια.',
    },
    {
      id: 'general-2',
      question: 'Πώς πληρώνομαι για τις υπηρεσίες μου;',
      answer:
        'Η πλατφόρμα δεν εμπλέκεται στην οικονομική σας συναλλαγή. Συμφωνείτε το κόστος και τον τρόπο πληρωμής απευθείας με τον πελάτη σας (εκτός πλατφόρμας), όπως ακριβώς κάνετε και στο φυσικό σας γραφείο.',
    },
    {
      id: 'general-3',
      question: 'Είναι τα έγγραφα των πελατών μου ασφαλή;',
      answer:
        'Απόλυτα. Το Deal Room είναι πλήρως εναρμονισμένο με τον GDPR. Τα έγγραφα κρυπτογραφούνται και είναι προσβάσιμα αυστηρά και μόνο από τα εμπλεκόμενα μέρη της συγκεκριμένης συναλλαγής.',
    },
    {
      id: 'general-4',
      question: 'Μπορώ να φέρω δικούς μου πελάτες στην πλατφόρμα;',
      answer:
        'Ναι! Μπορείτε να προσκαλέσετε πελάτες σας να ανοίξουν ένα Deal Room για να οργανώσετε ψηφιακά τη συναλλαγή τους, χωρίς καμία χρέωση.',
    },
  ],
  lawyers: [
    {
      id: 'lawyers-1',
      question: 'Φέρω νομική ευθύνη για τη λειτουργία της πλατφόρμας;',
      answer:
        'Όχι. Λειτουργείτε ως ανεξάρτητος επαγγελματίας. Η νομική σας ευθύνη περιορίζεται αποκλειστικά στη συμβουλή και τον έλεγχο που παρέχετε στον πελάτη σας.',
    },
    {
      id: 'lawyers-2',
      question: 'Πώς εγκρίνω ένα έγγραφο;',
      answer:
        "Μέσα στο Deal Room, μεταβαίνετε στην καρτέλα 'Έγγραφα'. Ελέγχετε το αρχείο και πατάτε το κουμπί 'Έγκριση'. Τίποτα δεν προχωράει στο επόμενο στάδιο χωρίς τη δική σας νομική συγκατάθεση.",
    },
    {
      id: 'lawyers-3',
      question: 'Μπορώ να επικοινωνήσω με τον δικηγόρο της άλλης πλευράς;',
      answer:
        'Βεβαίως. Το ενσωματωμένο Chat σας επιτρέπει να επικοινωνείτε άμεσα με τον πελάτη σας, αλλά και να συμμετέχετε σε ομαδική συνομιλία με τους υπόλοιπους επαγγελματίες της συναλλαγής.',
    },
  ],
  notaries: [
    {
      id: 'notaries-1',
      question: 'Ποιος είναι υπεύθυνος να μου στείλει τα έγγραφα;',
      answer:
        'Τα έγγραφα συλλέγονται και προ-ελέγχονται από τον Δικηγόρο και τον Μηχανικό μέσα στο Deal Room. Εσείς παραλαμβάνετε τον φάκελο έτοιμο, γλιτώνοντας χρόνο.',
    },
    {
      id: 'notaries-2',
      question: 'Τι κάνω αν ένα πιστοποιητικό (π.χ. ΤΑΠ, ΕΝΦΙΑ) έχει λήξει;',
      answer:
        "Μέσα από το Deal Room, επιλέγετε το συγκεκριμένο έγγραφο και πατάτε 'Απόρριψη/Επανέκδοση'. Ο αρμόδιος (π.χ. πωλητής ή δικηγόρος) ειδοποιείται αυτόματα να ανεβάσει το νέο έγγραφο.",
    },
    {
      id: 'notaries-3',
      question: 'Πώς κλείνεται το ραντεβού των υπογραφών;',
      answer:
        'Εσείς ορίζετε τη διαθεσιμότητά σας (ή προτείνει ο πελάτης). Για να οριστικοποιηθεί το ραντεβού στο γραφείο σας, απαιτείται ψηφιακή επιβεβαίωση και από τα 3 μέρη (Αγοραστής, Πωλητής, Συμβολαιογράφος).',
    },
  ],
  engineers: [
    {
      id: 'engineers-1',
      question: 'Πώς ολοκληρώνω τον τεχνικό έλεγχο;',
      answer:
        "Αφού εκδώσετε την Ηλεκτρονική Ταυτότητα Κτιρίου (ΗΤΚ) και το ΠΕΑ, τα ανεβάζετε στην καρτέλα Εγγράφων και πατάτε 'Ολοκλήρωση Τεχνικού Ελέγχου'. Αυτόματα ειδοποιούνται οι δικηγόροι και ο συμβολαιογράφος.",
    },
    {
      id: 'engineers-2',
      question: 'Πώς ζητάω παλιές κατόψεις ή άδειες από τον ιδιοκτήτη;',
      answer:
        'Μέσα από το Deal Room, μπορείτε να στείλετε απευθείας αίτημα στον ιδιοκτήτη (πωλητή) για να ανεβάσει τα νομιμοποιητικά στοιχεία που χρειάζεστε για την αυτοψία.',
    },
    {
      id: 'engineers-3',
      question: 'Πώς κλείνω ραντεβού για την αυτοψία;',
      answer:
        'Χρησιμοποιείτε το ενσωματωμένο ημερολόγιο της πλατφόρμας για να προτείνετε μέρα και ώρα στον ιδιοκτήτη, αποφεύγοντας τα άσκοπα τηλεφωνήματα.',
    },
  ],
};

const TABS: Array<{ id: FaqTab; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'lawyers', label: 'Lawyers' },
  { id: 'notaries', label: 'Notaries' },
  { id: 'engineers', label: 'Engineers' },
];

const TAB_TITLES: Record<FaqTab, string> = {
  general: 'Γενικές Ερωτήσεις',
  lawyers: 'Για Δικηγόρους',
  notaries: 'Για Συμβολαιογράφους',
  engineers: 'Για Μηχανικούς',
};

export default function ProfessionalFAQ() {
  const [activeTab, setActiveTab] = useState<FaqTab>('general');
  const [search, setSearch] = useState('');
  const [openItem, setOpenItem] = useState<string | null>(FAQ_CONTENT.general[0]?.id || null);

  const filteredItems = useMemo(() => {
    const source = FAQ_CONTENT[activeTab];
    const q = search.trim().toLowerCase();
    if (!q) return source;
    return source.filter((item) => {
      return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
    });
  }, [activeTab, search]);

  const handleTabChange = (tab: FaqTab) => {
    setActiveTab(tab);
    setSearch('');
    setOpenItem(FAQ_CONTENT[tab][0]?.id || null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-200 bg-teal-50 text-teal-700 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Professional Help Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-4">Κέντρο Υποστήριξης & Συχνές Ερωτήσεις</h1>
          <p className="text-slate-500 mt-2 max-w-3xl">
            Βρείτε απαντήσεις για τη λειτουργία του Deal Room και τη διαχείριση των υποθέσεών σας.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
            <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`pb-2 text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-b-2 border-teal-600 text-teal-700 font-medium'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Αναζήτηση ερώτησης..."
                className="w-full h-10 pl-9 pr-10 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label="Καθαρισμός αναζήτησης"
                >
                  <X className="w-4 h-4 mx-auto" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-slate-900">{TAB_TITLES[activeTab]}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredItems.length} αποτέλεσμα{filteredItems.length === 1 ? '' : 'τα'}
              </p>
            </div>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                Καθαρισμός φίλτρου
              </button>
            )}
          </div>

          <div>
            {filteredItems.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white border border-slate-200 mb-3">
                  <Search className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-slate-700 font-medium">Δεν βρέθηκαν αποτελέσματα για την αναζήτησή σας.</p>
                <p className="text-sm text-slate-500 mt-1">Δοκιμάστε διαφορετική λέξη-κλειδί ή αλλάξτε κατηγορία.</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isOpen = openItem === item.id;
                return (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-xl mb-3 shadow-sm transition-all ${
                      isOpen ? 'border-teal-200 shadow-md' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenItem(isOpen ? null : item.id)}
                      className="w-full px-4 py-4 text-left flex items-center justify-between gap-4"
                    >
                      <span className={`font-medium leading-relaxed ${isOpen ? 'text-teal-700' : 'text-slate-900'}`}>
                        {item.question}
                      </span>
                      <div
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                          isOpen ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/40 rounded-b-xl">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-slate-100 p-6 rounded-2xl mt-8 text-center border border-slate-200">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border border-slate-200 mb-3">
            <LifeBuoy className="w-5 h-5 text-teal-700" />
          </div>
          <p className="text-slate-700 mb-4">
            Δεν βρήκατε αυτό που ψάχνετε; Η ομάδα υποστήριξης επαγγελματιών είναι εδώ.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/agent/contact"
              className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Επικοινωνία με Support
            </Link>
            <Link
              href="/professional/dashboard"
              className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-teal-600 text-white border border-teal-600 hover:bg-teal-700 transition-colors"
            >
              Επιστροφή στο Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
