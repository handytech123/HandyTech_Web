import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { createCsrfHeaders } from "./csrf";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Handle CSRF-specific errors with better messaging
    if (res.status === 403 && text.includes('CSRF')) {
      throw new Error(`CSRF Error (${res.status}): ${text}`);
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  methodOrOptions?: string | { method?: string; body?: unknown },
  data?: unknown | undefined,
): Promise<Response> {
  let method = "GET";
  let body = data;

  if (typeof methodOrOptions === "string") {
    method = methodOrOptions;
  } else if (methodOrOptions && typeof methodOrOptions === "object") {
    method = methodOrOptions.method || "GET";
    body = methodOrOptions.body;
  }

  // Prepare base headers
  const baseHeaders: Record<string, string> = {};
  if (body) {
    baseHeaders["Content-Type"] = "application/json";
  }

  // Add CSRF token for non-GET requests with retry logic
  let headers = baseHeaders;
  if (method !== "GET") {
    try {
      headers = await createCsrfHeaders(baseHeaders);
    } catch (error) {
      console.error("[API] Failed to get CSRF token:", error);
      // Don't continue without CSRF token for security
      throw new Error(`CSRF token required but not available: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Make the request
  let res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // Always include cookies for session-based auth
  });

  // If we get a CSRF error on a non-GET request, try once more with a fresh token
  if (!res.ok && res.status === 403 && method !== "GET") {
    const errorText = await res.text();
    if (errorText.includes('CSRF')) {
      console.log(`[API] CSRF error detected, retrying ${method} ${url} with fresh token`);
      
      try {
        // Get fresh CSRF token and retry
        headers = await createCsrfHeaders(baseHeaders, false); // Don't retry in createCsrfHeaders since we're doing it here
        
        // Reset the response and retry
        res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          credentials: "include",
        });
        
        console.log(`[API] Retry with fresh CSRF token: ${res.status}`);
      } catch (retryError) {
        console.error("[API] Failed to retry with fresh CSRF token:", retryError);
        // Return the original response to preserve the original error
      }
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
