import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { apiClient } from '@/lib/api/client';

interface PropertyAvailabilityEditorProps {
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

export default function PropertyAvailabilityEditor({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
}: PropertyAvailabilityEditorProps) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingEdit, setRequestingEdit] = useState(false);

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
      setAvailabilities(data);
    } catch (error) {
      console.error('Error fetching availabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAvailability = async () => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          endTime: selectedEndTime,
        }),
      });

      if (!response.ok) throw new Error('Failed to add availability');
      await fetchAvailabilities();
      setSelectedDate(undefined);
      setSelectedTime('');
      setSelectedEndTime('');
    } catch (error) {
      console.error('Error adding availability:', error);
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/availability`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error('Failed to delete availability');
      await fetchAvailabilities();
    } catch (error) {
      console.error('Error deleting availability:', error);
    }
  };

  const handleRequestEdit = async () => {
    setRequestingEdit(true);
    try {
      await apiClient.post('/notifications', {
        title: 'Αίτημα Επεξεργασίας Ακινήτου',
        message: `Ο ιδιοκτήτης του ακινήτου ${propertyTitle} ζητά την επεξεργασία των πληροφοριών του.`,
        type: 'PROPERTY_EDIT_REQUEST',
      });
      onClose();
    } catch (error) {
      console.error('Error requesting edit:', error);
    } finally {
      setRequestingEdit(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl">
          <div className="p-6">
            <Dialog.Title className="text-2xl font-bold mb-4">
              Διαχείριση Διαθεσιμότητας: {propertyTitle}
            </Dialog.Title>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Προσθήκη Διαθεσιμότητας</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={el}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ώρα Έναρξης
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ώρα Λήξης
                  </label>
                  <input
                    type="time"
                    value={selectedEndTime}
                    onChange={(e) => setSelectedEndTime(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>
              <button
                onClick={handleAddAvailability}
                disabled={!selectedDate || !selectedTime || !selectedEndTime || saving}
                className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Αποθήκευση...' : 'Προσθήκη Διαθεσιμότητας'}
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Υπάρχουσες Διαθεσιμότητες</h3>
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
                      onClick={() => handleDeleteAvailability(availability.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Διαγραφή
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleRequestEdit}
                disabled={requestingEdit}
                className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                {requestingEdit ? 'Αποστολή...' : 'Αίτημα Επεξεργασίας Ακινήτου'}
              </button>

              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
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