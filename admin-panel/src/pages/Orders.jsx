import { useEffect, useMemo, useState } from 'react';
import { getOrders, setOrderStatus } from '../api.js';
import { formatPrice, formatDate } from '../utils.js';

const FILTERS = [
  { key: 'all', label: 'Hammasi / Все' },
  { key: 'today', label: 'Bugun / Сегодня' },
  { key: 'yesterday', label: 'Kecha / Вчера' },
  { key: 'week', label: '7 kun / Неделя' },
];

const sameDay = (d, ref) => {
  const x = new Date(d);
  return (
    x.getFullYear() === ref.getFullYear() &&
    x.getMonth() === ref.getMonth() &&
    x.getDate() === ref.getDate()
  );
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateStr, setDateStr] = useState(''); // yyyy-mm-dd (aniq sana)

  const load = () => {
    setLoading(true);
    getOrders()
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Har 15 soniyada avtomatik yangilash
    const t = setInterval(load, 15000);
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

  const total = filtered.reduce((s, o) => s + (o.total || 0), 0);

  const toggleStatus = async (o) => {
    const next = o.status === 'yetkazildi' ? 'kutilmoqda' : 'yetkazildi';
    await setOrderStatus(o.id, next);
    load();
  };

  // Manzil + GPS xarita havolasini ko'rsatish
  const renderLocation = (loc) => {
    if (!loc) return '—';
    const urlMatch = loc.match(/https?:\/\/\S+/);
    const text = loc
      .replace(/https?:\/\/\S+/, '')
      .replace(/\|/g, '')
      .trim();
    return (
      <>
        {text && <div>{text}</div>}
        {urlMatch && (
          <a
            className="map-link"
            href={urlMatch[0]}
            target="_blank"
            rel="noreferrer"
          >
            📍 Xaritada ochish
          </a>
        )}
      </>
    );
  };

  const pickFilter = (key) => {
    setFilter(key);
    setDateStr('');
  };

  return (
    <div>
      <div className="toolbar">
        <div>
          <div className="page-title">Buyurtmalar</div>
          <div className="page-sub">
            {filtered.length} ta buyurtma · Jami:{' '}
            <b style={{ color: 'var(--brand, #e4002b)' }}>{formatPrice(total)}</b>
          </div>
        </div>
        <button className="btn btn-light refresh" onClick={load}>
          🔄 Yangilash
        </button>
      </div>

      {/* Sana bo'yicha filtr */}
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
              onClick={() => pickFilter(f.key)}
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
          <button
            className="btn-sm btn-light"
            onClick={() => setDateStr('')}
          >
            ✕ Tozalash
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="loader">Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">📭 Bu davr uchun buyurtma yo'q</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Mijoz</th>
                <th>Telefon</th>
                <th>Buyurtma</th>
                <th>Manzil</th>
                <th>Jami</th>
                <th>Kuryer</th>
                <th>Sana</th>
                <th>Holati</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const items = Array.isArray(o.items) ? o.items : [];
                return (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.user?.name || '—'}</td>
                    <td>{o.phone || o.user?.phone || '—'}</td>
                    <td>
                      {items.map((i) => `${i.name} x${i.qty}`).join(', ')}
                    </td>
                    <td>{renderLocation(o.location)}</td>
                    <td className="price-new">{formatPrice(o.total)}</td>
                    <td>{o.courier || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(o.createdAt)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          o.status === 'yetkazildi' ? 'done' : 'pending'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn-sm ${
                          o.status === 'yetkazildi' ? 'btn-light' : 'btn-green'
                        }`}
                        onClick={() => toggleStatus(o)}
                      >
                        {o.status === 'yetkazildi'
                          ? '↩ Qaytarish'
                          : '✓ Yetkazildi'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
