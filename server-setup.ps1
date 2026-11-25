# ============================================================
#  Elif - noutbukda server: BIR MARTA sozlash
#  (kutubxonalar, frontend build, baza jadvallari, menyu)
#  Ishga tushirish: SERVER-SETUP.bat
# ============================================================
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$nodeDir = "C:\Program Files\nodejs"
if (Test-Path $nodeDir) { $env:Path = "$nodeDir;" + $env:Path }

function Step($t) { Write-Host "`n== $t ==" -ForegroundColor Cyan }
function Fail($t) {
    Write-Host "`nXATO: $t" -ForegroundColor Red
    Read-Host "Chiqish uchun Enter"
    exit 1
}

Step "1/6 Tekshiruv"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node.js o'rnatilmagan (nodejs.org)" }
if (-not (Test-Path "$root\backend\.env")) { Fail "backend\.env fayli yo'q. Avval uni yarating (LAPTOP.md, 4-qadam)" }
$envText = Get-Content "$root\backend\.env" -Raw
if ($envText -notmatch 'DATABASE_URL\s*=\s*"?postgresql://') { Fail "backend\.env ichida DATABASE_URL yo'q" }
if ($envText -notmatch 'BOT_TOKEN\s*=\s*"?\d+:') { Fail "backend\.env ichida BOT_TOKEN yo'q" }
Write-Host "node $(node --version) - OK"

Step "2/6 Backend kutubxonalari"
Push-Location "$root\backend"
npm install --include=dev
if ($LASTEXITCODE -ne 0) { Fail "backend npm install" }
npx prisma generate
if ($LASTEXITCODE -ne 0) { Fail "prisma generate" }
Pop-Location

# Frontendlar shu server orqali beriladi: VITE_API_URL bo'sh - so'rovlar
# o'sha manzilga (/api) ketadi. Admin panel /admin ostida ishlaydi.
$env:VITE_API_URL = ""

Step "3/6 Mini App build"
Push-Location "$root\mini-app"
npm install --include=dev
if ($LASTEXITCODE -ne 0) { Fail "mini-app npm install" }
npx vite build
if ($LASTEXITCODE -ne 0) { Fail "mini-app build" }
Pop-Location

Step "4/6 Admin panel build (/admin)"
Push-Location "$root\admin-panel"
npm install --include=dev
if ($LASTEXITCODE -ne 0) { Fail "admin-panel npm install" }
npx vite build --base=/admin/
if ($LASTEXITCODE -ne 0) { Fail "admin-panel build" }
Pop-Location

Step "5/6 Baza jadvallari"
Push-Location "$root\backend"
npx prisma db push --skip-generate
if ($LASTEXITCODE -ne 0) { Fail "prisma db push (DATABASE_URL va PostgreSQL ishlayotganini tekshiring)" }

Step "6/6 Menyu"
$count = node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); console.log(await p.product.count()); await p.`$disconnect();"
if ($LASTEXITCODE -ne 0) { Fail "bazaga ulanib bo'lmadi" }
if ([int]$count -eq 0) {
    npm run seed
    if ($LASTEXITCODE -ne 0) { Fail "menyu yozilmadi" }
} else {
    Write-Host "Bazada allaqachon $count ta mahsulot bor - menyuga tegilmadi."
}
Pop-Location

Write-Host "`n================ TAYYOR ================" -ForegroundColor Green
Write-Host " Endi SERVER-START.bat ni ishga tushiring." -ForegroundColor White
Write-Host "=======================================" -ForegroundColor Green
Read-Host "Yopish uchun Enter"
