import { useState } from 'react';
import Orders from './pages/Orders.jsx';
import Products from './pages/Products.jsx';
import Banners from './pages/Banners.jsx';
import Couriers from './pages/Couriers.jsx';
import { checkPassword } from './api.js';

function Login({ onOk }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    const ok = await checkPassword(pw).catch(() => false);
    setLoading(false);
    if (ok) {
      localStorage.setItem('adminPass', pw);
      onOk();
    } else {
      setErr("Parol noto'g'ri");
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={submit}>
        <div className="login-logo">🍔 Elif Admin</div>
        <div className="login-sub">Boshqaruv paneliga kirish</div>
        <input
          className="input"
          type="password"
          placeholder="Parol"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
        />
        {err && <div className="login-err">{err}</div>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Tekshirilmoqda...' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(
    () => !!localStorage.getItem('adminPass'),
  );
  const [page, setPage] = useState('orders');

  if (!authed) return <Login onOk={() => setAuthed(true)} />;

  const logout = () => {
    localStorage.removeItem('adminPass');
    setAuthed(false);
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">🍔 Elif Admin</div>
        <button
          className={`nav-btn ${page === 'orders' ? 'active' : ''}`}
          onClick={() => setPage('orders')}
        >
          📦 Buyurtmalar
        </button>
        <button
          className={`nav-btn ${page === 'products' ? 'active' : ''}`}
          onClick={() => setPage('products')}
        >
          🍔 Mahsulotlar
        </button>
        <button
          className={`nav-btn ${page === 'banners' ? 'active' : ''}`}
          onClick={() => setPage('banners')}
        >
          🏷 Акции
        </button>
        <button
          className={`nav-btn ${page === 'couriers' ? 'active' : ''}`}
          onClick={() => setPage('couriers')}
        >
          🛵 Kuryerlar
        </button>
        <button className="nav-btn logout-btn" onClick={logout}>
          🚪 Chiqish
        </button>
      </aside>

      <main className="main">
        {page === 'orders' && <Orders />}
        {page === 'products' && <Products />}
        {page === 'banners' && <Banners />}
        {page === 'couriers' && <Couriers />}
      </main>
    </div>
  );
}
