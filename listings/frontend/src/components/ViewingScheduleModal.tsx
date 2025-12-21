import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface ViewingScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
}

interface Availability {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export default function ViewingScheduleModal({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
}: ViewingScheduleModalProps) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customDate, setCustomDate] = useState<Date | undefined>();
  const [customStartTime, setCustomStartTime] = useState<string>('');
  const [customEndTime, setCustomEndTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'available' | 'custom'>('available');

  useEffect(() => {
    if (isOpen) {
      fetchAvailabilities();
    }
  }, [isOpen, propertyId]);

  const fetchAvailabilities = async () => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/availability`);
      if (!response.ok) throw new Error('Failed to fetch availabilities');
      const data = await response.json();
      setAvailabilities(data.filter((a: Availability) => a.isAvailable));
    } catch (error) {
      console.error('Error fetching availabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleViewing = async (availabilityId?: string) => {
    try {
      const response = await fetch(`/api/buyer/schedule-viewing/${propertyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availabilityId,
          customDate: mode === 'custom' ? customDate?.toISOString() : undefined,
          customStartTime: mode === 'custom' ? customStartTime : undefined,
          customEndTime: mode === 'custom' ? customEndTime : undefined,
          isCustomRequest: mode === 'custom',
        }),
      });

      if (!response.ok) throw new Error('Failed to schedule viewing');
      
      onClose();
      // Θα μπορούσαμε να προσθέσουμε ένα toast notification εδώ
      alert(mode === 'custom' 
        ? 'Το αίτημα προβολής στάλθηκε στον ιδιοκτήτη' 
        : 'Η προβολή προγραμματίστηκε επιτυχώς');
    } catch (error) {
      console.error('Error scheduling viewing:', error);
      alert('Παρουσιάστηκε σφάλμα κατά τον προγραμματισμό της προβολής');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl">
          <div className="p-6">
            <Dialog.Title className="text-2xl font-bold mb-4">
              Προγραμματισμός Προβολής: {propertyTitle}
            </Dialog.Title>

            <div className="mb-6">
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setMode('available')}
                  className={`flex-1 py-2 px-4 rounded-lg ${
                    mode === 'available'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Διαθέσιμες Ημερομηνίες
                </button>
                <button
                  onClick={() => setMode('custom')}
                  className={`flex-1 py-2 px-4 rounded-lg ${
                    mode === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Προτεινόμενη Ημερομηνία
                </button>
              </div>

              {mode === 'available' ? (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Διαθέσιμες Ημερομηνίες</h3>
                  {loading ? (
                    <div className="text-center py-4">Φόρτωση...</div>
                  ) : availabilities.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      Δεν υπάρχουν διαθέσιμες ημερομηνίες
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availabilities.map((availability) => (
                        <div
                          key={availability.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {format(new Date(availability.date), 'dd/MM/yyyy', {
                                locale: el,
                              })}
                            </p>
                            <p className="text-sm text-gray-600">
                              {availability.startTime} - {availability.endTime}
                            </p>
                          </div>
                          <button
                            onClick={() => handleScheduleViewing(availability.id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                          >
                            Επιλογή
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Προτεινόμενη Ημερομηνία</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Calendar
                        mode="single"
                        selected={customDate}
                        onSelect={setCustomDate}
                        locale={el}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ώρα Έναρξης
                      </label>
                      <input
                        type="time"
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ώρα Λήξης
                      </label>
                      <input
                        type="time"
                        value={customEndTime}
                        onChange={(e) => setCustomEndTime(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleScheduleViewing()}
                    disabled={!customDate || !customStartTime || !customEndTime}
                    className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Αποστολή Αιτήματος
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 