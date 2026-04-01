/**
 * Property Details Config - Mapping από add-listing για όλους τους τύπους ακινήτων.
 * Χρησιμοποιείται στη σελίδα λεπτομερειών ακινήτου.
 */

import {
  FaRuler,
  FaBuilding,
  FaBolt,
  FaBath,
  FaParking,
  FaHome,
  FaWifi,
  FaUser,
  FaCalendarAlt,
} from 'react-icons/fa';
import { MdSecurity, MdStore, MdWarehouse } from 'react-icons/md';
import { GiSolarPower, GiHeatHaze, GiGardeningShears } from 'react-icons/gi';
import { BsWindow } from 'react-icons/bs';

// Floor labels (από add-listing)
export const floorLabels: Record<string, string> = {
  basement: 'Υπόγειο',
  ground: 'Ισόγειο',
  '1': '1ος',
  '2': '2ος',
  '3': '3ος',
  '4': '4ος',
  '5': '5ος',
  '6': '6ος',
  '7': '7ος',
  '8': '8ος',
  '9': '9ος',
  '10': '10ος',
  '11+': '11ος+',
};

// Condition labels
export const conditionLabels: Record<string, string> = {
  new: 'Άριστη',
  underConstruction: 'Υπό κατασκευή',
  renovated: 'Ανακαινισμένο',
  needsRenovation: 'Χρήζει ανακαίνισης',
  semiFinished: 'Ημιτελές',
  newlyBuilt: 'Νεόδμητο',
  rented: 'Μισθωμένο',
  free: 'Ελεύθερο',
  leased: 'Εκμισθωμένο',
  empty: 'Κενό',
};

// Technical specs: { propertyKey | amenitiesKey, label, suffix, format }
export type TechSpecSource = { prop?: string; amen?: string };
export const TECHNICAL_SPECS: Array<{
  keys: TechSpecSource;
  label: string;
  suffix?: string;
  format?: (v: unknown) => string;
}> = [
  // Βασικά - όλοι τύποι
  { keys: { prop: 'condition' }, label: 'Κατάσταση', format: (v) => conditionLabels[String(v)] || String(v) },
  { keys: { prop: 'yearBuilt' }, label: 'Έτος Κατασκευής' },
  { keys: { prop: 'renovationYear' }, label: 'Έτος Ανακαίνισης' },
  { keys: { prop: 'parkingSpaces' }, label: 'Θέσεις Στάθμευσης' },
  { keys: { prop: 'floor' }, label: 'Όροφος', format: (v) => floorLabels[String(v)] || String(v) },
  { keys: { prop: 'garden' }, label: 'Κήπος', format: (v) => (v ? 'Ναι' : 'Όχι') },
  { keys: { prop: 'gardenArea' }, label: 'Εμβαδόν Κήπου', suffix: 'τ.μ.' },
  { keys: { prop: 'multipleFloors' }, label: 'Πολλαπλοί Όροφοι', format: (v) => (v ? 'Ναι' : 'Όχι') },
  { keys: { prop: 'floorsCount' }, label: 'Αριθμός Ορόφων' },
  // Κατοικία
  { keys: { prop: 'bedrooms' }, label: 'Υπνοδωμάτια' },
  { keys: { prop: 'bathrooms' }, label: 'Μπάνια' },
  { keys: { prop: 'heatingType' }, label: 'Θέρμανση' },
  { keys: { prop: 'heatingSystem' }, label: 'Σύστημα Θέρμανσης' },
  { keys: { prop: 'windows' }, label: 'Κουφώματα' },
  { keys: { prop: 'windowsType' }, label: 'Τύπος Κουφωμάτων' },
  { keys: { prop: 'flooring' }, label: 'Δάπεδο' },
  { keys: { prop: 'pool' }, label: 'Πισίνα' },
  { keys: { prop: 'poolType' }, label: 'Τύπος Πισίνας' },
  { keys: { prop: 'balconyArea' }, label: 'Μπαλκόνι', suffix: 'τ.μ.' },
  { keys: { prop: 'hasBalcony' }, label: 'Μπαλκόνι', format: (v) => (v ? 'Ναι' : 'Όχι') },
  // Επαγγελματικό
  { keys: { prop: 'commercialType' }, label: 'Τύπος' },
  { keys: { prop: 'commercialCategory' }, label: 'Κατηγορία' },
  { keys: { prop: 'rooms' }, label: 'Δωμάτια/Χώροι' },
  { keys: { prop: 'wc' }, label: 'WC' },
  { keys: { prop: 'storefrontLength' }, label: 'Μήκος Βιτρίνας', suffix: 'μ' },
  { keys: { prop: 'storeFrontLength' }, label: 'Μήκος Βιτρίνας', suffix: 'μ' },
  { keys: { prop: 'maxHeight' }, label: 'Μέγιστο Ύψος', suffix: 'μ' },
  { keys: { prop: 'auxiliarySpaces' }, label: 'Βοηθητικοί Χώροι' },
  { keys: { prop: 'floorDetails' }, label: 'Λεπτομέρειες Δαπέδου' },
  { keys: { prop: 'mezzanineArea' }, label: 'Εμβαδόν Παταριού', suffix: 'τ.μ.' },
  { keys: { prop: 'basementArea' }, label: 'Εμβαδόν Υπογείου', suffix: 'τ.μ.' },
  { keys: { prop: 'forecourtArea' }, label: 'Εμβαδόν Προαυλίου', suffix: 'τ.μ.' },
  { keys: { prop: 'clearHeight' }, label: 'Καθαρό Ύψος', suffix: 'μ' },
  { keys: { prop: 'powerKva' }, label: 'Ισχύς Ρεύματος', suffix: 'KVA' },
  { keys: { prop: 'buildingCoefficient' }, label: 'Συντελεστής Δόμησης' },
  { keys: { prop: 'remainingBuilding' }, label: 'Υπόλοιπο Δόμησης' },
  { keys: { prop: 'buildingUnitsCount' }, label: 'Αριθμός Ενοτήτων' },
  { keys: { prop: 'buildingLandUse' }, label: 'Χρήση Γης' },
  { keys: { prop: 'buildingFacadeLength' }, label: 'Πρόσοψη', suffix: 'μ' },
  { keys: { prop: 'superstructureArea' }, label: 'Ανωδομή', suffix: 'τ.μ.' },
  { keys: { prop: 'buildingFloorsDescription' }, label: 'Αριθμός Ορόφων' },
  { keys: { prop: 'landArea' }, label: 'Εμβαδόν Οικοπέδου', suffix: 'τ.μ.' },
  { keys: { prop: 'hospitalityBeds' }, label: 'Κλίνες' },
  { keys: { prop: 'hospitalityStars' }, label: 'Αστέρια' },
  { keys: { prop: 'distanceFromSea' }, label: 'Απόσταση από Θάλασσα', suffix: 'μ' },
  { keys: { prop: 'hospitalityPlotArea' }, label: 'Εμβαδόν Οικοπέδου', suffix: 'τ.μ.' },
  { keys: { prop: 'kitchenArea' }, label: 'Εμβαδόν Κουζίνας', suffix: 'τ.μ.' },
  { keys: { prop: 'parkingSpaceType' }, label: 'Τύπος Θέσεων' },
  { keys: { prop: 'entranceHeight' }, label: 'Ύψος Εισόδου', suffix: 'μ' },
  { keys: { prop: 'parkingBasementArea' }, label: 'Εμβαδόν Υπογείου', suffix: 'τ.μ.' },
  // Οικόπεδο
  { keys: { prop: 'plotArea' }, label: 'Εμβαδόν Οικοπέδου', suffix: 'τ.μ.' },
  { keys: { prop: 'coverageRatio' }, label: 'Συντελεστής Κάλυψης' },
  { keys: { prop: 'facadeLength' }, label: 'Μήκος Πρόσοψης', suffix: 'μ' },
  { keys: { prop: 'sides' }, label: 'Αριθμός Όψεων' },
  { keys: { prop: 'buildableArea' }, label: 'Κτίζει', suffix: 'τ.μ.' },
  { keys: { prop: 'buildingPermit' }, label: 'Άδεια Οικοδομής', format: (v) => (v ? 'Ναι' : 'Όχι') },
  { keys: { prop: 'roadAccess' }, label: 'Πρόσβαση από Δρόμο' },
  { keys: { prop: 'terrain' }, label: 'Κλίση Εδάφους' },
  { keys: { prop: 'shape' }, label: 'Μορφολογία' },
  { keys: { prop: 'suitability' }, label: 'Καταλληλότητα' },
  { keys: { prop: 'plotCategory' }, label: 'Κατηγορία Οικοπέδου' },
  { keys: { prop: 'plotOwnershipType' }, label: 'Τύπος Ιδιοκτησίας' },
  { keys: { prop: 'landCategory' }, label: 'Κατηγορία Γης' },
  { keys: { prop: 'ownershipType' }, label: 'Τύπος Ιδιοκτησίας' },
  { keys: { prop: 'buildingArea' }, label: 'Εμβαδόν Κτιρίου', suffix: 'τ.μ.' },
  { keys: { prop: 'morphology' }, label: 'Μορφολογία' },
  // Από amenities
  { keys: { amen: 'landUse' }, label: 'Χρήση Γης' },
  { keys: { amen: 'completeness' }, label: 'Πληρότητα' },
  { keys: { amen: 'internalParkingSpaces' }, label: 'Εσωτερικό Parking', suffix: 'θέσεις' },
];

// Amenities: { amenKey, label, icon }
export const AMENITIES_CONFIG: Array<{
  key: string;
  label: string;
  icon: React.ReactNode;
}> = [
  // Κατοικία
  { key: 'elevator', label: 'Ανελκυστήρας', icon: <FaBuilding /> },
  { key: 'furnished', label: 'Επιπλωμένο', icon: <FaHome /> },
  { key: 'securityDoor', label: 'Πόρτα Ασφαλείας', icon: <MdSecurity /> },
  { key: 'alarm', label: 'Συναγερμός', icon: <MdSecurity /> },
  { key: 'disabledAccess', label: 'Πρόσβαση ΑΜΕΑ', icon: <FaUser /> },
  { key: 'soundproofing', label: 'Ηχομόνωση', icon: <FaHome /> },
  { key: 'thermalInsulation', label: 'Θερμομόνωση', icon: <GiHeatHaze /> },
  { key: 'hasBalcony', label: 'Μπαλκόνι', icon: <GiGardeningShears /> },
  { key: 'storage', label: 'Αποθήκη', icon: <MdStore /> },
  { key: 'guestHouse', label: 'Ξενώνας', icon: <FaHome /> },
  { key: 'jacuzzi', label: 'Τζακούζι', icon: <FaBath /> },
  { key: 'outdoorSports', label: 'Αθλητικοί Χώροι', icon: <GiGardeningShears /> },
  { key: 'gym', label: 'Γυμναστήριο', icon: <FaHome /> },
  { key: 'sauna', label: 'Σάουνα', icon: <FaHome /> },
  { key: 'fireplace', label: 'Τζάκι', icon: <FaHome /> },
  { key: 'airConditioning', label: 'Κλιματισμός', icon: <GiHeatHaze /> },
  { key: 'solarWaterHeater', label: 'Ηλιακός Θερμοσίφωνας', icon: <GiSolarPower /> },
  { key: 'smartTv', label: 'Smart TV', icon: <FaHome /> },
  { key: 'bbq', label: 'BBQ', icon: <FaHome /> },
  { key: 'electricalAppliances', label: 'Ηλεκτρικές Συσκευές', icon: <FaHome /> },
  // Οικόπεδο
  { key: 'electricity', label: 'Παροχή Ρεύματος', icon: <FaBolt /> },
  { key: 'water', label: 'Παροχή Νερού', icon: <FaBath /> },
  { key: 'buildingPermit', label: 'Άδεια Οικοδομής', icon: <FaBuilding /> },
  { key: 'containerPermit', label: 'Άδεια Κοντέινερ', icon: <FaBuilding /> },
  { key: 'pea', label: 'ΠΕΑ', icon: <GiSolarPower /> },
  { key: 'fenced', label: 'Περιφραγμένο', icon: <GiGardeningShears /> },
  { key: 'withinPlan', label: 'Εντός Σχεδίου', icon: <FaBuilding /> },
  { key: 'withinSettlement', label: 'Εντός Οικισμού', icon: <FaBuilding /> },
  { key: 'reforestable', label: 'Αναδασωσίμο', icon: <GiGardeningShears /> },
  // Επαγγελματικό
  { key: 'threePhaseElectricity', label: 'Τριφασικό Ρεύμα', icon: <FaBolt /> },
  { key: 'waterSupply', label: 'Ύδρευση', icon: <FaBath /> },
  { key: 'falseCeiling', label: 'Ψευδοροφή', icon: <BsWindow /> },
  { key: 'airConditioningHeating', label: 'A/C - Θέρμανση', icon: <GiHeatHaze /> },
  { key: 'internetStructuredCabling', label: 'Δομημένη Καλωδίωση', icon: <FaWifi /> },
  { key: 'equipment', label: 'Εξοπλισμός', icon: <MdWarehouse /> },
  { key: 'energyCertificate', label: 'Ενεργειακό Πιστοποιητικό', icon: <GiSolarPower /> },
  { key: 'parking', label: 'Στάθμευση', icon: <FaParking /> },
  { key: 'awnings', label: 'Τέντες', icon: <FaHome /> },
  { key: 'facade', label: 'Πρόσοψη', icon: <FaBuilding /> },
  { key: 'internalStaircase', label: 'Εσωτερική Σκάλα', icon: <FaBuilding /> },
  { key: 'securityDoor', label: 'Πόρτα Ασφαλείας', icon: <MdSecurity /> },
  { key: 'fiberOptic', label: 'Οπτική Ίνα', icon: <FaWifi /> },
  { key: 'concierge', label: 'Θυρωρείο', icon: <FaUser /> },
  { key: 'sprinklers', label: 'Πυρόσβεση', icon: <MdSecurity /> },
  { key: 'security', label: 'Φύλαξη', icon: <MdSecurity /> },
  { key: 'wifiAllAreas', label: 'WiFi', icon: <FaWifi /> },
  { key: 'garden', label: 'Κήπος', icon: <GiGardeningShears /> },
  { key: 'safe', label: 'Χρηματοκιβώτιο', icon: <MdSecurity /> },
  { key: 'satelliteTv', label: 'Δορυφορική TV', icon: <FaHome /> },
  { key: 'forecourt', label: 'Προαύλιο', icon: <GiGardeningShears /> },
  { key: 'cctv', label: 'CCTV', icon: <MdSecurity /> },
  { key: 'ventilationSystem', label: 'Σύστημα Εξαερισμού', icon: <GiHeatHaze /> },
  { key: 'security24', label: 'Φύλαξη 24/7', icon: <MdSecurity /> },
  { key: 'automaticBarrier', label: 'Αυτόματη Μπάρα', icon: <FaParking /> },
  { key: 'licensePlateRecognition', label: 'Αναγνώριση Πινακίδων', icon: <FaParking /> },
  { key: 'evCharging', label: 'Φόρτιση Ηλεκτρικών', icon: <GiSolarPower /> },
  { key: 'parkingWc', label: 'WC', icon: <FaBath /> },
  { key: 'carElevator', label: 'Ασανσέρ Αυτοκινήτων', icon: <FaBuilding /> },
  { key: 'waitingArea', label: 'Χώρος Αναμονής', icon: <FaHome /> },
  { key: 'generator', label: 'Γεννήτρια', icon: <FaBolt /> },
  // Ολόκληρο Κτίριο
  { key: 'autonomousHeatingPerFloor', label: 'Αυτόνομη Θέρμανση', icon: <GiHeatHaze /> },
  { key: 'elevatorPassengerFreight', label: 'Ανελκυστήρας', icon: <FaBuilding /> },
  { key: 'fireEscape', label: 'Κλιμακοστάσιο Πυρασφάλειας', icon: <MdSecurity /> },
  { key: 'undergroundGarage', label: 'Υπόγειο Garage', icon: <FaParking /> },
  { key: 'centralSecurity', label: 'Κεντρικό Σύστημα Φύλαξης', icon: <MdSecurity /> },
  { key: 'roofGarden', label: 'Roof Garden', icon: <GiGardeningShears /> },
  { key: 'facadeLighting', label: 'Φωτισμός Πρόσοψης', icon: <FaHome /> },
  { key: 'surroundingSpace', label: 'Περιβάλλον Χώρος', icon: <GiGardeningShears /> },
];

// Helper: get value from property or amenities (supports basicDetails/features in amenities)
function getValue(
  prop: Record<string, unknown>,
  amen: Record<string, unknown> | null,
  keys: TechSpecSource
): unknown {
  if (keys.prop && prop && (prop[keys.prop] !== undefined && prop[keys.prop] !== null && prop[keys.prop] !== '')) {
    return prop[keys.prop];
  }
  if (keys.amen && amen) {
    const val = amen[keys.amen];
    if (val !== undefined && val !== null && val !== '') return val;
    const bd = amen.basicDetails as Record<string, unknown> | undefined;
    if (bd && keys.prop && bd[keys.prop] !== undefined && bd[keys.prop] !== null && bd[keys.prop] !== '') {
      return bd[keys.prop];
    }
    const fe = amen.features as Record<string, unknown> | undefined;
    if (fe && keys.prop && fe[keys.prop] !== undefined && fe[keys.prop] !== null && fe[keys.prop] !== '') {
      return fe[keys.prop];
    }
  }
  return null;
}

export function getTechSpecs(
  property: Record<string, unknown>,
  amenities: Record<string, unknown> | null
): Array<{ label: string; value: string }> {
  const seen = new Set<string>();
  const result: Array<{ label: string; value: string }> = [];
  const quickInfoKeys = new Set(['area', 'floor', 'yearBuilt', 'energyClass']);
  for (const spec of TECHNICAL_SPECS) {
    if (spec.keys.prop && quickInfoKeys.has(spec.keys.prop)) continue;
    const raw = getValue(property, amenities, spec.keys);
    if (raw === null || raw === undefined) continue;
    const strVal = spec.format ? spec.format(raw) : String(raw);
    if (!strVal) continue;
    const label = spec.label;
    if (seen.has(label)) continue; // Dedupe (e.g. storefrontLength vs storeFrontLength)
    seen.add(label);
    const value = spec.suffix ? `${strVal} ${spec.suffix}` : strVal;
    result.push({ label, value });
  }
  return result;
}

export function getAmenitiesWithIcons(
  property: Record<string, unknown>,
  amenities: Record<string, unknown> | null
): Array<{ label: string; icon: React.ReactNode; checked: boolean }> {
  const result: Array<{ label: string; icon: React.ReactNode; checked: boolean }> = [];
  const seen = new Set<string>();
  for (const a of AMENITIES_CONFIG) {
    if (seen.has(a.label)) continue;
    seen.add(a.label);
    const fromProp = property[a.key];
    const fromAmen = amenities?.[a.key];
    const checked = !!(fromProp || fromAmen);
    if (checked) {
      result.push({ label: a.label, icon: a.icon, checked: true });
    }
  }
  return result;
}

// Quick Info Bar: 4 primary fields (area, floor, year, energyClass)
export function getQuickInfoItems(property: Record<string, unknown>): Array<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> {
  const items: Array<{ icon: React.ReactNode; label: string; value: string }> = [];
  if (property.area != null && property.area !== '') {
    items.push({
      icon: <FaRuler className="w-5 h-5" />,
      label: 'Εμβαδόν',
      value: `${property.area} τ.μ.`,
    });
  }
  if (property.floor != null && property.floor !== '') {
    items.push({
      icon: <FaBuilding className="w-5 h-5" />,
      label: 'Όροφος',
      value: floorLabels[String(property.floor)] || String(property.floor),
    });
  }
  if (property.yearBuilt != null && property.yearBuilt !== '') {
    items.push({
      icon: <FaCalendarAlt className="w-5 h-5" />,
      label: 'Έτος',
      value: String(property.yearBuilt),
    });
  }
  if (property.energyClass != null && property.energyClass !== '') {
    items.push({
      icon: <GiSolarPower className="w-5 h-5" />,
      label: 'Ενεργειακή Κλάση',
      value: String(property.energyClass),
    });
  }
  return items;
}
