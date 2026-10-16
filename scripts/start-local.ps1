$ErrorActionPreference = 'Stop'
$taskAppRoot = Split-Path -Parent $PSScriptRoot
$taskNode = (Get-Command node -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath (Join-Path $taskAppRoot 'node_modules/next/package.json'))) {
    throw 'Instale primeiro as dependências na pasta da Prospecta: npm ci'
}
$taskDataRoot = Join-Path $taskAppRoot 'data'
New-Item -ItemType Directory -Force -Path $taskDataRoot | Out-Null
$taskExisting = $null
try { $taskExisting = Invoke-RestMethod -Uri 'http://127.0.0.1:4317/api/health' -TimeoutSec 2 } catch {}
if ($taskExisting.status -ne 'ok') {
    Start-Process -FilePath $taskNode -ArgumentList @('--env-file-if-exists=.env.local','--experimental-strip-types','scripts/worker.ts') -WorkingDirectory $taskAppRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskDataRoot 'worker.log') -RedirectStandardError (Join-Path $taskDataRoot 'worker-errors.log') | Out-Null
    Start-Process -FilePath $taskNode -ArgumentList @('--env-file-if-exists=.env.local','scripts/dev.mjs') -WorkingDirectory $taskAppRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskDataRoot 'web.log') -RedirectStandardError (Join-Path $taskDataRoot 'web-errors.log') | Out-Null
}
Write-Host 'Prospecta: http://127.0.0.1:4317'
Write-Host 'No primeiro arranque, aguarde alguns segundos e abra o endereço no navegador.'
