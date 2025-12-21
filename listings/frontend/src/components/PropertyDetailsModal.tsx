'use client';

import { Dialog, Transition } from '@headlessui/react';
import { FiShare2 } from 'react-icons/fi';
import { useState, useEffect, Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { HeartIcon, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { apiClient, fetchFromBackend } from '@/lib/api/client';

interface Property {
  id: string;
  
  // Βασικά στοιχεία
  title: string;
  shortDescription?: string;
  fullDescription: string;
  propertyType: string;
  condition?: string;
  yearBuilt?: number;
  renovationYear?: number;

  // Βασικά χαρακτηριστικά
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: string;
  parkingSpaces?: number;
  garden: boolean;
  multipleFloors: boolean;

  // Εμπορικά χαρακτηριστικά
  commercialType?: string;
  rooms?: number;

  // Χαρακτηριστικά οικοπέδου
  plotCategory?: string;
  plotOwnershipType?: string;

  // Χαρακτηριστικά
  heatingType?: string;
  heatingSystem?: string;
  windows?: string;
  windowsType?: string;
  flooring?: string;
  energyClass?: string;

  // Επιπλέον χαρακτηριστικά
  elevator: boolean;
  furnished: boolean;
  securityDoor: boolean;
  alarm: boolean;
  disabledAccess: boolean;
  soundproofing: boolean;
  thermalInsulation: boolean;
  pool?: string;
  balconyArea?: number;
  hasBalcony: boolean;

  // Χαρακτηριστικά οικοπέδου
  plotArea?: number;
  buildingCoefficient?: number;
  coverageRatio?: number;
  facadeLength?: number;
  sides?: number;
  buildableArea?: number;
  buildingPermit: boolean;
  roadAccess?: string;
  terrain?: string;
  shape?: string;
  suitability?: string;

  // Εμπορικά χαρακτηριστικά
  storageType?: string;
  elevatorType?: string;
  fireproofDoor: boolean;

  // Τοποθεσία
  state: string;
  city: string;
  neighborhood?: string;
  street: string;
  number: string;
  postalCode?: string;
  coordinates?: { lat: number; lng: number };

  // Τιμή
  price: number;
  pricePerSquareMeter?: number;
  negotiable: boolean;
  additionalPriceNotes?: string;

  // Συστημικά πεδία
  status: string;
  isVerified: boolean;
  isReserved: boolean;
  isSold: boolean;
  images: string[];
  keywords: string[];
  createdAt: string;
  updatedAt: string;

  // Σχέσεις
  user: {
    name: string;
    email: string;
  };
  agent?: {
    id: string;
    name: string;
    email: string;
  };
}

interface PropertyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  onShare?: () => void;
  isAgent: boolean;
}

export default function PropertyDetailsModal({
  isOpen,
  onClose,
  property,
  onShare,
  isAgent,
}: PropertyDetailsModalProps) {
  const { data: session } = useSession();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      checkIfFavorite();
    }
  }, [session?.user, property.id]);

  const checkIfFavorite = async () => {
    try {
      const { data } = await apiClient.get('/favorites');
      setIsFavorite(data.some((favorite: any) => favorite.propertyId === property.id));
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!session?.user) {
      toast.error('Πρέπει να συνδεθείτε για να προσθέσετε στα αγαπημένα');
      return;
    }

    setIsLoading(true);
    try {
      if (isFavorite) {
        await apiClient.delete('/favorites', { data: { propertyId: property.id } });
      } else {
        await apiClient.post('/favorites', { propertyId: property.id });
      }

      setIsFavorite(!isFavorite);
      toast.success(
        isFavorite
          ? 'Αφαιρέθηκε από τα αγαπημένα'
          : 'Προστέθηκε στα αγαπημένα'
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Σφάλμα κατά την ενημέρωση των αγαπημένων');
    } finally {
      setIsLoading(false);
    }
  };

  const expressInterest = async () => {
    if (!session?.user) {
      toast.error('Πρέπει να συνδεθείτε για να εκφράσετε ενδιαφέρον');
      return;
    }

    if (property.agent) {
      toast.error('Δεν μπορείτε να εκφράσετε ενδιαφέρον για ακίνητο που έχει ήδη συνδεθεί με μεσίτη');
      return;
    }

    // Έλεγχος αν ο χρήστης είναι ο ιδιοκτήτης του ακινήτου
    if (property.user?.email === session.user.email) {
      toast.error('Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/properties/interest', { propertyId: property.id });

      toast.success('Εκφράσατε επιτυχώς ενδιαφέρον για το ακίνητο');
      onClose();
    } catch (error) {
      console.error('Error expressing interest:', error);
      const errorMessage = error instanceof Error ? error.message : 'Σφάλμα κατά την έκφραση ενδιαφέροντος';
      
      // Ειδική διαχείριση για το μήνυμα του seller
      if (errorMessage.includes('Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς')) {
        toast.error('❌ Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case 'apartment':
        return 'Διαμέρισμα';
      case 'house':
        return 'Μονοκατοικία';
      case 'villa':
        return 'Βίλα';
      case 'commercial':
        return 'Επαγγελματικός Χώρος';
      case 'plot':
        return 'Οικόπεδο';
      default:
        return type;
    }
  };

  const getConditionLabel = (condition?: string) => {
    switch (condition) {
      case 'underConstruction':
        return 'Υπό κατασκευή';
      case 'renovated':
        return 'Ανακαινισμένο';
      case 'needsRenovation':
        return 'Χρήζει ανακαίνισης';
      default:
        return 'Δεν έχει οριστεί';
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-start">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {property.title}
                  </Dialog.Title>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={toggleFavorite}
                      disabled={isLoading}
                      className="text-gray-400 hover:text-red-500 focus:outline-none"
                    >
                      {isFavorite ? (
                        <HeartIconSolid className="h-6 w-6 text-red-500" />
                      ) : (
                        <HeartIcon className="h-6 w-6" />
                      )}
                    </button>
                    {onShare && (
                      <button
                        onClick={onShare}
                        className="text-gray-400 hover:text-blue-500 focus:outline-none"
                      >
                        <FiShare2 className="h-6 w-6" />
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Εικόνες */}
                  <div>
                    <div className="relative h-64">
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {property.images.slice(1).map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`${property.title} ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-75"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Βασικές Πληροφορίες */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-lg">Τιμή</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        {new Intl.NumberFormat('el-GR', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(property.price)}
                        {property.negotiable && (
                          <span className="text-sm font-normal text-gray-500 ml-2">
                            (Συζητήσιμη)
                          </span>
                        )}
                      </p>
                      {property.pricePerSquareMeter && (
                        <p className="text-sm text-gray-500">
                          {new Intl.NumberFormat('el-GR', {
                            style: 'currency',
                            currency: 'EUR',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(property.pricePerSquareMeter)}
                          /τ.μ.
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-lg">Τοποθεσία</h4>
                      <p className="text-gray-700">
                        {property.street} {property.number}
                        {property.neighborhood && `, ${property.neighborhood}`}
                        <br />
                        {property.city}, {property.state}
                        {property.postalCode && ` ${property.postalCode}`}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-lg">Χαρακτηριστικά</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-600">Τύπος</p>
                          <p className="font-medium">{getPropertyTypeLabel(property.propertyType)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Κατάσταση</p>
                          <p className="font-medium">{getConditionLabel(property.condition)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Εμβαδόν</p>
                          <p className="font-medium">{property.area} τ.μ.</p>
                        </div>
                        {property.yearBuilt && (
                          <div>
                            <p className="text-gray-600">Έτος Κατασκευής</p>
                            <p className="font-medium">{property.yearBuilt}</p>
                          </div>
                        )}
                        {property.renovationYear && (
                          <div>
                            <p className="text-gray-600">Έτος Ανακαίνισης</p>
                            <p className="font-medium">{property.renovationYear}</p>
                          </div>
                        )}
                        {property.bedrooms && (
                          <div>
                            <p className="text-gray-600">Υπνοδωμάτια</p>
                            <p className="font-medium">{property.bedrooms}</p>
                          </div>
                        )}
                        {property.bathrooms && (
                          <div>
                            <p className="text-gray-600">Μπάνια</p>
                            <p className="font-medium">{property.bathrooms}</p>
                          </div>
                        )}
                        {property.floor && (
                          <div>
                            <p className="text-gray-600">Όροφος</p>
                            <p className="font-medium">{property.floor}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Επιπλέον Χαρακτηριστικά */}
                    <div>
                      <h4 className="font-semibold text-lg">Επιπλέον Χαρακτηριστικά</h4>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {property.elevator && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Ασανσέρ</span>}
                        {property.furnished && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Επιπλωμένο</span>}
                        {property.securityDoor && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Πόρτα Ασφαλείας</span>}
                        {property.alarm && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Συναγερμός</span>}
                        {property.disabledAccess && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Πρόσβαση ΑΜΕΑ</span>}
                        {property.soundproofing && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Ηχομόνωση</span>}
                        {property.thermalInsulation && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Θερμομόνωση</span>}
                        {property.hasBalcony && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Μπαλκόνι</span>}
                        {property.garden && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Κήπος</span>}
                      </div>
                    </div>

                    {/* Περιγραφή */}
                    <div>
                      <h4 className="font-semibold text-lg">Περιγραφή</h4>
                      <p className="text-gray-700 whitespace-pre-line">{property.fullDescription}</p>
                    </div>

                    {/* Ενέργειες */}
                    <div className="flex justify-end space-x-4 mt-6">
                      {!isAgent && (
                        <button
                          onClick={expressInterest}
                          disabled={isLoading}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Εκδήλωση Ενδιαφέροντος
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 