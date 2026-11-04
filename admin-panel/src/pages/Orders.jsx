import { useEffect, useMemo, useState } from 'react';
import { getOrders, setOrderStatus, posRetry, posMarkSent } from '../api.js';
import { formatPrice, formatDate } from '../utils.js';
import Icon from '../components/Icon.jsx';

const FILTERS = [
  { key: 'all', label: 'Hammasi / Все' },
  { key: 'today', label: 'Bugun / Сегодня' },
  { key: 'yesterday', label: 'Kecha / Вчера' },
  { key: 'week', label: '7 kun / Неделя' },
];

// Clopos (kassa) holati
const POS_LABEL = {
  pending: { text: 'Navbatda', cls: 'pending' },
  preparing: { text: 'Yuborilmoqda', cls: 'pending' },
  sending: { text: 'Yuborilmoqda', cls: 'pending' },
  sent: { text: 'Kassada', cls: 'done' },
  error: { text: 'Xato', cls: 'pos-bad' },
  unknown: { text: "Noma'lum", cls: 'pos-bad' },
};

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
  const [now, setNow] = useState(Date.now()); // kechikishni hisoblash uchun

  const LATE_MIN = 10; // необработанный заказ старше 10 минут — предупреждение

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
    // Har 20 soniyada "hozir"ni yangilaymiz — kechikkan buyurtmalar yonishi uchun
    const tick = setInterval(() => setNow(Date.now()), 20000);
    return () => {
      clearInterval(t);
      clearInterval(tick);
    };
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

  // Clopos ustuni faqat integratsiya ishlatilgan bo'lsa ko'rinadi
  const showPos = orders.some((o) => o.posStatus);

  const retryPos = async (o) => {
    let r = await posRetry(o.id);
    if (r?.needConfirm) {
      const yes = window.confirm(
        `${r.error}\n\nClopos kassasida ELIF-${o.id} buyurtmasi YO'QLIGINI tekshirdingizmi? ` +
          'OK — qayta yuborish (kassada bo\'lsa — dublikat bo\'ladi).',
      );
      if (!yes) return;
      r = await posRetry(o.id, true);
    }
    if (r && !r.ok) alert(r.error || 'Xato');
    else if (r?.found) alert('Buyurtma kassada topildi ✅');
    load();
  };

  const markSent = async (o) => {
    const posId = window.prompt(
      `ELIF-${o.id} kassada bor bo'lsa — Clopos buyurtma raqamini kiriting (ixtiyoriy):`,
      '',
    );
    if (posId === null) return;
    const r = await posMarkSent(o.id, posId.trim());
    if (r && !r.ok) alert(r.error || 'Xato');
    load();
  };

  const renderPos = (o) => {
    if (!o.posStatus) return <span style={{ color: '#999' }}>—</span>;
    const l = POS_LABEL[o.posStatus] || { text: o.posStatus, cls: 'pending' };
    const bad = o.posStatus === 'error' || o.posStatus === 'unknown';
    return (
      <div className="status-cell">
        <span className={`badge ${l.cls}`}>{l.text}</span>
        {o.posId && <div style={{ fontSize: 12, color: '#666' }}>ID {o.posId}</div>}
        {o.posError && (
          <div style={{ fontSize: 12, color: bad ? '#c00' : '#a60', maxWidth: 220 }}>
            {o.posError}
          </div>
        )}
        {bad && (
          <>
            <button className="btn-sm btn-light" onClick={() => retryPos(o)}>
              <Icon name="refresh" size={14} /> Qayta yuborish
            </button>
            <button className="btn-sm btn-light" onClick={() => markSent(o)}>
              <Icon name="check" size={14} /> Kassada bor
            </button>
          </>
        )}
      </div>
    );
  };

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
            className="map-link icon-txt"
            href={urlMatch[0]}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="pin" size={14} /> Xaritada ochish
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
          <Icon name="refresh" size={16} /> Yangilash
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
          <div className="empty">
            <Icon name="inbox" size={44} strokeWidth={1.6} style={{ margin: '0 auto 10px' }} />
            Bu davr uchun buyurtma yo'q
          </div>
        ) : (
          <table className="orders-table">
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
                {showPos && <th>Kassa</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const items = Array.isArray(o.items) ? o.items : [];
                const pending = o.status !== 'yetkazildi';
                const ageMin = (now - new Date(o.createdAt).getTime()) / 60000;
                const overdue = pending && ageMin >= LATE_MIN;
                const rowCls = overdue
                  ? 'row-overdue'
                  : pending
                  ? 'row-new'
                  : '';
                return (
                  <tr key={o.id} className={rowCls}>
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
                      <div className="status-cell">
                        <span
                          className={`badge ${
                            o.status === 'yetkazildi' ? 'done' : 'pending'
                          }`}
                        >
                          {o.status}
                        </span>
                        {overdue && (
                          <div className="warn-late icon-txt">
                            <Icon name="alert" size={13} /> Kechikdi ·{' '}
                            {Math.floor(ageMin)} daq
                          </div>
                        )}
                        <button
                          className={`btn-sm ${
                            o.status === 'yetkazildi' ? 'btn-light' : 'btn-green'
                          }`}
                          onClick={() => toggleStatus(o)}
                        >
                          {o.status === 'yetkazildi' ? (
                            <>
                              <Icon name="refresh" size={14} /> Qaytarish
                            </>
                          ) : (
                            <>
                              <Icon name="check" size={14} /> Yetkazildi
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                    {showPos && <td>{renderPos(o)}</td>}
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
