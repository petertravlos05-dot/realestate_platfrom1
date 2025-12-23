import axios from 'axios';

// Backend API URL - must be set via NEXT_PUBLIC_API_URL environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

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
});

// Προσθήκη interceptor για το authentication token
apiClient.interceptors.request.use(async (config) => {
  // Πάντα ενημερώνουμε το token από το session για να εξασφαλίσουμε ότι είναι συγχρονισμένο
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/auth/token');
      if (response.ok) {
        const { token: newToken } = await response.json();
        if (newToken) {
          localStorage.setItem('token', newToken);
          config.headers.Authorization = `Bearer ${newToken}`;
          return config;
        }
      }
    } catch (error) {
      console.error('Error fetching token:', error);
      // Fallback στο παλιό token αν υπάρχει
      const oldToken = localStorage.getItem('token');
      if (oldToken) {
        config.headers.Authorization = `Bearer ${oldToken}`;
      }
    }
  } else {
    // Server-side: χρησιμοποιούμε το token από localStorage αν υπάρχει
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return config;
});

// Helper function για fetch calls που χρησιμοποιούν το backend
export const fetchFromBackend = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  let token = localStorage.getItem('token');
  
  // Πάντα ενημερώνουμε το token από το session για να εξασφαλίσουμε ότι είναι συγχρονισμένο
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/auth/token');
      if (response.ok) {
        const { token: newToken } = await response.json();
        if (newToken) {
          localStorage.setItem('token', newToken);
          token = newToken;
        }
      }
    } catch (error) {
      console.error('Error fetching token:', error);
      // Fallback στο παλιό token αν υπάρχει
    }
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
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

  return fetch(`${BACKEND_URL}/api${cleanEndpoint}`, {
    ...options,
    headers,
  });
};

// Helper function για FormData uploads
export const uploadToBackend = async (
  endpoint: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<Response> => {
  let token = localStorage.getItem('token');
  
  // Πάντα ενημερώνουμε το token από το session για να εξασφαλίσουμε ότι είναι συγχρονισμένο
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/auth/token');
      if (response.ok) {
        const { token: newToken } = await response.json();
        if (newToken) {
          localStorage.setItem('token', newToken);
          token = newToken;
        }
      }
    } catch (error) {
      console.error('Error fetching token:', error);
      // Fallback στο παλιό token αν υπάρχει
    }
  }
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
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