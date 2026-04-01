/**
 * Deal Chat API Client
 * Handles threads and messages
 */

import { fetchFromBackend } from './client';

export interface DealThread {
  id: string;
  dealRoomId: string;
  type: 'GROUP' | 'DIRECT';
  title?: string;
  createdAt: string;
  members?: Array<{
    userId: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  _count?: {
    messages: number;
  };
}

export interface DealMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface MessagesResponse {
  items: DealMessage[];
  nextCursor?: string;
}

/**
 * List threads in a deal room (user must be member)
 */
export async function listThreads(dealId: string): Promise<{ threads: DealThread[] }> {
  const response = await fetchFromBackend(`/deals/${dealId}/threads`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Access denied. You are not a participant in this deal room.');
    }
    const error = await response.json().catch(() => ({ error: 'Failed to fetch threads' }));
    throw new Error(error.error || 'Failed to fetch threads');
  }

  return response.json();
}

/**
 * Create direct thread between two participants
 */
export async function createDirectThread(
  dealId: string,
  otherUserId: string
): Promise<DealThread> {
  const response = await fetchFromBackend(`/deals/${dealId}/threads/direct`, {
    method: 'POST',
    body: JSON.stringify({ otherUserId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create thread' }));
    throw new Error(error.error || 'Failed to create thread');
  }

  return response.json();
}

/**
 * List messages in a thread (user must be member)
 */
export async function listMessages(
  threadId: string,
  params?: {
    cursor?: string;
    limit?: number;
  }
): Promise<MessagesResponse> {
  const queryParams = new URLSearchParams();
  if (params?.cursor) queryParams.append('cursor', params.cursor);
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const queryString = queryParams.toString();
  const url = `/threads/${threadId}/messages${queryString ? `?${queryString}` : ''}`;

  const response = await fetchFromBackend(url);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Access denied. You are not a member of this thread.');
    }
    const error = await response.json().catch(() => ({ error: 'Failed to fetch messages' }));
    throw new Error(error.error || 'Failed to fetch messages');
  }

  return response.json();
}

/**
 * Send message in a thread (user must be member)
 */
export async function sendMessage(
  threadId: string,
  body: string
): Promise<DealMessage> {
  if (!body || body.trim().length === 0) {
    throw new Error('Message body cannot be empty');
  }
  if (body.length > 4000) {
    throw new Error('Message body cannot exceed 4000 characters');
  }

  const response = await fetchFromBackend(`/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body: body.trim() }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Access denied. You are not a member of this thread.');
    }
    const error = await response.json().catch(() => ({ error: 'Failed to send message' }));
    throw new Error(error.error || 'Failed to send message');
  }

  return response.json();
}


