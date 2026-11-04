// Clopos moduli testlari — Clopos API soxta (mock) fetch bilan.
// Haqiqiy kassaga hech narsa yubormaydi.
// Ishga tushirish: cd backend && npm test
import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';

Object.assign(process.env, {
  CLOPOS_API_URL: 'https://clopos.invalid/open-api/v2',
  CLOPOS_CLIENT_ID: 'test',
  CLOPOS_CLIENT_SECRET: 'test',
  CLOPOS_BRAND: 'test',
  CLOPOS_INTEGRATOR_ID: '1',
  CLOPOS_VENUE_ID: '5',
});

const { default: config } = await import('../src/config/default.js');
const api = await import('../src/core/clopos.js');
const C = config.clopos;

let calls;
let orders;
let handler; // /customers so'rovlari uchun
let orderHandler; // /orders uchun (standart — muvaffaqiyat)
const SALE_TYPES = [
  { id: 11, name: 'Yetkazish', system_type: 'DELIVERY' },
  { id: 12, name: 'Olib ketish', system_type: 'TAKEAWAY' },
];

globalThis.fetch = async (url, options = {}) => {
  const u = new URL(url);
  const path = u.pathname.replace('/open-api/v2', '');
  if (path === '/auth') return Response.json({ token: 'tok' });
  const req = { url: u, path, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null };
  calls.push(req);
  if (path === '/sale-types') return Response.json({ data: SALE_TYPES });
  if (path === '/orders' && req.method === 'POST') {
    if (orderHandler) return orderHandler(req);
    assert.ok([14, 27, 51, 99].includes(req.body.customer.id), 'mijoz soxta kassada bo\'lishi kerak');
    assert.equal(req.body.customer.customer_discount_type, 0);
    orders.push(req.body);
    return Response.json({ data: { id: 4242, status: 'new' } });
  }
  return handler(req);
};

const products = [
  { id: 7, cloposId: 247, name: 'Gamburger', newPrice: 25000 },
  { id: 8, cloposId: 248, name: 'Lavash', newPrice: 30000 },
  { id: 9, cloposId: null, name: 'Yangi taom', newPrice: 15000 },
];
const settings = { freeFrom: 100000, deliveryFee: 8000 };
const baseOrder = {
  id: 123,
  phone: '+998901234567',
  location: "Chilonzor 5, 12-uy | https://maps.google.com/?q=41.1,69.2",
  // narxlar ataylab noto'g'ri — server bazadagi narxni olishi kerak
  items: [
    { id: 7, name: 'Gamburger', price: 1, qty: 2 },
    { id: 'delivery', name: 'Yetkazib berish', price: 8000, qty: 1 },
  ],
  total: 58000,
};
const user = { id: 999, name: 'Ali' };
const send = (o = {}, opts) => api.sendOrder({ ...baseOrder, ...o }, user, products, settings, opts);
const existing = async ({ url, method }) => {
  assert.equal(method, 'GET');
  assert.equal(url.searchParams.get('filters[0][0]'), 'phones');
  assert.equal(url.searchParams.get('filters[0][1]'), '998901234567');
  return Response.json({ data: [{ id: 99, phone: '+998 90 123-45-67' }], total: 1 });
};

beforeEach(() => {
  calls = [];
  orders = [];
  handler = existing;
  orderHandler = null;
  C.deliveryProductId = null;
  C.colaProductId = null;
});

test('mavjud mijoz: aniq telefon, server narxlari, yetkazish delivery_fee da', async () => {
  const r = await send();
  assert.equal(r.id, 4242);
  const o = orders[0];
  assert.equal(o.customer.id, 99);
  assert.equal(o.customer.phone, '+998901234567');
  assert.equal(o.customer.address, 'Chilonzor 5, 12-uy');
  assert.equal(o.auto_order_accept, false);
  assert.equal(o.order_number, 'ELIF-123');
  assert.equal(o.sale_type_id, 11);
  assert.equal(o.venue_id, 5);
  assert.equal(o.delivery_fee, 8000);
  assert.deepEqual(
    o.products.map((p) => [p.product_id, p.count, p.price]),
    [[247, 2, 25000]],
  );
  assert.ok(o.comment.startsWith('Telefon: +998901234567 | Manzil: Chilonzor 5, 12-uy'));
  assert.ok(o.comment.includes('Xarita: https://maps.google.com/?q=41.1,69.2'));
  assert.ok(!o.comment.includes('Diqqat'), 'summa mos — ogohlantirish yo\'q');
  assert.equal(calls.filter((c) => c.path === '/customers' && c.method === 'POST').length, 0);
});

test('yangi mijoz avval yaratiladi, keyin buyurtma', async () => {
  handler = async ({ method, body }) =>
    method === 'GET'
      ? Response.json({ data: [], total: 0 })
      : (assert.deepEqual(body, { name: 'Ali', phone: '+998901234567' }),
        Response.json({ success: true, data: { id: 14 } }));
  await send();
  assert.equal(orders[0].customer.id, 14);
  assert.deepEqual(
    calls.filter((c) => c.path !== '/sale-types').map((c) => `${c.method} ${c.path}`),
    ['GET /customers', 'POST /customers', 'POST /orders'],
  );
});

test('qisman mos telefon rad etiladi, barcha sahifalar qidiriladi', async () => {
  handler = async ({ url }) =>
    url.searchParams.get('page') === '1'
      ? Response.json({ data: Array.from({ length: 100 }, () => ({ id: 1, phone: '+998901234560' })), total: 101 })
      : Response.json({ data: [{ id: 27, phone: '998901234567' }], total: 101 });
  await send();
  assert.equal(orders[0].customer.id, 27);
});

test('mijoz yaratishda konflikt (409) — boshqa so\'rov yaratgan mijoz olinadi', async () => {
  let lookups = 0;
  handler = async ({ method }) =>
    method === 'POST'
      ? Response.json({ error: 'duplicate_phone' }, { status: 409 })
      : Response.json({ data: ++lookups === 1 ? [] : [{ id: 14, phone: baseOrder.phone }], total: lookups === 1 ? 0 : 1 });
  await send();
  assert.equal(orders[0].customer.id, 14);
});

test('bir telefondan bir vaqtda ikki buyurtma — bitta mijoz yaratiladi', async () => {
  handler = async ({ method }) =>
    method === 'GET' ? Response.json({ data: [], total: 0 }) : Response.json({ data: { id: 14 } });
  await Promise.all([send(), send({ id: 124 })]);
  assert.equal(orders.length, 2);
  assert.equal(calls.filter((c) => c.method === 'POST' && c.path === '/customers').length, 1);
});

test('qidiruv xatosi: mijoz yaratilmaydi, buyurtma yuborilmaydi, qayta urinish mumkin', async () => {
  handler = async () => Response.json({ error: 'unavailable' }, { status: 503 });
  await assert.rejects(send(), (e) => e.kind === 'retry');
  assert.equal(orders.length, 0);
});

test('customer id 0 qaytsa — hech qachon 0 yuborilmaydi', async () => {
  handler = async ({ method }) =>
    method === 'GET' ? Response.json({ data: [], total: 0 }) : Response.json({ data: { id: 0 } });
  await assert.rejects(send());
  assert.equal(orders.length, 0);
});

test('Clopos ID\'siz pozitsiya — buyurtma umuman yuborilmaydi (jim tashlab ketilmaydi)', async () => {
  await assert.rejects(
    send({ items: [{ id: 7, qty: 1 }, { id: 9, name: 'Yangi taom', qty: 1 }] }),
    (e) => e.kind === 'error' && e.message.includes('Yangi taom'),
  );
  assert.equal(calls.length, 0, 'Clopos\'ga birorta so\'rov ketmasligi kerak');
});

test('menyuda yo\'q mahsulot ham xato', async () => {
  await assert.rejects(send({ items: [{ id: 77, name: 'Eski', qty: 1 }] }), (e) => e.kind === 'error');
});

test('bir nechta mahsulot, miqdor > 1, chegaradan yuqori — bepul yetkazish', async () => {
  await send({
    items: [
      { id: 7, qty: 2 },
      { id: 8, qty: 3 },
    ],
    total: 140000,
  });
  const o = orders[0];
  assert.deepEqual(o.products.map((p) => [p.product_id, p.count, p.price]), [[247, 2, 25000], [248, 3, 30000]]);
  assert.equal(o.delivery_fee, 0);
  const sum = o.products.reduce((s, p) => s + p.price * p.count, 0) + o.delivery_fee;
  assert.equal(sum, 140000);
});

test('yetkazish mahsulot sifatida — delivery_fee 0, ikki marta hisoblanmaydi', async () => {
  C.deliveryProductId = 500;
  await send();
  const o = orders[0];
  assert.equal(o.delivery_fee, 0);
  assert.deepEqual(o.products.map((p) => [p.product_id, p.price]), [[247, 25000], [500, 8000]]);
  const sum = o.products.reduce((s, p) => s + p.price * p.count, 0) + o.delivery_fee;
  assert.equal(sum, 58000);
});

test('Coca-Cola: ID bo\'lmasa xato, ID bo\'lsa pozitsiya', async () => {
  const items = [{ id: 7, qty: 4 }, { id: 'cola', name: 'Coca-Cola 0.5L', price: 5000, qty: 1 }];
  await assert.rejects(send({ items, total: 105000 }), (e) => e.kind === 'error' && e.message.includes('COLA'));
  C.colaProductId = 600;
  await send({ items, total: 105000 });
  assert.deepEqual(orders[0].products.map((p) => [p.product_id, p.price]), [[247, 25000], [600, 5000]]);
  assert.equal(orders[0].delivery_fee, 0);
});

test('mini-app summasi server hisobiga mos kelmasa — izohda ogohlantirish', async () => {
  await send({ total: 10000 });
  assert.ok(orders[0].comment.includes('Diqqat: mini-app summasi 10000, server hisobi 58000'));
});

test('uzun izoh: telefon va manzil to\'liq saqlanadi', async () => {
  const addr = 'A'.repeat(300);
  await send({ location: addr, comment: 'x'.repeat(1000) });
  const c = orders[0].comment;
  assert.ok(c.startsWith(`Telefon: +998901234567 | Manzil: ${addr}`));
  assert.ok(c.length <= 500);
});

test('olib ketish: "Olib ketish", TAKEAWAY turi, yetkazish yo\'q', async () => {
  await send({ orderType: 'pickup', items: [{ id: 7, qty: 1 }], total: 25000 });
  const o = orders[0];
  assert.equal(o.sale_type_id, 12);
  assert.equal(o.delivery_fee, 0);
  assert.equal(o.customer.address, '');
  assert.ok(o.comment.startsWith('Telefon: +998901234567 | Manzil: Olib ketish'));
});

test('POST /orders natijalari: timeout=unknown, ulanmadi=retry, 422=error, 503=retry, 500=unknown', async () => {
  const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
  const refused = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
  const cases = [
    [() => { throw abort; }, 'unknown'],
    [() => { throw refused; }, 'retry'],
    [() => Response.json({ message: 'selected customer id is invalid' }, { status: 422 }), 'error'],
    [() => Response.json({}, { status: 503 }), 'retry'],
    [() => Response.json({}, { status: 500 }), 'unknown'],
  ];
  for (const [h, kind] of cases) {
    orderHandler = h;
    let before = 0;
    await assert.rejects(send({}, { onBeforePost: () => before++ }), (e) => e.kind === kind);
    assert.equal(before, 1, 'POST oldidan holat "sending" ga o\'tadi');
  }
});

test('kassada buyurtmani order_number bo\'yicha topish — faqat aniq mos', async () => {
  handler = async ({ path, url }) => {
    assert.equal(path, '/orders');
    assert.equal(url.searchParams.get('filters[0][1]'), 'ELIF-123');
    return Response.json({ data: [{ id: 1, order_number: 'ELIF-1234' }, { id: 77, order_number: 'ELIF-123' }] });
  };
  assert.equal((await api.findPosOrder('ELIF-123')).id, 77);
  handler = async () => Response.json({ data: [{ id: 1, order_number: 'ELIF-1234' }] });
  assert.equal(await api.findPosOrder('ELIF-123'), null);
});

test('sinov buyurtmasi alohida TEST mijoz bilan, haqiqiy telefonsiz', async () => {
  handler = async ({ url, method, body }) => {
    if (method === 'GET') {
      assert.equal(url.searchParams.get('filters[0][0]'), 'name');
      return Response.json({ data: [{ id: 99, name: 'TEST Elif bot', code: 'BOSHQA' }], total: 1 });
    }
    assert.deepEqual(body, { name: 'TEST Elif bot', code: 'ELIF-BOT-TEST' });
    return Response.json({ data: { id: 51 } });
  };
  const r = await api.sendTestOrder(products[0]);
  assert.equal(r.ok, true);
  assert.equal(orders[0].customer.id, 51);
  assert.equal(orders[0].customer.phone, '');
});

test('tovarlarni bog\'lash: aniq nom, dublikat nomda jadval, qo\'lda ID o\'zgarmaydi', async () => {
  handler = async ({ path }) => {
    assert.equal(path, '/products');
    return Response.json({
      data: [
        { id: 1, name: 'Лаваш', type: 'DISH', price: 38000 },
        { id: 31, name: 'Трайфл сникерс', type: 'DISH', price: 50000 },
        { id: 231, name: 'Трайфл сникерс', type: 'DISH', price: 50000 },
        { id: 24, name: 'Чиз бургер', type: 'DISH', price: 36000 },
      ],
      total: 4,
    });
  };
  const rows = [
    { id: 1, name: 'Лаваш', newPrice: 38000, cloposId: null },
    { id: 2, name: 'Трайфл сникерс', newPrice: 50000, cloposId: null },
    { id: 3, name: 'Чизбургер', newPrice: 35000, cloposId: null },
    { id: 4, name: 'Yangi', newPrice: 1, cloposId: null },
    { id: 5, name: 'Qo\'lda', newPrice: 1, cloposId: 999 },
  ];
  const fakePrisma = {
    product: {
      findMany: async () => rows,
      update: async ({ where, data }) => Object.assign(rows.find((r) => r.id === where.id), data),
    },
  };
  const r = await api.matchCloposIds(fakePrisma, { 'Трайфл сникерс': 31, 'Чизбургер': 24, Yangi: 12345 });
  assert.deepEqual(rows.map((x) => x.cloposId), [1, 31, 24, null, 999]);
  assert.equal(r.matched, 3);
  assert.deepEqual(r.notFound, ['Yangi']);
  assert.ok(r.priceDiff.some((d) => d.startsWith('Чизбургер: bot 35000, Clopos 36000')));
});
