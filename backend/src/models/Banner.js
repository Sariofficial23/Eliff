import prisma from '../database/connection.js';

// Standart bannerlar (jadval yangi yaratilganda yoziladi — namuna sifatida)
const DEFAULTS = [
  { title: 'Быстрая доставка', subtitle: 'Горячие блюда за 30 минут', emoji: '🛵', color: 'p1', linkType: null, linkValue: null, sort: 1 },
  { title: 'Пиццы Elif', subtitle: '14 видов, два размера', emoji: '🍕', color: 'p2', linkType: 'category', linkValue: 'Пицца', sort: 2 },
  { title: 'Сладкие десерты', subtitle: 'Трайфл и чизкейк', emoji: '🍰', color: 'p3', linkType: 'category', linkValue: 'Десерты', sort: 3 },
];

// Jadval mavjudligini ta'minlash (prod bazaga migratsiya qo'lda ishga
// tushirilmasligi uchun — startда bir marta bajariladi). Additiv, xavfsiz.
export const ensureBannerTable = async () => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Banner" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "subtitle" TEXT,
        "image" TEXT,
        "emoji" TEXT,
        "color" TEXT,
        "linkType" TEXT,
        "linkValue" TEXT,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "sort" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Narx ustunini qo'shamiz (eski jadvallar uchun ham) — additiv, xavfsiz
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "price" TEXT;`,
    );
    const count = await prisma.banner.count();
    if (count === 0) {
      await prisma.banner.createMany({ data: DEFAULTS });
      console.log('✅ Banner jadvali yaratildi va standart bannerlar yozildi');
    }
  } catch (e) {
    console.error('Banner jadvalini tayyorlashda xato:', e.message);
  }
};

export const getActiveBanners = () =>
  prisma.banner.findMany({
    where: { active: true },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
  });

export const getAllBanners = () =>
  prisma.banner.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] });

const clean = (d) => ({
  title: d.title,
  subtitle: d.subtitle || null,
  image: d.image || null,
  emoji: d.emoji || null,
  price: d.price || null,
  color: d.color || 'p1',
  linkType: d.linkType || null,
  linkValue: d.linkValue || null,
  active: d.active === undefined ? true : !!d.active,
  sort: d.sort ? Number(d.sort) : 0,
});

export const createBanner = (data) => prisma.banner.create({ data: clean(data) });

export const updateBanner = (id, data) =>
  prisma.banner.update({ where: { id: Number(id) }, data: clean(data) });

export const deleteBanner = (id) =>
  prisma.banner.delete({ where: { id: Number(id) } });
