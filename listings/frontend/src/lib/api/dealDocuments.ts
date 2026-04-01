/**
 * Deal Documents API Client
 * Handles document requests, uploads, reviews, and downloads
 */

import { fetchFromBackend, uploadToBackend } from './client';

export interface DealDocument {
  id: string;
  dealRoomId: string;
  category: string;
  status: 'REQUESTED' | 'UPLOADED' | 'APPROVED' | 'CHANGES_REQUESTED';
  requestedFromRole?: 'BUYER' | 'SELLER';
  requestedById?: string;
  uploadedById?: string;
  reviewById?: string;
  reviewNote?: string;
  guideWhere?: string; // Where to find the document (for custom documents)
  guideInstructions?: string; // Instructions on how to get the document (for custom documents)
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DownloadUrlResponse {
  url: string;
  expiresAt: string;
}

/**
 * List documents in a deal room (filtered by user's role visibility)
 */
export async function listDocuments(dealId: string): Promise<DealDocument[]> {
  const response = await fetchFromBackend(`/deals/${dealId}/documents`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Access denied. You are not a participant in this deal room.');
    }
    const error = await response.json().catch(() => ({ error: 'Failed to fetch documents' }));
    throw new Error(error.error || 'Failed to fetch documents');
  }

  const data = await response.json();
  // Backend returns { documents: [...] }, so extract the array
  return Array.isArray(data.documents) ? data.documents : (Array.isArray(data) ? data : []);
}

/**
 * Ensure rent documents (Ταυτότητα, Αποδεικτικό ΑΦΜ) exist for a rent deal.
 * Creates them if missing. Call when buyer visits Documents tab for rent.
 */
export async function ensureRentDocuments(dealId: string): Promise<{ created: string[] }> {
  const response = await fetchFromBackend(`/deals/${dealId}/documents/ensure-rent-documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to ensure rent documents' }));
    throw new Error(error.error || 'Failed to ensure rent documents');
  }
  return response.json();
}

/**
 * Request document (lawyer/notary only)
 */
export async function requestDocument(
  dealId: string,
  payload: {
    category: string;
    requestedFromRole: 'BUYER' | 'SELLER';
    note?: string;
    guideWhere?: string; // Where to find the document
    guideInstructions?: string; // Instructions on how to get the document
  }
): Promise<DealDocument> {
  const response = await fetchFromBackend(`/deals/${dealId}/documents/request`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to request document' }));
    throw new Error(error.error || 'Failed to request document');
  }

  return response.json();
}

/**
 * Upload document
 */
export async function uploadDocument(
  dealId: string,
  formData: FormData
): Promise<DealDocument> {
  const response = await uploadToBackend(`/deals/${dealId}/documents/upload`, formData);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to upload document' }));
    throw new Error(error.error || 'Failed to upload document');
  }

  return response.json();
}

/**
 * Review document (lawyer/notary only)
 */
export async function reviewDocument(
  docId: string,
  payload: {
    status: 'APPROVED' | 'CHANGES_REQUESTED';
    note?: string;
  }
): Promise<DealDocument> {
  const response = await fetchFromBackend(`/documents/${docId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to review document' }));
    throw new Error(error.error || 'Failed to review document');
  }

  return response.json();
}

/**
 * Get signed download URL for document
 */
export async function getDownloadUrl(docId: string): Promise<DownloadUrlResponse> {
  const response = await fetchFromBackend(`/documents/${docId}/download-url`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Access denied. You do not have permission to download this document.');
    }
    const error = await response.json().catch(() => ({ error: 'Failed to get download URL' }));
    throw new Error(error.error || 'Failed to get download URL');
  }

  return response.json();
}

/**
 * Download document (helper function)
 */
export async function downloadDocument(docId: string, fileName?: string): Promise<void> {
  const { url } = await getDownloadUrl(docId);
  
  // If URL is our backend's /file endpoint, fetch with credentials to ensure auth works
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  const isOurFileEndpoint = apiBase && url.startsWith(apiBase) && url.includes('/documents/') && url.includes('/file');
  
  if (isOurFileEndpoint && typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to download document');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    return;
  }
  
  // S3 signed URL – direct link works
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'document';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Delete document request (only if REQUESTED and by same professional)
 */
export async function deleteDocument(docId: string): Promise<void> {
  const response = await fetchFromBackend(`/documents/${docId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete document' }));
    throw new Error(error.error || 'Failed to delete document');
  }
}


