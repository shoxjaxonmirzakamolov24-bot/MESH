/**
 * SkillMesh — Frontend API yordamchisi
 * --------------------------------------------------
 * - JWT tokenni saqlaydi (localStorage) va barcha /api so'rovlariga
 *   Authorization: Bearer <token> sarlavhasini avtomatik qo'shadi.
 * - Telegram WebApp initData ni o'qish uchun yordamchilar beradi.
 *
 * Bu fayl main.tsx da App'dan OLDIN import qilinadi, shunda fetch
 * interceptori ilova ishga tushishidan oldin o'rnatiladi.
 */

const TOKEN_KEY = 'skillmesh_token';

let authToken: string | null = null;
try {
  authToken = localStorage.getItem(TOKEN_KEY);
} catch {
  authToken = null;
}

export function setAuthToken(token: string | null): void {
  authToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* localStorage mavjud bo'lmasa e'tiborsiz qoldiramiz */
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

/** Telegram WebApp obyektini qaytaradi (mavjud bo'lsa). */
export function getTelegramWebApp(): any | null {
  const tg = (window as any)?.Telegram?.WebApp;
  return tg || null;
}

/** Telegram tomonidan imzolangan initData (query-string) ni qaytaradi. */
export function getTelegramInitData(): string | null {
  const tg = getTelegramWebApp();
  const data = tg?.initData;
  return data && typeof data === 'string' && data.length > 0 ? data : null;
}

// --- Global fetch interceptor ---
// /api so'rovlariga avtomatik Authorization sarlavhasini qo'shadi.
const originalFetch = window.fetch.bind(window);

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  try {
    return (input as Request).url || '';
  } catch {
    return '';
  }
}

window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = resolveUrl(input);
  const isApi = url.startsWith('/api') || url.includes('/api/');

  if (isApi && authToken) {
    const headers = new Headers(
      init?.headers || (typeof input !== 'string' && !(input instanceof URL) ? (input as Request).headers : undefined)
    );
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${authToken}`);
    }
    return originalFetch(input, { ...(init || {}), headers });
  }

  return originalFetch(input, init);
};
