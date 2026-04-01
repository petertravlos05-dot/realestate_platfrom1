'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import DynamicNavbar from '@/components/navigation/DynamicNavbar';
import { useSession } from 'next-auth/react';
import {
  FileSignature,
  ArrowRight,
  FolderCheck,
  ShieldAlert,
  CalendarCheck,
  Users,
  CheckCircle,
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

const notaryFaq: FaqItem[] = [
  {
    question: 'Πληρώνω κάποια συνδρομή ή προμήθεια πλατφόρμας;',
    answer:
      'Απολύτως τίποτα. Η δημιουργία προφίλ και η χρήση του λογισμικού είναι 100% δωρεάν. Η αμοιβή σας καταβάλλεται απευθείας από τον αγοραστή βάσει της νομοθεσίας.',
  },
  {
    question: 'Τι γίνεται αν ένα έγγραφο που μου έστειλαν έχει λήξει;',
    answer:
      'Το απορρίπτετε με ένα κλικ μέσα από το Deal Room και ζητάτε την αντικατάστασή του. Ο υπεύθυνος (π.χ. δικηγόρος ή πωλητής) ειδοποιείται αυτόματα για να ανεβάσει το νέο.',
  },
  {
    question: 'Ποιος είναι υπεύθυνος για την ανάρτηση των εγγράφων;',
    answer:
      'Τα έγγραφα ανεβαίνουν από τους πωλητές, τους αγοραστές, τους μηχανικούς και τους δικηγόρους. Εσείς απλώς παραλαμβάνετε, ελέγχετε και συντάσσετε το συμβόλαιο.',
  },
];

export default function NotariesLandingPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const workflowRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const ctaHref = isLoggedIn ? '/professional/dashboard' : '/professional/join?type=NOTARY';
  const heroCtaLabel = isLoggedIn ? 'Μετάβαση στο Dashboard' : 'Δημιουργία Προφίλ Συμβολαιογράφου';
  const finalCtaLabel = isLoggedIn
    ? 'Μετάβαση στο Professional Dashboard'
    : 'Δημιουργήστε Προφίλ Συμβολαιογράφου (Δωρεάν)';

  const scrollToWorkflow = () => {
    workflowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DynamicNavbar />

      {/* 1. Hero Section */}
      <section className="relative min-h-screen bg-slate-900 overflow-hidden flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.14),transparent_30%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_82%,rgba(20,184,166,0.10),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px]" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold tracking-wide text-teal-300">
              <FileSignature className="h-4 w-4" />
              ΓΙΑ ΣΥΜΒΟΛΑΙΟΓΡΑΦΟΥΣ
            </span>

            <h1 className="mt-7 text-3xl md:text-5xl font-bold leading-tight tracking-tight text-slate-50">
              Τέλος στο κυνηγητό των εγγράφων. Τα συμβόλαια περνούν στη νέα εποχή.
            </h1>
            <p className="mt-6 text-lg md:text-xl leading-relaxed text-slate-300">
              Παραλάβετε προ-ελεγμένους ψηφιακούς φακέλους από δικηγόρους και μηχανικούς. Απαιτήστε έγγραφα,
              εγκρίνετε τα δικαιολογητικά με ένα κλικ και κλείστε ραντεβού υπογραφών ψηφιακά. Μηδενική χρέωση,
              μηδενική προμήθεια, απόλυτη οργάνωση.
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
                Δείτε τη διαδικασία
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Notary Value Proposition */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Σχεδιασμένο για να μη χάνετε ούτε λεπτό.</h2>
          <div className="grid md:grid-cols-3 gap-7">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-7 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                <FolderCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Προ-ελεγμένοι Φάκελοι</h3>
              <p className="text-slate-600 leading-relaxed">
                Ξεχάστε τον χαμό. Όταν μπαίνετε στο Deal Room, ο δικηγόρος και ο μηχανικός έχουν ήδη ελέγξει τα βασικά
                έγγραφα (τίτλους, ΗΤΚ). Εσείς παραλαμβάνετε τα πάντα συγκεντρωμένα και έτοιμα για σύνταξη συμβολαίου.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-7 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Απόλυτος Έλεγχος</h3>
              <p className="text-slate-600 leading-relaxed">
                Ζητήστε συγκεκριμένα έγγραφα ή ενέργειες από τον οποιονδήποτε (πωλητή, αγοραστή, δικηγόρο). Έχετε τη
                δύναμη να απορρίψετε ελλιπή δικαιολογητικά και να πατήσετε την τελική «Έγκριση» μόνο όταν ο φάκελος
                είναι άρτιος.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-7 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Έξυπνος Προγραμματισμός & Πελατεία</h3>
              <p className="text-slate-600 leading-relaxed">
                Τέρμα τα ατελείωτα τηλεφωνήματα για να βρεθεί κοινή ώρα. Προτείνετε τη διαθεσιμότητά σας και το
                σύστημα κλειδώνει το ραντεβού μόνο όταν συμφωνήσουν και τα 3 μέρη. Παράλληλα, προβάλλεστε δωρεάν σε
                νέους πελάτες της περιοχής σας.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 3. Notary Workflow */}
      <section ref={workflowRef} className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center">Ο Οδηγός σας μέσα στο Deal Room</h2>
          <p className="text-center text-slate-600 mt-3 mb-14">
            Απλοποιώντας τη διαδικασία από την ανάθεση μέχρι την υπογραφή.
          </p>

          <div className="relative">
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-teal-200" />
            <div className="space-y-10">
              {[
                {
                  title: 'Βήμα 1: Αίτημα Εγγράφων.',
                  description:
                    'Ο αγοραστής σας επιλέγει μέσα από την πλατφόρμα. Μπαίνετε στο Deal Room και επικοινωνείτε με τον δικηγόρο και τον μηχανικό για να σας μεταβιβάσουν τον ήδη ελεγμένο φάκελο.',
                },
                {
                  title: 'Βήμα 2: Έλεγχος & Τελική Έγκριση.',
                  description:
                    'Ελέγχετε ψηφιακά την ορθότητα των εγγράφων (π.χ. πιστοποιητικά ΕΝΦΙΑ, ΤΑΠ, φορολογική ενημερότητα). Μόλις βεβαιωθείτε ότι όλα είναι πλήρη, πατάτε «Έγκριση».',
                },
                {
                  title: 'Βήμα 3: Ραντεβού Υπογραφών.',
                  description:
                    'Ορίζετε τις διαθέσιμες ημέρες/ώρες σας ή εξετάζετε τις προτάσεις των πελατών. Το ραντεβού επιβεβαιώνεται ψηφιακά από αγοραστή, πωλητή και εσάς.',
                },
                {
                  title: 'Βήμα 4: Ολοκλήρωση.',
                  description:
                    'Οι πελάτες προσέρχονται στο γραφείο σας την προκαθορισμένη ώρα, οι υπογραφές πέφτουν και η συναλλαγή κλείνει με επιτυχία και απόλυτη τάξη.',
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

      {/* 4. Quote / Trust Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="h-14 w-14 rounded-full bg-teal-600/20 border border-teal-400/40 flex items-center justify-center mx-auto mb-6">
            <Users className="h-6 w-6 text-teal-300" />
          </div>
          <p className="text-xl md:text-2xl leading-relaxed text-slate-100 italic">
            "Η συλλογή των χαρτιών είναι η μεγαλύτερη πληγή στο ελληνικό Real Estate. Το ψηφιακό Deal Room χτίστηκε
            για να φέρει τα έγγραφα στο γραφείο σας, όχι για να τα κυνηγάτε."
          </p>
        </div>
      </section>

      {/* 5. FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">Συχνές Ερωτήσεις</h2>
          <div className="space-y-3">
            {notaryFaq.map((item, idx) => {
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
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-slate-900">
            Μειώστε τη γραφειοκρατία, αυξήστε τα συμβόλαια.
          </h2>
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

