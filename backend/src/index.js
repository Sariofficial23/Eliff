import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import config from './config/default.js';
import clientRoutes from './routes/client.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { registerBot } from './routes/bot.routes.js';
import { ensureBannerTable } from './models/Banner.js';
import { ensureSettingsTable } from './models/Setting.js';
import { ensurePosColumns, startPosWorker } from './core/posQueue.js';

// Xavfsizlik to'ri: kutilmagan xatolar jarayonni o'chirmasin (bot 24/7 ishlashi uchun)
process.on('unhandledRejection', (e) =>
  console.error('Unhandled rejection:', e?.message || e),
);
process.on('uncaughtException', (e) =>
  console.error('Uncaught exception:', e?.message || e),
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const miniDist = path.join(__dirname, '../../mini-app/dist');
const adminDist = path.join(__dirname, '../../admin-panel/dist');

const app = express();

app.use(cors());
// Limit oshiriladi — admin panelдан rasm (base64) yuklash uchun
app.use(express.json({ limit: '8mb' }));

// Salomatlik tekshiruvi
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API yo'llari
app.use('/api', clientRoutes);
app.use('/api/admin', adminRoutes);

// Aksiya bannerlari va sozlamalar jadvallarini tayyorlash (yo'q bo'lsa yaratadi)
ensureBannerTable();
ensureSettingsTable();
// Clopos ustunlari (Product.cloposId, Order.pos*) — so'rovlardan oldin tayyor bo'lsin
await ensurePosColumns();
startPosWorker();

// Botni ishga tushirish
registerBot();

// Frontendlar build qilingan bo'lsa — shu serverда beriladi (production)
if (fs.existsSync(miniDist)) {
  // Admin Panel — /admin
  app.use('/admin', express.static(adminDist));
  app.get('/admin/*', (req, res) =>
    res.sendFile(path.join(adminDist, 'index.html')),
  );

  // Mini App — /
  app.use(express.static(miniDist));
  app.get('*', (req, res) => res.sendFile(path.join(miniDist, 'index.html')));

  console.log('🖥  Mini App (/) va Admin Panel (/admin) shu serverда beriladi');
} else {
  // Development: frontendlar alohida Vite serverда ishlaydi
  app.get('/', (req, res) => res.json({ status: 'Elif API ishlayapti 🍔' }));
}

app.listen(config.port, () => {
  console.log(`✅ Server ishlayapti: http://localhost:${config.port}`);
});

// ---- Keep-alive ----
// Render (free) 15 daqiqa trafik bo'lmasa serverni uxlatib qo'yadi.
// Server o'zining /health manzilini har 10 daqiqada "ping" qilib turadi —
// shunda uxlab qolmaydi va buyurtmalar darhol qabul qilinadi. Bepul.
const KEEP_URL = process.env.RENDER_EXTERNAL_URL;
if (KEEP_URL) {
  const client = KEEP_URL.startsWith('https') ? https : http;
  const ping = () => {
    client
      .get(`${KEEP_URL}/health`, (res) => res.resume())
      .on('error', () => {});
  };
  setInterval(ping, 10 * 60 * 1000); // har 10 daqiqada
  console.log('⏰ Keep-alive yoqildi:', KEEP_URL);
}
