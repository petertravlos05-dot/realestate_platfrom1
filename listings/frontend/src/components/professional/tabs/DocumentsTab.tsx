'use client';

import Link from 'next/link';
import { FaFileAlt, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaDownload, FaEye } from 'react-icons/fa';
import { DealDocument } from '@/lib/api/dealDocuments';
import { DealRoom } from '@/lib/api/deals';
import { getDownloadUrl } from '@/lib/api/dealDocuments';
import { toast } from 'react-hot-toast';

interface DocumentsTabProps {
  documents: DealDocument[];
  deals: DealRoom[];
  loading?: boolean;
  onRefresh?: () => void;
}

export default function DocumentsTab({ documents, deals, loading, onRefresh }: DocumentsTabProps) {
  const reviewNeeded = documents.filter(doc => 
    doc.status === 'UPLOADED' || doc.status === 'CHANGES_REQUESTED'
  );

  const requested = documents.filter(doc => 
    doc.status === 'REQUESTED'
  );

  const handleDownload = async (docId: string, fileName?: string) => {
    try {
      const { url } = await getDownloadUrl(docId);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'document';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      toast.error(err.message || 'Αποτυχία λήψης εγγράφου');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      REQUESTED: 'bg-yellow-100 text-yellow-800',
      UPLOADED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      CHANGES_REQUESTED: 'bg-orange-100 text-orange-800',
    };
    const labels = {
      REQUESTED: 'Αναμονή',
      UPLOADED: 'Προς έλεγχο',
      APPROVED: 'Εγκεκριμένο',
      CHANGES_REQUESTED: 'Αλλαγές απαιτούνται',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getRoleLabel = (role?: string) => {
    const labels: Record<string, string> = {
      BUYER: 'Αγοραστής',
      SELLER: 'Πωλητής',
    };
    return labels[role || ''] || role || 'Άγνωστος';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <FaSpinner className="animate-spin text-3xl text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Review Needed Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Προς Έλεγχο</h2>
            <p className="text-sm text-gray-600 mt-1">
              {reviewNeeded.length} {reviewNeeded.length === 1 ? 'έγγραφο' : 'έγγραφα'} αναμονή ελέγχου
            </p>
          </div>
        </div>

        {reviewNeeded.length === 0 ? (
          <div className="text-center py-12">
            <FaCheckCircle className="text-5xl text-green-300 mx-auto mb-4" />
            <p className="text-gray-600">Δεν υπάρχουν έγγραφα προς έλεγχο</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviewNeeded.map((doc) => {
              const deal = deals.find(d => d.id === doc.dealRoomId);
              return (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <FaFileAlt className="text-purple-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{doc.category}</h3>
                        {getStatusBadge(doc.status)}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-2 mb-4">
                        <p>
                          <span className="font-medium">Deal Room:</span>{' '}
                          {deal?.property?.title || 'Άγνωστο ακίνητο'}
                        </p>
                        {doc.fileName && (
                          <p>
                            <span className="font-medium">Αρχείο:</span> {doc.fileName}
                          </p>
                        )}
                        {doc.reviewNote && (
                          <div className="mt-2 p-3 bg-orange-50 rounded">
                            <p className="text-sm text-orange-800">
                              <FaExclamationTriangle className="inline mr-2" />
                              {doc.reviewNote}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {doc.fileName && (
                        <button
                          onClick={() => handleDownload(doc.id, doc.fileName)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <FaDownload />
                          Λήψη
                        </button>
                      )}
                      <Link
                        href={`/deals/${doc.dealRoomId}?tab=documents`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm text-center"
                      >
                        <FaEye />
                        Προβολή Deal Room
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Requested Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Αναμονή από Πελάτη</h2>
            <p className="text-sm text-gray-600 mt-1">
              {requested.length} {requested.length === 1 ? 'έγγραφο' : 'έγγραφα'} σε αναμονή
            </p>
          </div>
        </div>

        {requested.length === 0 ? (
          <div className="text-center py-12">
            <FaFileAlt className="text-5xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Δεν υπάρχουν έγγραφα σε αναμονή</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requested.map((doc) => {
              const deal = deals.find(d => d.id === doc.dealRoomId);
              return (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <FaFileAlt className="text-yellow-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{doc.category}</h3>
                        {getStatusBadge(doc.status)}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-2">
                        <p>
                          <span className="font-medium">Deal Room:</span>{' '}
                          {deal?.property?.title || 'Άγνωστο ακίνητο'}
                        </p>
                        <p>
                          <span className="font-medium">Αναμένεται από:</span>{' '}
                          {getRoleLabel(doc.requestedFromRole)}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/deals/${doc.dealRoomId}?tab=documents`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Προβολή
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
