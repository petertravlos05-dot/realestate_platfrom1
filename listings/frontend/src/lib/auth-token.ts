/**
 * Gets or creates JWT token for backend API calls
 * If token exists in localStorage, returns it
 * Otherwise, fetches token from NextAuth session via API
 */
export async function getAuthToken(): Promise<string | null> {
  // Check if token exists in localStorage
  if (typeof window !== 'undefined') {
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      return existingToken;
    }
  }

  // If no token in localStorage, fetch from API
  try {
    const response = await fetch('/api/auth/token');
    if (!response.ok) {
      return null;
    }
    
    const { token } = await response.json();
    
    // Store in localStorage for future use
    if (typeof window !== 'undefined' && token) {
      localStorage.setItem('token', token);
    }
    
    return token;
  } catch (error) {
    console.error('Error fetching token:', error);
    return null;
  }
}

