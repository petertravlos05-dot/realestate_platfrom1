import Link from 'next/link';
import DynamicNavbar from '@/components/navigation/DynamicNavbar';
import { FaArrowRight, FaBuilding, FaGlobe, FaHome, FaLinkedin, FaShieldAlt, FaUsers } from 'react-icons/fa';

type PageProps = {
  params: { id: string };
  searchParams?: {
    name?: string;
    role?: string;
    city?: string;
    office?: string;
    bio?: string;
    website?: string;
    linkedin?: string;
  };
};

export default function ProfessionalPublicProfilePage({ params, searchParams }: PageProps) {
  const profileName = searchParams?.name || 'Επαγγελματίας';
  const profileRole = searchParams?.role || 'Πιστοποιημένος Συνεργάτης';
  const city = searchParams?.city || 'Ελλάδα';
  const office = searchParams?.office || '';
  const bio =
    searchParams?.bio ||
    'Επαγγελματίας με εμπειρία στις συναλλαγές ακινήτων, με έμφαση στην οργάνωση φακέλου και στη σωστή συνεργασία όλων των εμπλεκομένων.';
  const website = searchParams?.website || '';
  const linkedin = searchParams?.linkedin || '';

  return (
    <div className="min-h-screen bg-slate-50">
      <DynamicNavbar />
      <main className="pt-20 pb-16">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
            <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 border border-teal-100 px-3 py-1 text-xs font-semibold">
              Δημόσιο Προφίλ Επαγγελματία
            </span>

            <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-slate-900">{profileName}</h1>
            <p className="mt-2 text-lg text-slate-600">{profileRole}</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Πόλη</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{city}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ID Προφίλ</p>
                <p className="text-sm font-medium text-slate-900 mt-1 break-all">{params.id}</p>
              </div>
              {office && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Γραφείο</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">{office}</p>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Επαγγελματική Παρουσίαση</h2>
              <p className="mt-2 text-slate-600 leading-relaxed">{bio}</p>
            </div>

            {(website || linkedin) && (
              <div className="mt-6 flex flex-wrap gap-3">
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors text-sm"
                  >
                    <FaGlobe className="text-teal-600" />
                    Website
                  </a>
                )}
                {linkedin && (
                  <a
                    href={linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors text-sm"
                  >
                    <FaLinkedin className="text-teal-600" />
                    LinkedIn
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold">Σχετικά με την Πλατφόρμα</h2>
            <p className="mt-3 text-slate-300 leading-relaxed">
              Η πλατφόρμα οργανώνει όλη τη διαδικασία αγοραπωλησίας ακινήτου μέσα από ένα ασφαλές Deal Room, όπου
              συνεργάζονται πελάτες και επαγγελματίες με διαφάνεια και ταχύτητα.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                <FaShieldAlt className="text-teal-300 mb-3" />
                <p className="text-sm text-slate-200">Ασφαλής διαχείριση εγγράφων με έμφαση στην προστασία δεδομένων.</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                <FaUsers className="text-teal-300 mb-3" />
                <p className="text-sm text-slate-200">Συνεργασία όλων των ρόλων σε κοινό χώρο, χωρίς χαμένα emails.</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                <FaBuilding className="text-teal-300 mb-3" />
                <p className="text-sm text-slate-200">Από το πρώτο έγγραφο μέχρι την ολοκλήρωση της συναλλαγής.</p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/professionals"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 transition-colors font-semibold"
              >
                <FaHome />
                Δες την Πλατφόρμα
              </Link>
              <Link
                href="/professional/join"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-500 hover:bg-slate-800 transition-colors font-semibold"
              >
                Γίνε Επαγγελματίας
                <FaArrowRight />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

