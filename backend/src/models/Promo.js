import prisma from '../database/connection.js';

// Promokodlar jadvali + Order'ga promo ustunlari (start'да bir marta)
export const ensurePromoTable = async () => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Promo" (
        "id" SERIAL PRIMARY KEY,
        "code" TEXT UNIQUE NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'percent',
        "value" INTEGER NOT NULL DEFAULT 0,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "usedCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "promoCode" TEXT;`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discount" INTEGER DEFAULT 0;`,
    );
  } catch (e) {
    console.error('Promo jadvalini tayyorlashda xato:', e.message);
  }
};

const norm = (code) => String(code || '').trim().toUpperCase();

// type: 'percent' | 'fixed'; amount — chegirma qo'llaniladigan summa
export const computeDiscount = (promo, amount) => {
  if (!promo || !promo.active) return 0;
  const a = Number(amount) || 0;
  let d =
    promo.type === 'fixed'
      ? Number(promo.value) || 0
      : Math.round((a * (Number(promo.value) || 0)) / 100);
  return Math.max(0, Math.min(d, a));
};

export const getPromoByCode = (code) =>
  prisma.promo.findUnique({ where: { code: norm(code) } });

export const incrementUsed = (code) =>
  prisma.promo
    .update({ where: { code: norm(code) }, data: { usedCount: { increment: 1 } } })
    .catch(() => {});

export const getAllPromos = () =>
  prisma.promo.findMany({ orderBy: { id: 'desc' } });

const clean = (d) => ({
  code: norm(d.code),
  type: d.type === 'fixed' ? 'fixed' : 'percent',
  value: Math.max(0, Math.round(Number(d.value) || 0)),
  active: d.active === undefined ? true : !!d.active,
});

export const createPromo = (data) => prisma.promo.create({ data: clean(data) });

export const updatePromo = (id, data) =>
  prisma.promo.update({ where: { id: Number(id) }, data: clean(data) });

export const deletePromo = (id) =>
  prisma.promo.delete({ where: { id: Number(id) } });
