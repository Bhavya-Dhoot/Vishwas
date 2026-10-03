#!/usr/bin/env bash
set -euo pipefail
# Run inside the isolated tooling container launched by network.ps1.
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SAMPLES="$ROOT/data/fabric/fabric-samples"
VERSION=2.5.16
if [ ! -d "$SAMPLES" ]; then
  git clone https://github.com/hyperledger/fabric-samples.git "$SAMPLES"
  git -C "$SAMPLES" checkout 5789681b4f4d24e58fa40f19a69f5496892374b6
fi
if [ ! -f "$SAMPLES/.vishwas-isolated" ]; then
  # Only this ignored checkout is adapted; never touch other Docker projects.
  find "$SAMPLES/test-network" -type f \( -name '*.yaml' -o -name '*.sh' -o -name '*.json' -o -name '*.yml' -o -name '*.config' \) -exec sed -i 's/\r$//' {} +
  find "$SAMPLES/test-network" -type f \( -name '*.yaml' -o -name '*.sh' -o -name '*.json' -o -name '*.yml' \) -exec sed -i 's/example\.com/vishwas.example.com/g; s/fabric_test/vishwas_fabric/g; s/hyperledger\/fabric-peer:latest/hyperledger\/fabric-peer:2.5.16/g; s/hyperledger\/fabric-orderer:latest/hyperledger\/fabric-orderer:2.5.16/g' {} +
  sed -i -E 's/^([[:space:]]+- )([0-9]+:[0-9]+)$/\1127.0.0.1:\2/' "$SAMPLES/test-network/compose/compose-test-net.yaml"
  # Disable upstream global cleanup, including implicit cleanup on startup.
  sed -i '/^function networkDown() {/a\  echo "Use integrations/fabric/network.ps1 stop; upstream cleanup disabled" >&2; return 1' "$SAMPLES/test-network/network.sh"
  touch "$SAMPLES/.vishwas-isolated"
fi
sed -i 's/\r$//' "$SAMPLES/test-network/network.config"
if [ ! -f "$SAMPLES/.binaries-ready" ]; then
  mkdir -p "$SAMPLES/bin" "$SAMPLES/config"
  cp /usr/local/bin/{configtxgen,configtxlator,cryptogen,discover,osnadmin,peer} "$SAMPLES/bin/"
  cp /etc/hyperledger/fabric/{core.yaml,orderer.yaml} "$SAMPLES/config/"
  touch "$SAMPLES/.binaries-ready"
fi
for image in peer orderer ccenv; do docker pull "hyperledger/fabric-$image:$VERSION"; done
docker pull hyperledger/fabric-nodeenv:2.5
sed -i 's|fabric-ccenv:$(TWO_DIGIT_VERSION)|fabric-ccenv:2.5.16|' "$SAMPLES/test-network/compose/docker/peercfg/core.yaml"
cd "$SAMPLES/test-network"
export COMPOSE_PROJECT_NAME=vishwas DOCKER_API_VERSION=1.44
if [ -d organizations/peerOrganizations ] && [ ! -f organizations/peerOrganizations/org1.vishwas.example.com/peers/peer0.org1.vishwas.example.com/tls/server.crt ]; then
  # Recover only the empty certificate directories created by a failed first boot.
  if [ -f channel-artifacts/vishwas.block ]; then
    echo 'Channel exists with incomplete identity material; refusing to regenerate credentials' >&2
    exit 1
  fi
  stage="$(mktemp -d)"
  trap 'rm -rf "$stage"' EXIT
  for org in org1 org2 orderer; do cryptogen generate --config="organizations/cryptogen/crypto-config-$org.yaml" --output="$stage"; done
  cp -a "$stage/peerOrganizations/." organizations/peerOrganizations/
  cp -a "$stage/ordererOrganizations/." organizations/ordererOrganizations/
  rm -rf "$stage"
  trap - EXIT
  bash organizations/ccp-generate.sh
fi
./network.sh up
if [ ! -f channel-artifacts/vishwas.block ]; then ./network.sh createChannel -c vishwas; fi
if [ ! -f "$SAMPLES/.commitments-deployed" ]; then
  ./network.sh deployCC -c vishwas -ccn commitments -ccp "$ROOT/integrations/fabric/chaincode" -ccl javascript -ccv 1.0 -ccs 1
  touch "$SAMPLES/.commitments-deployed"
fi
