# ============================================================
#  Elif - noutbukda server: ISHGA TUSHIRISH va KUZATISH
#  Backend + bot (port 5000) + Cloudflare tunnel (HTTPS manzil).
#  Tunnel manzili har safar yangi bo'ladi: skript uni .env dagi
#  MINI_APP_URL ga yozadi va backendni qayta ishga tushiradi -
#  bot menyu tugmasi o'zi yangilanadi.
#  Biror qism to'xtab qolsa - skript uni qayta ishga tushiradi.
#  Bu oynani YOPMANG. To'xtatish: STOP.bat
# ============================================================
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backend = "$root\backend"
$envFile = "$backend\.env"
$port = 5000
$nodeDir = "C:\Program Files\nodejs"
if (Test-Path $nodeDir) { $env:Path = "$nodeDir;" + $env:Path }

function Log($t, $c = "White") { Write-Host ("[{0:HH:mm:ss}] {1}" -f (Get-Date), $t) -ForegroundColor $c }
function Fail($t) { Log "XATO: $t" Red; Read-Host "Chiqish uchun Enter"; exit 1 }

# --- dasturlarni topish ---
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { Fail "Node.js topilmadi" }
$cf = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cf) {
    foreach ($p in @("C:\Program Files (x86)\cloudflared\cloudflared.exe", "C:\Program Files\cloudflared\cloudflared.exe")) {
        if (Test-Path $p) { $cf = $p; break }
    }
}
if (-not $cf) { Fail "cloudflared topilmadi (PowerShell: winget install Cloudflare.cloudflared)" }
if (-not (Test-Path $envFile)) { Fail "backend\.env yo'q" }
if (-not (Test-Path "$root\mini-app\dist\index.html")) { Fail "Frontend build yo'q - avval SERVER-SETUP.bat" }

# Eski jarayonlar qolgan bo'lsa (ikki bot bitta tokenda ishlamasin)
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*src/index.js*" -or $_.CommandLine -like "*src\index.js*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

$script:backendProc = $null
$script:tunnelProc = $null
$script:url = $null

function Set-MiniAppUrl($u) {
    $text = Get-Content $envFile -Raw
    if ($text -match '(?m)^MINI_APP_URL=.*$') {
        $text = [regex]::Replace($text, '(?m)^MINI_APP_URL=.*$', "MINI_APP_URL=`"$u`"")
    } else {
        $text = $text.TrimEnd() + "`r`nMINI_APP_URL=`"$u`"`r`n"
    }
    [System.IO.File]::WriteAllText($envFile, $text, (New-Object System.Text.UTF8Encoding($false)))
}

function Start-Tunnel {
    $log = "$env:TEMP\elif_tunnel.log"
    Remove-Item $log -ErrorAction SilentlyContinue
    $script:tunnelProc = Start-Process -FilePath $cf -ArgumentList "tunnel", "--url", "http://localhost:$port" `
        -RedirectStandardError $log -WindowStyle Minimized -PassThru
    for ($i = 0; $i -lt 45; $i++) {
        Start-Sleep -Seconds 2
        if (Test-Path $log) {
            $m = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue |
                Select-Object -First 1
            if ($m) { $script:url = $m.Matches[0].Value; return $true }
        }
    }
    return $false
}

function Stop-Backend {
    if ($script:backendProc -and -not $script:backendProc.HasExited) {
        Stop-Process -Id $script:backendProc.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
}

function Start-Backend {
    Stop-Backend
    # Yangi oynada - loglar ko'rinib turadi
    $script:backendProc = Start-Process -FilePath $node -ArgumentList "src/index.js" `
        -WorkingDirectory $backend -PassThru
    Log "Backend ishga tushdi (PID $($script:backendProc.Id))" Green
}

function Show-Info {
    Write-Host ""
    Write-Host "==================== ISHLAYAPTI ====================" -ForegroundColor Green
    Write-Host " Mini App : $($script:url)" -ForegroundColor White
    Write-Host " Admin    : $($script:url)/admin" -ForegroundColor White
    Write-Host " Tekshirish: $($script:url)/api/products" -ForegroundColor White
    Write-Host " Telegramda /start - menyu tugmasi yangi manzilda." -ForegroundColor White
    Write-Host " Bu oynani YOPMANG. To'xtatish: STOP.bat" -ForegroundColor Yellow
    Write-Host "====================================================" -ForegroundColor Green
}

# --- birinchi ishga tushirish ---
Log "Tunnel ochilmoqda..." Cyan
if (-not (Start-Tunnel)) { Fail "Tunnel manzili olinmadi - internetni tekshiring" }
Log "Tunnel: $($script:url)" Green
Set-MiniAppUrl $script:url
Start-Backend
Show-Info

# --- kuzatish: har 20 soniyada ---
while ($true) {
    Start-Sleep -Seconds 20
    try {
        if ($script:tunnelProc.HasExited) {
            Log "Tunnel to'xtadi - qayta ochilmoqda..." Yellow
            if (Start-Tunnel) {
                Log "Yangi tunnel: $($script:url)" Green
                Set-MiniAppUrl $script:url
                Start-Backend
                Show-Info
            } else {
                Log "Tunnel ochilmadi, 20 soniyadan keyin yana urinamiz" Red
            }
            continue
        }
        if ($script:backendProc.HasExited) {
            Log "Backend to'xtadi (kod $($script:backendProc.ExitCode)) - qayta ishga tushirilmoqda" Yellow
            Start-Backend
        }
    } catch {
        Log "Kuzatishda xato: $($_.Exception.Message)" Red
    }
}
