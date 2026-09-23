import { useEffect, useMemo, useState } from 'react';
import { getOrders } from '../api.js';
import { formatPrice } from '../utils.js';
import Icon from '../components/Icon.jsx';

const FILTERS = [
  { key: 'today', label: 'Bugun / Сегодня' },
  { key: 'yesterday', label: 'Kecha / Вчера' },
  { key: 'week', label: '7 kun / Неделя' },
  { key: 'all', label: 'Hammasi / Все' },
];

const sameDay = (d, ref) => {
  const x = new Date(d);
  return (
    x.getFullYear() === ref.getFullYear() &&
    x.getMonth() === ref.getMonth() &&
    x.getDate() === ref.getDate()
  );
};

export default function Couriers() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [dateStr, setDateStr] = useState('');

  const load = () => {
    setLoading(true);
    getOrders()
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    if (dateStr) {
      const ref = new Date(dateStr + 'T12:00:00');
      return orders.filter((o) => sameDay(o.createdAt, ref));
    }
    if (filter === 'all') return orders;
    const now = new Date();
    if (filter === 'today') return orders.filter((o) => sameDay(o.createdAt, now));
    if (filter === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return orders.filter((o) => sameDay(o.createdAt, y));
    }
    if (filter === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return orders.filter((o) => new Date(o.createdAt) >= start);
    }
    return orders;
  }, [orders, filter, dateStr]);

  // Kuryerlar bo'yicha guruhlash
  const stats = useMemo(() => {
    const map = new Map();
    for (const o of filtered) {
      const key = o.courier && o.courier.trim() ? o.courier.trim() : '— Без курьера';
      if (!map.has(key))
        map.set(key, { courier: key, count: 0, delivered: 0, sum: 0 });
      const s = map.get(key);
      s.count += 1;
      s.sum += o.total || 0;
      if (o.status === 'yetkazildi') s.delivered += 1;
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [filtered]);

  const totalOrders = filtered.length;
  const totalSum = filtered.reduce((s, o) => s + (o.total || 0), 0);

  const pick = (k) => {
    setFilter(k);
    setDateStr('');
  };

  return (
    <div>
      <div className="toolbar">
        <div>
          <div className="page-title">Kuryerlar / Курьеры</div>
          <div className="page-sub">
            Заказов: {totalOrders} · Сумма:{' '}
            <b style={{ color: '#e4002b' }}>{formatPrice(totalSum)}</b>
          </div>
        </div>
        <button className="btn btn-light refresh" onClick={load}>
          <Icon name="refresh" size={16} /> Yangilash
        </button>
      </div>

      {/* Sana filtri */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        {FILTERS.map((f) => {
          const active = !dateStr && filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => pick(f.key)}
              className="btn-sm"
              style={{
                background: active ? '#e4002b' : '#f1f1f4',
                color: active ? '#fff' : '#333',
                fontWeight: 700,
              }}
            >
              {f.label}
            </button>
          );
        })}
        <input
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          className="input"
          style={{
            width: 'auto',
            padding: '7px 10px',
            border: dateStr ? '2px solid #e4002b' : undefined,
          }}
        />
        {dateStr && (
          <button className="btn-sm btn-light" onClick={() => setDateStr('')}>
            ✕ Tozalash
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="loader">Yuklanmoqda...</div>
        ) : stats.length === 0 ? (
          <div className="empty">
            <Icon name="inbox" size={44} strokeWidth={1.6} style={{ margin: '0 auto 10px' }} />
            Bu davr uchun ma'lumot yo'q
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kuryer / Курьер</th>
                <th>Buyurtmalar / Заказов</th>
                <th>Yetkazilgan / Доставлено</th>
                <th>Jami summa / Сумма</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.courier}>
                  <td>
                    <b>{s.courier}</b>
                  </td>
                  <td>
                    <span className="badge pending">{s.count}</span>
                  </td>
                  <td>
                    <span className="badge done">{s.delivered}</span>
                  </td>
                  <td className="price-new">{formatPrice(s.sum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
