const ABSOLUTE_URL = /^(https?:|data:|blob:)/i;

export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (ABSOLUTE_URL.test(url)) return url;
  if (url.startsWith('/uploads/')) {
    const base = import.meta.env.VITE_API_URL || '';
    if (!base) return url;
    return `${base.replace(/\/+$/, '')}${url}`;
  }
  return url;
}