import { getSettings, updateSettings } from '../models/Setting.js';

// Public (mini-app) va admin uchun o'qish
export const readSettings = async (req, res) => {
  res.json(await getSettings());
};

// Admin: saqlash
export const saveSettings = async (req, res) => {
  try {
    res.json(await updateSettings(req.body));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Sozlamalarni saqlashda xato' });
  }
};
