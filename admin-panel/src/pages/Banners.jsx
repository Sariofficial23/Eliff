import { useEffect, useState } from 'react';
import { getBanners, addBanner, updateBanner, deleteBanner } from '../api.js';
import { fileToCompressedDataUrl } from '../utils.js';
import Icon from '../components/Icon.jsx';

const empty = {
  title: '',
  subtitle: '',
  emoji: '',
  image: '',
  price: '',
  color: 'p1',
  linkType: '',
  linkValue: '',
  active: true,
  sort: 0,
};

const COLORS = [
  { key: 'p1', label: 'Красный' },
  { key: 'p2', label: 'Фиолетовый' },
  { key: 'p3', label: 'Оранжевый' },
];

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    getBanners()
      .then((d) => setBanners(Array.isArray(d) ? d : []))
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => {
    setForm(empty);
    setEditId(null);
    setModal(true);
  };
  const openEdit = (b) => {
    setForm({
      title: b.title || '',
      subtitle: b.subtitle || '',
      emoji: b.emoji || '',
      image: b.image || '',
      price: b.price || '',
      color: b.color || 'p1',
      linkType: b.linkType || '',
      linkValue: b.linkValue || '',
      active: b.active,
      sort: b.sort || 0,
    });
    setEditId(b.id);
    setModal(true);
  };

  const save = async () => {
    if (!form.title) {
      alert('Заголовок обязателен');
      return;
    }
    if (editId) await updateBanner(editId, form);
    else await addBanner(form);
    setModal(false);
    load();
  };

  const remove = async (b) => {
    if (window.confirm(`Удалить акцию «${b.title}»?`)) {
      await deleteBanner(b.id);
      load();
    }
  };

  const toggleActive = async (b) => {
    await updateBanner(b.id, { ...b, active: !b.active });
    load();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onPickImage = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setForm((f) => ({ ...f, image: dataUrl }));
    } catch (err) {
      alert('Не удалось обработать фото');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div>
          <div className="page-title">Акции (баннеры)</div>
          <div className="page-sub">
            Показываются вверху главной, когда клиент заходит в бот. Всего:{' '}
            {banners.length}
          </div>
        </div>
        <button className="btn" onClick={openAdd}>
          + Новая акция
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loader">Загрузка...</div>
        ) : banners.length === 0 ? (
          <div className="empty">
            <Icon name="tag" size={44} strokeWidth={1.6} style={{ margin: '0 auto 10px' }} />
            Пока нет акций
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Баннер</th>
                <th>Ссылка</th>
                <th>Статус</th>
                <th>Порядок</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      {b.image ? (
                        <img className="thumb" src={b.image} alt="" />
                      ) : (
                        b.emoji ? (
                        <div style={{ fontSize: 26 }}>{b.emoji}</div>
                      ) : (
                        <Icon name="tag" size={24} style={{ color: '#c4c4cc' }} />
                      )
                      )}
                      <div>
                        <b>{b.title}</b>
                        <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                          {b.subtitle}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--muted)' }}>
                    {b.linkType === 'category'
                      ? `Категория: ${b.linkValue}`
                      : b.linkType === 'url'
                      ? 'Ссылка'
                      : '—'}
                  </td>
                  <td>
                    <button
                      className={`btn-sm ${b.active ? 'btn-light' : 'btn-danger'}`}
                      onClick={() => toggleActive(b)}
                    >
                      {b.active ? (
                        <>
                          <Icon name="check" size={14} /> Активна
                        </>
                      ) : (
                        <>
                          <Icon name="eyeOff" size={14} /> Выключена
                        </>
                      )}
                    </button>
                  </td>
                  <td>{b.sort}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn-sm btn-light"
                        onClick={() => openEdit(b)}
                      >
                        <Icon name="pencil" size={15} /> Изменить
                      </button>
                      <button
                        className="btn-sm btn-danger"
                        onClick={() => remove(b)}
                      >
                        <Icon name="trash" size={15} /> Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editId ? 'Изменить акцию' : 'Новая акция'}</h3>

            <div className="field">
              <label>Заголовок *</label>
              <input
                className="input"
                value={form.title}
                onChange={set('title')}
                placeholder="Например: Скидка на пиццы"
              />
            </div>
            <div className="field">
              <label>Подзаголовок</label>
              <input
                className="input"
                value={form.subtitle}
                onChange={set('subtitle')}
                placeholder="Например: −20% на все 35 см"
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Эмодзи (если без картинки)</label>
                <input
                  className="input"
                  value={form.emoji}
                  onChange={set('emoji')}
                  placeholder="🍕"
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Цвет фона</label>
                <select
                  className="input"
                  value={form.color}
                  onChange={set('color')}
                >
                  {COLORS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Фото акции (необязательно)</label>
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 96,
                    height: 54,
                    borderRadius: 10,
                    background: '#f1f1f4',
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c4c4cc',
                  }}
                >
                  {form.image ? (
                    <img
                      src={form.image}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Icon name="image" size={22} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label className="btn btn-light" style={{ cursor: 'pointer' }}>
                    {uploading ? 'Обработка...' : (
                      <>
                        <Icon name="camera" size={16} /> Загрузить фото
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onPickImage}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {form.image && (
                    <button
                      type="button"
                      className="btn-sm btn-danger"
                      style={{ marginLeft: 8 }}
                      onClick={() => setForm({ ...form, image: '' })}
                    >
                      Убрать
                    </button>
                  )}
                </div>
              </div>
              <input
                className="input"
                value={form.image && form.image.startsWith('data:') ? '' : form.image}
                onChange={set('image')}
                placeholder="…или ссылка на фото (URL)"
              />
            </div>

            <div className="field">
              <label>Цена (необязательно, показывается на баннере)</label>
              <input
                className="input"
                value={form.price}
                onChange={set('price')}
                placeholder="Например: 55 000 so'm или от 45 000"
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Куда ведёт</label>
                <select
                  className="input"
                  value={form.linkType}
                  onChange={set('linkType')}
                >
                  <option value="">Никуда</option>
                  <option value="category">Категория меню</option>
                  <option value="url">Ссылка (URL)</option>
                </select>
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>
                  {form.linkType === 'category'
                    ? 'Название категории'
                    : form.linkType === 'url'
                    ? 'Адрес ссылки'
                    : 'Значение'}
                </label>
                <input
                  className="input"
                  value={form.linkValue}
                  onChange={set('linkValue')}
                  placeholder={
                    form.linkType === 'category'
                      ? 'Пицца'
                      : form.linkType === 'url'
                      ? 'https://...'
                      : ''
                  }
                  disabled={!form.linkType}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Порядок (меньше — левее)</label>
                <input
                  className="input"
                  type="number"
                  value={form.sort}
                  onChange={set('sort')}
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Показывать</label>
                <select
                  className="input"
                  value={form.active ? '1' : '0'}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.value === '1' })
                  }
                >
                  <option value="1">Да (активна)</option>
                  <option value="0">Нет (скрыта)</option>
                </select>
              </div>
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
