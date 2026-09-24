import {
  getPromoByCode,
  computeDiscount,
  getAllPromos,
  createPromo,
  updatePromo,
  deletePromo,
} from '../models/Promo.js';

// ---- Public: promokodni tekshirish ----
// POST /api/promo/check  { code, amount }
export const checkPromo = async (req, res) => {
  try {
    const { code, amount } = req.body;
    if (!code) return res.json({ ok: false, error: 'Promokod kiriting' });
    const promo = await getPromoByCode(code);
    if (!promo || !promo.active) {
      return res.json({ ok: false, error: "Promokod noto'g'ri yoki tugagan" });
    }
    const discount = computeDiscount(promo, amount);
    if (discount <= 0) {
      return res.json({ ok: false, error: 'Bu buyurtmaga qo\'llab bo\'lmaydi' });
    }
    res.json({
      ok: true,
      code: promo.code,
      type: promo.type,
      value: promo.value,
      discount,
    });
  } catch (e) {
    res.json({ ok: false, error: 'Xatolik' });
  }
};

// ---- Admin ----
export const listPromos = async (req, res) => {
  try {
    res.json(await getAllPromos());
  } catch (e) {
    res.status(500).json({ error: 'Xato' });
  }
};

export const addPromo = async (req, res) => {
  try {
    if (!req.body.code) return res.status(400).json({ error: 'Kod majburiy' });
    res.json(await createPromo(req.body));
  } catch (e) {
    if (e.code === 'P2002')
      return res.status(400).json({ error: 'Bunday kod allaqachon bor' });
    console.error(e);
    res.status(500).json({ error: "Qo'shishda xato" });
  }
};

export const editPromo = async (req, res) => {
  try {
    res.json(await updatePromo(req.params.id, req.body));
  } catch (e) {
    if (e.code === 'P2002')
      return res.status(400).json({ error: 'Bunday kod allaqachon bor' });
    console.error(e);
    res.status(500).json({ error: 'Tahrirlashda xato' });
  }
};

export const removePromo = async (req, res) => {
  try {
    await deletePromo(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "O'chirishda xato" });
  }
};
