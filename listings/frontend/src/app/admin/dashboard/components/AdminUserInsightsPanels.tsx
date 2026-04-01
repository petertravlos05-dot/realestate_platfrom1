'use client';

import React from 'react';
import { FaUniversity } from 'react-icons/fa';

export type AdminUserInsights = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    roleUpper: string;
    phone: string | null;
    payoutIban: string | null;
    createdAt: string;
    userType?: string | null;
    country?: string | null;
    taxId?: string | null;
    companyName?: string | null;
    companyTitle?: string | null;
    companyTaxId?: string | null;
    companyDou?: string | null;
    companyPhone?: string | null;
    companyEmail?: string | null;
    companyHeadquarters?: string | null;
    companyWebsite?: string | null;
    companyWorkingHours?: string | null;
    contactPersonName?: string | null;
    contactPersonEmail?: string | null;
    contactPersonPhone?: string | null;
    licenseNumber?: string | null;
    businessAddress?: string | null;
    companyLogoPresent?: boolean;
  };
  buyer: {
    propertyLeadsTotal: number;
    distinctPropertiesWithLeads: number;
    favoritesCount: number;
    inquiriesCount: number;
    distinctPropertiesViewed: number;
    agentConnectionsTotal: number;
    agentConnectionsConfirmed: number;
    agentConnectionsList: Array<{
      id: string;
      status: string;
      createdAt: string;
      property: { id: string; title: string } | null;
      agent: { id: string; name: string } | null;
    }>;
    leadsList: Array<{
      id: string;
      status: string;
      interestCancelled: boolean;
      createdAt: string;
      property: {
        id: string;
        title: string;
        city: string;
        propertyType: string;
        listingType: string;
      } | null;
      agent: { id: string; name: string; email: string } | null;
    }>;
    transactionsList: Array<{
      id: string;
      bucket: string;
      stage: string | null;
      interestCancelled: boolean;
      status: string;
      createdAt: string;
      property: { id: string; title: string } | null;
      agent: { id: string; name: string } | null;
    }>;
    transactionCounts: { open: number; cancelled: number; pending: number; completed: number };
    inferredSearchProfile: {
      propertyTypeCounts: Record<string, number>;
      rentVsSaleFromInterestedProperties: { rent: number; sale: number; unknown: number };
      note: string;
    };
  };
  seller: {
    propertiesTotal: number;
    soldAsSaleCount: number;
    soldOrRentedAsRentCount: number;
    removedOrRemovalRequestedCount: number;
    properties: Array<{
      id: string;
      title: string;
      status: string;
      isSold: boolean;
      removalRequested: boolean;
      listingType: string;
      createdAt: string;
    }>;
  };
  agent: {
    referralRegistrationsCount: number;
    referralRegistrationsSuccessNote: string;
    buyerAgentConnectionsTotal: number;
    buyerAgentConnectionsConfirmed: number;
    buyerAgentConnectionSuccessPercent: number | null;
    propertyLeadsAsAgentCount: number;
    leadsAsAgentSample: Array<{
      id: string;
      status: string;
      createdAt: string;
      property: { id: string; title: string } | null;
      buyer: { id: string; name: string } | null;
    }>;
    transactionsAsAgentList: Array<{
      id: string;
      bucket: string;
      stage: string | null;
      interestCancelled: boolean;
      createdAt: string;
      property: { id: string; title: string } | null;
      buyer: { id: string; name: string } | null;
    }>;
    transactionCounts: { open: number; cancelled: number; pending: number; completed: number };
    completedDealsWhileAgentCount: number;
    referralPointsTotal: number;
    referralPointsRecent: Array<{
      id: string;
      points: number;
      reason: string;
      createdAt: string;
      propertyId: string | null;
    }>;
    commissionsNote: string;
    payoutIban: string | null;
  };
};

const bucketLabel: Record<string, string> = {
  open: 'Ενεργή',
  cancelled: 'Ακυρωμένη',
  pending: 'Σε αναμονή',
  completed: 'Ολοκληρωμένη',
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  const v = value != null && String(value).trim() !== '' ? String(value) : '—';
  return (
    <div>
      <span className="block text-xs font-medium text-gray-500">{label}</span>
      <p className="text-sm text-gray-900 break-words mt-0.5">{v}</p>
    </div>
  );
}

function AccountAndCompanySections({ user }: { user: AdminUserInsights['user'] }) {
  const showCompanyBlock =
    user.userType === 'COMPANY' ||
    !!(user.companyName && String(user.companyName).trim()) ||
    !!(user.companyTaxId && String(user.companyTaxId).trim());

  return (
    <div className="space-y-6 border-b border-gray-200 pb-6 mb-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2 mb-3">Στοιχεία λογαριασμού</h3>
        <p className="text-xs text-gray-500 mb-3">
          Ίδια πληροφορία με το tab «Χρήστες»: στοιχεία που συνδέονται με το λογαριασμό σύνδεσης.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Field label="Όνομα (εμφανιζόμενο)" value={user.name} />
          <Field label="Email λογαριασμού (σύνδεση)" value={user.email} />
          <Field label="Ρόλος" value={user.role} />
          <Field label="Τηλέφωνο λογαριασμού" value={user.phone} />
          <Field label="Τύπος εγγραφής (userType)" value={user.userType} />
          <Field label="Χώρα" value={user.country} />
          <Field label="ΑΦΜ (προσωπικό)" value={user.taxId} />
          <Field label="Αριθμός άδειας (μεσίτη)" value={user.licenseNumber} />
          <Field label="Επαγγελματική διεύθυνση" value={user.businessAddress} />
          <Field label="IBAN εκταμίευσης" value={user.payoutIban} />
          <Field
            label="Ημερομηνία εγγραφής"
            value={new Date(user.createdAt).toLocaleString('el-GR', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          />
          <Field label="ID χρήστη" value={user.id} />
        </div>
      </div>

      {showCompanyBlock && (
        <div className="bg-slate-50/80 rounded-lg p-4 border border-slate-100">
          <h3 className="text-lg font-medium text-gray-900 border-b border-slate-200 pb-2 mb-3">
            Στοιχεία εταιρείας (όπως στη φόρμα εγγραφής)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Field label="Όνομα εταιρείας" value={user.companyName} />
            <Field label="Διακριτικός τίτλος" value={user.companyTitle} />
            <Field label="ΑΦΜ εταιρείας" value={user.companyTaxId} />
            <Field label="ΔΟΥ εταιρείας" value={user.companyDou} />
            <Field label="Τηλέφωνο εταιρείας" value={user.companyPhone} />
            <Field label="Email εταιρείας" value={user.companyEmail} />
            <Field label="Έδρα" value={user.companyHeadquarters} />
            <Field label="Website" value={user.companyWebsite} />
            <Field label="Ωράριο λειτουργίας" value={user.companyWorkingHours} />
            <Field
              label="Λογότυπο"
              value={user.companyLogoPresent ? 'Ναι (αρχείο έχει ανέβει)' : undefined}
            />
          </div>
          <h4 className="text-md font-semibold text-gray-800 mt-4 mb-2">Υπεύθυνος επικοινωνίας</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Field label="Ονοματεπώνυμο" value={user.contactPersonName} />
            <Field label="Email υπευθύνου" value={user.contactPersonEmail} />
            <Field label="Τηλέφωνο υπευθύνου" value={user.contactPersonPhone} />
          </div>
        </div>
      )}
    </div>
  );
}

type ReferralStats = {
  totalPoints?: number;
  referrerPoints?: number;
  referrals?: unknown[];
  points?: unknown[];
} | null;

interface PanelsProps {
  insights: AdminUserInsights | null;
  loading: boolean;
  referralStats: ReferralStats;
  /** false = μόνο buyer/seller/agent (legacy)· true = πλήρη στοιχεία λογαριασμού + εταιρεία */
  showAccountAndCompanySections?: boolean;
  /** true = μόνο ενότητα «Πωλητής» (για modal εταιρείας στο admin) */
  showOnlySellerActivity?: boolean;
}

export default function AdminUserInsightsPanels({
  insights,
  loading,
  referralStats,
  showAccountAndCompanySections = true,
  showOnlySellerActivity = false,
}: PanelsProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!insights) {
    return <p className="text-gray-600">Δεν φορτώθηκαν δεδομένα.</p>;
  }

  return (
    <div className="space-y-6">
      {showAccountAndCompanySections && <AccountAndCompanySections user={insights.user} />}

      {!showOnlySellerActivity && (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Προβολή ως αγοραστής</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Stat label="Ενδιαφέροντα (leads)" value={insights.buyer.propertyLeadsTotal} />
          <Stat label="Διακριτά ακίνητα (leads)" value={insights.buyer.distinctPropertiesWithLeads} />
          <Stat label="Αγαπημένα" value={insights.buyer.favoritesCount} />
          <Stat label="Ερωτήσεις (inquiries)" value={insights.buyer.inquiriesCount} />
          <Stat label="Ακίνητα που είδε (μοναδικά)" value={insights.buyer.distinctPropertiesViewed} />
          <Stat label="Συνδέσεις με μεσίτη (σύνολο)" value={insights.buyer.agentConnectionsTotal} />
          <Stat label="Επιβεβαιωμένες συνδέσεις" value={insights.buyer.agentConnectionsConfirmed} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <Stat label="Συναλλαγές ενεργές" value={insights.buyer.transactionCounts.open} />
          <Stat label="Σε αναμονή" value={insights.buyer.transactionCounts.pending} />
          <Stat label="Ακυρωμένες" value={insights.buyer.transactionCounts.cancelled} />
          <Stat label="Ολοκληρωμένες" value={insights.buyer.transactionCounts.completed} />
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="font-medium text-gray-800 mb-2">Τι ψάχνει (από leads & αγαπημένα)</p>
          <p className="text-xs text-gray-600 mb-2">{insights.buyer.inferredSearchProfile.note}</p>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="px-2 py-0.5 bg-white rounded border text-xs">
              Πώληση: {insights.buyer.inferredSearchProfile.rentVsSaleFromInterestedProperties.sale}
            </span>
            <span className="px-2 py-0.5 bg-white rounded border text-xs">
              Ενοικίαση: {insights.buyer.inferredSearchProfile.rentVsSaleFromInterestedProperties.rent}
            </span>
            <span className="px-2 py-0.5 bg-white rounded border text-xs">
              Άγνωστο: {insights.buyer.inferredSearchProfile.rentVsSaleFromInterestedProperties.unknown}
            </span>
          </div>
          <p className="text-xs text-gray-700">
            Τύποι ακινήτων:{' '}
            {Object.entries(insights.buyer.inferredSearchProfile.propertyTypeCounts)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ') || '—'}
          </p>
        </div>

        <ListSection title="Λίστα συναλλαγών" empty="Καμία συναλλαγή.">
          {insights.buyer.transactionsList.map((t) => (
            <li key={t.id} className="text-xs border-b border-gray-100 py-1.5 flex justify-between gap-2">
              <span className="text-gray-700 truncate">{t.property?.title || t.id}</span>
              <span className="shrink-0 text-gray-500">
                {bucketLabel[t.bucket] || t.bucket} {t.stage ? `· ${t.stage}` : ''}
              </span>
            </li>
          ))}
        </ListSection>

        <ListSection title="Συνδέσεις buyer–agent (ανά ακίνητο)" empty="Καμία σύνδεση.">
          {insights.buyer.agentConnectionsList.map((c) => (
            <li key={c.id} className="text-xs border-b border-gray-100 py-1.5">
              <span className="font-medium">{c.property?.title || '—'}</span> — {c.status} — μεσίτης:{' '}
              {c.agent?.name || '—'}
            </li>
          ))}
        </ListSection>

        <ListSection title="Leads / ενδιαφέροντα" empty="Κανένα lead.">
          {insights.buyer.leadsList.map((l) => (
            <li key={l.id} className="text-xs border-b border-gray-100 py-1.5">
              {l.property?.title} ({l.property?.listingType}) — {l.status}
              {l.interestCancelled ? ' · ακυρωμένο' : ''} — μεσίτης: {l.agent?.name || '—'}
            </li>
          ))}
        </ListSection>
      </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Προβολή ως πωλητής</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat label="Σύνολο καταχωρήσεων" value={insights.seller.propertiesTotal} />
          <Stat label="Πωλήσεις (όχι ενοικίαση)" value={insights.seller.soldAsSaleCount} />
          <Stat label="Ενοικιάσεις (ολοκληρωμένες)" value={insights.seller.soldOrRentedAsRentCount} />
          <Stat label="Αφαίρεση / αίτημα αφαίρεσης" value={insights.seller.removedOrRemovalRequestedCount} />
        </div>
        <ListSection title="Ακίνητα" empty="Κανένα ακίνητο.">
          {insights.seller.properties.map((p) => (
            <li key={p.id} className="text-xs border-b border-gray-100 py-1.5">
              <span className="font-medium">{p.title}</span> — {p.status} — {p.listingType}
              {p.isSold ? ' · ολοκληρωμένη' : ''}
              {p.removalRequested ? ' · αίτημα αφαίρεσης' : ''}
            </li>
          ))}
        </ListSection>
      </div>

      {!showOnlySellerActivity && (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Προβολή ως μεσίτης / referral agent</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Stat label="Εγγραφές μέσω referral" value={insights.agent.referralRegistrationsCount} />
          <Stat label="Συνδέσεις buyer–agent (σύνολο)" value={insights.agent.buyerAgentConnectionsTotal} />
          <Stat label="Επιβεβαιωμένες συνδέσεις" value={insights.agent.buyerAgentConnectionsConfirmed} />
          <Stat
            label="% επιτυχίας σύνδεσης"
            value={
              insights.agent.buyerAgentConnectionSuccessPercent != null
                ? `${insights.agent.buyerAgentConnectionSuccessPercent}%`
                : '—'
            }
          />
          <Stat label="Leads ως μεσίτης" value={insights.agent.propertyLeadsAsAgentCount} />
          <Stat label="Ολοκληρωμένες συναλλαγές (ως agent)" value={insights.agent.completedDealsWhileAgentCount} />
        </div>
        <p className="text-xs text-gray-600">{insights.agent.referralRegistrationsSuccessNote}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <Stat label="Συναλλαγές ενεργές" value={insights.agent.transactionCounts.open} />
          <Stat label="Σε αναμονή" value={insights.agent.transactionCounts.pending} />
          <Stat label="Ακυρωμένες" value={insights.agent.transactionCounts.cancelled} />
          <Stat label="Ολοκληρωμένες" value={insights.agent.transactionCounts.completed} />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-amber-900 flex items-center gap-2">
            <FaUniversity /> IBAN εκταμίευσης
          </p>
          {insights.agent.payoutIban ? (
            <p className="mt-2 font-mono text-sm break-all">{insights.agent.payoutIban}</p>
          ) : (
            <p className="mt-2 text-amber-800 text-sm">
              Δεν έχει καταχωρηθεί IBAN. (Κουμπί αιτήματος: θα οριστεί στη συνέχεια.)
            </p>
          )}
        </div>

        <p className="text-xs text-gray-600">{insights.agent.commissionsNote}</p>
        <Stat label="Σύνολο referral points (ενδεικτικά)" value={insights.agent.referralPointsTotal} />

        <ListSection title="Συναλλαγές ως μεσίτης" empty="Καμία.">
          {insights.agent.transactionsAsAgentList.map((t) => (
            <li key={t.id} className="text-xs border-b border-gray-100 py-1.5 flex justify-between gap-2">
              <span className="truncate">{t.property?.title || t.id}</span>
              <span className="shrink-0 text-gray-500">
                {bucketLabel[t.bucket] || t.bucket} {t.stage ? `· ${t.stage}` : ''}
              </span>
            </li>
          ))}
        </ListSection>

        <ListSection title="Πρόσφατα referral points" empty="Κανένα.">
          {insights.agent.referralPointsRecent.map((p) => (
            <li key={p.id} className="text-xs border-b border-gray-100 py-1.5">
              {p.points} πόντοι — {p.reason} — {new Date(p.createdAt).toLocaleDateString('el-GR')}
            </li>
          ))}
        </ListSection>

        <ListSection title="Δείγμα leads ως μεσίτης" empty="Κανένα.">
          {insights.agent.leadsAsAgentSample.map((l) => (
            <li key={l.id} className="text-xs border-b border-gray-100 py-1.5">
              {l.property?.title} — {l.status} — αγοραστής: {l.buyer?.name || '—'}
            </li>
          ))}
        </ListSection>
      </div>
      )}

      {!showOnlySellerActivity && referralStats && (
        <div className="border-t pt-4 text-sm space-y-2">
          <h3 className="font-medium text-gray-900">Referral (γενικά)</h3>
          <p>
            Σύνολο πόντων: <strong>{referralStats.totalPoints ?? 0}</strong> · Ως referrer:{' '}
            <strong>{referralStats.referrerPoints ?? 0}</strong>
          </p>
          <p className="text-xs text-gray-500">
            Εγγραφές/συνδέσεις μέσω referral: {(referralStats.referrals as unknown[] | undefined)?.length ?? 0}{' '}
            εγγραφές στη λίστα API.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function ListSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const n = React.Children.count(children);
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-800 mb-1">{title}</h4>
      {n === 0 ? (
        <p className="text-xs text-gray-500">{empty}</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100 px-2 bg-white">
          {children}
        </ul>
      )}
    </div>
  );
}
