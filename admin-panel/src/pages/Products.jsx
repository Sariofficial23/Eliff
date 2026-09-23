import { useEffect, useState } from 'react';
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  reseedMenu,
} from '../api.js';
import { formatPrice, fileToCompressedDataUrl } from '../utils.js';

const empty = {
  name: '',
  image: '',
  description: '',
  newPrice: '',
  oldPrice: '',
  category: '',
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [reseeding, setReseeding] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    getProducts()
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setForm(empty);
    setEditId(null);
    setModal(true);
  };

  const openEdit = (p) => {
    setForm({
      name: p.name,
      image: p.image || '',
      description: p.description || '',
      newPrice: p.newPrice,
      oldPrice: p.oldPrice || '',
      category: p.category || '',
    });
    setEditId(p.id);
    setModal(true);
  };

  const save = async () => {
    if (!form.name || !form.newPrice) {
      alert("Nom va yangi narx majburiy!");
      return;
    }
    if (editId) {
      await updateProduct(editId, form);
    } else {
      await addProduct(form);
    }
    setModal(false);
    load();
  };

  const remove = async (p) => {
    if (window.confirm(`"${p.name}" o'chirilsinmi?`)) {
      await deleteProduct(p.id);
      load();
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onPickImage = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // одну и ту же картинку можно выбрать снова
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setForm((f) => ({ ...f, image: dataUrl }));
    } catch (err) {
      alert('Не удалось обработать фото. Попробуйте другое изображение.');
    } finally {
      setUploading(false);
    }
  };

  const reseed = async () => {
    if (
      !window.confirm(
        'Обновить меню из постеров?\n\nТекущий список товаров будет заменён на полное меню (пиццы, лаваши, напитки и т.д.) с фото. Заказы не тронутся.',
      )
    )
      return;
    setReseeding(true);
    try {
      const r = await reseedMenu();
      if (r && r.ok) {
        alert(`✅ Меню обновлено: ${r.count} позиций`);
        load();
      } else {
        alert('Не удалось обновить меню');
      }
    } catch (e) {
      alert('Ошибка при обновлении меню');
    } finally {
      setReseeding(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div>
          <div className="page-title">Mahsulotlar</div>
          <div className="page-sub">Jami: {products.length} ta mahsulot</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-light"
            onClick={reseed}
            disabled={reseeding}
          >
            {reseeding ? '⏳ Обновление...' : '🔄 Обновить меню из постеров'}
          </button>
          <button className="btn" onClick={openAdd}>
            + Yangi pizza
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loader">Yuklanmoqda...</div>
        ) : products.length === 0 ? (
          <div className="empty">🍕 Hozircha mahsulot yo'q</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Rasm</th>
                <th>Nomi</th>
                <th>Tarkibi</th>
                <th>Kategoriya</th>
                <th>Narxi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <img className="thumb" src={p.image} alt={p.name} />
                  </td>
                  <td>
                    <b>{p.name}</b>
                  </td>
                  <td style={{ maxWidth: 260, color: 'var(--muted)' }}>
                    {p.description}
                  </td>
                  <td>{p.category}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="price-new">{formatPrice(p.newPrice)}</span>
                    {p.oldPrice ? (
                      <span className="price-old">{formatPrice(p.oldPrice)}</span>
                    ) : null}
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn-sm btn-light"
                        onClick={() => openEdit(p)}
                      >
                        ✏️ Tahrir
                      </button>
                      <button
                        className="btn-sm btn-danger"
                        onClick={() => remove(p)}
                      >
                        🗑 O'chirish
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
            <h3>{editId ? 'Pizzani tahrirlash' : 'Yangi pizza qo\'shish'}</h3>

            <div className="field">
              <label>Nomi *</label>
              <input className="input" value={form.name} onChange={set('name')} />
            </div>
            <div className="field">
              <label>Фото блюда</label>
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
                    width: 72,
                    height: 72,
                    borderRadius: 12,
                    background: '#f1f1f4',
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                  }}
                >
                  {form.image ? (
                    <img
                      src={form.image}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    '🍽'
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label className="btn btn-light" style={{ cursor: 'pointer' }}>
                    {uploading ? '⏳ Обработка...' : '📷 Загрузить фото'}
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
                placeholder="…или вставьте ссылку на фото (URL)"
              />
            </div>
            <div className="field">
              <label>Tarkibi (vergul bilan ajrating)</label>
              <textarea
                className="input"
                value={form.description}
                onChange={set('description')}
                placeholder="Tomat sousi, Mozzarella, ..."
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Yangi narx *</label>
                <input
                  className="input"
                  type="number"
                  value={form.newPrice}
                  onChange={set('newPrice')}
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Eski narx</label>
                <input
                  className="input"
                  type="number"
                  value={form.oldPrice}
                  onChange={set('oldPrice')}
                />
              </div>
            </div>
            <div className="field">
              <label>Kategoriya</label>
              <input
                className="input"
                value={form.category}
                onChange={set('category')}
                placeholder="Klassik, Achchiq, Milliy..."
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-light"
                onClick={() => setModal(false)}
              >
                Bekor qilish
              </button>
              <button className="btn" onClick={save}>
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
