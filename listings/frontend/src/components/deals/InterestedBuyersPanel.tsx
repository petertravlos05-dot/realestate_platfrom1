'use client';

import { useState } from 'react';
import SellerLeadsList, { Lead } from './SellerLeadsList';
import EmptyState from './ui/EmptyState';
import { FaUsers } from 'react-icons/fa';

interface InterestedBuyersPanelProps {
  leads: Lead[];
  selectedPropertyId: string | null;
  properties: Array<{ id: string; title: string }>;
  onLeadClick: (lead: Lead, propertyTitle: string) => void;
  loading?: boolean;
}

export default function InterestedBuyersPanel({
  leads,
  selectedPropertyId,
  properties,
  onLeadClick,
  loading = false,
}: InterestedBuyersPanelProps) {
  const [showAllLeads, setShowAllLeads] = useState(false);

  // Filter leads by selected property
  const filteredLeads = selectedPropertyId && !showAllLeads
    ? leads.filter(lead => lead.property.id === selectedPropertyId)
    : leads;

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Ενδιαφερόμενοι</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!selectedPropertyId && !showAllLeads) {
    return (
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Ενδιαφερόμενοι</h2>
          <button
            onClick={() => setShowAllLeads(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-all"
          >
            Όλοι
          </button>
        </div>
        <EmptyState
          icon={<FaUsers className="text-3xl" />}
          title="Επιλέξτε Ακίνητο"
          description="Επιλέξτε ένα ακίνητο από τη λίστα για να δείτε τους ενδιαφερόμενους."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {showAllLeads ? 'Όλοι οι Ενδιαφερόμενοι' : `Ενδιαφερόμενοι - ${selectedProperty?.title || 'Ακίνητο'}`}
        </h2>
        {selectedPropertyId && (
          <button
            onClick={() => setShowAllLeads(!showAllLeads)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-all"
          >
            {showAllLeads ? 'Από Ακίνητο' : 'Όλοι'}
          </button>
        )}
      </div>
      
      <SellerLeadsList
        leads={filteredLeads}
        onLeadClick={onLeadClick}
        propertyFilter={showAllLeads ? undefined : selectedPropertyId || undefined}
      />
    </div>
  );
}

