'use client';

interface LocationTabProps {
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export default function LocationTab({ formData, onChange }: LocationTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Διεύθυνση *
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={onChange}
            placeholder="π.χ. Σόλωνος 45"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Πόλη *
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={onChange}
              placeholder="π.χ. Αθήνα"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Περιοχή *
            </label>
            <input
              type="text"
              name="neighborhood"
              value={formData.neighborhood}
              onChange={onChange}
              placeholder="π.χ. Κολωνάκι"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ταχυδρομικός Κώδικας *
            </label>
            <input
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={onChange}
              placeholder="π.χ. 10680"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Επιπλέον πληροφορίες τοποθεσίας
          </label>
          <textarea
            name="locationDetails"
            value={formData.locationDetails}
            onChange={onChange}
            rows={4}
            placeholder="Προσθέστε επιπλέον πληροφορίες για την τοποθεσία (π.χ. κοντά σε μετρό, σχολεία, κλπ.)"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
} 