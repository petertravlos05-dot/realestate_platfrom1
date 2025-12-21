'use client';

interface AmenitiesTabProps {
  formData: any;
  onAmenityToggle: (amenity: string) => void;
}

export default function AmenitiesTab({ formData, onAmenityToggle }: AmenitiesTabProps) {
  const amenities = [
    { id: 'wifi', name: 'WiFi', icon: '📶' },
    { id: 'tv', name: 'Τηλεόραση', icon: '📺' },
    { id: 'washer', name: 'Πλυντήριο ρούχων', icon: '🧺' },
    { id: 'dryer', name: 'Στεγνωτήριο', icon: '👕' },
    { id: 'dishwasher', name: 'Πλυντήριο πιάτων', icon: '🍽️' },
    { id: 'fridge', name: 'Ψυγείο', icon: '❄️' },
    { id: 'oven', name: 'Φούρνος', icon: '🔥' },
    { id: 'microwave', name: 'Φούρνος μικροκυμάτων', icon: '📡' },
    { id: 'coffee', name: 'Καφετιέρα', icon: '☕' },
    { id: 'workspace', name: 'Χώρος εργασίας', icon: '💻' },
    { id: 'iron', name: 'Σίδερο', icon: '👔' },
    { id: 'hairdryer', name: 'Στεγνωτήρας μαλλιών', icon: '💨' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {amenities.map((amenity) => (
          <div
            key={amenity.id}
            className={`relative border rounded-lg p-4 hover:border-blue-500 cursor-pointer ${
              formData.amenities?.includes(amenity.id) ? 'border-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => onAmenityToggle(amenity.id)}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{amenity.icon}</span>
              <span className="text-sm">{amenity.name}</span>
            </div>
            <input
              type="checkbox"
              className="absolute opacity-0"
              checked={formData.amenities?.includes(amenity.id)}
              onChange={() => {}}
            />
          </div>
        ))}
      </div>
    </div>
  );
} 