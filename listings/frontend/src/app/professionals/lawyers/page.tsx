'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import DynamicNavbar from '@/components/navigation/DynamicNavbar';
import {
  Scale,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  Users,
  TrendingUp,
  KeyRound,
  FileCheck2,
  Send,
  CalendarCheck2,
  ChevronDown,
} from 'lucide-react';
import {
  FaHome,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
} from 'react-icons/fa';

type FaqItem = {
  question: string;
  answer: string;
};

const lawyerFaq: FaqItem[] = [
  {
    question: 'Αναλαμβάνω υποθέσεις και από αγοραστές και από πωλητές;',
    answer:
      'Ναι. Μπορείτε να δεχτείτε αιτήματα εκπροσώπησης είτε από την πλευρά του αγοραστή, είτε του πωλητή. Το περιβάλλον του Deal Room προσαρμόζεται αυτόματα στον ρόλο σας.',
  },
  {
    question: 'Πώς και πότε πληρώνομαι;',
    answer:
      'Η πλατφόρμα δεν έχει καμία ανάμειξη στις αμοιβές σας (0% προμήθεια). Συμφωνείτε το κόστος του νομικού ελέγχου και τον τρόπο πληρωμής απευθείας με τον πελάτη σας.',
  },
  {
    question: 'Φέρω ευθύνη για τη λειτουργία της πλατφόρμας;',
    answer:
      'Όχι. Η ευθύνη σας περιορίζεται αποκλειστικά στη νομική συμβουλή και τον έλεγχο που παρέχετε στον πελάτη σας.',
  },
];

export default function LawyersLandingPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const workflowRef = useRef<HTMLDivElement>(null);

  const scrollToWorkflow = () => {
    workflowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DynamicNavbar />

      {/* 1. Hero Section */}
      <section className="relative min-h-screen bg-slate-900 overflow-hidden flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.14),transparent_30%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_85%,rgba(20,184,166,0.12),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px]" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold tracking-wide text-teal-300">
              <Scale className="h-4 w-4" />
              ΓΙΑ ΔΙΚΗΓΟΡΟΥΣ ΑΚΙΝΗΤΩΝ
            </span>

            <h1 className="mt-6 text-3xl md:text-5xl font-bold leading-tight tracking-tight text-slate-50">
              Ο νομικός έλεγχος ακινήτων, επιτέλους οργανωμένος.
            </h1>
            <p className="mt-6 text-lg md:text-xl leading-relaxed text-slate-300">
              Πάρτε τον απόλυτο έλεγχο της αγοραπωλησίας. Εγκρίνετε έγγραφα, επικοινωνήστε άμεσα με συμβολαιογράφους
              και καθοδηγήστε τον πελάτη σας μέσα από ένα κρυπτογραφημένο ψηφιακό Deal Room. Δωρεάν οργάνωση για τους
              έμπειρους, δωρεάν πελατολόγιο για τους νέους στον κλάδο.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/professional/join?type=LAWYER"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-7 py-4 text-lg font-semibold text-white hover:bg-teal-500 transition-colors"
              >
                Δημιουργία Προφίλ Δικηγόρου
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={scrollToWorkflow}
                className="inline-flex items-center justify-center rounded-xl border border-white/45 px-7 py-4 text-lg font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Δείτε τον Οδηγό Βημάτων
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Lawyer Value Proposition */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Σχεδιασμένο για την νομική σας καθημερινότητα.
          </h2>
          <div className="grid md:grid-cols-3 gap-7">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-7 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Πλήρης Έλεγχος & Εγκρίσεις</h3>
              <p className="text-slate-600 leading-relaxed">
                Δεν είστε απλός θεατής. Εσείς ζητάτε τα έγγραφα, εσείς τα ελέγχετε και εσείς πατάτε την τελική
                «Έγκριση» για να προχωρήσει η προκαταβολή ή το συμβόλαιο. Τίποτα δεν προχωράει χωρίς τη νομική σας
                συγκατάθεση.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-7 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Απευθείας Επικοινωνία</h3>
              <p className="text-slate-600 leading-relaxed">
                Τέρμα τα διάσπαρτα emails. Επικοινωνήστε απευθείας με τον πελάτη σας (αγοραστή ή πωλητή) και
                συμμετέχετε σε κλειστή ομαδική συνομιλία με τον Συμβολαιογράφο και τον Μηχανικό για άμεση επίλυση
                θεμάτων.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-7 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Ασφάλεια & Νέο Πελατολόγιο</h3>
              <p className="text-slate-600 leading-relaxed">
                Τα έγγραφα είναι κρυπτογραφημένα και ορατά ΜΟΝΟ σε εσάς και τον πελάτη σας. Παράλληλα, αν είστε νέος
                στον κλάδο, η δωρεάν προβολή σας στο δίκτυό μας είναι ο ιδανικός τρόπος να προσελκύσετε νέους
                πελάτες.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 3. Workflow Timeline */}
      <section ref={workflowRef} className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center">Ο Οδηγός σας μέσα στο Deal Room (Βήμα-Βήμα)</h2>
          <p className="text-center text-slate-600 mt-3 mb-14">Παράδειγμα διαδικασίας ως Δικηγόρος Αγοραστή.</p>

          <div className="relative">
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-teal-200" />
            <div className="space-y-10">
              {[
                {
                  title: 'Βήμα 1: Έλεγχος για Προκαταβολή.',
                  description:
                    'Ελέγχετε τα βασικά έγγραφα του πελάτη σας (Ταυτότητα, ΑΦΜ, κλπ). Μόλις πατήσετε «Επιβεβαίωση», το σύστημα επιτρέπει την πληρωμή της προκαταβολής.',
                },
                {
                  title: 'Βήμα 2: Έγκριση Πλήρους Φακέλου.',
                  description:
                    'Μπαίνετε στο tab «Έγγραφα». Ελέγχετε τον τίτλο κτήσης και τα νομιμοποιητικά. Όταν είστε σίγουροι για τον νομικό έλεγχο, πατάτε την τελική «Έγκριση».',
                },
                {
                  title: 'Βήμα 3: Αποστολή στον Συμβολαιογράφο.',
                  description:
                    'Επιλέγετε με ένα κλικ τα έγγραφα που ελέγξατε και τα αποστέλλετε ψηφιακά στον Συμβολαιογράφο της συναλλαγής.',
                },
                {
                  title: 'Βήμα 4: Ραντεβού Υπογραφών.',
                  description:
                    'Το σύστημα σας ειδοποιεί μόλις τα μέρη κανονίσουν την ημερομηνία υπογραφής. Προσέρχεστε στο γραφείο του συμβολαιογράφου έχοντας τον πλήρη ψηφιακό φάκελο στο tablet ή το κινητό σας.',
                },
              ].map((step, idx) => (
                <article key={step.title} className="relative pl-14">
                  <div className="absolute left-0 top-0 h-10 w-10 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-slate-600 leading-relaxed">{step.description}</p>
                  <div className="mt-3 text-teal-700">
                    {idx === 0 && <FileCheck2 className="h-4 w-4" />}
                    {idx === 1 && <ShieldCheck className="h-4 w-4" />}
                    {idx === 2 && <Send className="h-4 w-4" />}
                    {idx === 3 && <CalendarCheck2 className="h-4 w-4" />}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. GDPR & Privacy Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-white">Απόλυτο Νομικό Απόρρητο.</h2>
            <p className="mt-5 text-slate-300 leading-relaxed text-lg">
              Γνωρίζουμε πόσο κρίσιμη είναι η προστασία των προσωπικών δεδομένων. Στο Deal Room, πρόσβαση στα έγγραφα
              έχει ΑΥΣΤΗΡΑ και μόνο αυτός που τα ζήτησε και αυτός που τα έστειλε. Κανένας τρίτος. Με την ολοκλήρωση
              της συναλλαγής, ο ψηφιακός φάκελος κλειδώνει, διασφαλίζοντας την πλήρη συμμόρφωση με τον GDPR.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8">
            <div className="mx-auto h-28 w-28 rounded-full bg-teal-600/20 border border-teal-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(20,184,166,0.2)]">
              <KeyRound className="h-10 w-10 text-teal-300" />
            </div>
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/50 p-5">
              <div className="flex items-center gap-3 text-teal-300 font-semibold">
                <ShieldCheck className="h-5 w-5" />
                GDPR Protected Deal Room
              </div>
              <p className="text-slate-300 text-sm mt-2">
                Κρυπτογράφηση, role-based access και αυτόματο κλείδωμα φακέλου μετά την ολοκλήρωση της υπόθεσης.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ Accordion */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">Συχνές Ερωτήσεις</h2>
          <div className="space-y-3">
            {lawyerFaq.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <article key={item.question} className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4"
                  >
                    <span className="font-semibold text-slate-900">{item.question}</span>
                    <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && <p className="px-5 pb-5 text-slate-600 leading-relaxed">{item.answer}</p>}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Final CTA */}
      <section className="py-24 bg-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-slate-900">Οργανώστε την επόμενη αγοραπωλησία σας ψηφιακά.</h2>
          <Link
            href="/professional/join?type=LAWYER"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-teal-600 text-white hover:bg-teal-500 font-semibold text-lg transition-colors"
          >
            Δημιουργήστε Προφίλ Δικηγόρου (Δωρεάν)
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

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
    </div>
  );
}

