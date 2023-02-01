const fs = require('fs')
const path = require('path')
const env = require('./src/loadEnv')

const { BRIDGE_MODE } = env

const deployResultsPath = path.join(__dirname, './bridgeDeploymentResults.json')

function writeDeploymentResults(data) {
  fs.writeFileSync(deployResultsPath, JSON.stringify(data, null, 4))
  console.log('Contracts Deployment have been saved to `bridgeDeploymentResults.json`')
}

async function deployOmnibridgeNFT() {
  const preDeploy = require('./src/omnibridge_nft/preDeploy')
  const deployFactory = require('./src/omnibridge_nft/factory')
  const deployHome = require('./src/omnibridge_nft/home')
  const deployForeign = require('./src/omnibridge_nft/foreign')
  const initializeHome = require('./src/omnibridge_nft/initializeHome')
  const initializeForeign = require('./src/omnibridge_nft/initializeForeign')
  const {
    initializeTokenFactoryForeign,
    initializeTokenFactoryHome,
  } = require('./src/omnibridge_nft/initializeFactory')

  await preDeploy()
  const {
    foreignNativeTokenImageERC721,
    homeBridgeTokenImageERC721,
    foreignBridgeTokenImageERC721,
    homeNativeTokenImageERC721,
    foreignTokenFactory,
    homeTokenFactory,
  } = await deployFactory()

  const {
    homeBridgeMediator,
    tokenImageERC1155: homeTokenImageERC1155,
    gasLimitManager,
    forwardingRulesManager,
  } = await deployHome()
  const { foreignBridgeMediator, tokenImageERC1155: foreignTokenImageERC1155 } = await deployForeign()

  await initializeHome({
    homeBridge: homeBridgeMediator.address,
    foreignBridge: foreignBridgeMediator.address,
    tokenImageERC1155: homeTokenImageERC1155.address,
    gasLimitManager: gasLimitManager.address,
    forwardingRulesManager: forwardingRulesManager.address,
    tokenFactoryERC721: homeTokenFactory.address,
  })

  await initializeForeign({
    foreignBridge: foreignBridgeMediator.address,
    homeBridge: homeBridgeMediator.address,
    tokenImageERC1155: foreignTokenImageERC1155.address,
    tokenFactoryERC721: foreignTokenFactory.address,
  })

  await initializeTokenFactoryForeign({
    factory: foreignTokenFactory.address,
    bridge: foreignBridgeMediator.address,
    oppositeBridge: homeBridgeMediator.address,
    erc721BridgeImage: foreignBridgeTokenImageERC721.address,
    erc721NativeImage: foreignNativeTokenImageERC721.address,
  })

  await initializeTokenFactoryHome({
    factory: homeTokenFactory.address,
    bridge: homeBridgeMediator.address,
    oppositeBridge: foreignBridgeMediator.address,
    erc721BridgeImage: homeBridgeTokenImageERC721.address,
    erc721NativeImage: homeNativeTokenImageERC721.address,
  })

  console.log('\nDeployment has been completed.\n\n')
  console.log(`[   Home  ] Bridge Mediator: ${homeBridgeMediator.address}`)
  console.log(`[ Foreign ] Bridge Mediator: ${foreignBridgeMediator.address}`)
  writeDeploymentResults({
    homeBridge: {
      homeBridgeMediator,
    },
    foreignBridge: {
      foreignBridgeMediator,
    },
  })
}

async function main() {
  console.log(`Bridge mode: ${BRIDGE_MODE}`)
  switch (BRIDGE_MODE) {
    case 'OMNIBRIDGE_NFT':
      await deployOmnibridgeNFT()
      break
    default:
      console.log(BRIDGE_MODE)
      throw new Error('Please specify BRIDGE_MODE: OMNIBRIDGE_NFT')
  }
}

main().catch((e) => console.log('Error:', e))
