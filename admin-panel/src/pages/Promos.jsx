import { useEffect, useMemo, useState } from 'react';
import {
  getPromos,
  addPromo,
  updatePromo,
  deletePromo,
  getOrders,
} from '../api.js';
import { formatPrice } from '../utils.js';
import Icon from '../components/Icon.jsx';

const empty = { code: '', type: 'percent', value: '', active: true };

export default function Promos() {
  const [promos, setPromos] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([getPromos(), getOrders()])
      .then(([p, o]) => {
        setPromos(Array.isArray(p) ? p : []);
        setOrders(Array.isArray(o) ? o : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Har bir promokod bo'yicha statistika (buyurtmalardan)
  const stats = useMemo(() => {
    const m = {};
    for (const o of orders) {
      if (!o.promoCode) continue;
      const k = o.promoCode;
      if (!m[k]) m[k] = { count: 0, sales: 0, discount: 0 };
      m[k].count += 1;
      m[k].sales += o.total || 0;
      m[k].discount += o.discount || 0;
    }
    return m;
  }, [orders]);

  const openAdd = () => {
    setForm(empty);
    setEditId(null);
    setModal(true);
  };
  const openEdit = (p) => {
    setForm({
      code: p.code,
      type: p.type || 'percent',
      value: String(p.value ?? ''),
      active: p.active,
    });
    setEditId(p.id);
    setModal(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.value) {
      alert('Код и значение обязательны');
      return;
    }
    const r = editId
      ? await updatePromo(editId, form)
      : await addPromo(form);
    if (r && r.error) {
      alert(r.error);
      return;
    }
    setModal(false);
    load();
  };

  const remove = async (p) => {
    if (window.confirm(`Удалить промокод «${p.code}»?`)) {
      await deletePromo(p.id);
      load();
    }
  };

  const toggle = async (p) => {
    await updatePromo(p.id, { ...p, active: !p.active });
    load();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valLabel = (p) =>
    p.type === 'fixed' ? `−${formatPrice(p.value)}` : `−${p.value}%`;

  return (
    <div>
      <div className="toolbar">
        <div>
          <div className="page-title">Промокоды</div>
          <div className="page-sub">
            Скидочные коды и статистика продаж по ним
          </div>
        </div>
        <button className="btn" onClick={openAdd}>
          + Новый промокод
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loader">Загрузка...</div>
        ) : promos.length === 0 ? (
          <div className="empty">
            <Icon name="percent" size={44} strokeWidth={1.6} style={{ margin: '0 auto 10px' }} />
            Пока нет промокодов
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Код</th>
                <th>Скидка</th>
                <th>Статус</th>
                <th>Заказов</th>
                <th>Продажи</th>
                <th>Сумма скидок</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => {
                const s = stats[p.code] || { count: 0, sales: 0, discount: 0 };
                return (
                  <tr key={p.id}>
                    <td>
                      <b>{p.code}</b>
                    </td>
                    <td className="price-new">{valLabel(p)}</td>
                    <td>
                      <button
                        className={`btn-sm ${p.active ? 'btn-light' : 'btn-danger'}`}
                        onClick={() => toggle(p)}
                      >
                        {p.active ? (
                          <>
                            <Icon name="check" size={14} /> Активен
                          </>
                        ) : (
                          <>
                            <Icon name="eyeOff" size={14} /> Выключен
                          </>
                        )}
                      </button>
                    </td>
                    <td>
                      <span className="badge pending">{s.count}</span>
                    </td>
                    <td className="price-new">{formatPrice(s.sales)}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 700 }}>
                      {formatPrice(s.discount)}
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn-sm btn-light"
                          onClick={() => openEdit(p)}
                        >
                          <Icon name="pencil" size={15} /> Изменить
                        </button>
                        <button
                          className="btn-sm btn-danger"
                          onClick={() => remove(p)}
                        >
                          <Icon name="trash" size={15} /> Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editId ? 'Изменить промокод' : 'Новый промокод'}</h3>

            <div className="field">
              <label>Код *</label>
              <input
                className="input"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="Например: ELIF10"
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Тип скидки</label>
                <select className="input" value={form.type} onChange={set('type')}>
                  <option value="percent">Процент (%)</option>
                  <option value="fixed">Фикс. сумма (сум)</option>
                </select>
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>
                  {form.type === 'fixed' ? 'Сумма скидки' : 'Процент скидки'}
                </label>
                <input
                  className="input"
                  type="number"
                  value={form.value}
                  onChange={set('value')}
                  placeholder={form.type === 'fixed' ? '10000' : '10'}
                />
              </div>
            </div>

            <div className="field">
              <label>Статус</label>
              <select
                className="input"
                value={form.active ? '1' : '0'}
                onChange={(e) =>
                  setForm({ ...form, active: e.target.value === '1' })
                }
              >
                <option value="1">Активен</option>
                <option value="0">Выключен</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn btn-light" onClick={() => setModal(false)}>
                Отмена
              </button>
              <button className="btn" onClick={save}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
