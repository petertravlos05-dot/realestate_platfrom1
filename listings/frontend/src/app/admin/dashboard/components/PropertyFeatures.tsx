import { Switch } from '@headlessui/react';

interface PropertyFeaturesProps {
  isEditing: boolean;
  property: any;
  editedData: any;
  setEditedData: (data: any) => void;
}

// Constants for select options
const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'commercial', 'plot'];
const CONDITIONS = ['underConstruction', 'renovated', 'needsRenovation'];
const HEATING_TYPES = ['autonomous', 'central', 'heatpump'];
const HEATING_SYSTEMS = ['gas', 'oil', 'electricity'];
const WINDOW_TYPES = ['pvc', 'wooden', 'aluminum'];
const WINDOW_STYLES = ['insulated', 'non_insulated'];
const FLOORING_TYPES = ['tiles', 'wooden', 'marble'];
const ENERGY_CLASSES = ['A+', 'A', 'B+', 'B', 'C', 'D', 'E', 'F', 'G'];
const POOL_TYPES = ['private', 'shared', 'none'];

export default function PropertyFeatures({
  isEditing,
  property,
  editedData,
  setEditedData
}: PropertyFeaturesProps) {
  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Basic Features */}
          <div>
            <h4 className="font-medium text-gray-700 mb-4">Βασικά Στοιχεία</h4>
            <ul className="space-y-2">
              <li>Κατάσταση: {property.condition || '-'}</li>
              <li>Υπνοδωμάτια: {property.bedrooms || '-'}</li>
              <li>Μπάνια: {property.bathrooms || '-'}</li>
              <li>Όροφος: {property.floor || '-'}</li>
              <li>Θέσεις Πάρκινγκ: {property.parkingSpaces || '-'}</li>
              <li>Έτος Κατασκευής: {property.yearBuilt || '-'}</li>
              {property.renovationYear && (
                <li>Έτος Ανακαίνισης: {property.renovationYear}</li>
              )}
            </ul>
          </div>

          {/* Energy & Construction */}
          <div>
            <h4 className="font-medium text-gray-700 mb-4">Ενέργεια & Κατασκευή</h4>
            <ul className="space-y-2">
              <li>Ενεργειακή Κλάση: {property.energyClass || '-'}</li>
              <li>Τύπος Θέρμανσης: {property.heatingType || '-'}</li>
              <li>Σύστημα Θέρμανσης: {property.heatingSystem || '-'}</li>
              <li>Κουφώματα: {property.windows || '-'}</li>
              <li>Τύπος Κουφωμάτων: {property.windowsType || '-'}</li>
              <li>Δάπεδο: {property.flooring || '-'}</li>
            </ul>
          </div>

          {/* Amenities */}
          <div>
            <h4 className="font-medium text-gray-700 mb-4">Παροχές</h4>
            <ul className="space-y-2">
              {property.elevator && <li>Ανελκυστήρας</li>}
              {property.furnished && <li>Επιπλωμένο</li>}
              {property.securityDoor && <li>Πόρτα Ασφαλείας</li>}
              {property.alarm && <li>Συναγερμός</li>}
              {property.disabledAccess && <li>Πρόσβαση ΑΜΕΑ</li>}
              {property.soundproofing && <li>Ηχομόνωση</li>}
              {property.thermalInsulation && <li>Θερμομόνωση</li>}
              {property.garden && <li>Κήπος</li>}
              {property.hasBalcony && <li>Μπαλκόνι</li>}
              {property.pool && <li>Πισίνα: {property.pool}</li>}
              {property.balconyArea && <li>Εμβαδόν Μπαλκονιού: {property.balconyArea} τ.μ.</li>}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Basic Features */}
        <div>
          <h4 className="font-medium text-gray-700 mb-4">Βασικά Στοιχεία</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Κατάσταση</label>
              <select
                value={editedData.condition || ''}
                onChange={(e) => setEditedData({ ...editedData, condition: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε κατάσταση</option>
                {CONDITIONS.map(condition => (
                  <option key={condition} value={condition}>{condition}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Υπνοδωμάτια</label>
              <input
                type="number"
                value={editedData.bedrooms || ''}
                onChange={(e) => setEditedData({ ...editedData, bedrooms: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Μπάνια</label>
              <input
                type="number"
                value={editedData.bathrooms || ''}
                onChange={(e) => setEditedData({ ...editedData, bathrooms: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Όροφος</label>
              <input
                type="text"
                value={editedData.floor || ''}
                onChange={(e) => setEditedData({ ...editedData, floor: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Θέσεις Πάρκινγκ</label>
              <input
                type="number"
                value={editedData.parkingSpaces || ''}
                onChange={(e) => setEditedData({ ...editedData, parkingSpaces: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Έτος Κατασκευής</label>
              <input
                type="number"
                value={editedData.yearBuilt || ''}
                onChange={(e) => setEditedData({ ...editedData, yearBuilt: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Έτος Ανακαίνισης</label>
              <input
                type="number"
                value={editedData.renovationYear || ''}
                onChange={(e) => setEditedData({ ...editedData, renovationYear: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Energy & Construction */}
        <div>
          <h4 className="font-medium text-gray-700 mb-4">Ενέργεια & Κατασκευή</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ενεργειακή Κλάση</label>
              <select
                value={editedData.energyClass || ''}
                onChange={(e) => setEditedData({ ...editedData, energyClass: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε κλάση</option>
                {ENERGY_CLASSES.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Τύπος Θέρμανσης</label>
              <select
                value={editedData.heatingType || ''}
                onChange={(e) => setEditedData({ ...editedData, heatingType: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε τύπο</option>
                {HEATING_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Σύστημα Θέρμανσης</label>
              <select
                value={editedData.heatingSystem || ''}
                onChange={(e) => setEditedData({ ...editedData, heatingSystem: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε σύστημα</option>
                {HEATING_SYSTEMS.map(system => (
                  <option key={system} value={system}>{system}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Κουφώματα</label>
              <select
                value={editedData.windows || ''}
                onChange={(e) => setEditedData({ ...editedData, windows: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε τύπο</option>
                {WINDOW_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Τύπος Κουφωμάτων</label>
              <select
                value={editedData.windowsType || ''}
                onChange={(e) => setEditedData({ ...editedData, windowsType: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε τύπο</option>
                {WINDOW_STYLES.map(style => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Δάπεδο</label>
              <select
                value={editedData.flooring || ''}
                onChange={(e) => setEditedData({ ...editedData, flooring: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε τύπο</option>
                {FLOORING_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div>
          <h4 className="font-medium text-gray-700 mb-4">Παροχές</h4>
          <div className="space-y-4">
            {[
              { key: 'elevator', label: 'Ανελκυστήρας' },
              { key: 'furnished', label: 'Επιπλωμένο' },
              { key: 'securityDoor', label: 'Πόρτα Ασφαλείας' },
              { key: 'alarm', label: 'Συναγερμός' },
              { key: 'disabledAccess', label: 'Πρόσβαση ΑΜΕΑ' },
              { key: 'soundproofing', label: 'Ηχομόνωση' },
              { key: 'thermalInsulation', label: 'Θερμομόνωση' },
              { key: 'garden', label: 'Κήπος' },
              { key: 'hasBalcony', label: 'Μπαλκόνι' }
            ].map(({ key, label }) => (
              <Switch.Group key={key}>
                <div className="flex items-center justify-between">
                  <Switch.Label className="text-sm font-medium text-gray-700">{label}</Switch.Label>
                  <Switch
                    checked={editedData[key] || false}
                    onChange={(checked) => setEditedData({ ...editedData, [key]: checked })}
                    className={`${
                      editedData[key] ? 'bg-blue-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        editedData[key] ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                </div>
              </Switch.Group>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700">Πισίνα</label>
              <select
                value={editedData.pool || ''}
                onChange={(e) => setEditedData({ ...editedData, pool: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε τύπο</option>
                {POOL_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {editedData.hasBalcony && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Εμβαδόν Μπαλκονιού (τ.μ.)</label>
                <input
                  type="number"
                  value={editedData.balconyArea || ''}
                  onChange={(e) => setEditedData({ ...editedData, balconyArea: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 