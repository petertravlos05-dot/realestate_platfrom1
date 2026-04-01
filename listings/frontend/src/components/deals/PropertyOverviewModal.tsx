'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FaTimes,
  FaSpinner,
  FaUsers,
  FaUserTie,
  FaHandshake,
  FaChartBar,
  FaFileAlt,
  FaEuroSign,
  FaEye,
  FaExternalLinkAlt,
  FaDownload,
} from 'react-icons/fa';
import { fetchFromBackend } from '@/lib/api/client';
import { downloadDocument } from '@/lib/api/dealDocuments';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface PropertyOverviewModalProps {
  propertyId: string;
  propertyTitle: string;
  fromSeller?: boolean;
  onClose: () => void;
}

interface SellerDocument {
  id: string;
  category: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  dealRoomId: string;
}

interface DealRoomItem {
  id: string;
  status: string;
  buyerName?: string;
  agreedPrice: number | null;
  stage: number;
  stageLabel: string;
}

interface OverviewData {
  property: { id: string; title: string; price: number };
  interestedCount: number;
  agentsPromotedCount: number;
  agentLinkClicksNoInterest: number;
  openDealRoomsCount: number;
  dealRooms: DealRoomItem[];
  sellerDocuments?: SellerDocument[];
  views: number;
  hasDepositPaidDealRoom: boolean;
  propertySold?: boolean;
  completedDealRoom?: DealRoomItem | null;
  otherDealRooms?: DealRoomItem[];
}

type TabId = 'summary' | 'deals' | 'interest' | 'documents';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'summary', label: 'Σύνοψη', icon: FaChartBar },
  { id: 'deals', label: 'Deal Rooms', icon: FaHandshake },
  { id: 'documents', label: 'Εγγραφα', icon: FaFileAlt },
  { id: 'interest', label: 'Ενδιαφέρον & Agents', icon: FaUsers },
];

function PriceChart({
  initialPrice,
  soldPrice,
  otherAgreedPrices,
}: {
  initialPrice: number;
  soldPrice?: number | null;
  otherAgreedPrices?: number[];
}) {
  const others = otherAgreedPrices ?? [];
  const allPrices = [initialPrice, ...(soldPrice != null ? [soldPrice] : []), ...others];
  const scaleMin = Math.min(...allPrices) * 0.9;
  const scaleMax = Math.max(...allPrices) * 1.1 || initialPrice * 1.1;
  const range = scaleMax - scaleMin || 1;

  const toPercent = (val: number) => Math.min(100, Math.max(0, ((val - scaleMin) / range) * 100));

  const barItems: { label: string; value: number; color: string }[] = [
    { label: 'Αρχική τιμή', value: initialPrice, color: 'bg-red-500' },
    ...(soldPrice != null ? [{ label: 'Τιμή πουλήθηκε', value: soldPrice, color: 'bg-teal-600' }] : []),
    ...others.map((p, i) => ({
      label: `Συμφωνημένη (δεν ολοκληρώθηκε) ${others.length > 1 ? i + 1 : ''}`.trim(),
      value: p,
      color: 'bg-amber-500',
    })),
  ];

  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FaEuroSign className="text-teal-600" />
        Γράφημα τιμών
      </h3>
      <div className="space-y-3">
        {barItems.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-600 w-24 shrink-0">{item.label}</span>
            <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${item.color} transition-all duration-500`}
                style={{ width: `${Math.min(toPercent(item.value), 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-gray-900 w-20 text-right shrink-0">
              {item.value.toLocaleString('el-GR')} €
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" /> Αρχική
        </span>
        {soldPrice != null && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-600" /> Πουλήθηκε
          </span>
        )}
        {others.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" /> Συμφωνημένες (δεν ολοκληρώθηκαν)
          </span>
        )}
      </div>
    </div>
  );
}

export default function PropertyOverviewModal({
  propertyId,
  propertyTitle,
  fromSeller = true,
  onClose,
}: PropertyOverviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [otherDealsExpanded, setOtherDealsExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetchFromBackend(`/seller/properties/${propertyId}/overview`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Σφάλμα φόρτωσης');
        }
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : 'Σφάλμα φόρτωσης επισκόπησης');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [propertyId, onClose]);

  const accent = fromSeller ? 'green' : 'blue';
  const accentClasses = fromSeller
    ? 'from-green-600 to-emerald-700 bg-green-600 hover:bg-green-700'
    : 'from-blue-600 to-indigo-700 bg-blue-600 hover:bg-blue-700';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className={`px-6 py-4 bg-gradient-to-r ${fromSeller ? 'from-green-600 to-emerald-700' : 'from-blue-600 to-indigo-700'} text-white flex items-center justify-between`}>
          <div>
            <h2 className="text-xl font-bold">Επισκόπηση Ακινήτου</h2>
            <p className="text-white/90 text-sm truncate max-w-md">{propertyTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <FaSpinner className="animate-spin text-4xl text-green-600" />
          </div>
        ) : data ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? fromSeller
                          ? 'border-green-600 text-green-700'
                          : 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="text-base" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'summary' && (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    {data.propertySold && (
                      <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                        <p className="text-teal-800 font-semibold">Το ακίνητο πουλήθηκε</p>
                        {data.completedDealRoom?.buyerName && (
                          <p className="text-sm text-teal-700 mt-1">
                            Αγοραστής: {data.completedDealRoom.buyerName}
                            {data.completedDealRoom.agreedPrice != null && (
                              <> · Τιμή: {data.completedDealRoom.agreedPrice.toLocaleString('el-GR')} €</>
                            )}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <FaUsers className="text-green-600" />
                          <span className="text-sm font-medium">Ενδιαφερόμενοι</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{data.interestedCount}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <FaUserTie className="text-green-600" />
                          <span className="text-sm font-medium">Agents προώθησαν</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{data.agentsPromotedCount}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <FaEye className="text-green-600" />
                          <span className="text-sm font-medium">Προβολές</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{data.views}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <FaHandshake className="text-green-600" />
                          <span className="text-sm font-medium">Ανοιχτά Deal Rooms</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{data.openDealRoomsCount}</p>
                      </div>
                    </div>

                    {/* Γράφημα τιμών */}
                    <PriceChart
                      initialPrice={data.property.price}
                      soldPrice={data.completedDealRoom?.agreedPrice ?? null}
                      otherAgreedPrices={(data.otherDealRooms ?? data.dealRooms ?? [])
                        .map((dr) => dr.agreedPrice)
                        .filter((p): p is number => p != null)}
                    />
                    {data.agentLinkClicksNoInterest > 0 && (
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <p className="text-sm text-amber-800">
                          <strong>{data.agentLinkClicksNoInterest}</strong> χρήστες πάτησαν link agent αλλά δεν εξέφρασαν ενδιαφέρον
                        </p>
                      </div>
                    )}
                    {data.hasDepositPaidDealRoom && (
                      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                        <p className="text-sm text-green-800 font-medium">
                          ✓ Ένα deal room έχει πληρωμένη προκαταβολή – το ακίνητο είναι κλειδωμένο
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'deals' && (
                  <motion.div
                    key="deals"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    {data.propertySold && data.completedDealRoom && (
                      <div className="p-4 rounded-xl border-2 border-teal-200 bg-teal-50/50">
                        <p className="text-sm font-medium text-teal-800 mb-1">Πουλήθηκε σε</p>
                        <Link
                          href={`/deals/${data.completedDealRoom.id}${fromSeller ? '?from=seller' : ''}`}
                          className="block p-3 rounded-lg border border-teal-200 bg-white hover:border-teal-300 hover:bg-teal-50/50 transition-all"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900">{data.completedDealRoom.buyerName || 'Αγοραστής'}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-700">
                              Ολοκληρώθηκε
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            {data.completedDealRoom.agreedPrice != null ? (
                              <span className="font-semibold text-green-700">
                                Τιμή: {data.completedDealRoom.agreedPrice.toLocaleString('el-GR')} €
                              </span>
                            ) : null}
                            <FaExternalLinkAlt className="text-gray-400 text-xs" />
                          </div>
                        </Link>
                      </div>
                    )}
                    {(() => {
                      const others = data.otherDealRooms ?? data.dealRooms;
                      const hasOthers = others.length > 0;
                      const maxShow = 5;
                      const toShow = otherDealsExpanded ? others.slice(0, maxShow) : [];
                      const hasMoreThan5 = others.length > maxShow;
                      if (!hasOthers && !data.propertySold) {
                        return <p className="text-gray-500 text-center py-8">Δεν υπάρχουν deal rooms</p>;
                      }
                      if (!hasOthers) return null;
                      return (
                        <div className="space-y-3">
                          <button
                            onClick={() => setOtherDealsExpanded(!otherDealsExpanded)}
                            className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-gray-50 transition-all flex items-center justify-between"
                          >
                            <span className="font-medium text-gray-700">
                              {otherDealsExpanded ? 'Απόκρυψη' : 'Προβολή άλλων'} deal rooms ({others.length})
                            </span>
                            <span className="text-gray-500 text-sm">
                              {otherDealsExpanded ? '▲' : '▼'}
                            </span>
                          </button>
                          {otherDealsExpanded && (
                            <div className="space-y-2">
                              {toShow.map((dr) => (
                                <Link
                                  key={dr.id}
                                  href={`/deals/${dr.id}${fromSeller ? '?from=seller' : ''}`}
                                  className="block p-4 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50/50 transition-all"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-900">{dr.buyerName || 'Αγοραστής'}</span>
                                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                      {dr.stageLabel}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    {dr.agreedPrice != null ? (
                                      <span className="font-semibold text-green-700">
                                        Συμφωνημένη τιμή: {dr.agreedPrice.toLocaleString('el-GR')} €
                                      </span>
                                    ) : (
                                      <span className="text-gray-500">Δεν έχει συμφωνηθεί τιμή ακόμα</span>
                                    )}
                                    <FaExternalLinkAlt className="text-gray-400 text-xs" />
                                  </div>
                                </Link>
                              ))}
                              {hasMoreThan5 && (
                                <Link
                                  href={`/deals?from=seller&tab=deals`}
                                  className="block p-4 rounded-xl border border-dashed border-green-300 bg-green-50/30 hover:bg-green-50 transition-all text-center text-green-700 font-medium"
                                >
                                  Δείτε όλες τις συναλλαγές στο tab Συναλλαγές →
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </motion.div>
                )}

                {activeTab === 'documents' && (
                  <motion.div
                    key="documents"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <p className="text-sm text-gray-600 mb-4">
                      Έγγραφα που έχετε ανεβάσει σε deal rooms αυτού του ακινήτου. Μπορείτε να τα βρείτε εδώ για γρήγορη πρόσβαση χωρίς να χρειάζεται ξανά ανέβασμα.
                    </p>
                    {(data.sellerDocuments?.length ?? 0) === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                        <FaFileAlt className="mx-auto text-4xl text-gray-300 mb-3" />
                        <p className="text-gray-500">Δεν έχετε ανεβάσει ακόμα έγγραφα σε κανένα deal room</p>
                        <p className="text-sm text-gray-400 mt-1">Τα έγγραφα που ανεβάζετε στο tab «Εγγραφα και ενεργείες» θα εμφανίζονται εδώ</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.sellerDocuments!.map((doc) => {
                          const dealRoom = data.dealRooms.find((dr) => dr.id === doc.dealRoomId);
                          const handleDownload = async () => {
                            setDownloadingDocId(doc.id);
                            try {
                              await downloadDocument(doc.id, doc.fileName ?? undefined);
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Σφάλμα λήψης');
                            } finally {
                              setDownloadingDocId(null);
                            }
                          };
                          return (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50/30 transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${fromSeller ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                  <FaFileAlt className="text-lg" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{doc.category}</p>
                                  <p className="text-sm text-gray-500 truncate">
                                    {doc.fileName ?? 'Ανώνυμο αρχείο'}
                                    {doc.sizeBytes != null && ` · ${(doc.sizeBytes / 1024).toFixed(1)} KB`}
                                  </p>
                                  <Link
                                    href={`/deals/${doc.dealRoomId}${fromSeller ? '?from=seller' : ''}`}
                                    className="text-xs text-green-600 hover:underline mt-0.5 inline-block"
                                  >
                                    {dealRoom ? `Deal με ${dealRoom.buyerName ?? 'αγοραστή'}` : 'Άνοιγμα deal room'} →
                                  </Link>
                                </div>
                              </div>
                              <button
                                onClick={handleDownload}
                                disabled={downloadingDocId === doc.id}
                                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                                  fromSeller
                                    ? 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                                }`}
                              >
                                {downloadingDocId === doc.id ? (
                                  <FaSpinner className="animate-spin" />
                                ) : (
                                  <FaDownload />
                                )}
                                Λήψη
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'interest' && (
                  <motion.div
                    key="interest"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                        <h3 className="font-semibold text-green-900 mb-1">Ενδιαφερόμενοι</h3>
                        <p className="text-2xl font-bold text-green-800">{data.interestedCount}</p>
                        <p className="text-sm text-green-700 mt-1">Αγοραστές που εξέφρασαν ενδιαφέρον</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <h3 className="font-semibold text-blue-900 mb-1">Agents που προώθησαν</h3>
                        <p className="text-2xl font-bold text-blue-800">{data.agentsPromotedCount}</p>
                        <p className="text-sm text-blue-700 mt-1">Μέσω link προώθησης ακινήτου</p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <h3 className="font-semibold text-amber-900 mb-1">Link χωρίς ενδιαφέρον</h3>
                        <p className="text-2xl font-bold text-amber-800">{data.agentLinkClicksNoInterest}</p>
                        <p className="text-sm text-amber-700 mt-1">Πάτησαν link agent αλλά δεν προχώρησαν</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <Link
                href={`/properties/${propertyId}`}
                className={`px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r ${accentClasses} flex items-center gap-2`}
              >
                <FaFileAlt />
                Λεπτομέρειες Ακινήτου
              </Link>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
              >
                Κλείσιμο
              </button>
            </div>
          </>
        ) : null}
      </motion.div>
    </div>
  );
}
