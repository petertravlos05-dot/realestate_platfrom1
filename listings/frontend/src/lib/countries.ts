/**
 * List of countries with their ISO 3166-1 alpha-2 codes and flag emojis
 * Sorted alphabetically by Greek name
 */

export interface Country {
  code: string;
  name: string;
  nameEn: string;
  flag: string;
}

export const countries: Country[] = [
  { code: 'GR', name: 'Ελλάδα', nameEn: 'Greece', flag: '🇬🇷' },
  { code: 'CY', name: 'Κύπρος', nameEn: 'Cyprus', flag: '🇨🇾' },
  { code: 'GB', name: 'Ηνωμένο Βασίλειο', nameEn: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'Ηνωμένες Πολιτείες', nameEn: 'United States', flag: '🇺🇸' },
  { code: 'DE', name: 'Γερμανία', nameEn: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'Γαλλία', nameEn: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Ιταλία', nameEn: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Ισπανία', nameEn: 'Spain', flag: '🇪🇸' },
  { code: 'PT', name: 'Πορτογαλία', nameEn: 'Portugal', flag: '🇵🇹' },
  { code: 'NL', name: 'Ολλανδία', nameEn: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', name: 'Βέλγιο', nameEn: 'Belgium', flag: '🇧🇪' },
  { code: 'AT', name: 'Αυστρία', nameEn: 'Austria', flag: '🇦🇹' },
  { code: 'CH', name: 'Ελβετία', nameEn: 'Switzerland', flag: '🇨🇭' },
  { code: 'SE', name: 'Σουηδία', nameEn: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Νορβηγία', nameEn: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Δανία', nameEn: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Φινλανδία', nameEn: 'Finland', flag: '🇫🇮' },
  { code: 'IE', name: 'Ιρλανδία', nameEn: 'Ireland', flag: '🇮🇪' },
  { code: 'PL', name: 'Πολωνία', nameEn: 'Poland', flag: '🇵🇱' },
  { code: 'CZ', name: 'Τσεχία', nameEn: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HU', name: 'Ουγγαρία', nameEn: 'Hungary', flag: '🇭🇺' },
  { code: 'RO', name: 'Ρουμανία', nameEn: 'Romania', flag: '🇷🇴' },
  { code: 'BG', name: 'Βουλγαρία', nameEn: 'Bulgaria', flag: '🇧🇬' },
  { code: 'HR', name: 'Κροατία', nameEn: 'Croatia', flag: '🇭🇷' },
  { code: 'SI', name: 'Σλοβενία', nameEn: 'Slovenia', flag: '🇸🇮' },
  { code: 'SK', name: 'Σλοβακία', nameEn: 'Slovakia', flag: '🇸🇰' },
  { code: 'EE', name: 'Εσθονία', nameEn: 'Estonia', flag: '🇪🇪' },
  { code: 'LV', name: 'Λετονία', nameEn: 'Latvia', flag: '🇱🇻' },
  { code: 'LT', name: 'Λιθουανία', nameEn: 'Lithuania', flag: '🇱🇹' },
  { code: 'MT', name: 'Μάλτα', nameEn: 'Malta', flag: '🇲🇹' },
  { code: 'LU', name: 'Λουξεμβούργο', nameEn: 'Luxembourg', flag: '🇱🇺' },
  { code: 'AU', name: 'Αυστραλία', nameEn: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Καναδάς', nameEn: 'Canada', flag: '🇨🇦' },
  { code: 'NZ', name: 'Νέα Ζηλανδία', nameEn: 'New Zealand', flag: '🇳🇿' },
  { code: 'ZA', name: 'Νότια Αφρική', nameEn: 'South Africa', flag: '🇿🇦' },
  { code: 'BR', name: 'Βραζιλία', nameEn: 'Brazil', flag: '🇧🇷' },
  { code: 'AR', name: 'Αργεντινή', nameEn: 'Argentina', flag: '🇦🇷' },
  { code: 'MX', name: 'Μεξικό', nameEn: 'Mexico', flag: '🇲🇽' },
  { code: 'JP', name: 'Ιαπωνία', nameEn: 'Japan', flag: '🇯🇵' },
  { code: 'CN', name: 'Κίνα', nameEn: 'China', flag: '🇨🇳' },
  { code: 'IN', name: 'Ινδία', nameEn: 'India', flag: '🇮🇳' },
  { code: 'KR', name: 'Νότια Κορέα', nameEn: 'South Korea', flag: '🇰🇷' },
  { code: 'SG', name: 'Σιγκαπούρη', nameEn: 'Singapore', flag: '🇸🇬' },
  { code: 'AE', name: 'Ηνωμένα Αραβικά Εμιράτα', nameEn: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', name: 'Σαουδική Αραβία', nameEn: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'IL', name: 'Ισραήλ', nameEn: 'Israel', flag: '🇮🇱' },
  { code: 'TR', name: 'Τουρκία', nameEn: 'Turkey', flag: '🇹🇷' },
  { code: 'RU', name: 'Ρωσία', nameEn: 'Russia', flag: '🇷🇺' },
  { code: 'UA', name: 'Ουκρανία', nameEn: 'Ukraine', flag: '🇺🇦' },
  { code: 'EG', name: 'Αίγυπτος', nameEn: 'Egypt', flag: '🇪🇬' },
  { code: 'MA', name: 'Μαρόκο', nameEn: 'Morocco', flag: '🇲🇦' },
  { code: 'TN', name: 'Τυνησία', nameEn: 'Tunisia', flag: '🇹🇳' },
  { code: 'AL', name: 'Αλβανία', nameEn: 'Albania', flag: '🇦🇱' },
  { code: 'RS', name: 'Σερβία', nameEn: 'Serbia', flag: '🇷🇸' },
  { code: 'BA', name: 'Βοσνία και Ερζεγοβίνη', nameEn: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { code: 'MK', name: 'Βόρεια Μακεδονία', nameEn: 'North Macedonia', flag: '🇲🇰' },
  { code: 'ME', name: 'Μαυροβούνιο', nameEn: 'Montenegro', flag: '🇲🇪' },
  { code: 'XK', name: 'Κοσσυφοπέδιο', nameEn: 'Kosovo', flag: '🇽🇰' },
].sort((a, b) => a.name.localeCompare(b.name, 'el')); // Sort alphabetically by Greek name

/**
 * Get country by code
 */
export function getCountryByCode(code: string): Country | undefined {
  return countries.find(c => c.code === code);
}

/**
 * Get country by name (Greek or English)
 */
export function getCountryByName(name: string): Country | undefined {
  return countries.find(c => c.name === name || c.nameEn === name);
}
