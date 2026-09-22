import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../models/Product.js';
import { getAllOrders, updateOrderStatus } from '../models/Order.js';
import prisma from '../database/connection.js';
import { menuData } from '../data/menu.js';

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
    await prisma.product.deleteMany();
    await prisma.product.createMany({ data: menuData });
    res.json({ ok: true, count: menuData.length });
  } catch (e) {
    console.error('Reseed xatosi:', e);
    res.status(500).json({ error: 'Menyuni yangilashda xato' });
  }
};
