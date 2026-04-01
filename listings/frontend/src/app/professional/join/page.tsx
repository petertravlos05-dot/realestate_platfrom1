'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  Building2,
  ShieldCheck,
  Mail,
  Lock,
  Scale,
  FileSignature,
  HardHat,
  Phone,
  MapPin,
  ArrowLeft,
} from 'lucide-react';
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
} from 'react-icons/fa';
import DynamicNavbar from '@/components/navigation/DynamicNavbar';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import {
  createOrUpdateProfessionalProfile,
  CreateProfessionalProfilePayload,
  getMyProfessionalProfile,
} from '@/lib/api/professionalsOnboarding';

type ProfessionalType = 'LAWYER' | 'NOTARY' | 'ENGINEER';
type Step = 1 | 2;

interface JoinFormState {
  type: ProfessionalType;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  registryNumber: string;
  registryBody: string;
}

const STORAGE_KEY = 'professionalJoinFormDataV2';

function ProfessionalJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { isAuthenticated, status: authStatus } = useCurrentUser();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);

  const typeParam = searchParams?.get('type')?.toUpperCase();
  const defaultType: ProfessionalType = ['LAWYER', 'NOTARY', 'ENGINEER'].includes(typeParam || '')
    ? (typeParam as ProfessionalType)
    : 'LAWYER';

  const [form, setForm] = useState<JoinFormState>({
    type: defaultType,
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    registryNumber: '',
    registryBody: '',
  });

  const stepLabel = useMemo(() => `Βήμα ${currentStep} από 2`, [currentStep]);

  const registryLabel = useMemo(() => {
    if (form.type === 'LAWYER') return 'Α.Μ. Δικηγορικού Συλλόγου';
    if (form.type === 'ENGINEER') return 'Α.Μ. ΤΕΕ';
    return 'Α.Μ. Συμβολαιογραφικού Συλλόγου';
  }, [form.type]);

  const registryBodyLabel = useMemo(() => {
    if (form.type === 'LAWYER') return 'Δικηγορικός Σύλλογος (π.χ. Αθηνών, Πειραιά, Θεσσαλονίκης)';
    if (form.type === 'ENGINEER') return 'Παράρτημα / περιφέρεια ΤΕΕ';
    return 'Συμβολαιογραφικός Σύλλογος (περιοχή)';
  }, [form.type]);

  const setField = <K extends keyof JoinFormState>(key: K, value: JoinFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const getPayloadFromForm = (data: JoinFormState): CreateProfessionalProfilePayload => {
    const displayName = `${data.firstName} ${data.lastName}`.trim();
    return {
      type: data.type,
      displayName,
      officeName: '',
      phone: data.phone.trim(),
      city: data.city.trim(),
      areaTags: [],
      languages: ['Greek'],
      registryNumber: data.registryNumber.trim(),
      registryBody: data.registryBody.trim(),
      availability: {
        timezone: 'Europe/Athens',
        weeklyRules: [],
        meetingTypes: [],
      },
    };
  };

  useEffect(() => {
    if (typeof window === 'undefined' || isAuthenticated) return;
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<JoinFormState>;
      setForm((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore bad storage
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (typeof window === 'undefined' || isAuthenticated) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form, isAuthenticated]);

  useEffect(() => {
    if (!session?.user?.email) return;
    setForm((prev) => {
      const next = { ...prev };
      if (!next.email) next.email = session.user?.email || '';
      if ((!next.firstName || !next.lastName) && session.user?.name) {
        const parts = session.user.name.trim().split(/\s+/);
        next.firstName = next.firstName || parts[0] || '';
        next.lastName = next.lastName || parts.slice(1).join(' ');
      }
      return next;
    });
  }, [session]);

  useEffect(() => {
    const checkProfileAndAutocreate = async () => {
      if (authStatus !== 'authenticated') return;
      try {
        const profile = await getMyProfessionalProfile();
        if (profile.exists && profile.profile) {
          setExistingProfile(profile.profile);
          if (
            session?.user?.role === 'LAWYER' ||
            session?.user?.role === 'NOTARY' ||
            session?.user?.role === 'ENGINEER'
          ) {
            router.push('/professional/dashboard');
            return;
          }
        }

        if (typeof window !== 'undefined') {
          const saved = sessionStorage.getItem(STORAGE_KEY);
          if (saved && !profile.exists) {
            const parsed = JSON.parse(saved) as JoinFormState;
            const payload = getPayloadFromForm(parsed);
            if (!payload.displayName || !payload.city || !payload.phone) {
              sessionStorage.removeItem(STORAGE_KEY);
              return;
            }
            await createOrUpdateProfessionalProfile(payload);
            sessionStorage.removeItem(STORAGE_KEY);
            toast.success('Η εγγραφή ολοκληρώθηκε επιτυχώς!');
            router.push('/professional/dashboard');
          }
        }
      } catch {
        // ignore
      }
    };
    checkProfileAndAutocreate();
  }, [authStatus, router, session]);

  const validateStep1 = () => {
    if (!form.type) {
      toast.error('Επιλέξτε την ιδιότητά σας.');
      return false;
    }
    if (!isAuthenticated) {
      if (!form.email.trim() || !form.email.includes('@')) {
        toast.error('Παρακαλώ εισάγετε έγκυρο email.');
        return false;
      }
      if (!form.password || form.password.length < 6) {
        toast.error('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.');
        return false;
      }
      if (form.password !== form.confirmPassword) {
        toast.error('Οι κωδικοί δεν ταιριάζουν.');
        return false;
      }
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.firstName.trim()) {
      toast.error('Συμπληρώστε το όνομα.');
      return false;
    }
    if (!form.lastName.trim()) {
      toast.error('Συμπληρώστε το επώνυμο.');
      return false;
    }
    if (!form.phone.trim()) {
      toast.error('Συμπληρώστε τηλέφωνο.');
      return false;
    }
    if (!form.city.trim()) {
      toast.error('Συμπληρώστε πόλη/περιοχή.');
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (!validateStep1()) return;
    setCurrentStep(2);
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return;
    setSubmitting(true);
    try {
      if (!isAuthenticated) {
        const displayName = `${form.firstName} ${form.lastName}`.trim();
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Professional-Registration': 'true',
          },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            confirmPassword: form.confirmPassword,
            name: displayName,
            role: form.type,
            phone: form.phone.trim() || undefined,
          }),
        });

        if (!registerResponse.ok) {
          const error = await registerResponse.json().catch(() => ({ error: 'Αποτυχία δημιουργίας λογαριασμού.' }));
          throw new Error(error.error || 'Αποτυχία δημιουργίας λογαριασμού.');
        }

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
        }

        const result = await signIn('credentials', {
          email: form.email.trim(),
          password: form.password,
          redirect: false,
        });
        if (result?.error) {
          throw new Error('Αποτυχία σύνδεσης μετά την εγγραφή.');
        }
        window.location.reload();
        return;
      }

      const payload = getPayloadFromForm(form);
      await createOrUpdateProfessionalProfile(payload);
      if (typeof window !== 'undefined') sessionStorage.removeItem(STORAGE_KEY);
      toast.success('Η εγγραφή ολοκληρώθηκε επιτυχώς!');
      router.push('/professional/dashboard');
    } catch (error: any) {
      toast.error(error?.message || 'Αποτυχία εγγραφής. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authStatus === 'loading' || status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-teal-600" />
      </div>
    );
  }

  if (
    existingProfile &&
    (session?.user?.role === 'LAWYER' || session?.user?.role === 'NOTARY' || session?.user?.role === 'ENGINEER')
  ) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DynamicNavbar />

      <div className="pt-16 lg:grid lg:grid-cols-2 min-h-[calc(100vh-4rem)]">
        {/* Left Column */}
        <aside className="hidden lg:flex relative overflow-hidden bg-slate-900 text-white px-10 xl:px-14 py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(20,184,166,0.18),transparent_35%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="relative flex flex-col justify-between w-full">
            <div>
              <div className="h-12 w-12 rounded-2xl bg-teal-600/20 border border-teal-400/30 flex items-center justify-center text-teal-300 mb-6 shadow-[0_0_40px_rgba(20,184,166,0.25)]">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="text-3xl xl:text-4xl font-bold leading-tight text-white">Εκσυγχρονίστε την πρακτική σας.</h1>
              <p className="text-slate-300 mt-3 max-w-xl leading-relaxed text-[15px]">
                Δημιουργήστε το δωρεάν ψηφιακό σας γραφείο. Διαχειριστείτε αγοραπωλησίες με απόλυτη ασφάλεια,
                εξαλείψτε τη γραφειοκρατία και προβάλλετε τις υπηρεσίες σας στο μεγαλύτερο δίκτυο αγοραστών και
                πωλητών.
              </p>

              <div className="mt-8 grid gap-3">
                <div className="rounded-xl border border-teal-400/20 bg-slate-800/60 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-50">Σημαντικό</p>
                  <p className="text-sm text-slate-200/90 mt-1 leading-relaxed">
                    Το <span className="font-semibold">RealEstate Pro</span> απευθύνεται μόνο σε επαγγελματίες
                    (Δικηγόρους, Συμβολαιογράφους, Μηχανικούς, Λογιστές) και η εγγραφή γίνεται από αυτή την
                    εξειδικευμένη σελίδα.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-50">Θέλετε πρόσβαση σε Buyer / Seller / Agent;</p>
                  <p className="text-sm text-slate-200/90 mt-1 leading-relaxed">
                    Για τους άλλους ρόλους χρειάζεται <span className="font-semibold">ξεχωριστός λογαριασμός</span> στο
                    κανονικό RealEstate.
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
        <main className="bg-white px-4 sm:px-8 py-6 lg:py-8 flex items-center justify-center">
          <div className="w-full max-w-lg">
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-500">{stepLabel}</p>
              <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full bg-teal-600 transition-all duration-300 ${currentStep === 1 ? 'w-1/2' : 'w-full'}`}
                />
              </div>
            </div>

            {currentStep === 1 && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Δημιουργία Επαγγελματικού Λογαριασμού</h2>
                  <p className="text-slate-500 mt-1">Επιλέξτε την ιδιότητά σας</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'LAWYER' as const, label: 'Δικηγόρος', icon: Scale },
                    { key: 'NOTARY' as const, label: 'Συμβολαιογράφος', icon: FileSignature },
                    { key: 'ENGINEER' as const, label: 'Μηχανικός', icon: HardHat },
                  ].map((role) => {
                    const Icon = role.icon;
                    const active = form.type === role.key;
                    return (
                      <button
                        key={role.key}
                        type="button"
                        onClick={() => setField('type', role.key)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          active
                            ? 'border-teal-600 bg-teal-50 text-teal-800'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <Icon className="h-4 w-4 mb-2" />
                        <p className="font-semibold">{role.label}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700 mb-1.5 block">Email Address</span>
                    <div className="relative">
                      <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setField('email', e.target.value)}
                        className="w-full h-10 pl-10 pr-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="name@company.com"
                        disabled={isAuthenticated}
                      />
                    </div>
                  </label>

                  {!isAuthenticated && (
                    <>
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700 mb-1.5 block">Password</span>
                        <div className="relative">
                          <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setField('password', e.target.value)}
                            className="w-full h-10 pl-10 pr-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Τουλάχιστον 6 χαρακτήρες"
                          />
                        </div>
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700 mb-1.5 block">Confirm Password</span>
                        <div className="relative">
                          <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="password"
                            value={form.confirmPassword}
                            onChange={(e) => setField('confirmPassword', e.target.value)}
                            className="w-full h-10 pl-10 pr-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Επαναλάβετε τον κωδικό"
                          />
                        </div>
                      </label>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full h-10 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-colors"
                >
                  Συνέχεια
                </button>
              </section>
            )}

            {currentStep === 2 && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Επαγγελματικά Στοιχεία</h2>
                  <p className="text-slate-500 mt-1 text-sm">
                    Τα στοιχεία αυτά θα εμφανίζονται στο δημόσιο προφίλ σας για να σας βρίσκουν οι πελάτες.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700 mb-1.5 block">Όνομα</span>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) => setField('firstName', e.target.value)}
                      className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Π.χ. Γιάννης"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700 mb-1.5 block">Επώνυμο</span>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) => setField('lastName', e.target.value)}
                      className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Π.χ. Παπαδόπουλος"
                    />
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700 mb-1.5 block">Phone Number</span>
                    <div className="relative">
                      <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setField('phone', e.target.value)}
                        className="w-full h-10 pl-10 pr-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="+30 69..."
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700 mb-1.5 block">City/Area</span>
                    <div className="relative">
                      <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => setField('city', e.target.value)}
                        className="w-full h-10 pl-10 pr-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Αθήνα"
                      />
                    </div>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1.5 block">
                    {registryLabel} (Προαιρετικό για επαλήθευση)
                  </span>
                  <input
                    type="text"
                    value={form.registryNumber}
                    onChange={(e) => setField('registryNumber', e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Συμπληρώστε αριθμό μητρώου"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1.5 block">
                    {registryBodyLabel} (προαιρετικό)
                  </span>
                  <input
                    type="text"
                    value={form.registryBody}
                    onChange={(e) => setField('registryBody', e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Π.χ. Δ.Σ. Αθηνών ή ΤΕΕ Δυτικής Ελλάδας"
                  />
                </label>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="h-10 px-5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Πίσω
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 h-10 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-colors disabled:opacity-60"
                  >
                    {submitting ? 'Αποθήκευση...' : 'Ολοκλήρωση Εγγραφής'}
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Πατώντας Ολοκλήρωση, αποδέχεστε τους Όρους Χρήσης για Επαγγελματίες.
                </p>
              </section>
            )}

            {!isAuthenticated && (
              <p className="mt-4 text-sm text-slate-500">
                Έχετε ήδη λογαριασμό;{' '}
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(
                    `/professional/join${searchParams?.get('type') ? `?type=${searchParams.get('type')}` : ''}`,
                  )}`}
                  className="text-teal-700 hover:text-teal-600 font-semibold"
                >
                  Συνδεθείτε
                </Link>
              </p>
            )}
          </div>
        </main>
      </div>

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
                Η πλατφόρμα που συνδέει Δικηγόρους, Συμβολαιογράφους και Μηχανικούς με πελάτες σε οργανωμένο Deal Room.
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

export default function ProfessionalJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <FaSpinner className="animate-spin text-4xl text-teal-600" />
        </div>
      }
    >
      <ProfessionalJoinContent />
    </Suspense>
  );
}
