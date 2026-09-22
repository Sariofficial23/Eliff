import { getInitData } from './telegram.js';

// Backend manzili. Vercel'да VITE_API_URL = Render backend URL bo'ladi.
// Local'да bo'sh — Vite proxy /api ni localhost:5000 ga yuboradi.
const API = import.meta.env.VITE_API_URL || '';

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Telegram-Init-Data': getInitData(),
});

export const getProducts = () =>
  fetch(`${API}/api/products`, { headers: headers() }).then((r) => r.json());

export const getBanners = () =>
  fetch(`${API}/api/banners`, { headers: headers() }).then((r) => r.json());

export const createOrder = (data) =>
  fetch(`${API}/api/orders`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const getMyOrders = () =>
  fetch(`${API}/api/orders/my`, { headers: headers() }).then((r) => r.json());
