How to deploy NFT OmniBridge AMB extension contracts
====

There are two options to deploy NFT OB contracts: 
  * with docker image, it could be useful for systems where there is no Node.JS environment configured
  * with `yarn`, for the cases where customization in the contracts code is required

If necessary, deploy and configure a multi-sig wallet contract to manage the bridge contracts after deployment. We have not audited any wallets for security, but have used [Gnosis Safe](https://gnosis-safe.io/) with success.

## Deployment with Docker

It is assumed that Docker is installed on the system.

1. Pull the docker image:

   ```
   docker pull omnibridge/nft-contracts:latest
   ```

2. Create a `nft-ob.env` file with the NFT OB configuration parameters. See below for comments related to each parameter.

3. Add funds to the deployment account in both the Home and Foreign networks.

4. Run the docker container:
   ```
   docker run -ti --rm --env-file nft-ob.env omnibridge/nft-contracts:latest deploy.sh
   ```

## Deployment with Yarn

Before deploying of the NFT OB contracts you must run `yarn` to install all dependencies.

1. Compile the source contracts.
   ```
   cd ..
   yarn compile
   ```

2. Create a `.env` file.
   ```
   cd deploy
   cp env.example .env
   ```

3. Adjust the parameters in the `.env` file. See below for comments related to each parameter.

4. Add funds to the deployment account in both the Home and Foreign networks.

5. Run `yarn deploy`.

## Contracts verification

The contracts are not automatically verified during deployment. In order to publish the contracts' code in Etherscan/Blockscout, follow [these instructions](VERIFICATION.md)

## NFT OB configuration parameters clarification

This example of an `.env` file for the NFT OmniBridge includes comments describing each parameter.

```bash
# Don't change this parameter
BRIDGE_MODE=OMNIBRIDGE_NFT

# The private key hex value of the account responsible for contracts
# deployments and initial configuration. The account's balance must contain
# funds from both networks.
DEPLOYMENT_ACCOUNT_PRIVATE_KEY=67..14
# Extra gas added to the estimated gas of a particular deployment/configuration transaction
# E.g. if estimated gas returns 100000 and the parameter is 0.2,
# the transaction gas limit will be (100000 + 100000 * 0.2) = 120000
DEPLOYMENT_GAS_LIMIT_EXTRA=0.2
# The "gasPrice" parameter set in every deployment/configuration transaction on
# Home network (in Wei).
HOME_DEPLOYMENT_GAS_PRICE=10000000000
# The "gasPrice" parameter set in every deployment/configuration transaction on
# Foreign network (in Wei).
FOREIGN_DEPLOYMENT_GAS_PRICE=10000000000

# The RPC channel to a Home node able to handle deployment/configuration
# transactions.
HOME_RPC_URL=https://core.poa.network
# Address on Home network with permissions to change parameters of the bridge contract.
# For extra security we recommended using a multi-sig wallet contract address here.
HOME_BRIDGE_OWNER=0x
# Address on Home network with permissions to upgrade the bridge contract
HOME_UPGRADEABLE_ADMIN=0x

# The RPC channel to a Foreign node able to handle deployment/configuration
# transactions.
FOREIGN_RPC_URL=https://mainnet.infura.io
# Address on Foreign network with permissions to change parameters of the bridge contract.
# For extra security we recommended using a multi-sig wallet contract address here.
FOREIGN_BRIDGE_OWNER=0x
# Address on Foreign network with permissions to upgrade the bridge contract and the
# bridge validator contract.
FOREIGN_UPGRADEABLE_ADMIN=0x

# The address of the existing AMB bridge in the Home network that will be used to pass messages
# to the Foreign network.
HOME_AMB_BRIDGE=0x
# The address of the existing AMB bridge in the Foreign network that will be used to pass messages
# to the Home network.
FOREIGN_AMB_BRIDGE=0x
# The gas limit that will be used in the execution of the message passed to the mediator contract
# in the Foreign network.
HOME_MEDIATOR_REQUEST_GAS_LIMIT=2000000
# The gas limit that will be used in the execution of the message passed to the mediator contract
# in the Home network.
FOREIGN_MEDIATOR_REQUEST_GAS_LIMIT=2000000

# address of an already deployed ERC721BridgeToken contract that will be used as an implementation for all bridged tokens on the Home side
# leave empty, if you want to deploy a new ERC721BridgeToken for further usage
HOME_ERC721_TOKEN_IMAGE=
# address of an already deployed ERC1155BridgeToken contract that will be used as an implementation for all bridged tokens on the Home side
# leave empty, if you want to deploy a new ERC1155BridgeToken for further usage
HOME_ERC1155_TOKEN_IMAGE=
# address of an already deployed NFTForwardingRulesManager contract for managing AMB lane permissions.
# leave empty, if you want to deploy a new NFTForwardingRulesManager.
# put false, if you want to do not use lane permissions.
HOME_FORWARDING_RULES_MANAGER=

# address of an already deployed ERC721BridgeToken contract that will be used as an implementation for all bridged tokens on the Foreign side
# leave empty, if you want to deploy a new ERC721BridgeToken for further usage
FOREIGN_ERC721_TOKEN_IMAGE=
# address of an already deployed ERC1155BridgeToken contract that will be used as an implementation for all bridged tokens on the Foreign side
# leave empty, if you want to deploy a new ERC1155BridgeToken for further usage
FOREIGN_ERC1155_TOKEN_IMAGE=

# suffix used for token names for tokens bridged from Foreign to Home
# usually you might want it to start with a space character
HOME_TOKEN_NAME_SUFFIX=""

# suffix used for token names for tokens bridged from Home to Foreign
# usually you might want it to start with a space character
FOREIGN_TOKEN_NAME_SUFFIX=""
```
