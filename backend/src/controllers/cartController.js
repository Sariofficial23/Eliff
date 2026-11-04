import { getAllProducts } from '../models/Product.js';
import {
  createOrder as createOrderModel,
  getOrdersByUser,
} from '../models/Order.js';
import { findOrCreateUser, getUserByTelegramId } from '../models/User.js';
import { sendOrderConfirmation, notifyCouriers } from './botController.js';
import { cloposEnabled } from '../core/clopos.js';
import { kickPosQueue } from '../core/posQueue.js';

// GET /api/products
export const listProducts = async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Mahsulotlarni olishda xato' });
  }
};

// POST /api/orders
export const placeOrder = async (req, res) => {
  try {
    const tgUser = req.telegramUser;
    const { items, total, phone, location } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Savatcha bo\'sh' });
    }

    const name =
      [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Mijoz';

    const user = await findOrCreateUser({
      telegramId: tgUser.id,
      name,
      phone,
    });

    const order = await createOrderModel({
      userId: user.id,
      items,
      total,
      location,
      phone,
      posStatus: cloposEnabled() ? 'pending' : null,
    });

    // Botga xabar (mijozga)
    sendOrderConfirmation(tgUser.id);

    // Kuryerlar guruhiga yuborish
    notifyCouriers(order);

    // Clopos (kassa) — navbat orqali; xato bo'lsa ham buyurtma va xabarlar saqlanadi
    kickPosQueue();

    res.json({ ok: true, orderId: order.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Buyurtma berishda xato' });
  }
};

// GET /api/orders/my
export const myOrders = async (req, res) => {
  try {
    const tgUser = req.telegramUser;
    const user = await getUserByTelegramId(tgUser.id);
    if (!user) return res.json([]);
    const orders = await getOrdersByUser(user.id);
    res.json(orders);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Buyurtmalarni olishda xato' });
  }
};
