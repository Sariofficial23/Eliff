import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../models/Product.js';
import { getAllOrders, updateOrderStatus } from '../models/Order.js';
import prisma from '../database/connection.js';
import { menuData } from '../data/menu.js';
import {
  checkCloposStatus,
  cloposEnabled,
  fetchCloposProducts,
  matchCloposIds,
  sendTestOrder,
} from '../core/clopos.js';
import { markPosSent, retryPos } from '../core/posQueue.js';

// ---------- Mahsulotlar (CRUD) ----------

export const listProducts = async (req, res) => {
  try {
    res.json(await getAllProducts());
  } catch (e) {
    res.status(500).json({ error: 'Xato' });
  }
};

export const addProduct = async (req, res) => {
  try {
    const { name, image, description, newPrice, oldPrice, category } = req.body;
    if (!name || !newPrice) {
      return res.status(400).json({ error: 'Nom va yangi narx majburiy' });
    }
    const product = await createProduct({
      name,
      image,
      description,
      newPrice,
      oldPrice,
      category,
    });
    res.json(product);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Qo\'shishda xato' });
  }
};

export const editProduct = async (req, res) => {
  try {
    const product = await updateProduct(req.params.id, req.body);
    res.json(product);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Tahrirlashda xato' });
  }
};

export const removeProduct = async (req, res) => {
  try {
    await deleteProduct(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'O\'chirishda xato' });
  }
};

// ---------- Buyurtmalar ----------

export const listOrders = async (req, res) => {
  try {
    res.json(await getAllOrders());
  } catch (e) {
    res.status(500).json({ error: 'Xato' });
  }
};

export const changeOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await updateOrderStatus(req.params.id, status);
    res.json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Holatni o\'zgartirishda xato' });
  }
};

// ---------- Menyuni koddan qayta yozish (reseed) ----------
// Eski mahsulotlarni o'chirib, src/data/menu.js dagi to'liq menyuni yozadi.
// Buyurtmalar (items JSON) o'zgarmaydi. Admin parol bilan himoyalangan.
export const reseedMenu = async (req, res) => {
  try {
    // Clopos bog'lanishlarini nom bo'yicha saqlab qolamiz
    const old = await prisma.product.findMany({ select: { name: true, cloposId: true } });
    const keep = new Map(old.filter((p) => p.cloposId).map((p) => [p.name, p.cloposId]));
    await prisma.product.deleteMany();
    await prisma.product.createMany({
      data: menuData.map((m) => ({ ...m, cloposId: keep.get(m.name) ?? null })),
    });
    res.json({ ok: true, count: menuData.length });
  } catch (e) {
    console.error('Reseed xatosi:', e);
    res.status(500).json({ error: 'Menyuni yangilashda xato' });
  }
};

// ---------- Clopos (kassa) ----------

// Ulanishni tekshirish: kalitlar, avtorizatsiya, savdo turlari
export const cloposStatus = async (req, res) => {
  try {
    const status = await checkCloposStatus();
    const grouped = await prisma.order.groupBy({
      by: ['posStatus'],
      _count: { _all: true },
      where: { posStatus: { not: null } },
    });
    status.queue = Object.fromEntries(grouped.map((g) => [g.posStatus, g._count._all]));
    const products = await prisma.product.findMany({ select: { name: true, cloposId: true } });
    status.unmapped = products.filter((p) => !p.cloposId).map((p) => p.name);
    status.productCount = products.length;
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Clopos katalogi (qo'lda bog'lash uchun ro'yxat)
export const cloposProducts = async (req, res) => {
  if (!cloposEnabled()) return res.status(400).json({ error: 'Clopos sozlanmagan' });
  try {
    res.json(await fetchCloposProducts());
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};

// Nomi aniq mos kelganlarni avtomatik bog'lash (qo'lda qo'yilganlar o'zgarmaydi)
export const cloposMatch = async (req, res) => {
  if (!cloposEnabled()) return res.status(400).json({ error: 'Clopos sozlanmagan' });
  try {
    res.json(await matchCloposIds(prisma));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};

// Sinov buyurtmasi (TEST mijoz bilan, kassada rad etish mumkin)
export const cloposTestOrder = async (req, res) => {
  if (!cloposEnabled()) return res.status(400).json({ error: 'Clopos sozlanmagan' });
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.body?.productId) },
    });
    if (!product?.cloposId) {
      return res.status(400).json({ error: "Clopos ID'si bor mahsulotni tanlang" });
    }
    if (String(req.body?.phone || '').replace(/\D/g, '').length < 9) {
      return res.status(400).json({ error: 'Telefon raqamini kiriting' });
    }
    res.json(await sendTestOrder(product, req.body?.phone));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};

// Buyurtmani kassaga qayta yuborish (dublikatdan himoyalangan)
export const cloposRetryOrder = async (req, res) => {
  try {
    const r = await retryPos(req.params.id, { confirmed: req.body?.confirmed === true });
    res.status(r.ok || r.needConfirm ? 200 : 400).json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Admin kassada ko'rdi — "yuborilgan" deb belgilash
export const cloposMarkSent = async (req, res) => {
  try {
    const r = await markPosSent(req.params.id, req.body?.posId);
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
