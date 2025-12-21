import { Switch } from '@headlessui/react';

interface PropertySpecialFeaturesProps {
  isEditing: boolean;
  property: any;
  editedData: any;
  setEditedData: (data: any) => void;
}

// Constants for select options
const COMMERCIAL_TYPES = ['store', 'office', 'warehouse'];
const PLOT_CATEGORIES = ['residential', 'agricultural', 'industrial', 'investment'];
const PLOT_OWNERSHIP_TYPES = ['private', 'corporate', 'shared'];
const ROAD_ACCESS_TYPES = ['asphalt', 'dirt', 'municipal', 'rural'];
const TERRAIN_TYPES = ['flat', 'sloped', 'amphitheater'];
const SHAPE_TYPES = ['triangular', 'rectangular', 'corner'];
const SUITABILITY_TYPES = ['residential', 'professional', 'tourist', 'industrial'];
const STORAGE_TYPES = ['internal', 'external', 'none'];
const ELEVATOR_TYPES = ['passenger', 'freight', 'both', 'none'];

export default function PropertySpecialFeatures({
  isEditing,
  property,
  editedData,
  setEditedData
}: PropertySpecialFeaturesProps) {
  if (!isEditing) {
    if (property.propertyType === 'commercial') {
      return (
        <div className="mt-6 border-t pt-6">
          <h4 className="font-medium text-gray-700 mb-4">Εμπορικά Χαρακτηριστικά</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>Τύπος: {property.commercialType || '-'}</div>
            <div>Αριθμός Δωματίων: {property.rooms || '-'}</div>
            <div>Τύπος Αποθήκης: {property.storageType || '-'}</div>
            <div>Τύπος Ανελκυστήρα: {property.elevatorType || '-'}</div>
            {property.fireproofDoor && <div>Πυράντοχη Πόρτα: Ναι</div>}
          </div>
        </div>
      );
    }

    if (property.propertyType === 'plot') {
      return (
        <div className="mt-6 border-t pt-6">
          <h4 className="font-medium text-gray-700 mb-4">Χαρακτηριστικά Οικοπέδου</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>Κατηγορία: {property.plotCategory || '-'}</div>
            <div>Τύπος Ιδιοκτησίας: {property.plotOwnershipType || '-'}</div>
            <div>Συντελεστής Δόμησης: {property.buildingCoefficient || '-'}</div>
            <div>Κάλυψη: {property.coverageRatio || '-'}</div>
            <div>Πρόσοψη: {property.facadeLength || '-'} μ.</div>
            <div>Αριθμός Πλευρών: {property.sides || '-'}</div>
            <div>Οικοδομήσιμη Επιφάνεια: {property.buildableArea || '-'} τ.μ.</div>
            {property.buildingPermit && <div>Οικοδομική Άδεια: Ναι</div>}
            <div>Πρόσβαση: {property.roadAccess || '-'}</div>
            <div>Έδαφος: {property.terrain || '-'}</div>
            <div>Σχήμα: {property.shape || '-'}</div>
            <div>Καταλληλότητα: {property.suitability || '-'}</div>
          </div>
        </div>
      );
    }

    return null;
  }

  if (editedData.propertyType === 'commercial') {
    return (
      <div className="mt-6 border-t pt-6">
        <h4 className="font-medium text-gray-700 mb-4">Εμπορικά Χαρακτηριστικά</h4>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Τύπος</label>
            <select
              value={editedData.commercialType || ''}
              onChange={(e) => setEditedData({ ...editedData, commercialType: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Επιλέξτε τύπο</option>
              {COMMERCIAL_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Αριθμός Δωματίων</label>
            <input
              type="number"
              value={editedData.rooms || ''}
              onChange={(e) => setEditedData({ ...editedData, rooms: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Τύπος Αποθήκης</label>
            <select
              value={editedData.storageType || ''}
              onChange={(e) => setEditedData({ ...editedData, storageType: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Επιλέξτε τύπο</option>
              {STORAGE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Τύπος Ανελκυστήρα</label>
            <select
              value={editedData.elevatorType || ''}
              onChange={(e) => setEditedData({ ...editedData, elevatorType: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Επιλέξτε τύπο</option>
              {ELEVATOR_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <Switch.Group>
              <div className="flex items-center justify-between">
                <Switch.Label className="text-sm font-medium text-gray-700">Πυράντοχη Πόρτα</Switch.Label>
                <Switch
                  checked={editedData.fireproofDoor || false}
                  onChange={(checked) => setEditedData({ ...editedData, fireproofDoor: checked })}
                  className={`${
                    editedData.fireproofDoor ? 'bg-blue-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      editedData.fireproofDoor ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
              </div>
            </Switch.Group>
          </div>
        </div>
      </div>
    );
  }

  if (editedData.propertyType === 'plot') {
    return (
      <div className="mt-6 border-t pt-6">
        <h4 className="font-medium text-gray-700 mb-4">Χαρακτηριστικά Οικοπέδου</h4>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Κατηγορία</label>
            <select
              value={editedData.plotCategory || ''}
              onChange={(e) => setEditedData({ ...editedData, plotCategory: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Επιλέξτε κατηγορία</option>
              {PLOT_CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Τύπος Ιδιοκτησίας</label>
            <select
              value={editedData.plotOwnershipType || ''}
              onChange={(e) => setEditedData({ ...editedData, plotOwnershipType: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Επιλέξτε τύπο</option>
              {PLOT_OWNERSHIP_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Συντελεστής Δόμησης</label>
            <input
              type="number"
              step="0.01"
              value={editedData.buildingCoefficient || ''}
              onChange={(e) => setEditedData({ ...editedData, buildingCoefficient: parseFloat(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Κάλυψη</label>
            <input
              type="number"
              step="0.01"
              value={editedData.coverageRatio || ''}
              onChange={(e) => setEditedData({ ...editedData, coverageRatio: parseFloat(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Πρόσοψη (μ.)</label>
            <input
              type="number"
              step="0.01"
              value={editedData.facadeLength || ''}
              onChange={(e) => setEditedData({ ...editedData, facadeLength: parseFloat(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Αριθμός Πλευρών</label>
            <input
              type="number"
              value={editedData.sides || ''}
              onChange={(e) => setEditedData({ ...editedData, sides: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Οικοδομήσιμη Επιφάνεια (τ.μ.)</label>
            <input
              type="number"
              step="0.01"
              value={editedData.buildableArea || ''}
              onChange={(e) => setEditedData({ ...editedData, buildableArea: parseFloat(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Πρόσβαση</label>
            <select
              value={editedData.roadAccess || ''}
              onChange={(e) => setEditedData({ ...editedData, roadAccess: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Επιλέξτε τύπο</option>
              {ROAD_ACCESS_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Έδαφος</label>
            <select
              value={editedData.terrain || ''}
              onChange={(e) => setEditedData({ ...editedData, terrain: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Επιλέξτε τύπο</option>
              {TERRAIN_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Σχήμα</label>
            <select
              value={editedData.shape || ''}
              onChange={(e) => setEditedData({ ...editedData, shape: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Επιλέξτε τύπο</option>
              {SHAPE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Καταλληλότητα</label>
            <select
              value={editedData.suitability || ''}
              onChange={(e) => setEditedData({ ...editedData, suitability: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Επιλέξτε τύπο</option>
              {SUITABILITY_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <Switch.Group>
              <div className="flex items-center justify-between">
                <Switch.Label className="text-sm font-medium text-gray-700">Οικοδομική Άδεια</Switch.Label>
                <Switch
                  checked={editedData.buildingPermit || false}
                  onChange={(checked) => setEditedData({ ...editedData, buildingPermit: checked })}
                  className={`${
                    editedData.buildingPermit ? 'bg-blue-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      editedData.buildingPermit ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
              </div>
            </Switch.Group>
          </div>
        </div>
      </div>
    );
  }

  return null;
} 