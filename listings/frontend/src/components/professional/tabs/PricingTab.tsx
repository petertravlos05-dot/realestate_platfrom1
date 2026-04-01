'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FaSpinner, FaCheckCircle } from 'react-icons/fa';
import { Camera, Globe, Linkedin, Star, UserCircle, CalendarDays, Clock3 } from 'lucide-react';
import { createOrUpdateProfessionalProfile } from '@/lib/api/professionalsOnboarding';
import { toast } from 'react-hot-toast';

interface PricingTabProps {
  initialPricing: {
    hourlyRate: string;
    consultationFee: string;
    onlineFee: string;
    inPersonFee: string;
  };
  profile: any;
  role?: string | null;
  loading?: boolean;
  focusSection?: string | null;
  onUpdate: () => void;
}

interface PricingState {
  hourlyRate: string;
  consultationFee: string;
  onlineFee: string;
  inPersonFee: string;
  titleCheckFrom: string;
  contractRepresentationFrom: string;
  htkFrom: string;
  peaFrom: string;
  siteInspectionFee: string;
  arbitrarySettlementEstimate: string;
  notaryContractPercent: string;
  notaryDraftingFixedFee: string;
  pricingPolicyDetails: string;
}

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

type WeekSchedule = Record<number, DaySchedule>;

type EditSection = 'basic' | 'meetings' | 'pricing' | null;

const DEFAULT_WEEK_SCHEDULE: WeekSchedule = {
  0: { enabled: false, start: '09:00', end: '17:00' }, // Κυριακή
  1: { enabled: true, start: '09:00', end: '17:00' }, // Δευτέρα
  2: { enabled: true, start: '09:00', end: '17:00' }, // Τρίτη
  3: { enabled: true, start: '09:00', end: '17:00' }, // Τετάρτη
  4: { enabled: true, start: '09:00', end: '17:00' }, // Πέμπτη
  5: { enabled: true, start: '09:00', end: '17:00' }, // Παρασκευή
  6: { enabled: false, start: '09:00', end: '17:00' }, // Σάββατο
};

const dayNames: Record<number, string> = {
  0: 'Κυριακή',
  1: 'Δευτέρα',
  2: 'Τρίτη',
  3: 'Τετάρτη',
  4: 'Πέμπτη',
  5: 'Παρασκευή',
  6: 'Σάββατο',
};

function parseWeeklyRulesToSchedule(weeklyRules: any[] | undefined): WeekSchedule {
  if (!weeklyRules || weeklyRules.length === 0) return DEFAULT_WEEK_SCHEDULE;

  const next: WeekSchedule = JSON.parse(JSON.stringify(DEFAULT_WEEK_SCHEDULE));
  weeklyRules.forEach((r) => {
    if (typeof r?.weekday === 'number' && r?.start && r?.end) {
      next[r.weekday] = { enabled: true, start: r.start, end: r.end };
    }
  });
  return next;
}

function buildWeeklyRulesFromSchedule(schedule: WeekSchedule): Array<{ weekday: number; start: string; end: string }> {
  return Object.entries(schedule)
    .map(([weekday, day]) => ({ weekday: Number(weekday), ...day }))
    .filter((d) => d.enabled && !!d.start && !!d.end && d.start < d.end)
    .map((d) => ({ weekday: d.weekday, start: d.start, end: d.end }))
    .sort((a, b) => a.weekday - b.weekday);
}

export default function PricingTab({ initialPricing, profile, role, loading, focusSection, onUpdate }: PricingTabProps) {
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  const [pricing, setPricing] = useState<PricingState>({
    hourlyRate: initialPricing.hourlyRate || '',
    consultationFee: initialPricing.consultationFee || '',
    onlineFee: initialPricing.onlineFee || '',
    inPersonFee: initialPricing.inPersonFee || '',
    titleCheckFrom: '',
    contractRepresentationFrom: '',
    htkFrom: '',
    peaFrom: '',
    siteInspectionFee: '',
    arbitrarySettlementEstimate: '',
    notaryContractPercent: '',
    notaryDraftingFixedFee: '',
    pricingPolicyDetails: '',
  });
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState('');
  const [onlineMeetings, setOnlineMeetings] = useState(true);
  const [inPersonMeetings, setInPersonMeetings] = useState(true);
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(DEFAULT_WEEK_SCHEDULE);
  const [selectedWeekday, setSelectedWeekday] = useState<number>(1);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const meetingsSectionRef = useRef<HTMLDivElement | null>(null);
  const pricingSectionRef = useRef<HTMLDivElement | null>(null);

  const isBasicEditing = editingSection === 'basic';
  const isMeetingsEditing = editingSection === 'meetings';
  const isPricingEditing = editingSection === 'pricing';
  const resolvedRole = (profile?.type || role || '').toUpperCase();

  useEffect(() => {
    const services = (profile?.services || {}) as Record<string, any>;
    const savedPricing = services.pricing || {};
    const savedPublic = services.publicProfile || {};
    const savedAvailability = profile?.availability;

    setPricing({
      hourlyRate: savedPricing.hourlyRate?.toString() || initialPricing.hourlyRate || '',
      consultationFee: savedPricing.consultationFee?.toString() || initialPricing.consultationFee || '',
      onlineFee: savedPricing.onlineFee?.toString() || initialPricing.onlineFee || '',
      inPersonFee: savedPricing.inPersonFee?.toString() || initialPricing.inPersonFee || '',
      titleCheckFrom: savedPricing.titleCheckFrom?.toString() || savedPricing.consultationFee?.toString() || '',
      contractRepresentationFrom: savedPricing.contractRepresentationFrom?.toString() || '',
      htkFrom: savedPricing.htkFrom?.toString() || savedPricing.consultationFee?.toString() || '',
      peaFrom: savedPricing.peaFrom?.toString() || savedPricing.onlineFee?.toString() || '',
      siteInspectionFee: savedPricing.siteInspectionFee?.toString() || savedPricing.inPersonFee?.toString() || '',
      arbitrarySettlementEstimate: savedPricing.arbitrarySettlementEstimate?.toString() || '',
      notaryContractPercent: savedPricing.notaryContractPercent?.toString() || savedPricing.hourlyRate?.toString() || '',
      notaryDraftingFixedFee: savedPricing.notaryDraftingFixedFee?.toString() || savedPricing.consultationFee?.toString() || '',
      pricingPolicyDetails: savedPricing.pricingPolicyDetails?.toString() || '',
    });
    setBio(profile?.bio || '');
    setWebsite(savedPublic.website || '');
    setLinkedin(savedPublic.linkedin || '');
    setAvatarDataUrl(savedPublic.avatarDataUrl || '');
    setOnlineMeetings((savedAvailability?.meetingTypes || []).includes('ONLINE'));
    setInPersonMeetings((savedAvailability?.meetingTypes || []).includes('IN_PERSON'));
    setWeekSchedule(parseWeeklyRulesToSchedule(savedAvailability?.weeklyRules));
  }, [profile, initialPricing]);

  useEffect(() => {
    if (focusSection === 'basic' || focusSection === 'meetings') {
      meetingsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (focusSection === 'pricing') {
      pricingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusSection]);

  const bioCounter = useMemo(() => `${bio.length} / 500`, [bio.length]);

  const getReadonlyLabel = (value: string, fallback = 'Δεν έχει οριστεί') => {
    return value && value.trim().length > 0 ? value : fallback;
  };

  const handleSaveProfile = async () => {
    try {
      setPricingLoading(true);

      const numericPricingEntries: Array<[keyof PricingState, string]> = [
        ['hourlyRate', pricing.hourlyRate],
        ['consultationFee', pricing.consultationFee],
        ['onlineFee', pricing.onlineFee],
        ['inPersonFee', pricing.inPersonFee],
        ['titleCheckFrom', pricing.titleCheckFrom],
        ['contractRepresentationFrom', pricing.contractRepresentationFrom],
        ['htkFrom', pricing.htkFrom],
        ['peaFrom', pricing.peaFrom],
        ['siteInspectionFee', pricing.siteInspectionFee],
        ['arbitrarySettlementEstimate', pricing.arbitrarySettlementEstimate],
        ['notaryContractPercent', pricing.notaryContractPercent],
        ['notaryDraftingFixedFee', pricing.notaryDraftingFixedFee],
      ];

      const pricingPayload: Record<string, number | string> = {};
      numericPricingEntries.forEach(([key, rawValue]) => {
        if (!rawValue) return;
        const parsed = parseFloat(rawValue);
        if (Number.isNaN(parsed) || parsed < 0) {
          throw new Error('Οι τιμές πρέπει να είναι έγκυροι θετικοί αριθμοί.');
        }
        pricingPayload[key] = parsed;
      });
      pricingPayload.pricingPolicyDetails = pricing.pricingPolicyDetails.trim();

      // Keep legacy keys populated for older UI and downstream consumers.
      if (resolvedRole === 'LAWYER') {
        pricingPayload.consultationFee = pricingPayload.consultationFee ?? pricingPayload.titleCheckFrom;
      } else if (resolvedRole === 'ENGINEER') {
        pricingPayload.consultationFee = pricingPayload.consultationFee ?? pricingPayload.htkFrom;
        pricingPayload.onlineFee = pricingPayload.onlineFee ?? pricingPayload.peaFrom;
        pricingPayload.inPersonFee = pricingPayload.inPersonFee ?? pricingPayload.siteInspectionFee;
      } else if (resolvedRole === 'NOTARY') {
        pricingPayload.hourlyRate = pricingPayload.hourlyRate ?? pricingPayload.notaryContractPercent;
        pricingPayload.consultationFee = pricingPayload.consultationFee ?? pricingPayload.notaryDraftingFixedFee;
      }

      const meetingTypes: Array<'ONLINE' | 'IN_PERSON'> = [];
      if (onlineMeetings) meetingTypes.push('ONLINE');
      if (inPersonMeetings) meetingTypes.push('IN_PERSON');

      const nextServices = {
        ...(profile?.services || {}),
        pricing: {
          ...((profile?.services || {}).pricing || {}),
          ...pricingPayload,
        },
        publicProfile: {
          ...((profile?.services || {}).publicProfile || {}),
          website: website.trim(),
          linkedin: linkedin.trim(),
          avatarDataUrl: avatarDataUrl || '',
        },
      };

      const payload: any = {
        type: profile.type || (role as 'LAWYER' | 'NOTARY' | 'ENGINEER'),
        displayName: profile.displayName,
        officeName: profile.officeName || '',
        areaTags: profile.areaTags || [],
        languages: profile.languages || ['Greek'],
        bio: bio.trim(),
        services: nextServices,
        availability: {
          timezone: profile?.availability?.timezone || 'Europe/Athens',
          weeklyRules: buildWeeklyRulesFromSchedule(weekSchedule),
          meetingTypes,
        },
      };

      if (typeof profile?.city === 'string' && profile.city.trim().length > 0) {
        payload.city = profile.city;
      }

      await createOrUpdateProfessionalProfile(payload);

      toast.success('Το δημόσιο προφίλ αποθηκεύτηκε επιτυχώς');
      setEditingSection(null);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Αποτυχία αποθήκευσης προφίλ');
    } finally {
      setPricingLoading(false);
    }
  };

  const handleCancelChanges = () => {
    setEditingSection(null);
    const services = (profile?.services || {}) as Record<string, any>;
    const savedPricing = services.pricing || {};
    const savedPublic = services.publicProfile || {};
    const savedAvailability = profile?.availability;
    setPricing({
      hourlyRate: savedPricing.hourlyRate?.toString() || initialPricing.hourlyRate || '',
      consultationFee: savedPricing.consultationFee?.toString() || initialPricing.consultationFee || '',
      onlineFee: savedPricing.onlineFee?.toString() || initialPricing.onlineFee || '',
      inPersonFee: savedPricing.inPersonFee?.toString() || initialPricing.inPersonFee || '',
      titleCheckFrom: savedPricing.titleCheckFrom?.toString() || savedPricing.consultationFee?.toString() || '',
      contractRepresentationFrom: savedPricing.contractRepresentationFrom?.toString() || '',
      htkFrom: savedPricing.htkFrom?.toString() || savedPricing.consultationFee?.toString() || '',
      peaFrom: savedPricing.peaFrom?.toString() || savedPricing.onlineFee?.toString() || '',
      siteInspectionFee: savedPricing.siteInspectionFee?.toString() || savedPricing.inPersonFee?.toString() || '',
      arbitrarySettlementEstimate: savedPricing.arbitrarySettlementEstimate?.toString() || '',
      notaryContractPercent: savedPricing.notaryContractPercent?.toString() || savedPricing.hourlyRate?.toString() || '',
      notaryDraftingFixedFee: savedPricing.notaryDraftingFixedFee?.toString() || savedPricing.consultationFee?.toString() || '',
      pricingPolicyDetails: savedPricing.pricingPolicyDetails?.toString() || '',
    });
    setBio(profile?.bio || '');
    setWebsite(savedPublic.website || '');
    setLinkedin(savedPublic.linkedin || '');
    setAvatarDataUrl(savedPublic.avatarDataUrl || '');
    setOnlineMeetings((savedAvailability?.meetingTypes || []).includes('ONLINE'));
    setInPersonMeetings((savedAvailability?.meetingTypes || []).includes('IN_PERSON'));
    setWeekSchedule(parseWeeklyRulesToSchedule(savedAvailability?.weeklyRules));
    toast('Οι αλλαγές ακυρώθηκαν');
  };

  const updateDaySchedule = (weekday: number, patch: Partial<DaySchedule>) => {
    setWeekSchedule((prev) => ({
      ...prev,
      [weekday]: { ...prev[weekday], ...patch },
    }));
  };

  const handleAvatarPick = () => {
    if (!isBasicEditing) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Επίλεξε αρχείο εικόνας.');
      return;
    }

    // Keep payload bounded in services JSON
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Η εικόνα πρέπει να είναι έως 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setAvatarDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const renderSectionActions = (section: EditSection) => {
    const isSectionEditing = editingSection === section;

    if (!isSectionEditing) {
      return (
        <button
          type="button"
          onClick={() => setEditingSection(section)}
          className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Επεξεργασία
        </button>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCancelChanges}
          className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Ακύρωση
        </button>
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={pricingLoading}
          className="inline-flex items-center gap-2 text-sm px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pricingLoading ? (
            <>
              <FaSpinner className="animate-spin" />
              Αποθήκευση...
            </>
          ) : (
            <>
              <FaCheckCircle />
              Αποθήκευση
            </>
          )}
        </button>
      </div>
    );
  };

  const setPricingField = (key: keyof PricingState, value: string) => {
    setPricing((prev) => ({ ...prev, [key]: value }));
  };

  const renderPriceInput = ({
    field,
    label,
    addon,
    placeholder,
  }: {
    field: keyof PricingState;
    label: string;
    addon: '€' | '%';
    placeholder?: string;
  }) => (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 mb-1 block">{label}</span>
      <div
        className={`flex items-center border rounded-lg overflow-hidden ${
          isPricingEditing
            ? 'border-slate-300 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500'
            : 'border-slate-200'
        }`}
      >
        <span className="h-11 w-10 bg-slate-100 text-slate-500 grid place-items-center border-r border-slate-300">
          {addon}
        </span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={pricing[field]}
          onChange={(e) => setPricingField(field, e.target.value)}
          readOnly={!isPricingEditing}
          className={`h-11 w-full px-3 outline-none ${
            isPricingEditing ? 'text-slate-900' : 'bg-slate-50 text-slate-700'
          }`}
          placeholder={placeholder || '0.00'}
        />
      </div>
    </label>
  );

  const pricingFieldsByRole: Record<string, Array<{ field: keyof PricingState; label: string; addon: '€' | '%' }>> = {
    LAWYER: [
      { field: 'titleCheckFrom', label: 'Έλεγχος Τίτλων (Ενδεικτική τιμή από)', addon: '€' },
      { field: 'contractRepresentationFrom', label: 'Παράσταση σε Συμβόλαιο (Από)', addon: '€' },
      { field: 'hourlyRate', label: 'Ωριαία / Αρχική Συμβουλευτική', addon: '€' },
    ],
    ENGINEER: [
      { field: 'htkFrom', label: 'Έκδοση Ηλεκτρονικής Ταυτότητας (ΗΤΚ) από', addon: '€' },
      { field: 'peaFrom', label: 'Ενεργειακό Πιστοποιητικό (ΠΕΑ) από', addon: '€' },
      { field: 'siteInspectionFee', label: 'Αυτοψία / Έλεγχος Ακινήτου', addon: '€' },
      { field: 'arbitrarySettlementEstimate', label: 'Τακτοποίηση Αυθαιρέτων (Αρχική εκτίμηση)', addon: '€' },
    ],
    NOTARY: [
      { field: 'notaryContractPercent', label: 'Αναλογική Αμοιβή Συμβολαίου (Ενδεικτικό %)', addon: '%' },
      { field: 'notaryDraftingFixedFee', label: 'Πάγια Έξοδα Σύνταξης (Ενδεικτικά)', addon: '€' },
    ],
  };
  const activePricingFields = pricingFieldsByRole[resolvedRole] || pricingFieldsByRole.LAWYER;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <FaSpinner className="animate-spin text-3xl text-teal-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Card 1: Basic Info & Branding */}
      <div ref={meetingsSectionRef} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-900">Βασικές Πληροφορίες</h2>
          {renderSectionActions('basic')}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative w-24 h-24">
            <div className="w-24 h-24 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center">
              {avatarDataUrl ? (
                <img
                  src={avatarDataUrl}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <UserCircle className="w-12 h-12 text-slate-400" />
              )}
            </div>
            {isBasicEditing && (
              <button
                type="button"
                onClick={handleAvatarPick}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Επαγγελματικό Βιογραφικό / Παρουσίαση
            </label>
            {isBasicEditing ? (
              <>
                <textarea
                  maxLength={500}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full min-h-[120px] px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Περιγράψτε την εμπειρία σας και τις υπηρεσίες σας..."
                />
                <p className="text-xs text-slate-500 mt-1 text-right">{bioCounter}</p>
              </>
            ) : (
              <div className="min-h-[120px] px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-700">
                {getReadonlyLabel(bio, 'Δεν έχει προστεθεί βιογραφικό ακόμα.')}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-2 block">Website</span>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                readOnly={!isBasicEditing}
                className={`w-full h-11 pl-10 pr-3 border rounded-lg ${isBasicEditing
                  ? 'border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                placeholder="https://example.com"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-2 block">LinkedIn Profile</span>
            <div className="relative">
              <Linkedin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                readOnly={!isBasicEditing}
                className={`w-full h-11 pl-10 pr-3 border rounded-lg ${isBasicEditing
                  ? 'border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </label>
        </div>
      </div>

      {/* Card 2: Meetings & Availability */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-900">Τρόπος Επικοινωνίας & Ραντεβού</h2>
          {renderSectionActions('meetings')}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={() => isMeetingsEditing && setOnlineMeetings((v) => !v)}
            className={`text-left p-4 rounded-lg border transition-colors ${onlineMeetings
              ? 'border-teal-300 bg-teal-50 text-teal-800'
              : 'border-slate-200 bg-white text-slate-700'
              } ${isMeetingsEditing ? 'hover:bg-slate-50' : 'cursor-default'}`}
          >
            <p className="font-medium">Online Συναντήσεις (Π.χ. Zoom, Teams)</p>
          </button>
          <button
            type="button"
            onClick={() => isMeetingsEditing && setInPersonMeetings((v) => !v)}
            className={`text-left p-4 rounded-lg border transition-colors ${inPersonMeetings
              ? 'border-teal-300 bg-teal-50 text-teal-800'
              : 'border-slate-200 bg-white text-slate-700'
              } ${isMeetingsEditing ? 'hover:bg-slate-50' : 'cursor-default'}`}
          >
            <p className="font-medium">Δια ζώσης Συναντήσεις (Στο γραφείο μου)</p>
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-900">Προεπιλεγμένο Ωράριο</h3>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
              const day = weekSchedule[weekday];
              const isSelected = selectedWeekday === weekday;
              return (
                <button
                  key={weekday}
                  type="button"
                  onClick={() => setSelectedWeekday(weekday)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900'
                      : day.enabled
                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  {dayNames[weekday]}
                </button>
              );
            })}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-slate-900">{dayNames[selectedWeekday]}</div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={weekSchedule[selectedWeekday].enabled}
                  onChange={(e) => isMeetingsEditing && updateDaySchedule(selectedWeekday, { enabled: e.target.checked })}
                  disabled={!isMeetingsEditing}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-60"
                />
                Ενεργή ημέρα
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-slate-500 mb-1 block">Ώρα έναρξης</span>
                <div className="relative">
                  <Clock3 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="time"
                    value={weekSchedule[selectedWeekday].start}
                    onChange={(e) => updateDaySchedule(selectedWeekday, { start: e.target.value })}
                    readOnly={!isMeetingsEditing || !weekSchedule[selectedWeekday].enabled}
                    className={`h-10 w-full pl-10 pr-3 border rounded-lg ${
                      isMeetingsEditing && weekSchedule[selectedWeekday].enabled
                        ? 'border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 mb-1 block">Ώρα λήξης</span>
                <div className="relative">
                  <Clock3 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="time"
                    value={weekSchedule[selectedWeekday].end}
                    onChange={(e) => updateDaySchedule(selectedWeekday, { end: e.target.value })}
                    readOnly={!isMeetingsEditing || !weekSchedule[selectedWeekday].enabled}
                    className={`h-10 w-full pl-10 pr-3 border rounded-lg ${
                      isMeetingsEditing && weekSchedule[selectedWeekday].enabled
                        ? 'border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  />
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Pricing */}
      <div ref={pricingSectionRef} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Τιμολογιακή Πολιτική</h2>
          {renderSectionActions('pricing')}
        </div>
        <div className="mb-5 p-4 rounded-lg bg-teal-50 border border-teal-100 text-teal-800 text-sm">
          Οι τιμές είναι ενδεικτικές (ή &apos;από&apos;) και βοηθούν τους πελάτες να έχουν μια αρχική εικόνα. Η τελική αμοιβή
          συμφωνείται πάντα κατόπιν συνεννόησης, βάσει των ιδιαιτεροτήτων του ακινήτου.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activePricingFields.map((fieldConfig) => (
            <div key={fieldConfig.field}>{renderPriceInput(fieldConfig)}</div>
          ))}
        </div>

        <label className="block mt-6">
          <span className="text-sm font-medium text-slate-700 mb-1 block">
            Επεξήγηση Τιμολογιακής Πολιτικής (Προαιρετικό)
          </span>
          <textarea
            value={pricing.pricingPolicyDetails}
            onChange={(e) => setPricingField('pricingPolicyDetails', e.target.value)}
            readOnly={!isPricingEditing}
            className={`w-full min-h-[110px] px-4 py-3 border rounded-lg ${
              isPricingEditing
                ? 'border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
            placeholder="π.χ. Η τελική αμοιβή για την τακτοποίηση εξαρτάται από τα τετραγωνικά και τις παραβάσεις... / Η αμοιβή συμβολαίου καθορίζεται βάσει της κρατικής κλίμακας..."
          />
        </label>
      </div>

      {/* Card 4: Reviews */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
          <Star className="w-5 h-5 text-teal-600" />
          Η Φήμη σας στην Πλατφόρμα
        </h2>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/3">
            <p className="text-5xl font-bold text-slate-900 leading-none">4.8</p>
            <div className="flex items-center gap-1 mt-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star key={idx} className="w-5 h-5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-3">Από 12 συνολικές αξιολογήσεις.</p>
          </div>

          <div className="lg:flex-1 space-y-3">
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-sm text-slate-700">"Εξαιρετικός επαγγελματίας, άμεση εξυπηρέτηση και σαφείς οδηγίες."</p>
              <p className="text-xs text-slate-500 mt-2">- Γιώργος Π.</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-sm text-slate-700">"Πολύ οργανωμένος και ξεκάθαρος σε κάθε στάδιο της διαδικασίας."</p>
              <p className="text-xs text-slate-500 mt-2">- Ελένη Μ.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-sm text-slate-500 pb-2">
        Πάτησε «Επεξεργασία» σε όποιο section θέλεις και μετά «Αποθήκευση» στο ίδιο section.
      </div>

      <div className="flex justify-end pb-2">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
        >
          Διαγραφή Προφίλ
        </button>
      </div>
    </div>
  );
}
