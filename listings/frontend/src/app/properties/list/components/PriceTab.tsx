'use client';

interface PriceTabProps {
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export default function PriceTab({ formData, onChange }: PriceTabProps) {
  const handleCheckboxChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const syntheticEvent = {
      target: {
        ...e.target,
        name,
        value: e.target.checked
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Τύπος συναλλαγής *
          </label>
          <select
            name="transactionType"
            value={formData.transactionType}
            onChange={onChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Επιλέξτε τύπο συναλλαγής</option>
            <option value="sale">Πώληση</option>
            <option value="rent">Ενοικίαση</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Τιμή *
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={onChange}
              min="0"
              placeholder="π.χ. 150000"
              className="block w-full rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
              €
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formData.transactionType === 'rent' ? 'Τιμή ανά μήνα' : 'Συνολική τιμή'}
          </p>
        </div>
      </div>

      {formData.transactionType === 'rent' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Εγγύηση
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="number"
                name="deposit"
                value={formData.deposit}
                onChange={onChange}
                min="0"
                placeholder="π.χ. 1000"
                className="block w-full rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                €
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ελάχιστη περίοδος μίσθωσης
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="number"
                name="minRentalPeriod"
                value={formData.minRentalPeriod}
                onChange={onChange}
                min="0"
                placeholder="π.χ. 12"
                className="block w-full rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                μήνες
              </span>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Επιπλέον κόστη
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                name="includesUtilities"
                checked={formData.includesUtilities}
                onChange={handleCheckboxChange('includesUtilities')}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Συμπεριλαμβάνονται λογαριασμοί κοινής ωφέλειας</span>
            </label>
          </div>
          <div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                name="includesMaintenance"
                checked={formData.includesMaintenance}
                onChange={handleCheckboxChange('includesMaintenance')}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Συμπεριλαμβάνονται κοινόχρηστα</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
} 