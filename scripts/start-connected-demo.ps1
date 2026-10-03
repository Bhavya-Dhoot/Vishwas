param([int]$Port = 3000, [switch]$WithoutFabric)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path "$PSScriptRoot/..").Path
$hospitalTokenFile = Join-Path $env:LOCALAPPDATA 'Vishwas/sample-hospital-api.token'
if (-not (Test-Path -LiteralPath $hospitalTokenFile)) {
  throw 'Start integrations/sample-hospital/server.mjs first to create its local token.'
}
$env:HOSPITAL_API_TOKEN = [IO.File]::ReadAllText($hospitalTokenFile).Trim()
$env:HOSPITAL_API_URL = 'http://127.0.0.1:4100'
$hospitalHeaders = @{ Authorization = "Bearer $env:HOSPITAL_API_TOKEN" }
$hospitalHealth = Invoke-RestMethod -Uri "$env:HOSPITAL_API_URL/health" -Headers $hospitalHeaders -TimeoutSec 5
if ($hospitalHealth.status -ne 'ok') { throw 'The fictional hospital API is not ready.' }

if ($WithoutFabric) {
  Remove-Item Env:FABRIC_GATEWAY_URL -ErrorAction SilentlyContinue
  Remove-Item Env:FABRIC_GATEWAY_TOKEN -ErrorAction SilentlyContinue
} else {
  $fabricTokenFile = Join-Path $root 'data/fabric/bridge-token.txt'
  if (-not (Test-Path -LiteralPath $fabricTokenFile)) {
    throw 'Start the Fabric network and bridge first, or use -WithoutFabric.'
  }
  $env:FABRIC_GATEWAY_TOKEN = [IO.File]::ReadAllText($fabricTokenFile).Trim()
  $env:FABRIC_GATEWAY_URL = 'http://127.0.0.1:3101'
  $fabricHeaders = @{ Authorization = "Bearer $env:FABRIC_GATEWAY_TOKEN" }
  $fabricHealth = Invoke-RestMethod -Uri "$env:FABRIC_GATEWAY_URL/health" -Headers $fabricHeaders -TimeoutSec 10
  if ($fabricHealth.status -ne 'ready') { throw 'The Fabric ledger is not ready.' }
}

$env:PORT = "$Port"
$env:APP_MODE = 'demo'
$env:EDGE_ONLY = 'true'
$env:DB_PATH = Join-Path $root 'data/vishwas-connected-encrypted.sqlite'
Write-Host "Connected fictional demo: http://127.0.0.1:$Port"
Write-Host 'Use the staff connector panel to sync the directory before a new enquiry.'
Write-Host 'This preserves its database. Connected reset and rescheduling require reconciliation.'
node (Join-Path $root 'server.mjs')
