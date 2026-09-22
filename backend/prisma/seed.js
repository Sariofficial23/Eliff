import { PrismaClient } from '@prisma/client';
import { menuData } from '../src/data/menu.js';

const prisma = new PrismaClient();

async function main() {
  // Menyuni yangilash: eski mahsulotlarni o'chirib, yangisini yozamiz.
  // (Buyurtmalar items'ni JSON sifatida saqlaydi — ular o'chmaydi.)
  await prisma.product.deleteMany();
  await prisma.product.createMany({ data: menuData });
  console.log(`✅ Elif fast food menyusi yozildi: ${menuData.length} ta mahsulot.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed xatosi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
