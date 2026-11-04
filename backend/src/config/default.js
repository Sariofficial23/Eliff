import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: process.env.PORT || 5000,
  botToken: process.env.BOT_TOKEN,
  databaseUrl: process.env.DATABASE_URL,
  miniAppUrl: process.env.MINI_APP_URL || '',
  courierGroupId: process.env.COURIER_GROUP_ID || '',
  env: process.env.NODE_ENV || 'development',
};

// ---- Clopos (POS kassa) integratsiyasi — Open API v2 ----
// Hamma qiymatlar Render "Environment" bo'limida turadi, GitHub'ga yozilmaydi.
// Majburiy maydonlar to'ldirilmaguncha integratsiya o'chiq (enabled=false) —
// bot avvalgidek ishlaydi (faqat kuryerlar guruhi).
const CLOPOS_V2_BASE = 'https://integrations.clopos.com/open-api/v2';
const rawApiUrl = (process.env.CLOPOS_API_URL || '').trim().replace(/\/+$/, '');
const clopos = {
  apiUrl: /open-api\/v2/i.test(rawApiUrl) ? rawApiUrl : CLOPOS_V2_BASE,
  clientId: (process.env.CLOPOS_CLIENT_ID || '').trim(),
  clientSecret: (process.env.CLOPOS_CLIENT_SECRET || '').trim(),
  brand: (process.env.CLOPOS_BRAND || '').trim(),
  integratorId: (process.env.CLOPOS_INTEGRATOR_ID || '').trim(),
  venueId: Number(process.env.CLOPOS_VENUE_ID) || null,
  // Ixtiyoriy: berilmasa — Clopos ma'lumotnomasidan DELIVERY turi tanlanadi
  saleTypeDelivery: Number(process.env.CLOPOS_SALE_TYPE_DELIVERY) || null,
  // Olib ketish (hozir mini-app'da yo'q) — kelajak uchun, TAKEAWAY turi
  saleTypePickup: Number(process.env.CLOPOS_SALE_TYPE_PICKUP) || null,
  // Ixtiyoriy: Coca-Cola taklifi va yetkazish uchun Clopos'dagi mahsulot ID'lari.
  // Yetkazish ID'si berilmasa — narx delivery_fee maydonida yuboriladi.
  colaProductId: Number(process.env.CLOPOS_COLA_PRODUCT_ID) || null,
  deliveryProductId: Number(process.env.CLOPOS_DELIVERY_PRODUCT_ID) || null,
  // true — buyurtma kassada darhol qabul qilingan bo'ladi (kassir tasdig'isiz).
  // Standart: false — kassir Clopos'da qo'lda qabul qiladi.
  autoAccept: /^(1|true|yes)$/i.test(String(process.env.CLOPOS_AUTO_ACCEPT || '').trim()),
};
clopos.enabled = Boolean(
  clopos.clientId &&
    clopos.clientSecret &&
    clopos.brand &&
    clopos.integratorId &&
    clopos.venueId,
);
config.clopos = clopos;

if (!config.botToken) {
  console.warn('⚠️  BOT_TOKEN .env faylida topilmadi!');
}

export default config;
