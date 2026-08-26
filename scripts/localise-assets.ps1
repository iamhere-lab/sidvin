# =====================================================================
#  Sidvin Celeste — download every remote image into assets/images
#  and repoint index.html / thank-you.html at the local copies.
#
#  Run from the project root in PowerShell:
#      powershell -ExecutionPolicy Bypass -File scripts\localise-assets.ps1
#
#  Safe to re-run: files already in assets/images are not re-downloaded,
#  and URLs already localised are simply not found again.
# =====================================================================

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root   = Split-Path -Parent $PSScriptRoot
$imgDir = Join-Path $root 'assets\images'
$pages  = @('index.html', 'thank-you.html')
$UA     = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

New-Item -ItemType Directory -Force -Path $imgDir | Out-Null

# ---- collect every remote uploads URL referenced by the HTML -------------
$urls = @()
foreach ($p in $pages) {
    $path = Join-Path $root $p
    if (-not (Test-Path $path)) { continue }
    $html = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    # og:image is deliberately left absolute (see below), so don't fetch it either
    $scan = [regex]::Replace($html, '<meta property="og:image"[^>]*>', '')
    $urls += [regex]::Matches($scan, 'https://sidvinceleste\.com/wp-content/uploads/[^"''\s\)]+') |
             ForEach-Object { $_.Value }
}
$urls = $urls | Sort-Object -Unique

if ($urls.Count -eq 0) {
    Write-Host "Nothing to do - no remote image URLs found (already localised?)." -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($urls.Count) remote assets." -ForegroundColor Cyan
Write-Host ""

# ---- download -----------------------------------------------------------
$map  = @{}
$ok   = 0
$fail = 0
$failed = @()

foreach ($u in $urls) {
    $file = [System.IO.Path]::GetFileName(([uri]$u).AbsolutePath)
    $dest = Join-Path $imgDir $file
    $map[$u] = "assets/images/$file"

    if ((Test-Path $dest) -and ((Get-Item $dest).Length -gt 0)) {
        Write-Host "  = $file (already here)"
        $ok++
        continue
    }

    try {
        Invoke-WebRequest -Uri $u -OutFile $dest -UseBasicParsing -TimeoutSec 90 -Headers @{ 'User-Agent' = $UA }
        $kb = [math]::Round((Get-Item $dest).Length / 1KB)
        Write-Host ("  + {0}  ({1} KB)" -f $file, $kb) -ForegroundColor Green
        $ok++
    } catch {
        Write-Host "  ! FAILED $file  ($($_.Exception.Message))" -ForegroundColor Red
        if (Test-Path $dest) { Remove-Item $dest -Force }
        $map.Remove($u)
        $failed += $u
        $fail++
    }
}

# ---- rewrite the HTML ---------------------------------------------------
# og:image must stay an absolute URL or link previews on WhatsApp / Facebook
# break, so that one line is protected while the rest is rewritten.
$enc = New-Object System.Text.UTF8Encoding($false)   # UTF-8 without BOM

foreach ($p in $pages) {
    $path = Join-Path $root $p
    if (-not (Test-Path $path)) { continue }

    # MUST read as UTF-8 explicitly. Get-Content -Raw uses the ANSI codepage on
    # Windows PowerShell 5.1, which corrupts every em-dash, prime mark and ×.
    $html = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    $ogLine = [regex]::Match($html, '<meta property="og:image"[^>]*>').Value

    foreach ($k in $map.Keys) { $html = $html.Replace($k, $map[$k]) }

    if ($ogLine) {
        $html = [regex]::Replace($html, '<meta property="og:image"[^>]*>', { param($m) $ogLine })
    }

    [System.IO.File]::WriteAllText($path, $html, $enc)
    Write-Host "Rewrote $p" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Done. $ok downloaded or already present, $fail failed." -ForegroundColor Cyan
if ($fail -gt 0) {
    Write-Host "These stayed pointing at the live site so nothing breaks:" -ForegroundColor Yellow
    $failed | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
}
Write-Host "Reload index.html and check every image still appears." -ForegroundColor Cyan
