'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { registerProfessional } from '@/lib/api/professionals';
import { FaSpinner, FaSave } from 'react-icons/fa';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import ForbiddenState from '@/components/common/ForbiddenState';

export default function ProfessionalProfilePage() {
  const { role, status, isAuthenticated } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'LAWYER' as 'LAWYER' | 'NOTARY',
    displayName: '',
    officeName: '',
    phone: '',
    city: '',
    areaTags: [] as string[],
    address: '',
    bio: '',
    languages: [] as string[],
    services: {},
  });
  const [areaTagInput, setAreaTagInput] = useState('');
  const [languageInput, setLanguageInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await registerProfessional(formData);
      toast.success('Το προφίλ ενημερώθηκε επιτυχώς');
    } catch (error: any) {
      console.error('Error registering professional:', error);
      toast.error(error.message || 'Αποτυχία αποθήκευσης προφίλ');
    } finally {
      setLoading(false);
    }
  };

  const addAreaTag = () => {
    if (areaTagInput.trim() && !formData.areaTags.includes(areaTagInput.trim())) {
      setFormData({ ...formData, areaTags: [...formData.areaTags, areaTagInput.trim()] });
      setAreaTagInput('');
    }
  };

  const removeAreaTag = (tag: string) => {
    setFormData({ ...formData, areaTags: formData.areaTags.filter((t) => t !== tag) });
  };

  const addLanguage = () => {
    if (languageInput.trim() && !formData.languages.includes(languageInput.trim())) {
      setFormData({ ...formData, languages: [...formData.languages, languageInput.trim()] });
      setLanguageInput('');
    }
  };

  const removeLanguage = (lang: string) => {
    setFormData({ ...formData, languages: formData.languages.filter((l) => l !== lang) });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }

  // Role gating: Only LAWYER and NOTARY can access
  if (role !== 'LAWYER' && role !== 'NOTARY') {
    return (
      <ForbiddenState
        title="Δεν έχετε πρόσβαση"
        subtitle="Αυτή η σελίδα είναι διαθέσιμη μόνο για δικηγόρους και συμβολαιογράφους."
        backHref="/"
        backLabel="Επιστροφή στην Αρχική"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Επαγγελματικό Προφίλ</h1>
          <p className="mt-2 text-gray-600">Ορίστε τα στοιχεία του επαγγελματικού σας προφίλ</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Τύπος</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'LAWYER' | 'NOTARY' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="LAWYER">Δικηγόρος</option>
              <option value="NOTARY">Συμβολαιογράφος</option>
              <option value="ENGINEER">Πολιτικός Μηχανικός</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Όνομα</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Γραφείο</label>
            <input
              type="text"
              value={formData.officeName}
              onChange={(e) => setFormData({ ...formData, officeName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Τηλέφωνο</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Πόλη</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Περιοχές</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={areaTagInput}
                onChange={(e) => setAreaTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAreaTag())}
                placeholder="Προσθέστε περιοχή..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                type="button"
                onClick={addAreaTag}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Προσθήκη
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.areaTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeAreaTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Διεύθυνση</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Βιογραφικό</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Γλώσσες</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={languageInput}
                onChange={(e) => setLanguageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                placeholder="Προσθέστε γλώσσα..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                type="button"
                onClick={addLanguage}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Προσθήκη
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.languages.map((lang) => (
                <span
                  key={lang}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-2"
                >
                  {lang}
                  <button
                    type="button"
                    onClick={() => removeLanguage(lang)}
                    className="text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
            Αποθήκευση
          </button>
        </form>
      </div>
    </div>
  );
}

