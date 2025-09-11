// CSRF token management for secure cookie-based authentication
let cachedCsrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

/**
 * Fetches and caches CSRF token from the server
 * @returns Promise that resolves to the CSRF token
 */
export async function getCsrfToken(): Promise<string> {
  // If we have a cached token, return it
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  // If there's already a request in flight, return that promise
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Create new request for CSRF token
  csrfTokenPromise = fetchCsrfToken();
  
  try {
    const token = await csrfTokenPromise;
    cachedCsrfToken = token;
    return token;
  } catch (error) {
    // Clear the promise so we can retry on next call
    csrfTokenPromise = null;
    throw error;
  } finally {
    // Clear the promise after completion (success or failure)
    csrfTokenPromise = null;
  }
}

/**
 * Internal function to fetch CSRF token from server
 */
async function fetchCsrfToken(): Promise<string> {
  try {
    const response = await fetch('/api/csrf', {
      method: 'GET',
      credentials: 'include', // Include cookies for session validation
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.csrfToken) {
      throw new Error('CSRF token not found in response');
    }

    return data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw new Error('Unable to retrieve CSRF token for secure requests');
  }
}

/**
 * Clears the cached CSRF token (useful for logout or token expiration)
 */
export function clearCsrfToken(): void {
  cachedCsrfToken = null;
  csrfTokenPromise = null;
}

/**
 * Creates headers object with CSRF token for non-GET requests
 * @param additionalHeaders - Optional additional headers to include
 * @returns Promise that resolves to headers object with CSRF token
 */
export async function createCsrfHeaders(additionalHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const csrfToken = await getCsrfToken();
  
  return {
    'x-csrf-token': csrfToken,
    ...additionalHeaders,
  };
}