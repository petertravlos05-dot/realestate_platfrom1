'use client';

interface FeaturesTabProps {
  formData: any;
  onFeatureToggle: (feature: string) => void;
}

export default function FeaturesTab({ formData, onFeatureToggle }: FeaturesTabProps) {
  const features = [
    { id: 'parking', name: 'Πάρκινγκ', icon: '🚗' },
    { id: 'elevator', name: 'Ανελκυστήρας', icon: '🔼' },
    { id: 'storage', name: 'Αποθήκη', icon: '📦' },
    { id: 'furnished', name: 'Επιπλωμένο', icon: '🛋️' },
    { id: 'ac', name: 'Κλιματισμός', icon: '❄️' },
    { id: 'heating', name: 'Θέρμανση', icon: '🔥' },
    { id: 'security', name: 'Σύστημα ασφαλείας', icon: '🔒' },
    { id: 'garden', name: 'Κήπος', icon: '🌳' },
    { id: 'balcony', name: 'Μπαλκόνι', icon: '🏗️' },
    { id: 'pets', name: 'Επιτρέπονται κατοικίδια', icon: '🐾' },
    { id: 'renovated', name: 'Ανακαινισμένο', icon: '🔨' },
    { id: 'view', name: 'Θέα', icon: '👀' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {features.map((feature) => (
          <div
            key={feature.id}
            className={`relative border rounded-lg p-4 hover:border-blue-500 cursor-pointer ${
              formData.features?.includes(feature.id) ? 'border-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => onFeatureToggle(feature.id)}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{feature.icon}</span>
              <span className="text-sm">{feature.name}</span>
            </div>
            <input
              type="checkbox"
              className="absolute opacity-0"
              checked={formData.features?.includes(feature.id)}
              onChange={() => {}}
            />
          </div>
        ))}
      </div>
    </div>
  );
} 