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
import {
  listPromos,
  addPromo,
  editPromo,
  removePromo,
} from '../controllers/promoController.js';

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

// Promokodlar (CRUD)
router.get('/promos', listPromos);
router.post('/promos', addPromo);
router.put('/promos/:id', editPromo);
router.delete('/promos/:id', removePromo);

// Buyurtmalar
router.get('/orders', listOrders);
router.patch('/orders/:id', changeOrderStatus);

export default router;
