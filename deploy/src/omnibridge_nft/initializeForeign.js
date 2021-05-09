const { web3Foreign, deploymentAddress } = require('../web3')
const { EternalStorageProxy, ForeignNFTOmnibridge } = require('../loadContracts')
const { sendRawTxForeign, transferProxyOwnership } = require('../deploymentUtils')

const {
  FOREIGN_BRIDGE_OWNER,
  FOREIGN_UPGRADEABLE_ADMIN,
  FOREIGN_AMB_BRIDGE,
  FOREIGN_MEDIATOR_REQUEST_GAS_LIMIT,
} = require('../loadEnv')

function initializeMediator({
  contract,
  params: { bridgeContract, mediatorContract, requestGasLimit, owner, tokenImageERC721, tokenImageERC1155 },
}) {
  console.log(`
    AMB contract: ${bridgeContract},
    Mediator contract: ${mediatorContract},
    MEDIATOR_REQUEST_GAS_LIMIT : ${requestGasLimit},
    OWNER: ${owner},
    ERC721_TOKEN_IMAGE: ${tokenImageERC721},
    ERC1155_TOKEN_IMAGE: ${tokenImageERC1155}`)

  return contract.methods
    .initialize(bridgeContract, mediatorContract, requestGasLimit, owner, tokenImageERC721, tokenImageERC1155)
    .encodeABI()
}

async function initialize({ homeBridge, foreignBridge, tokenImageERC721, tokenImageERC1155 }) {
  let nonce = await web3Foreign.eth.getTransactionCount(deploymentAddress)
  const contract = new web3Foreign.eth.Contract(ForeignNFTOmnibridge.abi, foreignBridge)

  console.log('\n[Foreign] Initializing Bridge Mediator with following parameters:')

  const initializeData = initializeMediator({
    contract,
    params: {
      bridgeContract: FOREIGN_AMB_BRIDGE,
      mediatorContract: homeBridge,
      requestGasLimit: FOREIGN_MEDIATOR_REQUEST_GAS_LIMIT,
      owner: FOREIGN_BRIDGE_OWNER,
      tokenImageERC721,
      tokenImageERC1155,
    },
  })

  await sendRawTxForeign({
    data: initializeData,
    nonce: nonce++,
    to: foreignBridge,
  })

  console.log('\n[Foreign] Transferring bridge mediator proxy ownership to upgradeability admin')
  const proxy = new web3Foreign.eth.Contract(EternalStorageProxy.abi, foreignBridge)
  await transferProxyOwnership({
    network: 'foreign',
    proxy,
    newOwner: FOREIGN_UPGRADEABLE_ADMIN,
    nonce: nonce++,
  })
}

module.exports = initialize
