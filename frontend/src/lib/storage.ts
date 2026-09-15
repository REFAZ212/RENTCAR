const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '' : 'https://api.udinrentcar.com');

export const storageUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('/')) return path;
  return `${API_BASE_URL}/storage/${path}`;
};