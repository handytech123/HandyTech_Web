import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { createCsrfHeaders } from "./csrf";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
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

  // Add CSRF token for non-GET requests
  let headers = baseHeaders;
  if (method !== "GET") {
    try {
      headers = await createCsrfHeaders(baseHeaders);
    } catch (error) {
      console.error("Failed to get CSRF token:", error);
      // Continue with request without CSRF token - let server handle the error
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // Always include cookies for session-based auth
  });

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
