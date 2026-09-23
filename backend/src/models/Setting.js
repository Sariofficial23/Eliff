import prisma from '../database/connection.js';

// Sozlamalar (key-value). Standart qiymatlar:
const DEFAULTS = {
  freeFrom: 100000, // shu summadan yuqori — bepul yetkazish va Cola taklifi
  deliveryFee: 8000, // yetkazish narxi (kam buyurtmaga)
};

// Jadval mavjudligini ta'minlash + standart qiymatlar (startда bir marta)
export const ensureSettingsTable = async () => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Setting" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT NOT NULL
      );
    `);
    for (const [k, v] of Object.entries(DEFAULTS)) {
      await prisma.setting.upsert({
        where: { key: k },
        update: {},
        create: { key: k, value: String(v) },
      });
    }
  } catch (e) {
    console.error('Setting jadvalini tayyorlashda xato:', e.message);
  }
};

export const getSettings = async () => {
  try {
    const rows = await prisma.setting.findMany();
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const num = (k) => {
      const n = Number(m[k]);
      return Number.isFinite(n) && n >= 0 ? n : DEFAULTS[k];
    };
    return { freeFrom: num('freeFrom'), deliveryFee: num('deliveryFee') };
  } catch (e) {
    return { ...DEFAULTS };
  }
};

export const updateSettings = async (data) => {
  const allowed = ['freeFrom', 'deliveryFee'];
  for (const k of allowed) {
    if (data[k] === undefined || data[k] === null || data[k] === '') continue;
    const val = String(Math.max(0, Math.round(Number(data[k]) || 0)));
    await prisma.setting.upsert({
      where: { key: k },
      update: { value: val },
      create: { key: k, value: val },
    });
  }
  return getSettings();
};
