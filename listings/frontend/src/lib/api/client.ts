import axios from 'axios';

// Backend API URL - must be set via NEXT_PUBLIC_API_URL environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

// Global handler for ACCOUNT_DELETED errors
let accountDeletedHandler: (() => void) | null = null;

export function setAccountDeletedHandler(handler: () => void) {
  accountDeletedHandler = handler;
}

/** Clear auth-related storage (call on logout to prevent cross-user data) */
export function clearAuthStorage() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
}

async function handleAccountDeletedError() {
  if (typeof window !== 'undefined' && accountDeletedHandler) {
    accountDeletedHandler();
  } else if (typeof window !== 'undefined') {
    // Fallback: redirect to login
    window.location.href = '/login?message=account_deleted';
  }
}

if (!BACKEND_URL) {
  console.error('NEXT_PUBLIC_API_URL is not set! Please configure it in your environment variables.');
}

if (!BACKEND_URL) {
  console.error('NEXT_PUBLIC_API_URL is not set! API calls will fail.');
}

export const apiClient = axios.create({
  baseURL: BACKEND_URL ? `${BACKEND_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with cross-origin requests
});

// Helper function to get CSRF token from cookie
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

async function ensureCsrfToken(): Promise<string | null> {
  const token = getCsrfToken();
  if (token) return token;
  if (typeof window === 'undefined' || !BACKEND_URL) return null;

  try {
    // Trigger a safe backend request so CSRF middleware can set csrf_token cookie.
    await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (error) {
    console.error('Error ensuring CSRF token:', error);
  }

  return getCsrfToken();
}

// Προσθήκη interceptor για το authentication token και CSRF token
apiClient.interceptors.request.use(async (config) => {
  // Add CSRF token to state-changing requests
  const method = config.method?.toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method || '');
  if (isStateChanging && typeof window !== 'undefined') {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  // Prefer cookie-based auth (cookies are sent automatically with withCredentials: true)
  // Fallback to Bearer token for backward compatibility
  // TODO: Remove Bearer token fallback once cookie auth is confirmed working
  const ALLOW_BEARER_TOKENS = true; // Migration flag - set to false once cookies are working

  if (ALLOW_BEARER_TOKENS && typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/auth/token', { cache: 'no-store' });
      if (response.status === 401) {
        localStorage.removeItem('token');
      } else if (response.ok) {
        const { token: newToken } = await response.json();
        if (newToken) {
          localStorage.setItem('token', newToken);
          config.headers.Authorization = `Bearer ${newToken}`;
          return config;
        }
      }
    } catch (error) {
      console.error('Error fetching token:', error);
    }
  }
  
  return config;
});

// Response interceptor για ACCOUNT_DELETED errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 403 && error.response?.data?.error === 'ACCOUNT_DELETED') {
      await handleAccountDeletedError();
    }
    return Promise.reject(error);
  }
);

// Helper function για fetch calls που χρησιμοποιούν το backend
export const fetchFromBackend = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Add CSRF token to state-changing requests
  const method = options.method?.toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method || '');
  
  let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // TODO: Remove Bearer token fallback once cookie auth is confirmed working
  const ALLOW_BEARER_TOKENS = true; // Migration flag
  
  // Πάντα ενημερώνουμε το token από το session για να εξασφαλίσουμε ότι είναι συγχρονισμένο
  if (ALLOW_BEARER_TOKENS && typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/auth/token', { cache: 'no-store' });
      if (response.status === 401) {
        localStorage.removeItem('token');
        token = null;
      } else if (response.ok) {
        const { token: newToken } = await response.json();
        if (newToken) {
          localStorage.setItem('token', newToken);
          token = newToken;
        }
      }
    } catch (error) {
      console.error('Error fetching token:', error);
      token = null;
    }
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Add CSRF token for state-changing requests
  if (isStateChanging && typeof window !== 'undefined') {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  if (ALLOW_BEARER_TOKENS && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!BACKEND_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured. Please set it in your environment variables.');
  }

  // Αν το endpoint ξεκινάει με /api/, το αφαιρούμε γιατί το baseURL ήδη έχει /api
  const cleanEndpoint = endpoint.startsWith('/api/') 
    ? endpoint.replace('/api', '') 
    : endpoint.startsWith('/') 
    ? endpoint 
    : `/${endpoint}`;

  const response = await fetch(`${BACKEND_URL}/api${cleanEndpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Send cookies with cross-origin requests
  });

  // Check for ACCOUNT_DELETED error
  if (response.status === 403) {
    try {
      const errorData = await response.json();
      if (errorData.error === 'ACCOUNT_DELETED') {
        await handleAccountDeletedError();
      }
    } catch (e) {
      // Not JSON or parse error - continue
    }
  }

  return response;
};

// Helper function για FormData uploads
export const uploadToBackend = async (
  endpoint: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<Response> => {
  // Add CSRF token (uploads are POST requests)
  const csrfToken = typeof window !== 'undefined' ? await ensureCsrfToken() : null;
  
  let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // TODO: Remove Bearer token fallback once cookie auth is confirmed working
  const ALLOW_BEARER_TOKENS = true; // Migration flag
  
  // Πάντα ενημερώνουμε το token από το session
  if (ALLOW_BEARER_TOKENS && typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/auth/token', { cache: 'no-store' });
      if (response.status === 401) {
        localStorage.removeItem('token');
        token = null;
      } else if (response.ok) {
        const { token: newToken } = await response.json();
        if (newToken) {
          localStorage.setItem('token', newToken);
          token = newToken;
        }
      }
    } catch (error) {
      console.error('Error fetching token:', error);
      token = null;
    }
  }
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Add CSRF token
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  if (ALLOW_BEARER_TOKENS && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!BACKEND_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured. Please set it in your environment variables.');
  }

  // Αν το endpoint ξεκινάει με /api/, το αφαιρούμε
  const cleanEndpoint = endpoint.startsWith('/api/') 
    ? endpoint.replace('/api', '') 
    : endpoint.startsWith('/') 
    ? endpoint 
    : `/${endpoint}`;

  return fetch(`${BACKEND_URL}/api${cleanEndpoint}`, {
    ...options,
    method: options.method || 'POST',
    headers,
    body: formData,
    credentials: 'include', // Send cookies with cross-origin requests
  });
};

/**
 * Helper function για να μετατρέψουμε fetch('/api/...') calls
 * Χρησιμοποιήστε αυτό αντί για fetch() για όλα τα API calls
 */
export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Αν είναι FormData, χρησιμοποιούμε uploadToBackend
  if (options.body instanceof FormData) {
    return uploadToBackend(endpoint, options.body, options);
  }

  // Αλλιώς χρησιμοποιούμε fetchFromBackend
  return fetchFromBackend(endpoint, options);
}; 