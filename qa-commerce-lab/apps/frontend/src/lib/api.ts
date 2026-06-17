const API_URL = import.meta.env.VITE_API_URL ?? "";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Unexpected error." }));
    throw new Error(payload.message ?? "Unexpected error.");
  }

  return response.json() as Promise<T>;
}

export { API_URL };
