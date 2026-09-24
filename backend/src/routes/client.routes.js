import { Router } from 'express';
import { telegramAuth } from '../middlewares/auth.middleware.js';
import {
  listProducts,
  placeOrder,
  myOrders,
} from '../controllers/cartController.js';
import { listActiveBanners } from '../controllers/bannerController.js';
import { readSettings } from '../controllers/settingsController.js';
import { checkPromo } from '../controllers/promoController.js';

const router = Router();

// Mini App (mijoz) uchun API yo'llari
router.get('/products', listProducts);
router.get('/banners', listActiveBanners);
router.get('/settings', readSettings);
router.post('/promo/check', checkPromo);
router.post('/orders', telegramAuth, placeOrder);
router.get('/orders/my', telegramAuth, myOrders);

export default router;
