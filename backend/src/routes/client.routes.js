import { Router } from 'express';
import { telegramAuth } from '../middlewares/auth.middleware.js';
import {
  listProducts,
  placeOrder,
  myOrders,
} from '../controllers/cartController.js';
import { listActiveBanners } from '../controllers/bannerController.js';

const router = Router();

// Mini App (mijoz) uchun API yo'llari
router.get('/products', listProducts);
router.get('/banners', listActiveBanners);
router.post('/orders', telegramAuth, placeOrder);
router.get('/orders/my', telegramAuth, myOrders);

export default router;
