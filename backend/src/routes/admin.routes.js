import { Router } from 'express';
import { adminAuth } from '../middlewares/auth.middleware.js';
import {
  listProducts,
  addProduct,
  editProduct,
  removeProduct,
  listOrders,
  changeOrderStatus,
  reseedMenu,
  cloposStatus,
  cloposProducts,
  cloposMatch,
  cloposTestOrder,
  cloposRetryOrder,
  cloposMarkSent,
} from '../controllers/adminController.js';
import {
  listBanners,
  addBanner,
  editBanner,
  removeBanner,
} from '../controllers/bannerController.js';
import {
  readSettings,
  saveSettings,
} from '../controllers/settingsController.js';

const router = Router();

// Barcha admin yo'llari parol bilan himoyalanadi
router.use(adminAuth);

// Mahsulotlar (CRUD)
router.get('/products', listProducts);
router.post('/products', addProduct);
router.put('/products/:id', editProduct);
router.delete('/products/:id', removeProduct);

// Menyuni koddan qayta yozish (posterdagi to'liq menyu)
router.post('/seed', reseedMenu);

// Aksiya bannerlari (CRUD)
router.get('/banners', listBanners);
router.post('/banners', addBanner);
router.put('/banners/:id', editBanner);
router.delete('/banners/:id', removeBanner);

// Sozlamalar (yetkazish)
router.get('/settings', readSettings);
router.put('/settings', saveSettings);

// Buyurtmalar
router.get('/orders', listOrders);
router.patch('/orders/:id', changeOrderStatus);

// Clopos (kassa)
router.get('/clopos/status', cloposStatus);
router.get('/clopos/products', cloposProducts);
router.post('/clopos/match', cloposMatch);
router.post('/clopos/test-order', cloposTestOrder);
router.post('/orders/:id/pos-retry', cloposRetryOrder);
router.post('/orders/:id/pos-mark-sent', cloposMarkSent);

export default router;
