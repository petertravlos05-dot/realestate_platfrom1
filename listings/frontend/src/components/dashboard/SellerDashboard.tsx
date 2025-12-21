import { useState, useEffect } from 'react';
import axios from 'axios';
import { AppointmentDetailsModal } from '../appointments/AppointmentDetailsModal';
import { useSession } from 'next-auth/react';

interface Appointment {
  _id: string;
  propertyId: string;
  buyerId: string;
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  submittedByBuyer: boolean;
  createdAt: string;
}

interface Property {
  _id: string;
  title: string;
  price: number;
  location: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

export const SellerDashboard = () => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('properties');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [users, setUsers] = useState<Record<string, User>>({});
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('activeTab:', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'appointments') {
      fetchAppointments();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'appointments') {
      fetchAppointments();
    }
  }, []);

  const fetchAppointments = async () => {
    console.log('Κλήθηκε το fetchAppointments');
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/seller/appointments');
      let allAppointments = response.data.appointments;
      // Log για debugging
      console.log('Logged in seller id:', session?.user?.id);
      console.log('Appointments received from API:', allAppointments);
      if (session?.user?.id) {
        allAppointments = allAppointments.filter((a: any) => a.property?.userId === session.user.id);
      }
      setAppointments(allAppointments);
      setProperties(response.data.properties);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Σφάλμα κατά την ανάκτηση των ραντεβού');
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentStatusChange = async (appointmentId: string, status: 'accepted' | 'rejected') => {
    try {
      setLoading(true);
      setError(null);

      await axios.put(`/api/seller/appointments/${appointmentId}/status`, { status });
      await fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setError('Σφάλμα κατά την ενημέρωση της κατάστασης του ραντεβού');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('properties')}
          className={`px-4 py-2 rounded ${
            activeTab === 'properties'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Ακίνητα
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2 rounded ${
            activeTab === 'appointments'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Ραντεβού
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="space-y-4">
          {loading ? (
            <p>Φόρτωση...</p>
          ) : appointments.length === 0 ? (
            <p>Δεν υπάρχουν ραντεβού</p>
          ) : (
            <div className="grid gap-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-white p-4 rounded-lg shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">
                        {appointment.property?.title}
                      </h3>
                      <p className="text-gray-600">
                        Αγοραστής: {appointment.buyer?.name}
                      </p>
                      <p className="text-gray-600">
                        Ημερομηνία: {new Date(appointment.date).toLocaleDateString('el-GR')}
                      </p>
                      <p className="text-gray-600">Ώρα: {appointment.time}</p>
                      <p className="text-gray-600">
                        Κατάσταση:{' '}
                        <span
                          className={`font-semibold ${
                            appointment.status === 'pending'
                              ? 'text-yellow-600'
                              : appointment.status === 'accepted'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {appointment.status === 'pending'
                            ? 'Εκκρεμεί'
                            : appointment.status === 'accepted'
                            ? 'Εγκεκριμένο'
                            : 'Απορριφθέν'}
                        </span>
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedAppointment(appointment)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Λεπτομέρειες
                      </button>
                      {appointment.status === 'pending' && (
                        <>
                          <button
                            onClick={() =>
                              handleAppointmentStatusChange(appointment._id, 'accepted')
                            }
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Αποδοχή
                          </button>
                          <button
                            onClick={() =>
                              handleAppointmentStatusChange(appointment._id, 'rejected')
                            }
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Απόρριψη
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedAppointment && (
        <AppointmentDetailsModal
          appointment={selectedAppointment}
          property={properties[selectedAppointment.propertyId]}
          buyer={users[selectedAppointment.buyerId]}
          onClose={() => setSelectedAppointment(null)}
          onStatusChange={handleAppointmentStatusChange}
        />
      )}
    </div>
  );
}; 