import { useEffect, useState } from 'react';
import { initTelegram, closeApp } from './telegram.js';
import { getProducts, createOrder, getBanners } from './api.js';

import Onboarding from './components/Onboarding.jsx';
import Home from './components/Home.jsx';
import Catalog from './components/Catalog.jsx';
import Cart from './components/Cart.jsx';
import Profile from './components/Profile.jsx';
import BottomNav from './components/BottomNav.jsx';
import ProductSheet from './components/ProductSheet.jsx';

export default function App() {
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem('onboarded') === '1',
  );
  const [tab, setTab] = useState('home');
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);
  const [catalogCat, setCatalogCat] = useState('Barchasi');

  const goCatalog = (cat) => {
    if (cat) setCatalogCat(cat);
    setTab('catalog');
  };

  useEffect(() => {
    initTelegram();
    getProducts()
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
    getBanners()
      .then((data) => setBanners(Array.isArray(data) ? data : []))
      .catch(() => setBanners([]));
  }, []);

  const finishOnboarding = () => {
    localStorage.setItem('onboarded', '1');
    setOnboarded(true);
  };

  // ---- Savatcha logikasi ----
  const addToCart = (product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.id === product.id);
      if (found) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0),
    );
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const handleReorder = (items) => {
    items.forEach((it) => {
      const product = products.find((p) => p.id === it.id);
      if (product) {
        for (let n = 0; n < (it.qty || 1); n++) addToCart(product);
      }
    });
    setTab('cart');
  };

  const confirmOrder = async (orderData) => {
    const res = await createOrder(orderData);
    if (res && res.ok) {
      setCart([]);
      // Buyurtma qabul qilindi — Mini App yopiladi
      alert("Buyurtmangiz qabul qilindi! 🍕");
      closeApp();
    } else {
      alert('Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    }
  };

  if (!onboarded) {
    return <Onboarding onFinish={finishOnboarding} />;
  }

  return (
    <div className="app">
      {tab === 'home' && (
        <Home
          products={products}
          banners={banners}
          loading={loading}
          onOpen={setActiveProduct}
          onAdd={addToCart}
          onChangeQty={changeQty}
          cart={cart}
          goCatalog={goCatalog}
        />
      )}
      {tab === 'catalog' && (
        <Catalog
          products={products}
          loading={loading}
          onOpen={setActiveProduct}
          onAdd={addToCart}
          onChangeQty={changeQty}
          cart={cart}
          activeCat={catalogCat}
          setActiveCat={setCatalogCat}
        />
      )}
      {tab === 'cart' && (
        <Cart
          cart={cart}
          changeQty={changeQty}
          onConfirm={confirmOrder}
          goCatalog={() => setTab('catalog')}
        />
      )}
      {tab === 'profile' && <Profile onReorder={handleReorder} />}

      <BottomNav tab={tab} setTab={setTab} cartCount={cartCount} />

      <ProductSheet
        product={activeProduct}
        onClose={() => setActiveProduct(null)}
        onAdd={addToCart}
      />
    </div>
  );
}
