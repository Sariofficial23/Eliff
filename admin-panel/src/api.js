// Backend manzili. Vercel'да VITE_API_URL = Render backend URL bo'ladi.
// Local'да bo'sh — Vite proxy /api ni localhost:5000 ga yuboradi.
const API = import.meta.env.VITE_API_URL || '';

const json = (r) => {
  if (r.status === 401) {
    // Parol noto'g'ri yoki muddati tugagan — login sahifasiga qaytaramiz
    localStorage.removeItem('adminPass');
    window.location.reload();
    throw new Error('unauthorized');
  }
  return r.json();
};

const H = () => ({
  'Content-Type': 'application/json',
  'X-Admin-Password': localStorage.getItem('adminPass') || '',
});

// Parolni tekshirish (login uchun)
export const checkPassword = (pw) =>
  fetch(`${API}/api/admin/products`, {
    headers: { 'X-Admin-Password': pw },
  }).then((r) => r.ok);

// Buyurtmalar
export const getOrders = () =>
  fetch(`${API}/api/admin/orders`, { headers: H() }).then(json);
export const setOrderStatus = (id, status) =>
  fetch(`${API}/api/admin/orders/${id}`, {
    method: 'PATCH',
    headers: H(),
    body: JSON.stringify({ status }),
  }).then(json);

// Mahsulotlar (CRUD)
export const getProducts = () =>
  fetch(`${API}/api/admin/products`, { headers: H() }).then(json);
export const addProduct = (data) =>
  fetch(`${API}/api/admin/products`, {
    method: 'POST',
    headers: H(),
    body: JSON.stringify(data),
  }).then(json);
export const updateProduct = (id, data) =>
  fetch(`${API}/api/admin/products/${id}`, {
    method: 'PUT',
    headers: H(),
    body: JSON.stringify(data),
  }).then(json);
export const deleteProduct = (id) =>
  fetch(`${API}/api/admin/products/${id}`, {
    method: 'DELETE',
    headers: H(),
  }).then(json);

// Menyuni koddan qayta yozish (posterdagi to'liq menyu)
export const reseedMenu = () =>
  fetch(`${API}/api/admin/seed`, { method: 'POST', headers: H() }).then(json);
