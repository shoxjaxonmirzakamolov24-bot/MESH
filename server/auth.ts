import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

/**
 * SkillMesh — Authentication & Authorization
 * --------------------------------------------------
 * - Telegram Mini App `initData` ni bot token bilan HMAC-SHA256 orqali tekshiradi.
 * - Tekshiruvdan o'tgan foydalanuvchiga server o'z JWT'sini chiqaradi.
 * - requireAuth / requireAdmin Express middleware'lari himoyalangan yo'llar uchun.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Dev rejimida (faqat ALLOW_DEV_AUTH=true bo'lganda) Telegram imzosisiz kirishga ruxsat.
export const ALLOW_DEV_AUTH = process.env.ALLOW_DEV_AUTH === 'true';

// JWT maxfiy kaliti. Productionda majburiy. Dev'da fallback (ogohlantirish bilan).
const JWT_SECRET: string = (() => {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET muhit o\'zgaruvchisi production uchun majburiy (kamida 16 belgi).');
  }
  console.warn('⚠️ JWT_SECRET o\'rnatilmagan — dev uchun vaqtinchalik kalit ishlatilmoqda. Productionda albatta o\'rnating!');
  return 'dev-only-insecure-secret-change-me';
})();

const JWT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 kun

export interface TelegramUserData {
  id: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface AuthClaims {
  id: string; // tizimdagi user id (masalan, tg-12345)
  role: 'user' | 'admin';
}

export interface AuthedRequest extends Request {
  authUser?: AuthClaims;
}

/**
 * Telegram WebApp `initData` (query-string) ni tekshiradi.
 * Hujjat: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Imzo noto'g'ri yoki eskirgan bo'lsa Error tashlaydi.
 */
export function verifyTelegramInitData(initData: string): TelegramUserData {
  if (!BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN sozlanmagan — Telegram autentifikatsiyasini tekshirib bo\'lmaydi.');
  }
  if (!initData || typeof initData !== 'string') {
    throw new Error('initData yetishmayapti.');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) {
    throw new Error('initData ichida hash yo\'q.');
  }
  params.delete('hash');

  // data_check_string: kalit bo'yicha alifbo tartibida "key=value" qatorlari \n bilan
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => [k, v] as [string, string])
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  // Timing-safe taqqoslash
  const a = Buffer.from(computedHash, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Telegram imzosi yaroqsiz (initData buzilgan yoki soxta).');
  }

  // Eskirganlik tekshiruvi (24 soatdan eski bo'lsa rad etamiz)
  const authDate = Number(params.get('auth_date') || '0');
  if (authDate > 0) {
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds > 60 * 60 * 24) {
      throw new Error('initData eskirgan — qaytadan kiring.');
    }
  }

  const userRaw = params.get('user');
  if (!userRaw) {
    throw new Error('initData ichida foydalanuvchi ma\'lumoti yo\'q.');
  }

  let tgUser: TelegramUserData;
  try {
    tgUser = JSON.parse(userRaw);
  } catch {
    throw new Error('initData foydalanuvchi ma\'lumotini o\'qib bo\'lmadi.');
  }
  if (!tgUser || tgUser.id === undefined || tgUser.id === null) {
    throw new Error('initData ichida foydalanuvchi id yo\'q.');
  }
  return tgUser;
}

/** Telegram id berilgan adminlar ro'yxatida bo'lsa 'admin' rolini qaytaradi. */
export function resolveRole(telegramId: string | number): 'user' | 'admin' {
  return ADMIN_TELEGRAM_IDS.includes(String(telegramId)) ? 'admin' : 'user';
}

/** Foydalanuvchi uchun imzolangan JWT chiqaradi. */
export function signToken(claims: AuthClaims): string {
  return jwt.sign({ role: claims.role }, JWT_SECRET, {
    subject: claims.id,
    expiresIn: JWT_TTL_SECONDS,
  });
}

/** JWT'ni tekshiradi va da'volarni qaytaradi (xato bo'lsa throw). */
export function verifyToken(token: string): AuthClaims {
  const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  const id = decoded.sub;
  if (!id || typeof id !== 'string') {
    throw new Error('Token subyekti yaroqsiz.');
  }
  const role = decoded.role === 'admin' ? 'admin' : 'user';
  return { id, role };
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Har qanday tizimga kirgan foydalanuvchini talab qiladi. req.authUser ni o'rnatadi. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi. Iltimos, qaytadan kiring.' });
  }
  try {
    req.authUser = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Sessiya yaroqsiz yoki muddati tugagan. Qaytadan kiring.' });
  }
}

/** Faqat admin rolidagi foydalanuvchini o'tkazadi. requireAuth'dan keyin ishlatiladi. */
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.authUser) {
    return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi.' });
  }
  if (req.authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Ruxsat yo\'q — bu amal faqat administratorlar uchun.' });
  }
  return next();
}
