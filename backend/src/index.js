import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from './config/default.js';
import clientRoutes from './routes/client.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { registerBot } from './routes/bot.routes.js';
import { ensureBannerTable } from './models/Banner.js';

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
app.use(express.json());

// Salomatlik tekshiruvi
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API yo'llari
app.use('/api', clientRoutes);
app.use('/api/admin', adminRoutes);

// Aksiya bannerlari jadvalini tayyorlash (yo'q bo'lsa yaratadi)
ensureBannerTable();

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
