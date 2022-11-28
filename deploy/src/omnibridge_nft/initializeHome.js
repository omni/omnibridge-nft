const { web3Home, deploymentAddress } = require('../web3')
const { EternalStorageProxy, HomeNFTOmnibridge } = require('../loadContracts')
const { sendRawTxHome, transferProxyOwnership } = require('../deploymentUtils')

const { HOME_AMB_BRIDGE, HOME_BRIDGE_OWNER, HOME_UPGRADEABLE_ADMIN } = require('../loadEnv')

function initializeMediator({
  contract,
  params: {
    bridgeContract,
    mediatorContract,
    owner,
    tokenImageERC1155,
    gasLimitManager,
    forwardingRulesManager,
    tokenFactoryERC721,
  },
}) {
  console.log(`
    AMB contract: ${bridgeContract},
    Mediator contract: ${mediatorContract},
    OWNER: ${owner},
    ERC1155_TOKEN_IMAGE: ${tokenImageERC1155},
    GAS_LIMIT_MANAGER: ${gasLimitManager},
    FORWARDING_RULES_MANAGER: ${forwardingRulesManager},
    ERC721_TOKEN_FACTORY: ${tokenFactoryERC721}
    `)

  return contract.methods
    .initialize(
      bridgeContract,
      mediatorContract,
      gasLimitManager,
      owner,
      tokenImageERC1155,
      forwardingRulesManager,
      tokenFactoryERC721
    )
    .encodeABI()
}

async function initialize({
  homeBridge,
  foreignBridge,
  tokenImageERC721,
  tokenImageERC1155,
  forwardingRulesManager,
  gasLimitManager,
  tokenFactoryERC721,
}) {
  let nonce = await web3Home.eth.getTransactionCount(deploymentAddress)
  const mediatorContract = new web3Home.eth.Contract(HomeNFTOmnibridge.abi, homeBridge)

  console.log('\n[Home] Initializing Bridge Mediator with following parameters:')

  const initializeMediatorData = initializeMediator({
    contract: mediatorContract,
    params: {
      bridgeContract: HOME_AMB_BRIDGE,
      mediatorContract: foreignBridge,
      gasLimitManager,
      owner: HOME_BRIDGE_OWNER,
      tokenImageERC721,
      tokenImageERC1155,
      forwardingRulesManager,
      tokenFactoryERC721,
    },
  })

  await sendRawTxHome({
    data: initializeMediatorData,
    nonce: nonce++,
    to: homeBridge,
  })

  console.log('\n[Home] Transferring bridge mediator proxy ownership to upgradeability admin')
  const mediatorProxy = new web3Home.eth.Contract(EternalStorageProxy.abi, homeBridge)
  await transferProxyOwnership({
    proxy: mediatorProxy,
    newOwner: HOME_UPGRADEABLE_ADMIN,
    nonce: nonce++,
  })
}

module.exports = initialize
