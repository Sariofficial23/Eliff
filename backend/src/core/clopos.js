// Clopos POS integratsiyasi — Open API v2 (integrations.clopos.com/open-api/v2).
// Hujjatlar: https://developer.clopos.com (v2).
//
// Zanjir: POST /auth -> token (keyingi so'rovlarda x-token sarlavhasi)
//         GET /sale-types -> yetkazish turi ID'si
//         GET /customers (filters phones) -> mijoz, topilmasa POST /customers
//         POST /orders (customer.id = Clopos'dagi haqiqiy ID)
//
// Bu modul faqat Clopos bilan gaplashadi. Navbat, qayta urinish va bazaga
// yozish — core/posQueue.js da. Buyurtma kassaga auto_order_accept=false
// bilan tushadi: kassir uni Clopos'da qo'lda qabul qiladi.

import { randomUUID } from 'crypto';
import config from '../config/default.js';
import { CLOPOS_MAP } from '../data/cloposMap.js';

const C = config.clopos;
const TIMEOUT_MS = 15000;

// Coca-Cola taklifi narxi — mini-app (Cart.jsx) dagi COLA bilan bir xil
export const COLA_PRICE = 5000;

let tokenCache = { token: null, expiresAt: 0 };
let saleTypesCache = { items: null, at: 0 };

// Natija turi bilan xato: posQueue shunga qarab qaror qiladi.
//   retry   — xavfsiz qayta urinish mumkin (buyurtma kassaga yetmagan)
//   error   — ma'lumotni tuzatish kerak (ID yo'q, 400/422 ...), avtomatik urinmaymiz
//   unknown — POST /orders yuborilgan, lekin javob kelmadi: kassada bormi — noma'lum
export class PosError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

const short = (v, n = 300) => {
  try {
    return JSON.stringify(v).slice(0, n);
  } catch {
    return String(v).slice(0, n);
  }
};

// So'rov serverga umuman yetmaganini bildiruvchi tarmoq xatolari
const NOT_DELIVERED = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
]);

async function rawFetch(url, options) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text.slice(0, 300) };
    }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(t);
  }
}

// Tarmoq xatosi so'rov yuborilmasdan oldin bo'lganmi?
const neverSent = (e) =>
  NOT_DELIVERED.has(e?.cause?.code) || NOT_DELIVERED.has(e?.code);

async function getToken() {
  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expiresAt - 60000) return tokenCache.token;

  let r;
  try {
    r = await rawFetch(`${C.apiUrl}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: C.clientId,
        client_secret: C.clientSecret,
        brand: C.brand,
        integrator_id: C.integratorId,
      }),
    });
  } catch (e) {
    throw new PosError('retry', `auth: tarmoq xatosi (${e.cause?.code || e.name})`);
  }
  if (!r.ok || !r.data?.token) {
    // 401/403 — kalitlar noto'g'ri: qayta urinish foyda bermaydi
    const kind = r.status === 401 || r.status === 403 ? 'error' : 'retry';
    throw new PosError(kind, `auth ${r.status}: ${short(r.data, 200)}`);
  }
  const ttlMs =
    Number(r.data.expires_in) > 0 ? Number(r.data.expires_in) * 1000 : 10 * 60 * 1000;
  tokenCache = { token: r.data.token, expiresAt: now + ttlMs };
  return r.data.token;
}

// GET va boshqa "buyurtma yaratmaydigan" so'rovlar uchun
async function apiCall(path, { method = 'GET', body } = {}) {
  const token = await getToken();
  let r;
  try {
    r = await rawFetch(`${C.apiUrl}${path}`, {
      method,
      headers: { 'x-token': token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new PosError('retry', `${method} ${path.split('?')[0]}: tarmoq xatosi (${e.cause?.code || e.name})`);
  }
  if (r.status === 401) tokenCache = { token: null, expiresAt: 0 };
  return r;
}

// ---- Savdo turlari (5 daqiqa kesh) ----
async function getSaleTypes() {
  const now = Date.now();
  if (saleTypesCache.items && now < saleTypesCache.at + 5 * 60000) return saleTypesCache.items;
  const r = await apiCall('/sale-types');
  if (!r.ok) throw new PosError('retry', `sale-types ${r.status}: ${short(r.data, 200)}`);
  const items = Array.isArray(r.data?.data) ? r.data.data : [];
  saleTypesCache = { items, at: now };
  return items;
}

async function resolveSaleTypeId(type = 'delivery') {
  if (type === 'pickup' && C.saleTypePickup) return C.saleTypePickup;
  if (type === 'delivery' && C.saleTypeDelivery) return C.saleTypeDelivery;
  const items = await getSaleTypes();
  const want = type === 'pickup' ? ['TAKEAWAY', 'IN'] : ['DELIVERY'];
  for (const st of want) {
    const found = items.find((x) => (x.system_type || x.channel) === st);
    if (found) return found.id;
  }
  // Boshqa turga "taxmin" bilan yubormaymiz — kassada noto'g'ri tur bo'lmasin
  const env = type === 'pickup' ? 'CLOPOS_SALE_TYPE_PICKUP' : 'CLOPOS_SALE_TYPE_DELIVERY';
  throw new PosError('error', `Clopos'da ${want[0]} savdo turi topilmadi — ${env} ni kiriting`);
}

// ---- Mijoz: telefon bo'yicha aniq topish yoki yaratish ----
// Clopos customer.id ni o'z bazasidagi mijozlar bilan tekshiradi: 0 yoki
// Telegram ID yuborilsa — 422 "selected customer id is invalid".
const customerRequests = new Map();
export const phoneDigits = (value) => String(value || '').replace(/\D/g, '');
const validCustomerId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;

async function findCustomer({ name, phone, code }) {
  const digits = phoneDigits(phone);
  for (let page = 1; page <= 100; page++) {
    const params = new URLSearchParams({
      page: String(page),
      limit: '100',
      'filters[0][0]': digits ? 'phones' : 'name',
      'filters[0][1]': digits || name,
    });
    const r = await apiCall(`/customers?${params}`);
    if (!r.ok || r.data?.success === false) {
      throw new PosError('retry', `customer lookup ${r.status}: ${short(r.data)}`);
    }
    if (!Array.isArray(r.data?.data)) {
      throw new PosError('retry', 'customer lookup: javob noto\'g\'ri');
    }
    const rows = r.data.data;
    const found = rows.find((row) => {
      if (!validCustomerId(row.id)) return false;
      if (code) return row.code === code;
      const phones = [row.phone, ...(Array.isArray(row.phones) ? row.phones : [])];
      return phones.some(
        (p) => phoneDigits(typeof p === 'object' && p !== null ? p.phone : p) === digits,
      );
    });
    if (found) return Number(found.id);
    const total = r.data.total;
    if (rows.length === 0 || (total != null ? page * 100 >= Number(total) : rows.length < 100)) {
      return null;
    }
  }
  throw new PosError('retry', 'customer lookup: sahifalar chegarasi oshdi');
}

async function resolveCustomerId(customer) {
  const key = customer.code || phoneDigits(customer.phone);
  if (!key) throw new PosError('error', 'mijoz telefoni yo\'q');
  if (customerRequests.has(key)) return customerRequests.get(key);
  const pending = (async () => {
    const existingId = await findCustomer(customer);
    if (existingId) return existingId;
    const body = { name: customer.name };
    if (customer.phone) body.phone = customer.phone;
    if (customer.code) body.code = customer.code;
    const r = await apiCall('/customers', { method: 'POST', body });
    if (r.ok && r.data?.success !== false && validCustomerId(r.data?.data?.id)) {
      return Number(r.data.data.id);
    }
    // Boshqa jarayon shu telefonni ayni paytda yaratgan bo'lishi mumkin
    if (r.status === 409 || r.status === 422) {
      const again = await findCustomer(customer);
      if (again) return again;
    }
    throw new PosError('retry', `customer create ${r.status}: ${short(r.data)}`);
  })();
  customerRequests.set(key, pending);
  try {
    return await pending;
  } finally {
    customerRequests.delete(key);
  }
}

// ---- Buyurtma tanasi ----
// Narxlar mijoz yuborgan qiymatdan emas, bazadagi mahsulotlardan olinadi.
// Yetkazish narxi admin sozlamalaridan (settings) qayta hisoblanadi.
// Clopos ID'si yo'q pozitsiya bo'lsa — buyurtma yuborilmaydi (xato).
const MAP_RE = /https?:\/\/\S+/;

export function buildOrderPayload(order, user, products, settings) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = [];
  const missing = [];
  let goods = 0;
  let clientDelivery = 0;

  for (const it of Array.isArray(order.items) ? order.items : []) {
    const qty = Math.max(1, Math.round(Number(it.qty) || 1));
    if (it.id === 'delivery') {
      clientDelivery += Math.round(Number(it.price) || 0) * qty;
      continue;
    }
    if (it.id === 'cola') {
      goods += COLA_PRICE * qty;
      if (C.colaProductId) {
        lines.push({ cloposId: C.colaProductId, name: it.name || 'Coca-Cola', price: COLA_PRICE, qty });
      } else missing.push(`${it.name || 'Coca-Cola'} (CLOPOS_COLA_PRODUCT_ID)`);
      continue;
    }
    const p = byId.get(Number(it.id));
    if (!p) {
      missing.push(`${it.name || it.id} (menyuda yo'q)`);
      continue;
    }
    goods += p.newPrice * qty;
    if (p.cloposId) lines.push({ cloposId: p.cloposId, name: p.name, price: p.newPrice, qty });
    else missing.push(p.name);
  }

  if (missing.length) {
    throw new PosError('error', `Clopos ID yo'q: ${missing.join(', ')}`);
  }
  if (!lines.length) throw new PosError('error', 'buyurtmada mahsulot yo\'q');

  const freeFrom = Number(settings?.freeFrom) || 0;
  const fee = Number(settings?.deliveryFee) || 0;
  const delivery =
    order.orderType === 'pickup' || (freeFrom > 0 && goods >= freeFrom) ? 0 : fee;
  const serverTotal = goods + delivery;

  let deliveryFee = delivery;
  if (delivery > 0 && C.deliveryProductId) {
    lines.push({ cloposId: C.deliveryProductId, name: 'Yetkazib berish', price: delivery, qty: 1 });
    deliveryFee = 0; // bir xil yetkazishni ikki marta hisoblamaymiz
  }

  const pickup = order.orderType === 'pickup';
  const location = String(order.location || '');
  const mapUrl = (location.match(MAP_RE) || [])[0] || '';
  const address = location.replace(MAP_RE, '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
  const addressText = pickup ? 'Olib ketish' : address || mapUrl || '—';

  const warn = [];
  if (Number(order.total) !== serverTotal) {
    warn.push(`Diqqat: mini-app summasi ${order.total}, server hisobi ${serverTotal}`);
  }
  if (clientDelivery !== delivery) {
    warn.push(`yetkazish: mini-app ${clientDelivery}, server ${delivery}`);
  }
  // Telefon va manzil kassa bildirishnomasida birinchi turadi va hech qachon
  // kesilmaydi: 500 belgi chegarasi faqat qolgan qismga qo'llanadi.
  const head = `Telefon: ${order.phone || '—'} | Manzil: ${addressText}`;
  const tail = [
    !pickup && mapUrl && address ? `Xarita: ${mapUrl}` : null,
    `Telegram bot #${order.id}`,
    order.comment ? String(order.comment) : null,
    ...warn,
  ]
    .filter(Boolean)
    .join(' | ');
  const room = Math.max(0, 500 - head.length - 3);
  const comment = tail && room > 0 ? `${head} | ${tail.slice(0, room)}` : head;

  const customer = {
    name: user?.name || 'Telegram mijoz',
    phone: order.phone || '',
    address: pickup ? '' : (address || mapUrl).slice(0, 300),
  };

  return {
    customer,
    serverTotal,
    payload: {
      auto_order_accept: false, // kassir Clopos'da o'zi qabul qiladi
      order_number: `ELIF-${order.id}`.slice(0, 20),
      sale_type_id: null, // sendOrder ichida to'ldiriladi
      // order_number — dublikatni tekshirish uchun bizning raqam
      venue_id: C.venueId,
      delivery_fee: deliveryFee,
      comment,
      customer: null, // sendOrder ichida to'ldiriladi
      products: lines.map((l) => ({
        product_id: l.cloposId,
        product_name: l.name,
        count: l.qty,
        price: Math.round(l.price),
        status: 'new',
        product_hash: randomUUID(),
        portion_size: 1,
      })),
    },
  };
}

// POST /orders — yagona "xavfli" so'rov: javob kelmasa natija noma'lum.
async function postOrder(payload) {
  const token = await getToken();
  let r;
  try {
    r = await rawFetch(`${C.apiUrl}/orders`, {
      method: 'POST',
      headers: { 'x-token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    if (neverSent(e)) throw new PosError('retry', `orders: ulanib bo'lmadi (${e.cause?.code || e.code})`);
    throw new PosError(
      'unknown',
      `orders: javob kelmadi (${e.name === 'AbortError' ? 'timeout' : e.cause?.code || e.name}) — Clopos'da tekshiring`,
    );
  }
  if (r.ok && r.data?.success !== false) return r.data?.data || r.data;
  if (r.status === 401) {
    tokenCache = { token: null, expiresAt: 0 };
    throw new PosError('retry', 'orders 401: token yangilanadi');
  }
  if (r.status === 429 || r.status === 502 || r.status === 503) {
    throw new PosError('retry', `orders ${r.status}: ${short(r.data)}`);
  }
  if (r.status >= 500) {
    throw new PosError('unknown', `orders ${r.status}: ${short(r.data)} — Clopos'da tekshiring`);
  }
  throw new PosError('error', `orders ${r.status}: ${short(r.data)}`);
}

// Buyurtmani kassaga yuborish. onBeforePost — POST /orders dan oldin chaqiriladi
// (navbat shu yerda holatni "sending" ga o'tkazadi). Clopos javobini qaytaradi.
export async function sendOrder(order, user, products, settings, { onBeforePost } = {}) {
  if (!C.enabled) throw new PosError('error', 'Clopos sozlanmagan');
  const { customer, payload } = buildOrderPayload(order, user, products, settings);
  payload.sale_type_id = await resolveSaleTypeId(order.orderType === 'pickup' ? 'pickup' : 'delivery');
  const customerId = await resolveCustomerId(customer);
  payload.customer = { ...customer, id: customerId, customer_discount_type: 0 };
  if (onBeforePost) await onBeforePost();
  return postOrder(payload);
}

// Taym-aut / noma'lum natijadan keyin: kassada shu order_number bilan buyurtma
// bormi? Faqat aniq mos kelgan order_number "topildi" deb hisoblanadi.
// Topilmasa — null (bu "yo'q" degani emas: admin kassada tekshiradi).
export async function findPosOrder(orderNumber) {
  const params = new URLSearchParams({
    page: '1',
    limit: '50',
    'filters[0][0]': 'order_number',
    'filters[0][1]': orderNumber,
  });
  const r = await apiCall(`/orders?${params}`);
  if (!r.ok || !Array.isArray(r.data?.data)) return null;
  const hit = r.data.data.find((o) => String(o.order_number ?? o.orderNumber ?? '') === orderNumber);
  return hit || null;
}

export const cloposEnabled = () => C.enabled;

// ---- Admin: sinov buyurtmasi ----
// Clopos mijoz yaratishda telefonni majburiy so'raydi, shuning uchun admin
// o'z raqamini kiritadi: shu telefonli mijoz topiladi yoki yaratiladi.
export async function sendTestOrder(product, phone) {
  const digits = phoneDigits(phone);
  if (digits.length < 9) {
    throw new PosError('error', 'Sinov uchun telefon raqamini kiriting (+998XXXXXXXXX)');
  }
  const testPhone = digits.length === 9 ? `+998${digits}` : `+${digits}`;
  const saleTypeId = await resolveSaleTypeId();
  const customer = { name: 'TEST Elif bot', phone: testPhone };
  const customerId = await resolveCustomerId(customer);
  const payload = {
    auto_order_accept: false,
    order_number: `TEST-${Date.now() % 100000}`,
    sale_type_id: saleTypeId,
    venue_id: C.venueId,
    delivery_fee: 0,
    comment: `Telefon: ${testPhone} | Manzil: Test manzil | TEST — Elif bot (rad etish mumkin)`,
    customer: { id: customerId, customer_discount_type: 0, name: customer.name, phone: testPhone, address: 'Test manzil' },
    products: [
      {
        product_id: product.cloposId,
        product_name: product.name,
        count: 1,
        price: Math.round(product.newPrice || 0),
        status: 'new',
        product_hash: randomUUID(),
        portion_size: 1,
      },
    ],
  };
  const r = await apiCall('/orders', { method: 'POST', body: payload });
  return { ok: r.ok, status: r.status, saleTypeId, response: r.data };
}

// ---- Clopos menyusi (GET /products) ----
export async function fetchCloposProducts() {
  const limit = 100;
  const rows = [];
  for (let page = 1; page <= 100; page++) {
    const q = `?limit=${limit}&page=${page}&selects=id,name,type,price&with[0]=category`;
    const r = await apiCall(`/products${q}`);
    if (!r.ok) throw new PosError('retry', `products ${r.status}: ${short(r.data, 200)}`);
    const items = Array.isArray(r.data?.data) ? r.data.data : [];
    rows.push(...items);
    const total = Number(r.data?.total ?? rows.length);
    if (items.length === 0 || rows.length >= total) break;
  }
  const SELLABLE = new Set(['GOODS', 'DISH', 'MODIFICATION']);
  return rows
    .filter((p) => SELLABLE.has(p.type) && Number(p.status ?? 1) !== 0 && !p.hidden)
    .map((p) => ({
      cloposId: p.id,
      name: p.fullName || p.name,
      price: Math.round(Number(p.price) || 0),
      category: p.category?.name || '',
    }));
}

const norm = (s) =>
  String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/gi, '');

// Nomi aniq mos kelgan mahsulotlarga cloposId qo'yish (bo'sh bo'lsa).
// Qo'lda qo'yilgan ID'lar o'zgartirilmaydi. Narx farqi hisobotda ko'rsatiladi.
export async function matchCloposIds(prisma, aliases = CLOPOS_MAP) {
  const cloposItems = await fetchCloposProducts();
  const byId = new Map(cloposItems.map((c) => [Number(c.cloposId), c]));
  const byName = new Map();
  const dup = new Set();
  for (const c of cloposItems) {
    const k = norm(c.name);
    if (!k) continue;
    if (byName.has(k)) dup.add(k);
    else byName.set(k, c);
  }
  const products = await prisma.product.findMany();
  let matched = 0;
  const priceDiff = [];
  const notFound = [];
  for (const p of products) {
    let c = p.cloposId ? byId.get(Number(p.cloposId)) : null;
    if (!p.cloposId) {
      // 1) kassada nomi aniq bir xil (va yagona) bo'lsa; 2) bog'lanish jadvali
      const k = norm(p.name);
      c = (!dup.has(k) && byName.get(k)) || byId.get(Number(aliases[p.name])) || null;
      if (!c) {
        notFound.push(p.name);
        continue;
      }
      await prisma.product.update({ where: { id: p.id }, data: { cloposId: c.cloposId } });
      matched++;
    }
    if (c && c.price && c.price !== p.newPrice) {
      priceDiff.push(`${p.name}: bot ${p.newPrice}, Clopos ${c.price} (${c.name})`);
    }
  }
  return {
    matched,
    total: products.length,
    cloposCount: cloposItems.length,
    notFound,
    priceDiff,
  };
}

// ---- Admin: "Clopos'ni tekshirish" ----
export async function checkCloposStatus() {
  const required = {
    CLOPOS_CLIENT_ID: C.clientId,
    CLOPOS_CLIENT_SECRET: C.clientSecret,
    CLOPOS_BRAND: C.brand,
    CLOPOS_INTEGRATOR_ID: C.integratorId,
    CLOPOS_VENUE_ID: C.venueId,
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const status = {
    enabled: C.enabled,
    apiUrl: C.apiUrl,
    brand: C.brand || null,
    venueId: C.venueId,
    saleTypeDelivery: C.saleTypeDelivery,
    colaProductId: C.colaProductId,
    deliveryProductId: C.deliveryProductId,
    missing,
  };
  if (missing.length) {
    status.auth = { ok: false, error: `Kiritilmagan: ${missing.join(', ')}` };
    return status;
  }
  try {
    tokenCache = { token: null, expiresAt: 0 };
    await getToken();
    status.auth = { ok: true };
  } catch (e) {
    status.auth = { ok: false, error: e.message };
    return status;
  }
  try {
    const items = await getSaleTypes();
    status.saleTypes = items.map((x) => ({
      id: x.id,
      name: x.name,
      system_type: x.system_type || x.channel,
    }));
  } catch (e) {
    status.saleTypesError = e.message;
  }
  return status;
}
