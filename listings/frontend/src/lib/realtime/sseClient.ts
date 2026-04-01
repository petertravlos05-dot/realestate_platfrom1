/**
 * SSE Client Utility for Real-time Updates
 * Handles Server-Sent Events with automatic reconnection and JWT authentication
 */

export interface SSEEvent {
  type: string;
  at: string;
  dealId?: string;
  threadId?: string;
  docId?: string;
  appointmentId?: string;
  requestId?: string;
  actorUserId?: string;
  summary?: string;
  metadata?: Record<string, any>;
}

export interface SSESnapshot {
  type: 'snapshot';
  dealId?: string;
  professionalUserId?: string;
  counts: {
    unreadMessages?: number;
    pendingDocuments?: number;
    upcomingAppointments?: number;
    pendingProfessionalRequests?: number;
  };
}

export type SSEEventCallback = (event: SSEEvent | SSESnapshot) => void;

export interface SSEClientOptions {
  url: string;
  onEvent: SSEEventCallback;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  lastEventId?: string;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private currentReconnectDelay: number;
  private readonly maxReconnectDelay: number;
  private isManuallyClosed = false;
  private lastEventId: string | undefined;

  constructor(private options: SSEClientOptions) {
    this.currentReconnectDelay = options.reconnectDelay || 1000;
    this.maxReconnectDelay = options.maxReconnectDelay || 30000;
    this.lastEventId = options.lastEventId;
  }

  connect(): void {
    if (this.eventSource) {
      return; // Already connected
    }

    this.isManuallyClosed = false;
    // attemptConnection is async but we don't await it - it will handle errors internally
    this.attemptConnection().catch((error) => {
      console.error('[SSE Client] Connection attempt failed:', error);
      this.options.onError?.(error as any);
    });
  }

  private async attemptConnection(): Promise<void> {
    try {
      // Build URL with lastEventId if available
      let url = this.options.url;
      
      // Get token from localStorage for SSE requests (EventSource doesn't support custom headers)
      // This is a fallback if cookies don't work
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('token');
        
        // Try to get fresh token from session if available
        try {
          const response = await fetch('/api/auth/token');
          if (response.ok) {
            const data = await response.json();
            if (data?.token) {
              localStorage.setItem('token', data.token);
              token = data.token;
            }
          }
        } catch (e) {
          // Ignore errors - use existing token from localStorage
          console.warn('[SSE Client] Failed to fetch fresh token, using cached token:', e);
        }
      }
      
      // Add token as query parameter for SSE (EventSource limitation)
      const queryParams: string[] = [];
      if (this.lastEventId) {
        queryParams.push(`lastEventId=${encodeURIComponent(this.lastEventId)}`);
      }
      if (token) {
        queryParams.push(`token=${encodeURIComponent(token)}`);
      }
      
      if (queryParams.length > 0) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}${queryParams.join('&')}`;
      }

      this.eventSource = new EventSource(url, {
        withCredentials: true, // Include cookies (JWT) - primary auth method
      });

      this.eventSource.onopen = () => {
        this.currentReconnectDelay = this.options.reconnectDelay || 1000; // Reset delay on successful connection
        this.options.onConnect?.();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Store lastEventId for reconnection
          if (event.lastEventId) {
            this.lastEventId = event.lastEventId;
          }

          this.options.onEvent(data);
        } catch (error) {
          console.error('Error parsing SSE event:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.options.onError?.(error);
        
        // Close current connection
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        // Attempt reconnect if not manually closed
        if (!this.isManuallyClosed) {
          this.scheduleReconnect();
        } else {
          this.options.onDisconnect?.();
        }
      };
    } catch (error) {
      console.error('Error creating SSE connection:', error);
      if (!this.isManuallyClosed) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.attemptConnection();
    }, this.currentReconnectDelay);

    // Exponential backoff
    this.currentReconnectDelay = Math.min(
      this.currentReconnectDelay * 2,
      this.maxReconnectDelay
    );
  }

  disconnect(): void {
    this.isManuallyClosed = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.options.onDisconnect?.();
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }
}

/**
 * Helper: Create SSE client for deal events
 */
export function createDealSSEClient(
  dealId: string,
  onEvent: SSEEventCallback,
  options?: Partial<SSEClientOptions>
): SSEClient {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = `${backendUrl}/api/deals/${dealId}/events`;

  return new SSEClient({
    url,
    onEvent,
    ...options,
  });
}

/**
 * Helper: Create SSE client for professional events
 */
export function createProfessionalSSEClient(
  onEvent: SSEEventCallback,
  options?: Partial<SSEClientOptions>
): SSEClient {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = `${backendUrl}/api/professionals/me/events`;

  return new SSEClient({
    url,
    onEvent,
    ...options,
  });
}


