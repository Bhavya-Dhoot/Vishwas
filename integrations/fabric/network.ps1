param([ValidateSet('start','stop')][string]$Action='start')
$ErrorActionPreference='Stop'
$docker = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe'
if (-not (Test-Path $docker)) { $docker='docker' }
$root=(Resolve-Path "$PSScriptRoot/../..").Path
if ($Action -eq 'stop') {
  # Preserve ledger volumes and credentials; stop only this project's containers.
  $names=& $docker ps -a --format '{{.Names}}'
  foreach ($name in $names) {
    if ($name -match '^(orderer|peer0\.org[12])\.vishwas\.example\.com$' -or $name -match '^dev-peer0\.org[12]\.vishwas\.example\.com-commitments-') { & $docker stop $name }
  }
  exit
}
$drive=$root.Substring(0,1).ToLower()
$linuxRoot='/run/desktop/mnt/host/'+$drive+$root.Substring(2).Replace('\','/')
$toolsDir=Join-Path $root 'data/fabric/tools'
$pluginsDir=Join-Path $toolsDir 'cli-plugins'
if (-not (Test-Path -LiteralPath (Join-Path $toolsDir 'docker')) -or -not (Test-Path -LiteralPath (Join-Path $pluginsDir 'docker-compose'))) {
  New-Item -ItemType Directory -Force $pluginsDir | Out-Null
  & $docker pull docker:27-cli
  if ($LASTEXITCODE -ne 0) { throw 'Unable to obtain the isolated Docker CLI tools.' }
  $copyContainer=(& $docker create --name ('vishwas-cli-copy-'+[guid]::NewGuid().ToString('N')) docker:27-cli).Trim()
  if ($LASTEXITCODE -ne 0 -or $copyContainer -notmatch '^[a-f0-9]{64}$') { throw 'Unable to prepare Docker CLI extraction.' }
  try {
    & $docker cp "${copyContainer}:/usr/local/bin/docker" (Join-Path $toolsDir 'docker')
    if ($LASTEXITCODE -ne 0) { throw 'Docker CLI extraction failed.' }
    & $docker cp "${copyContainer}:/usr/local/libexec/docker/cli-plugins/docker-compose" (Join-Path $pluginsDir 'docker-compose')
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose extraction failed.' }
  } finally { & $docker rm $copyContainer | Out-Null }
}
& $docker run --rm --name vishwas-fabric-tools --network host -v '/var/run/docker.sock:/var/run/docker.sock' -v "${root}:${linuxRoot}" -v "${linuxRoot}/data/fabric/tools/docker:/usr/local/bin/docker" -v "${linuxRoot}/data/fabric/tools/cli-plugins:/root/.docker/cli-plugins" -w $linuxRoot --entrypoint bash hyperledger/fabric-tools:2.5.16 integrations/fabric/setup.sh
if ($LASTEXITCODE -ne 0) { throw 'Fabric network setup failed; inspect output above.' }
