#!/usr/bin/env bash

if [ -d flats ]; then
  rm -rf flats
fi

mkdir flats

FLATTENER=./node_modules/.bin/truffle-flattener
BRIDGE_CONTRACTS_DIR=contracts/upgradeable_contracts
TOKEN_CONTRACTS_DIR=contracts/tokens

echo "Flattening common bridge contracts"
${FLATTENER} contracts/upgradeability/EternalStorageProxy.sol > flats/EternalStorageProxy_flat.sol

echo "Flattening contracts related to NFT Omnibridge"
${FLATTENER} ${BRIDGE_CONTRACTS_DIR}/omnibridge_nft/HomeNFTOmnibridge.sol > flats/HomeNFTOmnibridge_flat.sol
${FLATTENER} ${BRIDGE_CONTRACTS_DIR}/omnibridge_nft/ForeignNFTOmnibridge.sol > flats/ForeignNFTOmnibridge_flat.sol
${FLATTENER} ${BRIDGE_CONTRACTS_DIR}/omnibridge_nft/components/bridged/ERC721TokenProxy.sol > flats/ERC721TokenProxy_flat.sol
${FLATTENER} ${BRIDGE_CONTRACTS_DIR}/omnibridge_nft/modules/forwarding_rules/NFTForwardingRulesManager.sol > flats/NFTForwardingRulesManager_flat.sol

echo "Flattening token contracts"
${FLATTENER} ${TOKEN_CONTRACTS_DIR}/ERC721BridgeToken.sol > flats/ERC721BridgeToken_flat.sol

for file in flats/*.sol; do
  grep -v SPDX "$file" > tmp; mv tmp "$file"
done
