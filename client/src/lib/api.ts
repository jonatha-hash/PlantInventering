export const API_URL = "https://plantinventering-server.onrender.com";

export function api(path: string, options?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
}
