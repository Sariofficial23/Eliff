import { getUser } from '../telegram.js';
import ProductCard from './ProductCard.jsx';
import Icon from './Icon.jsx';

// Bannerlar bo'sh bo'lsa (yoki hali yuklanmagan) — zaxira namunalar
const FALLBACK_BANNERS = [
  { id: 'f1', title: 'Быстрая доставка', subtitle: 'Горячие блюда за 30 минут', color: 'p1', emoji: '🛵' },
  { id: 'f2', title: 'Пиццы Elif', subtitle: '14 видов, два размера', color: 'p2', emoji: '🍕', linkType: 'category', linkValue: 'Пицца' },
  { id: 'f3', title: 'Сладкие десерты', subtitle: 'Трайфл и чизкейк', color: 'p3', emoji: '🍰', linkType: 'category', linkValue: 'Десерты' },
];

export default function Home({
  products,
  banners,
  loading,
  onOpen,
  onAdd,
  onChangeQty,
  cart = [],
  goCatalog,
}) {
  const user = getUser();
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const popular = products.slice(0, 8);
  const discounted = products.filter((p) => p.oldPrice);
  const qtyOf = (id) => cart.find((i) => i.id === id)?.qty || 0;

  const bannerList = banners && banners.length ? banners : FALLBACK_BANNERS;
  const onBanner = (b) => {
    if (b.linkType === 'category' && b.linkValue) goCatalog(b.linkValue);
    else if (b.linkType === 'url' && b.linkValue)
      window.open(b.linkValue, '_blank');
  };

  return (
    <div className="page">
      <div className="topbar">
        <div className="loc">
          <div>
            <div className="loc-label">Yetkazib berish manzili</div>
            <div className="loc-val">
              <span className="pin">
                <Icon name="pin" size={18} />
              </span>
              Angren shahar
            </div>
          </div>
          <div className="avatar">
            <Icon name="smile" size={22} />
          </div>
        </div>
        <div className="search" onClick={() => goCatalog('Barchasi')}>
          <span className="ico">
            <Icon name="search" size={19} />
          </span>
          <input readOnly placeholder="Taom qidirish..." />
        </div>
      </div>

      {/* Aksiya bannerlari (admin panelдан boshqariladi) */}
      <div className="rail">
        {bannerList.map((b) => (
          <div
            key={b.id}
            className={`promo ${b.color || 'p1'}`}
            style={
              b.image
                ? {
                    backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.45), rgba(0,0,0,.05)), url(${b.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
            onClick={() => onBanner(b)}
          >
            <h3>{b.title}</h3>
            {b.subtitle && <p>{b.subtitle}</p>}
            {b.price && <div className="promo-price">{b.price}</div>}
            {!b.image && b.emoji && <div className="emoji">{b.emoji}</div>}
          </div>
        ))}
      </div>

      {/* Kategoriyalar */}
      <div className="cats">
        {categories.map((c) => (
          <div key={c} className="chip" onClick={() => goCatalog(c)}>
            {c}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="skel-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="skel" key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="sec">
            <h2>
              <Icon name="flame" size={20} className="sec-ico" style={{ color: 'var(--brand)' }} />
              Mashhur
            </h2>
            <a onClick={() => goCatalog('Barchasi')}>Barchasi</a>
          </div>
          <div className="hrail">
            {popular.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onOpen={onOpen}
                onAdd={onAdd}
                onChangeQty={onChangeQty}
                qty={qtyOf(p.id)}
              />
            ))}
          </div>

          {discounted.length > 0 && (
            <>
              <div className="sec">
                <h2>
                  <Icon name="tag" size={20} className="sec-ico" style={{ color: 'var(--brand)' }} />
                  Chegirmalar
                </h2>
              </div>
              <div className="hrail">
                {discounted.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onOpen={onOpen}
                    onAdd={onAdd}
                    onChangeQty={onChangeQty}
                    qty={qtyOf(p.id)}
                  />
                ))}
              </div>
            </>
          )}

          <div className="sec">
            <h2>Butun menyu</h2>
          </div>
          <div className="grid">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onOpen={onOpen}
                onAdd={onAdd}
                onChangeQty={onChangeQty}
                qty={qtyOf(p.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
