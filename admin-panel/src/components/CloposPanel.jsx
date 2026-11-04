import { useEffect, useState } from 'react';
import {
  getCloposStatus,
  getCloposProducts,
  matchClopos,
  cloposTestOrder,
  getProducts,
} from '../api.js';
import { formatPrice } from '../utils.js';

const QUEUE_LABEL = {
  pending: 'в очереди',
  preparing: 'отправляется',
  sending: 'отправляется',
  sent: 'в кассе',
  error: 'ошибка',
  unknown: 'неизвестно',
};

const muted = { color: 'var(--muted)', fontSize: 12 };

// Касса Clopos: проверка подключения, сопоставление товаров, пробный заказ
export default function CloposPanel() {
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState('');
  const [catalog, setCatalog] = useState(null);
  const [matchRes, setMatchRes] = useState(null);
  const [testRes, setTestRes] = useState(null);
  const [mapped, setMapped] = useState([]);
  const [testId, setTestId] = useState('');

  const check = () => {
    setBusy('check');
    getCloposStatus()
      .then(setSt)
      .catch(() => setSt({ auth: { ok: false, error: 'Нет связи с backend' } }))
      .finally(() => setBusy(''));
  };
  useEffect(check, []);

  const loadCatalog = async () => {
    setBusy('catalog');
    try {
      const r = await getCloposProducts();
      setCatalog(Array.isArray(r) ? r : { error: r?.error });
    } finally {
      setBusy('');
    }
  };

  const match = async () => {
    setBusy('match');
    try {
      setMatchRes(await matchClopos());
      check();
    } finally {
      setBusy('');
    }
  };

  const openTest = async () => {
    const list = await getProducts();
    setMapped((Array.isArray(list) ? list : []).filter((p) => p.cloposId));
    setTestRes({ open: true });
  };

  const sendTest = async () => {
    if (!testId) return;
    if (!window.confirm('В кассу Clopos уйдёт ТЕСТОВЫЙ заказ (клиент «TEST Elif bot»). Его можно отклонить. Отправить?')) return;
    setBusy('test');
    try {
      setTestRes({ open: true, result: await cloposTestOrder(Number(testId)) });
    } finally {
      setBusy('');
    }
  };

  const ok = st?.auth?.ok;

  return (
    <div className="card" style={{ padding: 24, maxWidth: 720, marginTop: 20 }}>
      <div className="page-title" style={{ fontSize: 18 }}>Касса Clopos</div>
      <div style={muted}>
        Заказы из бота попадают в Clopos с ручным подтверждением — кассир принимает их в
        разделе онлайн-заказов кассы.
      </div>

      {!st ? (
        <div className="loader">Проверка...</div>
      ) : (
        <div style={{ marginTop: 14, lineHeight: 1.7 }}>
          <div>
            Интеграция:{' '}
            <b style={{ color: st.enabled ? 'var(--green)' : '#c00' }}>
              {st.enabled ? 'включена' : 'выключена'}
            </b>
            {st.missing?.length > 0 && (
              <span style={muted}> — не заданы в Render: {st.missing.join(', ')}</span>
            )}
          </div>
          {st.enabled && (
            <>
              <div>
                Авторизация:{' '}
                <b style={{ color: ok ? 'var(--green)' : '#c00' }}>
                  {ok ? 'успешно' : `ошибка — ${st.auth?.error}`}
                </b>
              </div>
              <div>
                Филиал (venue_id): <b>{st.venueId}</b> · бренд: <b>{st.brand}</b>
              </div>
              {st.saleTypes && (
                <div>
                  Типы продаж:{' '}
                  {st.saleTypes.map((t) => `${t.id} — ${t.name} (${t.system_type})`).join('; ')}
                  {st.saleTypeDelivery ? (
                    <span style={muted}> · доставка задана вручную: {st.saleTypeDelivery}</span>
                  ) : null}
                </div>
              )}
              {st.saleTypesError && <div style={{ color: '#c00' }}>{st.saleTypesError}</div>}
              <div>
                Товары без Clopos ID: <b>{st.unmapped?.length || 0}</b> из {st.productCount}
                {st.unmapped?.length > 0 && (
                  <div style={muted}>
                    {st.unmapped.slice(0, 30).join(', ')}
                    {st.unmapped.length > 30 ? ' …' : ''} — такие заказы НЕ уйдут в кассу, пока
                    товару не назначен ID.
                  </div>
                )}
              </div>
              {!st.colaProductId && (
                <div style={muted}>
                  Coca-Cola: CLOPOS_COLA_PRODUCT_ID не задан — заказы с колой будут с ошибкой.
                </div>
              )}
              {st.queue && Object.keys(st.queue).length > 0 && (
                <div>
                  Заказы:{' '}
                  {Object.entries(st.queue)
                    .map(([k, v]) => `${QUEUE_LABEL[k] || k}: ${v}`)
                    .join(' · ')}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        <button className="btn btn-light" onClick={check} disabled={!!busy}>
          {busy === 'check' ? 'Проверка...' : 'Проверить подключение'}
        </button>
        {ok && (
          <>
            <button className="btn btn-light" onClick={loadCatalog} disabled={!!busy}>
              {busy === 'catalog' ? 'Загрузка...' : 'Каталог Clopos'}
            </button>
            <button className="btn btn-light" onClick={match} disabled={!!busy}>
              {busy === 'match' ? '...' : 'Связать товары по названию'}
            </button>
            <button className="btn btn-light" onClick={openTest} disabled={!!busy}>
              Пробный заказ
            </button>
          </>
        )}
      </div>

      {matchRes && (
        <div style={{ marginTop: 14, fontSize: 13 }}>
          {matchRes.error ? (
            <span style={{ color: '#c00' }}>{matchRes.error}</span>
          ) : (
            <>
              Связано новых: <b>{matchRes.matched}</b> (в Clopos {matchRes.cloposCount} товаров).
              {matchRes.notFound?.length > 0 && (
                <div style={muted}>
                  Не найдено по названию: {matchRes.notFound.join(', ')} — укажите ID вручную в
                  «Товары → Изменить».
                </div>
              )}
              {matchRes.priceDiff?.length > 0 && (
                <div style={{ color: '#a60' }}>
                  Цена отличается: {matchRes.priceDiff.join('; ')}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {testRes?.open && (
        <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 'auto' }} value={testId} onChange={(e) => setTestId(e.target.value)}>
            <option value="">— товар —</option>
            {mapped.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (ID {p.cloposId})
              </option>
            ))}
          </select>
          <button className="btn" onClick={sendTest} disabled={!testId || !!busy}>
            {busy === 'test' ? 'Отправка...' : 'Отправить тест'}
          </button>
          {testRes.result && (
            <pre style={{ width: '100%', fontSize: 12, whiteSpace: 'pre-wrap', margin: 0 }}>
              {testRes.result.ok ? '✅ ' : '❌ '}
              {JSON.stringify(testRes.result.response ?? testRes.result, null, 2).slice(0, 800)}
            </pre>
          )}
        </div>
      )}

      {Array.isArray(catalog) && (
        <div style={{ marginTop: 16, maxHeight: 320, overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Clopos ID</th>
                <th>Название</th>
                <th>Категория</th>
                <th>Цена</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((c) => (
                <tr key={c.cloposId}>
                  <td>{c.cloposId}</td>
                  <td>{c.name}</td>
                  <td>{c.category}</td>
                  <td>{formatPrice(c.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {catalog?.error && <div style={{ color: '#c00', marginTop: 10 }}>{catalog.error}</div>}
    </div>
  );
}
