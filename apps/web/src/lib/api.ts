const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { requireAuth = true, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((customHeaders as Record<string, string>) ?? {}),
  };

  if (requireAuth) {
    const token = localStorage.getItem("accessToken");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    headers,
    ...rest,
  });

  // Handle token refresh
  if (res.status === 401 && requireAuth) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${localStorage.getItem("accessToken")}`;
      const retryRes = await fetch(`${API_URL}${endpoint}`, {
        headers,
        ...rest,
      });
      return retryRes.json();
    }

    // Refresh failed — redirect to login
    localStorage.clear();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message ?? "API request failed");
  }

  return data;
}

async function refreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    localStorage.setItem("accessToken", data.data.accessToken);
    localStorage.setItem("refreshToken", data.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}
