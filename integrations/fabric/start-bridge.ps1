$ErrorActionPreference='Stop'
$root=(Resolve-Path "$PSScriptRoot/../..").Path
$tokenFile=Join-Path $root 'data/fabric/bridge-token.txt'
New-Item -ItemType Directory -Force (Split-Path $tokenFile) | Out-Null
if (-not (Test-Path $tokenFile)) {
  $bytes=New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  [IO.File]::WriteAllText($tokenFile,[Convert]::ToHexString($bytes).ToLowerInvariant())
}
$env:FABRIC_GATEWAY_TOKEN=[IO.File]::ReadAllText($tokenFile).Trim()
node "$PSScriptRoot/bridge.mjs"
