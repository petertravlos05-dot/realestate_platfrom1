'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Mail, Lock, ShieldCheck, Building2 } from 'lucide-react';
import {
  FaSpinner,
  FaHome,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaArrowRight,
} from 'react-icons/fa';
import { fetchFromBackend } from '@/lib/api/client';
import ConsentModal from '@/components/modals/ConsentModal';
import DynamicNavbar from '@/components/navigation/DynamicNavbar';

interface ConsentRequiredError {
  error: 'CONSENT_REQUIRED';
  required: string[];
  versions: {
    terms?: string;
    privacy?: string;
  };
  message: string;
}

function ProfessionalLoginForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentData, setConsentData] = useState<ConsentRequiredError | null>(null);
  const [loginCredentials, setLoginCredentials] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    if (session?.user) {
      const role = (session.user as any).role;
      if (role === 'LAWYER' || role === 'NOTARY' || role === 'ENGINEER' || role === 'ACCOUNTANT') {
        router.push('/professional/dashboard');
      }
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const backendResponse = await fetchFromBackend('/auth/professional/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (backendResponse.status === 428) {
        const consentError: ConsentRequiredError = await backendResponse.json();
        setConsentData(consentError);
        setLoginCredentials({ email, password });
        setShowConsentModal(true);
        setLoading(false);
        return;
      }

      if (!backendResponse.ok) {
        let errorData: any;
        try {
          errorData = await backendResponse.json();
        } catch {
          if (backendResponse.status === 429) {
            setError('Πολλά αιτήματα. Παρακαλώ περιμένετε λίγα λεπτά πριν προσπαθήσετε ξανά.');
          } else {
            setError('Σφάλμα σύνδεσης. Παρακαλώ δοκιμάστε ξανά.');
          }
          setLoading(false);
          return;
        }

        if (errorData.error === 'NOT_PROFESSIONAL_ACCOUNT') {
          setError('Μόνο οι επαγγελματίες μπορούν να συνδεθούν από αυτή τη σελίδα.');
        } else if (backendResponse.status === 429) {
          const retryAfter = errorData.retryAfterSeconds || 60;
          const minutes = Math.ceil(retryAfter / 60);
          setError(`Πολλά αιτήματα. Παρακαλώ περιμένετε ${minutes} ${minutes === 1 ? 'λεπτό' : 'λεπτά'} πριν προσπαθήσετε ξανά.`);
        } else {
          setError(errorData.error || 'Λάθος email ή κωδικός');
        }
        setLoading(false);
        return;
      }

      const backendData = await backendResponse.json();
      const userRole = backendData.user?.role || backendData.role;
      if (userRole !== 'LAWYER' && userRole !== 'NOTARY' && userRole !== 'ENGINEER' && userRole !== 'ACCOUNTANT') {
        setError('Μόνο οι επαγγελματίες μπορούν να συνδεθούν από αυτή τη σελίδα.');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Σφάλμα κατά τη δημιουργία session. Παρακαλώ δοκιμάστε να ανανεώσετε τη σελίδα.');
        setTimeout(() => {
          router.push('/professional/dashboard');
        }, 1500);
      } else {
        router.push('/professional/dashboard');
      }
    } catch {
      setError('Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentAccepted = async () => {
    setShowConsentModal(false);
    setLoading(true);

    if (loginCredentials) {
      try {
        const result = await signIn('credentials', {
          redirect: false,
          email: loginCredentials.email,
          password: loginCredentials.password,
        });

        if (result?.error) {
          setError('Σφάλμα κατά τη σύνδεση. Παρακαλώ δοκιμάστε ξανά.');
        } else {
          router.push('/professional/dashboard');
        }
      } catch {
        setError('Σφάλμα κατά τη σύνδεση. Παρακαλώ δοκιμάστε ξανά.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <div className="pt-16 min-h-[calc(100vh-4rem)] bg-slate-50">
        <div className="lg:grid lg:grid-cols-12 min-h-[calc(100vh-4rem)]">
        {/* Left Column - Pro hero */}
        <aside className="hidden lg:flex lg:col-span-5 relative overflow-hidden bg-slate-900 text-white px-10 xl:px-14 py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(20,184,166,0.18),transparent_35%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_40%,rgba(56,189,248,0.10),transparent_40%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_100%,rgba(94,234,212,0.10),transparent_45%)]" />
          <div className="relative flex flex-col justify-between w-full">
            <div>
              <div className="h-12 w-12 rounded-2xl bg-teal-600/20 border border-teal-400/30 flex items-center justify-center text-teal-300 mb-6 shadow-[0_0_40px_rgba(20,184,166,0.25)]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className="text-3xl xl:text-4xl font-bold leading-tight text-white">Καλώς ήρθατε ξανά.</h1>
              <p className="text-slate-300 mt-3 max-w-xl leading-relaxed text-[15px]">
                Συνδεθείτε στο επαγγελματικό σας περιβάλλον και διαχειριστείτε υποθέσεις Real Estate με απόλυτη
                οργάνωση, ασφάλεια και πλήρη εικόνα προόδου.
              </p>

              <div className="mt-8 grid gap-3">
                {[
                  'Κεντρικός φάκελος υπόθεσης (Deal Room)',
                  'Αυτόματες ειδοποιήσεις και χρονοδιάγραμμα',
                  'Ομαδικό chat με πελάτες & μεσίτες',
                ].map((t) => (
                  <div key={t} className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
                    <div className="mt-0.5 h-7 w-7 rounded-lg bg-teal-600/15 border border-teal-400/20 flex items-center justify-center text-teal-300">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-slate-200 leading-snug">{t}</p>
                  </div>
                ))}

                <div className="rounded-xl border border-teal-400/20 bg-slate-800/60 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-50">Σημαντικό</p>
                  <p className="text-sm text-slate-200/90 mt-1 leading-relaxed">
                    Σε αυτή τη σελίδα μπορούν να συνδεθούν <span className="font-semibold">μόνο</span> χρήστες που είναι
                    επαγγελματίες και έχουν κάνει εγγραφή μέσα από τη σελίδα εγγραφής επαγγελματιών.
                  </p>
                  <Link href="/professional/join" className="inline-flex items-center mt-2 text-sm font-semibold text-teal-300 hover:text-teal-200">
                    Εγγραφή Επαγγελματία
                    <FaArrowRight className="ml-2 text-xs" />
                  </Link>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-50">Θέλετε πρόσβαση σε Buyer / Seller / Agent;</p>
                  <p className="text-sm text-slate-200/90 mt-1 leading-relaxed">
                    Το <span className="font-semibold">RealEstate Pro</span> είναι ξεχωριστό περιβάλλον. Για τους άλλους
                    ρόλους χρειάζεται <span className="font-semibold">νέος λογαριασμός</span> στο κανονικό RealEstate.
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    <Link href="/buyer/auth/register" className="text-sm font-semibold text-teal-300 hover:text-teal-200">
                      Δημιουργία λογαριασμού RealEstate →
                    </Link>
                    <Link href="/buyer" className="text-sm font-semibold text-slate-200 hover:text-white underline underline-offset-2">
                      Επιστροφή στο RealEstate
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 flex items-center gap-3">
              <Building2 className="h-5 w-5 text-teal-300" />
              <p className="text-slate-200 text-sm font-medium">Πάνω από 500+ επαγγελματίες μας εμπιστεύονται.</p>
            </div>
          </div>
        </aside>

        {/* Right Column */}
        <main className="lg:col-span-7 px-4 sm:px-8 py-10 lg:py-12 flex items-start lg:items-center justify-center">
          <div className="w-full max-w-xl">
            <div className="mb-6 text-center lg:text-left">
              <p className="text-sm font-semibold text-slate-500">Σύνδεση Επαγγελματία</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Πρόσβαση στο Professional Dashboard</h2>
              <p className="text-slate-500 mt-2">Για Δικηγόρους, Συμβολαιογράφους, Μηχανικούς και Λογιστές.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1.5 block">Email</span>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="w-full h-11 pl-10 pr-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="name@company.com"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1.5 block">Κωδικός</span>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="w-full h-11 pl-10 pr-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="••••••••"
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Σύνδεση...
                    </>
                  ) : (
                    <>
                      Σύνδεση
                      <FaArrowRight className="text-xs" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-sm text-slate-500">
                Δεν έχετε επαγγελματικό λογαριασμό;{' '}
                <Link href="/professional/join" className="text-teal-700 hover:text-teal-600 font-semibold">
                  Εγγραφείτε ως Επαγγελματίας
                </Link>
              </p>
            </div>
          </div>
        </main>
        </div>
      </div>

      {/* Footer - Same structure as buyer/join style */}
      <footer className="bg-slate-100 border-t border-slate-300/60 py-12 mt-12">
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

      {consentData && loginCredentials && (
        <ConsentModal
          isOpen={showConsentModal}
          onClose={() => setShowConsentModal(false)}
          onAccept={handleConsentAccepted}
          requiredConsents={consentData.required}
          versions={consentData.versions}
          email={loginCredentials.email}
          password={loginCredentials.password}
        />
      )}
    </>
  );
}

export default function ProfessionalsLoginPage() {
  return (
    <>
      <DynamicNavbar />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <FaSpinner className="animate-spin text-4xl text-teal-600" />
          </div>
        }
      >
        <ProfessionalLoginForm />
      </Suspense>
    </>
  );
}
