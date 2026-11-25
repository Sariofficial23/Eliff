# 💻 Сервер на ноутбуке (вместо Render + Neon)

Бот, API, мини-приложение и админка работают на ноутбуке, база — PostgreSQL
там же. Наружу всё открывается бесплатным туннелем Cloudflare. Vercel и Render
не нужны.

Условия: ноутбук **всегда включён**, подключён к зарядке и интернету, сон
отключён.

---

## 1. Установить (один раз)

| Программа | Где |
|---|---|
| Node.js LTS | nodejs.org |
| PostgreSQL 16 | postgresql.org/download/windows. **Запомните пароль `postgres`** |
| Git | git-scm.com |
| cloudflared | PowerShell: `winget install Cloudflare.cloudflared` |

## 2. Скачать проект

```
cd C:\
git clone https://github.com/Sariofficial23/Eliff.git
```

## 3. Создать базу

```
& "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres elif
```

## 4. Файл `C:\Eliff\backend\.env`

Создайте его в Блокноте и сохраните с типом **«Все файлы»** и именем `.env`:

```
DATABASE_URL="postgresql://postgres:ПАРОЛЬ_POSTGRES@localhost:5432/elif"
BOT_TOKEN="токен бота"
ADMIN_PASSWORD="пароль админки"
COURIER_GROUP_ID="id группы курьеров"
MINI_APP_URL=""
NODE_ENV=production
PORT=5000
CLOPOS_CLIENT_ID="..."
CLOPOS_CLIENT_SECRET="..."
CLOPOS_BRAND="eliffastfood"
CLOPOS_INTEGRATOR_ID="..."
CLOPOS_VENUE_ID="1"
CLOPOS_COLA_PRODUCT_ID="215"
```

Значения берите в Render → `elif-backend` → Environment (значок глаза). `MINI_APP_URL`
оставьте пустым: скрипт заполнит его сам.

## 5. Настройка — двойной клик `SERVER-SETUP.bat` (один раз)

Скрипт ставит зависимости, собирает мини-приложение и админку, создаёт таблицы
и записывает меню (только если база пустая). Повторно запускайте его после
`git pull`, когда меняется код.

## 6. Остановить Render

Render → `elif-backend` → Settings → **Suspend**. Два сервера с одним токеном
бота мешают друг другу.

## 7. Запуск — двойной клик `SERVER-START.bat`

Скрипт:
- открывает туннель и получает адрес `https://….trycloudflare.com`;
- записывает его в `MINI_APP_URL` и запускает бота: кнопка меню в Telegram
  сама переключится на новый адрес;
- каждые 20 секунд проверяет сервер и туннель и перезапускает упавший;
  при новом адресе туннеля перезапускает бота.

Окно **не закрывать**. Остановить всё: `STOP.bat`.

Адреса показываются в окне:
- мини-приложение: `https://….trycloudflare.com`;
- админка: `https://….trycloudflare.com/admin`.

После первого запуска откройте админку → Настройки → «Касса Clopos» →
**Связать товары по названию**.

## 8. Автозапуск после перезагрузки

1. `Win + R` → `shell:startup` → Enter.
2. В открывшуюся папку положите **ярлык** на `C:\Eliff\SERVER-START.bat`
   (правой кнопкой по файлу → «Создать ярлык» → перенести).
3. Включите автоматический вход в Windows без пароля, иначе скрипт стартует
   только после входа.
4. Параметры → Система → Питание: **Сон — Никогда**, при закрытии крышки —
   **Ничего не делать**.

## Важно

- Адрес trycloudflare меняется при каждом перезапуске туннеля. Бот подхватывает
  его сам, но **старые ссылки на админку перестанут работать**: берите
  актуальный адрес из окна `SERVER-START.bat`.
- Нет света или интернета — бот не принимает заказы.
- Резервная копия базы, раз в день, например:
  `& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres elif > C:\Eliff\backup.sql`
- Старые заказы, клиентов и баннеры из Neon можно перенести позже, когда Neon
  снова станет доступен (после 1-го числа месяца).
