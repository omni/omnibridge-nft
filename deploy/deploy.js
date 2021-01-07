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
  const deployHome = require('./src/omnibridge_nft/home')
  const deployForeign = require('./src/omnibridge_nft/foreign')
  const initializeHome = require('./src/omnibridge_nft/initializeHome')
  const initializeForeign = require('./src/omnibridge_nft/initializeForeign')
  await preDeploy()
  const { homeBridgeMediator, tokenImage: homeTokenImage } = await deployHome()
  const { foreignBridgeMediator, tokenImage: foreignTokenImage } = await deployForeign()

  await initializeHome({
    homeBridge: homeBridgeMediator.address,
    foreignBridge: foreignBridgeMediator.address,
    tokenImage: homeTokenImage.address,
  })

  await initializeForeign({
    foreignBridge: foreignBridgeMediator.address,
    homeBridge: homeBridgeMediator.address,
    tokenImage: foreignTokenImage.address,
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
