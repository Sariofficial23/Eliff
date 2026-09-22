import {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../models/Banner.js';

// ---------- Mijoz (public) ----------
export const listActiveBanners = async (req, res) => {
  try {
    res.json(await getActiveBanners());
  } catch (e) {
    // Jadval hali yo'q bo'lsa ham ilova ishlashi uchun bo'sh ro'yxat
    res.json([]);
  }
};

// ---------- Admin ----------
export const listBanners = async (req, res) => {
  try {
    res.json(await getAllBanners());
  } catch (e) {
    res.status(500).json({ error: 'Xato' });
  }
};

export const addBanner = async (req, res) => {
  try {
    if (!req.body.title) {
      return res.status(400).json({ error: 'Sarlavha majburiy' });
    }
    res.json(await createBanner(req.body));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Qo'shishda xato" });
  }
};

export const editBanner = async (req, res) => {
  try {
    res.json(await updateBanner(req.params.id, req.body));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Tahrirlashda xato' });
  }
};

export const removeBanner = async (req, res) => {
  try {
    await deleteBanner(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "O'chirishda xato" });
  }
};
