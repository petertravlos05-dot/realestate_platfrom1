'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import DynamicNavbar from '@/components/navigation/DynamicNavbar';
import { useSession } from 'next-auth/react';
import {
  Compass,
  HardHat,
  Ruler,
  UploadCloud,
  Calendar,
  ArrowRight,
  FileWarning,
  CalendarRange,
  ChevronDown,
  MessageSquare,
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

const engineerFaq: FaqItem[] = [
  {
    question: 'Υπάρχει κάποιο κόστος εγγραφής ή προμήθεια;',
    answer:
      'Όχι. Η πλατφόρμα δεν κρατάει καμία προμήθεια. Συμφωνείτε την αμοιβή σας (π.χ. για τακτοποιήσεις ή έκδοση ΗΤΚ) απευθείας με τον ιδιοκτήτη.',
  },
  {
    question: 'Μπορώ να χρησιμοποιήσω το Deal Room για πελάτες εκτός πλατφόρμας;',
    answer:
      'Ναι. Μπορείτε να προσκαλέσετε τους υφιστάμενους πελάτες σας στην πλατφόρμα για να οργανώσετε τον φάκελο του ακινήτου τους ψηφιακά, χωρίς καμία χρέωση.',
  },
  {
    question: 'Ποιος άλλος βλέπει τα σχέδια και την ΗΤΚ;',
    answer:
      'Μόνο τα εξουσιοδοτημένα μέρη της συναλλαγής (αγοραστής, πωλητής, δικηγόροι, συμβολαιογράφος). Το Deal Room προσφέρει πλήρη έλεγχο πρόσβασης.',
  },
];

export default function EngineersLandingPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const workflowRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const ctaHref = isLoggedIn ? '/professional/dashboard' : '/professional/join?type=ENGINEER';
  const heroCtaLabel = isLoggedIn ? 'Μετάβαση στο Dashboard' : 'Δημιουργία Προφίλ Μηχανικού';
  const finalCtaLabel = isLoggedIn
    ? 'Μετάβαση στο Professional Dashboard'
    : 'Δημιουργήστε Προφίλ Μηχανικού (Δωρεάν)';

  const scrollToWorkflow = () => {
    workflowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DynamicNavbar />

      {/* 1. Hero Section */}
      <section className="relative min-h-screen bg-slate-900 overflow-hidden flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.12),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold tracking-wide text-teal-300">
              <Compass className="h-4 w-4" />
              ΓΙΑ ΜΗΧΑΝΙΚΟΥΣ
            </span>

            <h1 className="mt-7 text-3xl md:text-5xl font-bold leading-tight tracking-tight text-slate-50">
              Τέλος στα άσκοπα τηλέφωνα. Ο τεχνικός έλεγχος γίνεται ψηφιακά.
            </h1>
            <p className="mt-6 text-lg md:text-xl leading-relaxed text-slate-300">
              Συλλέξτε έγγραφα από ιδιοκτήτες, κλείστε ραντεβού αυτοψίας και ανεβάστε την Ηλεκτρονική Ταυτότητα
              Κτιρίου σε ένα κοινό, ασφαλές Deal Room. Προβάλλετε το γραφείο σας και αναλάβετε νέες υποθέσεις,
              εντελώς δωρεάν.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href={ctaHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-7 py-4 text-lg font-semibold text-white hover:bg-teal-500 transition-colors"
              >
                {heroCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={scrollToWorkflow}
                className="inline-flex items-center justify-center rounded-xl border border-white/50 px-7 py-4 text-lg font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Δείτε πώς λειτουργεί
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Engineer Value Proposition */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Εργαλεία που λύνουν τα χέρια του Μηχανικού.
          </h2>
          <div className="grid md:grid-cols-3 gap-7">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-7 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                <FileWarning className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Ψηφιακή Συλλογή Εγγράφων</h3>
              <p className="text-slate-600 leading-relaxed">
                Ξεχάστε τα μισά emails. Ζητήστε από τον ιδιοκτήτη παλιές άδειες, κατόψεις ή νομιμοποιήσεις αυθαιρέτων
                απευθείας μέσα από το Deal Room. Αν λείπει κάτι, το σύστημα τον ειδοποιεί να το ανεβάσει.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-7 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                <UploadCloud className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Άμεση Ανάρτηση & Έγκριση</h3>
              <p className="text-slate-600 leading-relaxed">
                Εκδίδετε την ΗΤΚ ή το ΠΕΑ, το ανεβάζετε στον φάκελο και πατάτε «Ολοκλήρωση Τεχνικού Ελέγχου». Αμέσως,
                δικηγόροι και συμβολαιογράφοι ειδοποιούνται ότι το ακίνητο είναι τεχνικά έτοιμο, χωρίς να σας
                ενοχλούν.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-7 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                <CalendarRange className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Αυτόματες Αυτοψίες & Νέοι Πελάτες</h3>
              <p className="text-slate-600 leading-relaxed">
                Κλείστε ραντεβού για την αυτοψία του ακινήτου μέσα από το ημερολόγιο της πλατφόρμας. Παράλληλα, το
                προφίλ σας προβάλλεται δωρεάν στο δίκτυό μας, φέρνοντάς σας νέους πελάτες για τακτοποιήσεις και
                βεβαιώσεις.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 3. Engineer Workflow */}
      <section ref={workflowRef} className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center">Ο Οδηγός σας μέσα στο Deal Room</h2>
          <p className="text-center text-slate-600 mt-3 mb-14">Από την ανάθεση μέχρι την έκδοση της ΗΤΚ.</p>

          <div className="relative">
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-teal-200" />
            <div className="space-y-10">
              {[
                {
                  title: 'Βήμα 1: Αίτημα & Συλλογή.',
                  description:
                    'Ο ιδιοκτήτης σας αναθέτει το ακίνητο. Μέσα από το Deal Room, του ζητάτε με ένα κλικ όλα τα απαραίτητα αρχικά έγγραφα (οικοδομική άδεια, σχέδια).',
                },
                {
                  title: 'Βήμα 2: Αυτοψία.',
                  description:
                    'Κλείνετε ραντεβού με τον ιδιοκτήτη μέσα από το ενσωματωμένο ημερολόγιο της πλατφόρμας για να επισκεφθείτε το ακίνητο.',
                },
                {
                  title: 'Βήμα 3: Ανάρτηση (ΗΤΚ).',
                  description:
                    'Ετοιμάζετε την Ηλεκτρονική Ταυτότητα Κτιρίου και το Ενεργειακό Πιστοποιητικό. Τα ανεβάζετε με ασφάλεια στον κλειδωμένο ψηφιακό φάκελο.',
                },
                {
                  title: 'Βήμα 4: Πράσινο Φως.',
                  description:
                    'Πατάτε «Ολοκλήρωση Τεχνικού Ελέγχου». Τα υπόλοιπα μέρη της συναλλαγής βλέπουν ότι ο φάκελος είναι άρτιος τεχνικά και η διαδικασία συνεχίζεται στον δικηγόρο/συμβολαιογράφο.',
                },
              ].map((step, idx) => (
                <article key={step.title} className="relative pl-14">
                  <div className="absolute left-0 top-0 h-10 w-10 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-slate-600 leading-relaxed">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Technical Precision & Communication */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,184,166,0.12)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(20,184,166,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-teal-600/20 border border-teal-400/40 flex items-center justify-center mb-6">
                <Ruler className="h-9 w-9 text-teal-300" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <HardHat className="h-5 w-5 text-teal-300 mb-2" />
                  <p className="text-sm text-slate-300">Blueprint checks</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <UploadCloud className="h-5 w-5 text-teal-300 mb-2" />
                  <p className="text-sm text-slate-300">Cloud folder sync</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white">Απευθείας επικοινωνία με την ομάδα.</h2>
            <p className="mt-5 text-slate-300 leading-relaxed text-lg">
              Αν προκύψει νομικό κόλλημα με κάποια τακτοποίηση, δεν χρειάζεται να ψάχνετε τον δικηγόρο του αγοραστή
              στο τηλέφωνο. Στείλτε του μήνυμα απευθείας στο ενσωματωμένο chat του Deal Room. Όλα τα μέρη είναι
              συνδεδεμένα.
            </p>
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800/80 p-4 inline-flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-teal-300" />
              <span className="text-slate-200">Realtime collaboration χωρίς θόρυβο.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">Συχνές Ερωτήσεις</h2>
          <div className="space-y-3">
            {engineerFaq.map((item, idx) => {
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
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-slate-900">Εκσυγχρονίστε τον τεχνικό έλεγχο.</h2>
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-teal-600 text-white hover:bg-teal-500 font-semibold text-lg transition-colors"
          >
            {finalCtaLabel}
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
