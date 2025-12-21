import axios from 'axios';

// Backend API URL - default to localhost:3001 (Express backend)
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Προσθήκη interceptor για το authentication token
apiClient.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('token');
  
  // If no token, try to get it from NextAuth session
  if (!token && typeof window !== 'undefined') {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/211915cc-8ff4-43a8-b097-387c0e673837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:interceptor',message:'No token in localStorage, fetching from NextAuth',data:{url:config.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      const response = await fetch('/api/auth/token');
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/211915cc-8ff4-43a8-b097-387c0e673837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:interceptor',message:'Token fetch response',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (response.ok) {
        const { token: newToken } = await response.json();
        if (newToken) {
          localStorage.setItem('token', newToken);
          token = newToken;
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/211915cc-8ff4-43a8-b097-387c0e673837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:interceptor',message:'Token stored in localStorage',data:{tokenLength:newToken.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
        }
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/211915cc-8ff4-43a8-b097-387c0e673837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:interceptor',message:'Error fetching token',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching token:', error);
    }
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/211915cc-8ff4-43a8-b097-387c0e673837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:interceptor',message:'Token added to headers',data:{url:config.url,hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  } else {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/211915cc-8ff4-43a8-b097-387c0e673837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:interceptor',message:'No token available',data:{url:config.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  }
  return config;
});

// Helper function για fetch calls που χρησιμοποιούν το backend
export const fetchFromBackend = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  let token = localStorage.getItem('token');
  
  // If no token, try to get it from NextAuth session
  if (!token && typeof window !== 'undefined') {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/211915cc-8ff4-43a8-b097-387c0e673837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:fetchFromBackend',message:'No token in localStorage, fetching from NextAuth',data:{endpoint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    try {
      const response = await fetch('/api/auth/token');
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/211915cc-8ff4-43a8-b097-387c0e673837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:fetchFromBackend',message:'Token fetch response',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (response.ok) {
        const { token: newToken } = await response.json();
        if (newToken) {
          localStorage.setItem('token', newToken);
          token = newToken;
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/211915cc-8ff4-43a8-b097-387c0e673837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:fetchFromBackend',message:'Token stored in localStorage',data:{tokenLength:newToken.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        }
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/211915cc-8ff4-43a8-b097-387c0e673837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:fetchFromBackend',message:'Error fetching token',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching token:', error);
    }
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/211915cc-8ff4-43a8-b097-387c0e673837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:fetchFromBackend',message:'Token added to headers',data:{endpoint,hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  } else {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/211915cc-8ff4-43a8-b097-387c0e673837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:fetchFromBackend',message:'No token available',data:{endpoint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
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
  
  // If no token, try to get it from NextAuth session
  if (!token && typeof window !== 'undefined') {
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
    }
  }
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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