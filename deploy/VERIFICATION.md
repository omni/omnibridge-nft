## Process

Due to usage of `pragma abicoder v2;` in the contracts source code,
it is not possible to verify contracts through flattened source files.

Instead, two different approaches can be used for Etherscan and Blockscout explorers.

## Verification in Etherscan/Bscscan

The simplest semi-automated solution found so far is to use `truffle-plugin-verify` and the corresponding shell script.
First, collect information about deployed contracts from the logs for the particular chain in the following format:

Example of deployed contracts list in the Foreign chain:
```
EternalStorageProxy@0xEc05e3f4D845f0E39e33146395aCE5D35c01Fcc0
ERC721BridgeToken@0xd880d9d42Fad3dcbe885F499AE15822ACBF1f1F8
ERC1155BridgeToken@0xaa5cF36b6d97a709fccF3fd4BEa94dA9753d9cA4
ForeignNFTOmnibridge@0x964C086398cba3c0BaE520bE900E660a84cA331c
```

Example of deployed contracts list in the Home chain:
```
EternalStorageProxy@0x2c0bF58cC87763783e35a625ff6a3e50d9E05337
ERC721BridgeToken@0x714c7985B073b1177356560631A30D24F60f9241
ERC1155BridgeToken@0xB2bf0271DB0d30090756A25B01be2698f3E5e556
OwnedUpgradeabilityProxy@0x4dCD4Dd4096eab35611D496087ceF7DaF1D4E57C
SelectorTokenGasLimitManager@0x783A53aC5ab27d24E83A0211e6Ff70c3705a5435
HomeNFTOmnibridge@0xFF9c66898B706cd56d2dB9587aB597A000eC6ed6

# If required:
# NFTForwardingRulesManager@0x...
```

After that run the following command for source verification in Etherscan for foreign network:
```bash
deploy/verifyEtherscan.sh ForeignNFTOmnibridge@0x964C086398cba3c0BaE520bE900E660a84cA331c
```

Use `VERIFY_HOME=true` environment variable for verification in the home network:
```bash
VERIFY_HOME=true deploy/verifyEtherscan.sh HomeNFTOmnibridge@0xFF9c66898B706cd56d2dB9587aB597A000eC6ed6
```

## Verification in Blockscout

In order to verify multi-file contract in Blockscout, it must support Sourcify integration (present in the xDAI instance).

The list of actions is the following:
1) Upload contracts sources and metadata to IPFS.
2) Wait until Sourcify monitor will handle uploaded files and will automatically verify deployed contracts.
3) Import sources to blockscout from Sourcify database.

### Upload to IPFS

Run the following in our terminal

```bash
node deploy/uploadToIPFS.js
```

You should see all compiled artifacts being uploaded sequentially, their hashes should be printed into the console.

### Check that contracts are verified in Sourcify

You can check if your contracts are verified by visiting https://sourcify.dev
Select the corresponding chain, then enter your contract address.
You should be able to see a green check sign at the top.

### Import sources to Blockscout

Go to the contract page of your contract in the Blockscout, click `Code`, then `Verify & Publish`, then `Sources and Metadata JSON file`.
Upload any file from the `./build/contract/*.json`. It could be any artifact, it does not matter, since our sources are already present in the Sourcify database.
