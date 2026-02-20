$ErrorActionPreference = "Stop"

function Resolve-Python {
  if ($env:VIRTUAL_ENV) {
    $active = Join-Path $env:VIRTUAL_ENV "Scripts\python.exe"
    if (Test-Path $active) { return $active }
  }

  $candidates = @(
    ".\venv\Scripts\python.exe",
    "python"
  )

  foreach ($candidate in $candidates) {
    if ($candidate -eq "python") { return "python" }
    if (Test-Path $candidate) { return $candidate }
  }

  return "python"
}

$py = Resolve-Python
Write-Host "Using Python interpreter: $py"

$check = @'
import importlib, sys
mods = ("fastapi", "uvicorn", "groq")
missing = [m for m in mods if importlib.util.find_spec(m) is None]
if missing:
    print("MISSING:" + ",".join(missing))
    sys.exit(1)
print("OK")
'@

$tmp = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tmp -Value $check -Encoding UTF8

try {
  & $py $tmp | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing backend dependencies from requirements.txt..."
    & $py -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
      throw "Dependency install failed."
    }
  }
} finally {
  Remove-Item $tmp -ErrorAction SilentlyContinue
}

function Clear-BackendPort {
  param(
    [int]$Port = 8000
  )

  $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $listeners) { return }

  $owners = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($ownerId in $owners) {
    if ($ownerId -eq $PID) { continue }
    try {
      Stop-Process -Id $ownerId -Force -ErrorAction Stop
      Write-Host "Stopped stale process on port $Port (PID $ownerId)."
    } catch {
      Write-Host "Warning: could not stop process $ownerId on port $Port."
    }
  }

  Start-Sleep -Milliseconds 600
  $stillUsed = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($stillUsed) {
    throw "Port $Port is still in use. Stop the existing process and retry."
  }
}

Clear-BackendPort -Port 8000
& $py main.py
if ($LASTEXITCODE -ne 0) {
  throw "Backend exited with code $LASTEXITCODE."
}
