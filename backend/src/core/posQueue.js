// Clopos'ga yuborish navbati (bazada saqlanadi — server qayta ishga tushsa ham
// yo'qolmaydi). Buyurtma yaratilganda posStatus='pending' bilan BIR yozuvda
// saqlanadi, keyin shu ishchi uni kassaga yuboradi.
//
// posStatus:
//   null       — Clopos'ga yuborilmaydi (integratsiya o'chiq paytdagi buyurtma)
//   pending    — navbatda (posNextAt vaqtidan keyin yuboriladi)
//   preparing  — mijoz/savdo turi aniqlanmoqda (kassaga hali hech narsa ketmagan)
//   sending    — POST /orders yuborildi, javob kutilmoqda
//   sent       — kassaga tushdi (posId — Clopos buyurtma ID'si)
//   error      — ma'lumotni tuzatish kerak yoki urinishlar tugadi
//   unknown    — so'rov ketdi, lekin javob kelmadi: avtomatik QAYTA YUBORILMAYDI
//
// Kuryerlar guruhi va mijozga xabarlar bu navbatga bog'liq emas.

import prisma from '../database/connection.js';
import { getSettings } from '../models/Setting.js';
import { cloposEnabled, findPosOrder, sendOrder } from './clopos.js';

const MAX_ATTEMPTS = 6;
const BACKOFF_MIN = [1, 2, 5, 10, 30]; // urinishlar orasidagi kutish (daqiqa)
const TICK_MS = 20000;

let running = false;
let timer = null;

const safe = (msg) => String(msg || '').slice(0, 500);

// Ustunlarni qo'shish (Banner/Setting kabi — startда, additiv va xavfsiz)
export const ensurePosColumns = async () => {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "cloposId" INTEGER;`,
    );
    for (const sql of [
      `ADD COLUMN IF NOT EXISTS "posStatus" TEXT`,
      `ADD COLUMN IF NOT EXISTS "posId" TEXT`,
      `ADD COLUMN IF NOT EXISTS "posAttempts" INTEGER NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS "posError" TEXT`,
      `ADD COLUMN IF NOT EXISTS "posNextAt" TIMESTAMP(3)`,
      `ADD COLUMN IF NOT EXISTS "posUpdatedAt" TIMESTAMP(3)`,
    ]) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ${sql};`);
    }
  } catch (e) {
    console.error('POS ustunlarini tayyorlashda xato:', e.message);
  }
};

const setPos = (id, data) =>
  prisma.order.update({
    where: { id },
    data: { ...data, posUpdatedAt: new Date() },
  });

// Server yiqilib qolgan paytdagi "yarim" yozuvlarni tiklash
async function recover() {
  // preparing — kassaga hech narsa ketmagan: xavfsiz qayta navbatga
  await prisma.order.updateMany({
    where: { posStatus: 'preparing' },
    data: { posStatus: 'pending', posNextAt: null },
  });
  // sending — POST ketgan bo'lishi mumkin: avval kassada tekshiramiz
  const stuck = await prisma.order.findMany({ where: { posStatus: 'sending' } });
  for (const o of stuck) await resolveUnknown(o, 'server qayta ishga tushdi, javob olinmagan');
}

// Javobi noma'lum buyurtma: kassada order_number bo'yicha qidiramiz
async function resolveUnknown(order, reason) {
  let hit = null;
  try {
    hit = await findPosOrder(`ELIF-${order.id}`);
  } catch {
    hit = null;
  }
  if (hit) {
    await setPos(order.id, {
      posStatus: 'sent',
      posId: hit.id != null ? String(hit.id) : null,
      posError: null,
      posNextAt: null,
    });
    console.log(`[OK] Clopos: #${order.id} kassada topildi (id=${hit.id})`);
    return 'sent';
  }
  await setPos(order.id, {
    posStatus: 'unknown',
    posError: safe(
      `${reason}. Kassada ELIF-${order.id} topilmadi yoki tekshirib bo'lmadi — Clopos'da qo'lda tekshiring`,
    ),
    posNextAt: null,
  });
  console.error(`[WARN] Clopos: #${order.id} natijasi noma'lum — ${reason}`);
  return 'unknown';
}

async function processOrder(order) {
  // Atomik "egallash": ikki jarayon bir buyurtmani yubormasligi uchun
  const claim = await prisma.order.updateMany({
    where: { id: order.id, posStatus: 'pending' },
    data: {
      posStatus: 'preparing',
      posAttempts: { increment: 1 },
      posUpdatedAt: new Date(),
    },
  });
  if (claim.count !== 1) return;
  const attempts = (order.posAttempts || 0) + 1;

  try {
    const ids = (Array.isArray(order.items) ? order.items : [])
      .map((i) => Number(i.id))
      .filter(Number.isFinite);
    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    const settings = await getSettings();

    const data = await sendOrder(order, order.user, products, settings, {
      onBeforePost: () => setPos(order.id, { posStatus: 'sending' }),
    });
    const posId = data?.id != null ? String(data.id) : null;
    await setPos(order.id, {
      posStatus: 'sent',
      posId,
      posError: posId ? null : "Clopos javobida buyurtma id'si yo'q",
      posNextAt: null,
    });
    console.log(`[OK] Clopos: zakaz #${order.id} -> id=${posId ?? '?'} status=${data?.status ?? '?'}`);
  } catch (e) {
    const kind = e.kind || 'retry';
    if (kind === 'unknown') {
      await resolveUnknown(order, e.message);
      return;
    }
    if (kind === 'retry' && attempts < MAX_ATTEMPTS) {
      const wait = BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)];
      await setPos(order.id, {
        posStatus: 'pending',
        posError: safe(`${attempts}-urinish: ${e.message}`),
        posNextAt: new Date(Date.now() + wait * 60000),
      });
      console.error(`[WARN] Clopos: #${order.id} ${attempts}-urinish xato, ${wait} daq. keyin — ${e.message}`);
      return;
    }
    await setPos(order.id, {
      posStatus: 'error',
      posError: safe(kind === 'retry' ? `${attempts} ta urinish: ${e.message}` : e.message),
      posNextAt: null,
    });
    console.error(`[WARN] Clopos: zakaz #${order.id} ne ushel v POS - ${e.message}`);
  }
}

export async function tickPosQueue() {
  if (running || !cloposEnabled()) return;
  running = true;
  try {
    const due = await prisma.order.findMany({
      where: {
        posStatus: 'pending',
        OR: [{ posNextAt: null }, { posNextAt: { lte: new Date() } }],
      },
      orderBy: { id: 'asc' },
      take: 10,
      include: { user: true },
    });
    for (const o of due) await processOrder(o);
  } catch (e) {
    console.error('POS navbati xatosi:', e.message);
  } finally {
    running = false;
  }
}

// Yangi buyurtmadan keyin darhol (navbatni kutmasdan) yuborish
export const kickPosQueue = () => {
  if (cloposEnabled()) setImmediate(() => tickPosQueue());
};

export async function startPosWorker() {
  if (!cloposEnabled() || timer) return;
  try {
    await recover();
  } catch (e) {
    console.error('POS navbatini tiklashda xato:', e.message);
  }
  timer = setInterval(tickPosQueue, TICK_MS);
  tickPosQueue();
  console.log('🧾 Clopos navbati ishga tushdi');
}

// ---- Admin amallari ----

// Qayta yuborish. "unknown" bo'lsa — avval kassada qidiramiz; topilmasa faqat
// admin "kassada yo'q" deb tasdiqlasa (confirmed=true) qayta yuboramiz.
export async function retryPos(id, { confirmed = false } = {}) {
  const order = await prisma.order.findUnique({ where: { id: Number(id) } });
  if (!order) return { ok: false, error: 'Buyurtma topilmadi' };
  if (!cloposEnabled()) return { ok: false, error: 'Clopos sozlanmagan' };
  if (['pending', 'preparing', 'sending'].includes(order.posStatus)) {
    return { ok: false, error: 'Buyurtma allaqachon navbatda' };
  }
  if (order.posStatus === 'sent') {
    return { ok: false, error: 'Buyurtma kassaga allaqachon yuborilgan' };
  }
  if (order.posStatus === 'unknown' || order.posStatus === null) {
    let hit = null;
    try {
      hit = await findPosOrder(`ELIF-${order.id}`);
    } catch {
      hit = null;
    }
    if (hit) {
      await setPos(order.id, {
        posStatus: 'sent',
        posId: hit.id != null ? String(hit.id) : null,
        posError: null,
      });
      return { ok: true, found: true };
    }
    if (!confirmed) {
      return {
        ok: false,
        needConfirm: true,
        error: `Kassada ELIF-${order.id} topilmadi. Clopos'da yo'qligini tekshirib, tasdiqlang`,
      };
    }
  }
  const updated = await prisma.order.updateMany({
    where: { id: order.id, posStatus: order.posStatus },
    data: {
      posStatus: 'pending',
      posAttempts: 0,
      posNextAt: null,
      posError: null,
      posUpdatedAt: new Date(),
    },
  });
  if (updated.count !== 1) return { ok: false, error: 'Holat o\'zgargan, sahifani yangilang' };
  kickPosQueue();
  return { ok: true };
}

// Admin kassada buyurtmani ko'rdi — "yuborilgan" deb belgilaydi (qayta yubormaymiz)
export async function markPosSent(id, posId) {
  const order = await prisma.order.findUnique({ where: { id: Number(id) } });
  if (!order) return { ok: false, error: 'Buyurtma topilmadi' };
  if (!['unknown', 'error'].includes(order.posStatus)) {
    return { ok: false, error: 'Faqat "noma\'lum" yoki "xato" holatini belgilash mumkin' };
  }
  await setPos(order.id, {
    posStatus: 'sent',
    posId: posId ? String(posId).slice(0, 40) : order.posId,
    posError: null,
    posNextAt: null,
  });
  return { ok: true };
}
