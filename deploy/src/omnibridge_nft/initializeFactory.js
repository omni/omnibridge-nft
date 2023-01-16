const { web3Foreign, web3Home, DEPLOYMENT_FACTORY_ACCOUNT_PRIVATE_KEY, deploymentFactoryAddress } = require('../web3')
const { sendRawTxForeign, sendRawTxHome } = require('../deploymentUtils')
const { ERC721TokenFactory } = require('../loadContracts')

function initializeERC721TokenFactory({
  contract,
  params: { erc721BridgeImage, erc721NativeImage, bridge, oppositeBridge, owner },
}) {
  console.log(`
    ERC721 BRIDGE IMAGE CONTRACT: ${erc721BridgeImage},
    ERC721 NATIVE IMAGE CONTRACT: ${erc721NativeImage},
    BRIDGE: ${bridge},
    OPPOSITE BRIDGE : ${oppositeBridge},
    OWNER: ${owner}`)

  return contract.methods.initialize(erc721BridgeImage, erc721NativeImage, bridge, oppositeBridge, owner).encodeABI()
}

const { HOME_TOKEN_FACTORY_OWNER, FOREIGN_TOKEN_FACTORY_OWNER } = require('../loadEnv')

async function initializeForeign({ factory, erc721BridgeImage, erc721NativeImage, bridge, oppositeBridge }) {
  let nonce = await web3Foreign.eth.getTransactionCount(deploymentFactoryAddress)
  const contract = new web3Foreign.eth.Contract(ERC721TokenFactory.abi, factory)

  console.log('\n[Foreign] Initializing ERC721 token factory with following parameters:')

  const initializeData = initializeERC721TokenFactory({
    contract,
    params: {
      erc721BridgeImage,
      erc721NativeImage,
      bridge,
      oppositeBridge,
      owner: FOREIGN_TOKEN_FACTORY_OWNER,
    },
  })

  await sendRawTxForeign({
    data: initializeData,
    nonce: nonce++,
    to: factory,
    privateKey: DEPLOYMENT_FACTORY_ACCOUNT_PRIVATE_KEY,
  })
}

async function initializeHome({ factory, erc721BridgeImage, erc721NativeImage, bridge, oppositeBridge }) {
  let nonce = await web3Home.eth.getTransactionCount(deploymentFactoryAddress)
  const contract = new web3Home.eth.Contract(ERC721TokenFactory.abi, factory)

  console.log('\n[Home] Initializing ERC721 token factory with following parameters:')

  const initializeData = initializeERC721TokenFactory({
    contract,
    params: {
      erc721BridgeImage,
      erc721NativeImage,
      bridge,
      oppositeBridge,
      owner: HOME_TOKEN_FACTORY_OWNER,
    },
  })

  await sendRawTxHome({
    data: initializeData,
    nonce: nonce++,
    to: factory,
    privateKey: DEPLOYMENT_FACTORY_ACCOUNT_PRIVATE_KEY,
  })
}

module.exports = {
  initializeTokenFactoryForeign: initializeForeign,
  initializeTokenFactoryHome: initializeHome,
}
