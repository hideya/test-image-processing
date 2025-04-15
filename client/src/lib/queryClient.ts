import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Token storage helpers
const TOKEN_KEY = 'auth_token';

export function setAuthToken(token: string) {
  console.log("*** Setting auth token in localStorage", token ? `(length: ${token.length})` : "(empty)");
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  console.log("*** Getting auth token from localStorage", token ? `(length: ${token.length})` : "(not found)");
  return token;
}

export function clearAuthToken() {
  console.log("*** Clearing auth token from localStorage");
  localStorage.removeItem(TOKEN_KEY);
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const data = await res.json();
      console.log('*** API Error response:', data);
      throw new Error(data.message || `${res.status}: ${res.statusText}`);
    } catch (e) {
      if (e instanceof Error && e.message) {
        console.log('*** Error from API:', e.message);
        throw e;
      }
      const text = await res.text() || res.statusText;
      console.log(`*** API Error (${res.status}):`, text);
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`*** API Request: ${method} ${url}`);
  const headers: Record<string, string> = {};
  
  // Add content-type for requests with data
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add auth token if available
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('*** Adding Authorization header with Bearer token');
  } else {
    console.log('*** No token available for request');
  }

  console.log(`*** Sending ${method} request to ${url}`);
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Keep this for local dev with cookies
  });

  console.log(`*** Response received: ${res.status} ${res.statusText}`);
  await throwIfResNotOk(res);
  console.log(`*** Response validation passed, returning response`);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add auth token if available
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
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
