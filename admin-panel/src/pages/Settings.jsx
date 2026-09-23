import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../api.js';
import { formatPrice } from '../utils.js';

export default function Settings() {
  const [freeFrom, setFreeFrom] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => {
    setLoading(true);
    getSettings()
      .then((s) => {
        setFreeFrom(String(s?.freeFrom ?? 100000));
        setDeliveryFee(String(s?.deliveryFee ?? 8000));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const s = await saveSettings({
        freeFrom: Number(freeFrom) || 0,
        deliveryFee: Number(deliveryFee) || 0,
      });
      setFreeFrom(String(s.freeFrom));
      setDeliveryFee(String(s.deliveryFee));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert('Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div>
          <div className="page-title">Настройки доставки</div>
          <div className="page-sub">
            Порог бесплатной доставки и стоимость доставки
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        {loading ? (
          <div className="loader">Загрузка...</div>
        ) : (
          <>
            <div className="field">
              <label>Бесплатная доставка от (сум)</label>
              <input
                className="input"
                type="number"
                value={freeFrom}
                onChange={(e) => setFreeFrom(e.target.value)}
                placeholder="100000"
              />
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
                Заказ от этой суммы — доставка бесплатно, и появляется
                предложение Coca-Cola. Сейчас: <b>{formatPrice(Number(freeFrom) || 0)}</b>
              </div>
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label>Стоимость доставки (сум)</label>
              <input
                className="input"
                type="number"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder="8000"
              />
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
                Добавляется к заказам меньше порога. Сейчас:{' '}
                <b>{formatPrice(Number(deliveryFee) || 0)}</b>
              </div>
            </div>

            <div
              style={{
                marginTop: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <button className="btn" onClick={save} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              {saved && (
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>
                  ✓ Сохранено
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
