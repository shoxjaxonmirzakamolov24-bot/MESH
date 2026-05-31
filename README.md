# SkillMesh

**AI yordamida global mahorat almashinuvi tarmog'i** — Telegram Mini App.
Foydalanuvchilar mahoratlarini almashadi, AI mos sheriklarni topadi, kelishuvlar
$MESH kreditlari bilan escrow (kafolat) ostida amalga oshiriladi.

Texnologiyalar: **React 19 + TypeScript + Vite** (frontend), **Express** (backend),
**Supabase** (saqlash), **Google Gemini** (AI), **JWT + Telegram initData** (auth).

---

## Imkoniyatlar

- 🔐 Telegram `initData` imzosini serverda tekshirish + JWT sessiyalar
- 🧠 Gemini asosidagi moslik tahlili va "Uyushma Rahbari" AI yordamchisi
- 💬 Chat, hamjamiyat e'lonlari, taqrizlar va bildirishnomalar
- 🪙 $MESH kreditlari, escrow kelishuvlar, kunlik faucet
- 🛡️ Rol asosidagi admin paneli (server tomonda himoyalangan)

---

## Lokal ishga tushirish

**Talablar:** Node.js 20+

1. Bog'liqliklarni o'rnating:
   ```bash
   npm install
   ```

2. `.env.example` ni nusxalab `.env` yarating va to'ldiring:
   ```bash
   cp .env.example .env
   ```
   Lokal sinov uchun minimal sozlama:
   ```ini
   ALLOW_DEV_AUTH="true"
   JWT_SECRET="lokal-test-uchun-kamida-16-belgi"
   ADMIN_TELEGRAM_IDS="73327"   # o'zingizni admin qilish uchun
   # GEMINI_API_KEY / SUPABASE_* ixtiyoriy
   ```
   > `ALLOW_DEV_AUTH="true"` bo'lganda Telegramsiz, qo'lda kirish formasi ishlaydi.
   > Productionda buni **albatta o'chiring**.

3. Ishga tushiring:
   ```bash
   npm run dev
   ```
   Ilova: http://localhost:3000

Tip tekshiruvi: `npm run lint` — Productionga build: `npm run build` so'ng `npm start`.

---

## Supabase sozlash (ixtiyoriy, lekin production uchun tavsiya)

Hozircha holat bitta JSON ustunda saqlanadi. Supabase'da quyidagi jadval kerak
(SQL Editor'da bir marta ishga tushiring):

```sql
create table if not exists skillmesh_state (
  id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);
```

So'ng `.env` ga `SUPABASE_URL` va `SUPABASE_SERVICE_ROLE_KEY` ni qo'shing.

> **Eslatma (Phase 2):** Bitta JSON-blob saqlash masshtablanmaydi. Keyingi bosqichda
> normallashtirilgan jadvallar (users, profiles, agreements, ...) + RLS rejalashtirilgan.

---

## Telegram bot va Mini App

1. [@BotFather](https://t.me/BotFather) da bot yarating → `TELEGRAM_BOT_TOKEN` oling.
2. `/setmenubutton` yoki `/newapp` orqali Mini App URL'ini deploy qilingan manzilga ulang.
3. Ilova Telegram ichida ochilganda `initData` avtomatik imzolanadi va serverda tekshiriladi.

---

## Deploy (Render namunasi)

1. Render'da Web Service yarating, GitHub repoga ulang.
2. Build buyrug'i: `npm install && npm run build` — Start buyrug'i: `npm start`.
3. Environment bo'limiga `.env` dagi barcha kalitlarni qo'shing
   (`TELEGRAM_BOT_TOKEN`, `JWT_SECRET`, `ADMIN_TELEGRAM_IDS`, `GEMINI_API_KEY`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV=production`).
   `ALLOW_DEV_AUTH` ni qo'shmang yoki `false` qiling.
4. Health-check / monitoring uchun: `GET /api/health` va `GET /api/ping`.

---

## Litsenziya

Shaxsiy loyiha. Barcha huquqlar muallifga tegishli.
