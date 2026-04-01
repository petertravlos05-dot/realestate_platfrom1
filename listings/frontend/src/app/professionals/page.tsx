'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import DynamicNavbar from '@/components/navigation/DynamicNavbar';
import {
  FaArrowRight,
  FaCheckCircle,
  FaTimesCircle,
  FaShieldAlt,
  FaFolderOpen,
  FaUsers,
  FaChartLine,
  FaBalanceScale,
  FaFileSignature,
  FaDraftingCompass,
  FaHome,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
} from 'react-icons/fa';

export default function ProfessionalsLandingPage() {
  const roleSectionRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const heroPrimaryHref = isLoggedIn ? '/professional/dashboard' : '/professional/join';
  const heroPrimaryLabel = isLoggedIn ? 'Μετάβαση στο Dashboard' : 'Δημιουργήστε Δωρεάν Προφίλ';
  const finalCtaHref = isLoggedIn ? '/professional/dashboard' : '/professional/join';
  const finalCtaLabel = isLoggedIn ? 'Μετάβαση στο Professional Dashboard' : 'Εγγραφή Επαγγελματία (Δωρεάν)';

  useEffect(() => {
    if (status !== 'authenticated') return;
    const role = session?.user?.role;
    const isProfessional =
      role === 'LAWYER' || role === 'NOTARY' || role === 'ENGINEER' || role === 'ACCOUNTANT' || role === 'ADMIN';

    if (!isProfessional) {
      void (async () => {
        await signOut({ redirect: false });
        router.push('/buyer');
      })();
    }
  }, [router, session?.user?.role, status]);

  const scrollToRoles = () => {
    roleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DynamicNavbar />

      {/* 1. Hero Section */}
      <section className="relative min-h-screen overflow-hidden bg-slate-900 text-white flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.10),transparent_35%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(20,184,166,0.08),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:42px_42px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-28 w-full">
          <div className="max-w-4xl">
            <span className="inline-flex rounded-full bg-slate-800 border border-slate-700 px-4 py-2 text-sm font-semibold tracking-wide text-teal-300">
              ΓΙΑ ΔΙΚΗΓΟΡΟΥΣ, ΣΥΜΒΟΛΑΙΟΓΡΑΦΟΥΣ & ΜΗΧΑΝΙΚΟΥΣ
            </span>

            <h1 className="mt-7 text-3xl md:text-5xl font-bold leading-tight tracking-tight text-slate-50">
              Τέλος στο χάος των emails. Το ψηφιακό σας γραφείο για Real Estate, εντελώς δωρεάν.
            </h1>

            <p className="mt-6 text-lg md:text-xl leading-relaxed text-slate-300">
              Συγκεντρώστε όλα τα έγγραφα της αγοραπωλησίας σε ένα ασφαλές Deal Room. Εξαλείψτε τα ατελείωτα
              τηλεφωνήματα, συνεργαστείτε ψηφιακά με πελάτες και μεσίτες, και προβάλλετε το γραφείο σας σε
              εκατοντάδες νέους πελάτες.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href={heroPrimaryHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-8 py-4 text-lg font-semibold text-white hover:bg-teal-500 transition-colors"
              >
                {heroPrimaryLabel}
                <FaArrowRight />
              </Link>
              <button
                onClick={scrollToRoles}
                className="inline-flex items-center justify-center rounded-xl border border-white/50 px-8 py-4 text-lg font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Πώς λειτουργεί
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. The Problem vs The Solution */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-700 mb-6">Ο παλιός, χαοτικός τρόπος</h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-slate-600">
                  <FaTimesCircle className="mt-0.5 text-rose-500 shrink-0" />
                  <span>Διάσπαρτα έγγραφα σε email και Viber.</span>
                </li>
                <li className="flex items-start gap-3 text-slate-600">
                  <FaTimesCircle className="mt-0.5 text-rose-500 shrink-0" />
                  <span>Ατελείωτα τηλεφωνήματα με μεσίτες και πελάτες.</span>
                </li>
                <li className="flex items-start gap-3 text-slate-600">
                  <FaTimesCircle className="mt-0.5 text-rose-500 shrink-0" />
                  <span>Χαμένες πληροφορίες και νομικές παρεξηγήσεις.</span>
                </li>
                <li className="flex items-start gap-3 text-slate-600">
                  <FaTimesCircle className="mt-0.5 text-rose-500 shrink-0" />
                  <span>Καθυστερήσεις εβδομάδων στη συλλογή δικαιολογητικών.</span>
                </li>
              </ul>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-800 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-teal-300 mb-6">Ο ψηφιακός τρόπος (Deal Room)</h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-slate-100">
                  <FaCheckCircle className="mt-0.5 text-teal-400 shrink-0" />
                  <span>Όλα τα έγγραφα σε έναν κοινό, ασφαλή φάκελο.</span>
                </li>
                <li className="flex items-start gap-3 text-slate-100">
                  <FaCheckCircle className="mt-0.5 text-teal-400 shrink-0" />
                  <span>Γραπτή, ξεκάθαρη επικοινωνία στο ενσωματωμένο Chat.</span>
                </li>
                <li className="flex items-start gap-3 text-slate-100">
                  <FaCheckCircle className="mt-0.5 text-teal-400 shrink-0" />
                  <span>Αυτόματες ειδοποιήσεις για ελλείψεις εγγράφων.</span>
                </li>
                <li className="flex items-start gap-3 text-slate-100">
                  <FaCheckCircle className="mt-0.5 text-teal-400 shrink-0" />
                  <span>Ταχύτερες υπογραφές, μηδενική ταλαιπωρία.</span>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* 3. Dual Benefit Section */}
      <section className="py-20 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <article className="rounded-2xl border border-slate-200 bg-white p-8 lg:p-10 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <FaShieldAlt />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <FaFolderOpen />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Οργάνωση & Ασφάλεια</h3>
              <p className="text-slate-600 leading-relaxed">
                Διαχειριστείτε όλες τις υποθέσεις σας από ένα κεντρικό Dashboard. Προστατέψτε τα δεδομένα των
                πελατών σας και έχετε πλήρες ιστορικό κάθε ενέργειας και εγγράφου.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-8 lg:p-10 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <FaUsers />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <FaChartLine />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Δωρεάν Πελατολόγιο & Μηδενική Προμήθεια</h3>
              <p className="text-slate-600 leading-relaxed">
                Το προφίλ σας προβάλλεται στον κατάλογο επαγγελματιών μας. Οι χρήστες σας βρίσκουν, σας
                αξιολογούν και σας στέλνουν αιτήματα συνεργασίας. Η πλατφόρμα ΔΕΝ κρατάει καμία προμήθεια από
                την αμοιβή σας. Η τιμολόγηση γίνεται 100% μεταξύ εσάς και του πελάτη.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 4. Role Selection */}
      <section ref={roleSectionRef} className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Επιλέξτε την ειδικότητά σας</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <article className="bg-white shadow-lg border border-slate-100 rounded-xl p-7">
              <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                <FaBalanceScale />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Δικηγόρος</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Νομικός έλεγχος, προέλεγχος τίτλων και καθοδήγηση αγοραστών/πωλητών μέσα από το Deal Room.
              </p>
              <Link href="/professionals/lawyers" className="text-teal-700 hover:text-teal-600 font-semibold">
                Προφίλ Δικηγόρου →
              </Link>
            </article>

            <article className="bg-white shadow-lg border border-slate-100 rounded-xl p-7">
              <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                <FaFileSignature />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Συμβολαιογράφος</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Συγκέντρωση δικαιολογητικών, σύνταξη προσυμφώνων και οριστικών συμβολαίων ψηφιακά και οργανωμένα.
              </p>
              <Link href="/professionals/notaries" className="text-teal-700 hover:text-teal-600 font-semibold">
                Προφίλ Συμβολαιογράφου →
              </Link>
            </article>

            <article className="bg-white shadow-lg border border-slate-100 rounded-xl p-7">
              <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                <FaDraftingCompass />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Μηχανικός</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Ανάρτηση Ηλεκτρονικής Ταυτότητας Κτιρίου, κατόψεων και τεχνικών ελέγχων απευθείας στον φάκελο
                του ακινήτου.
              </p>
              <Link href="/professionals/engineers" className="text-teal-700 hover:text-teal-600 font-semibold">
                Προφίλ Μηχανικού →
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section className="py-20 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Πώς λειτουργεί</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white font-bold">1</div>
              <h3 className="font-bold text-slate-900 mb-2">Εγγραφή:</h3>
              <p className="text-slate-600">Φτιάχνετε το επαγγελματικό σας προφίλ δωρεάν.</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white font-bold">2</div>
              <h3 className="font-bold text-slate-900 mb-2">Ανακάλυψη:</h3>
              <p className="text-slate-600">
                Οι πελάτες σας βρίσκουν στη λίστα, βλέπουν τις κριτικές σας και κλείνουν online ή δια ζώσης
                ραντεβού.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white font-bold">3</div>
              <h3 className="font-bold text-slate-900 mb-2">Σύνδεση:</h3>
              <p className="text-slate-600">
                Αποδέχεστε το αίτημα συνεργασίας και ορίζετε την αμοιβή σας εκτός πλατφόρμας.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white font-bold">4</div>
              <h3 className="font-bold text-slate-900 mb-2">Deal Room:</h3>
              <p className="text-slate-600">
                Μπαίνετε στον ψηφιακό φάκελο του ακινήτου και ξεκινάτε τη δουλειά χωρίς γραφειοκρατία.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">Συχνές Ερωτήσεις</h2>
          <div className="space-y-5">
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Κοστίζει κάτι η συμμετοχή μου;</h3>
              <p className="text-slate-600">
                Όχι, η δημιουργία προφίλ και η χρήση του Deal Room είναι εντελώς δωρεάν για τους επαγγελματίες.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Πώς πληρώνομαι;</h3>
              <p className="text-slate-600">
                Η πλατφόρμα δεν εμπλέκεται στις αμοιβές σας. Συμφωνείτε την τιμή και τον τρόπο πληρωμής
                απευθείας με τον πελάτη σας.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Μπορώ να φέρω δικούς μου πελάτες στο Deal Room;</h3>
              <p className="text-slate-600">
                Φυσικά! Μπορείτε να προσκαλέσετε τους υφιστάμενους πελάτες σας στο σύστημα για να εκμεταλλευτείτε
                την οργάνωση του Deal Room.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 7. Final Bottom CTA */}
      <section className="py-24 bg-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Είστε έτοιμοι να εκσυγχρονίσετε το γραφείο σας;</h2>
          <Link
            href={finalCtaHref}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-teal-600 text-white hover:bg-teal-500 font-semibold text-lg transition-colors"
          >
            {finalCtaLabel}
            <FaArrowRight />
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
