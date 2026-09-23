import { useState } from 'react';
import Orders from './pages/Orders.jsx';
import Products from './pages/Products.jsx';
import Banners from './pages/Banners.jsx';
import Couriers from './pages/Couriers.jsx';
import Settings from './pages/Settings.jsx';
import Icon from './components/Icon.jsx';
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
        <div className="login-logo icon-txt" style={{ justifyContent: 'center' }}>
          <span className="brand-mark">
            <Icon name="burger" size={20} />
          </span>
          Elif Admin
        </div>
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
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sbCollapsed') === '1',
  );

  if (!authed) return <Login onOk={() => setAuthed(true)} />;

  const logout = () => {
    localStorage.removeItem('adminPass');
    setAuthed(false);
  };

  const toggleSidebar = () => {
    setCollapsed((c) => {
      localStorage.setItem('sbCollapsed', c ? '0' : '1');
      return !c;
    });
  };

  const nav = [
    { key: 'orders', icon: 'box', label: 'Buyurtmalar' },
    { key: 'products', icon: 'burger', label: 'Mahsulotlar' },
    { key: 'banners', icon: 'tag', label: 'Акции' },
    { key: 'couriers', icon: 'bike', label: 'Kuryerlar' },
    { key: 'settings', icon: 'settings', label: 'Настройки' },
  ];

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="logo">
            <span className="brand-mark">
              <Icon name="burger" size={20} />
            </span>
            <span className="nav-label">Elif Admin</span>
          </div>
          <button
            className="sb-toggle"
            onClick={toggleSidebar}
            title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            <Icon name={collapsed ? 'menu' : 'chevronLeft'} size={18} />
          </button>
        </div>

        {nav.map((n) => (
          <button
            key={n.key}
            className={`nav-btn ${page === n.key ? 'active' : ''}`}
            onClick={() => setPage(n.key)}
            title={n.label}
          >
            <Icon name={n.icon} size={19} />
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
        <button
          className="nav-btn logout-btn"
          onClick={logout}
          title="Chiqish"
        >
          <Icon name="logout" size={19} />
          <span className="nav-label">Chiqish</span>
        </button>
      </aside>

      <main className="main">
        {page === 'orders' && <Orders />}
        {page === 'products' && <Products />}
        {page === 'banners' && <Banners />}
        {page === 'couriers' && <Couriers />}
        {page === 'settings' && <Settings />}
      </main>
    </div>
  );
}
