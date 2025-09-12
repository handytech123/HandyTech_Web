// CSRF token management for secure cookie-based authentication
let cachedCsrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

/**
 * Fetches and caches CSRF token from the server
 * @param forceRefresh - If true, bypasses cache and fetches fresh token
 * @returns Promise that resolves to the CSRF token
 */
export async function getCsrfToken(forceRefresh: boolean = false): Promise<string> {
  // If we have a cached token and not forcing refresh, return it
  if (cachedCsrfToken && !forceRefresh) {
    return cachedCsrfToken;
  }

  // If there's already a request in flight, return that promise
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Create new request for CSRF token
  console.log('[CSRF] Fetching new CSRF token', forceRefresh ? '(forced refresh)' : '');
  csrfTokenPromise = fetchCsrfToken();
  
  try {
    const token = await csrfTokenPromise;
    cachedCsrfToken = token;
    return token;
  } catch (error) {
    // Clear the promise so we can retry on next call
    csrfTokenPromise = null;
    // Clear cached token on error
    cachedCsrfToken = null;
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
      cache: 'no-cache', // Always fetch fresh token, don't use browser cache
    });

    if (!response.ok) {
      // Clear cached token on failure so we retry next time
      cachedCsrfToken = null;
      
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication required for CSRF token: ${response.status}`);
      }
      
      throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.csrfToken) {
      throw new Error('CSRF token not found in response');
    }

    console.log('[CSRF] Successfully fetched fresh CSRF token');
    return data.csrfToken;
  } catch (error) {
    console.error('[CSRF] Error fetching CSRF token:', error);
    
    // Clear cached token so we don't use stale tokens
    cachedCsrfToken = null;
    
    // Provide more specific error message
    if (error instanceof Error && error.message.includes('Authentication required')) {
      throw new Error('Session expired. Please sign in again to continue.');
    }
    
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
 * @param retryOnFailure - If true, will retry once with fresh token on failure
 * @returns Promise that resolves to headers object with CSRF token
 */
export async function createCsrfHeaders(
  additionalHeaders: Record<string, string> = {},
  retryOnFailure: boolean = true
): Promise<Record<string, string>> {
  try {
    const csrfToken = await getCsrfToken();
    
    return {
      'x-csrf-token': csrfToken,
      ...additionalHeaders,
    };
  } catch (error) {
    if (retryOnFailure) {
      console.log('[CSRF] Retrying with fresh token after initial failure');
      try {
        // Clear cache and try again with fresh token
        const csrfToken = await getCsrfToken(true);
        
        return {
          'x-csrf-token': csrfToken,
          ...additionalHeaders,
        };
      } catch (retryError) {
        console.error('[CSRF] Failed to get CSRF token even after retry:', retryError);
        throw retryError;
      }
    }
    
    throw error;
  }
}