const { web3Foreign, deploymentFactoryAddress, web3Home, deploymentAddress } = require('../web3')
const { deployContractByFactoryDeploymentAccount, deployContract, upgradeProxy } = require('../deploymentUtils')
const { ERC721NativeToken, ERC721BridgeToken, ERC721TokenFactory, EternalStorageProxy } = require('../loadContracts')
const { ZERO_ADDRESS } = require('../constants')

const {
  FOREIGN_ERC721_NATIVE_TOKEN_IMAGE,
  FOREIGN_ERC721_BRIDGE_TOKEN_IMAGE,
  HOME_ERC721_NATIVE_TOKEN_IMAGE,
  HOME_ERC721_BRIDGE_TOKEN_IMAGE,
  ERC721_TOKEN_FACTORY,
  DEPLOYMENT_FACTORY_ACCOUNT_PRIVATE_KEY,
} = require('../loadEnv')

async function deployFactory() {
  let nonceFactoryForeign = await web3Foreign.eth.getTransactionCount(deploymentFactoryAddress)
  let nonceForeign = await web3Foreign.eth.getTransactionCount(deploymentAddress)
  let nonceFactoryHome = await web3Home.eth.getTransactionCount(deploymentFactoryAddress)
  let nonceHome = await web3Home.eth.getTransactionCount(deploymentAddress)

  if (nonceFactoryForeign !== nonceFactoryHome) {
    throw new Error(`nonceFactoryForeign ${nonceFactoryForeign} should equals  ${nonceFactoryHome}`)
  }

  // 1
  let foreignNativeTokenImageERC721 = FOREIGN_ERC721_NATIVE_TOKEN_IMAGE
  if (!foreignNativeTokenImageERC721) {
    console.log('\n[Foreign] Deploying new ERC721 native token image')
    const nativeImage = await deployContractByFactoryDeploymentAccount(ERC721NativeToken, ['', ''], {
      network: 'foreign',
      nonce: nonceFactoryForeign++,
    })
    foreignNativeTokenImageERC721 = nativeImage.options.address
    console.log('\n[Foreign] New ERC721 token native image has been deployed: ', foreignNativeTokenImageERC721)
  } else {
    console.log('\n[Foreign] Using existing ERC721 native token image: ', foreignNativeTokenImageERC721)
  }

  let homeBridgeTokenImageERC721 = HOME_ERC721_BRIDGE_TOKEN_IMAGE
  if (!homeBridgeTokenImageERC721) {
    console.log('\n[Home] Deploying new ERC721 bridge token image')
    const bridgeImage = await deployContractByFactoryDeploymentAccount(ERC721BridgeToken, ['', '', ZERO_ADDRESS], {
      network: 'home',
      nonce: nonceFactoryHome++,
    })
    homeBridgeTokenImageERC721 = bridgeImage.options.address
    console.log('\n[Home] New ERC721 token bridge image has been deployed: ', homeBridgeTokenImageERC721)
  } else {
    console.log('\n[Home] Using existing ERC721 bridge token image: ', homeBridgeTokenImageERC721)
  }

  if (foreignNativeTokenImageERC721 !== homeBridgeTokenImageERC721) {
    throw new Error('foreignNativeTokenImageERC721 should equals homeBridgeTokenImageERC721')
  }

  // 2.
  let foreignBridgeTokenImageERC721 = FOREIGN_ERC721_BRIDGE_TOKEN_IMAGE
  if (!foreignBridgeTokenImageERC721) {
    console.log('\n[Foreign] Deploying new ERC721 bridge token image')
    const bridgeImage = await deployContractByFactoryDeploymentAccount(ERC721BridgeToken, ['', '', ZERO_ADDRESS], {
      network: 'foreign',
      nonce: nonceFactoryForeign++,
    })
    foreignBridgeTokenImageERC721 = bridgeImage.options.address
    console.log('\n[Foreign] New ERC721 token bridge image has been deployed: ', foreignBridgeTokenImageERC721)
  } else {
    console.log('\n[Foreign] Using existing ERC721 bridge token image: ', foreignBridgeTokenImageERC721)
  }

  let homeNativeTokenImageERC721 = HOME_ERC721_NATIVE_TOKEN_IMAGE
  if (!homeNativeTokenImageERC721) {
    console.log('\n[Home] Deploying new ERC721 native token image')
    const nativeImage = await deployContractByFactoryDeploymentAccount(ERC721NativeToken, ['', ''], {
      network: 'home',
      nonce: nonceFactoryHome++,
    })
    homeNativeTokenImageERC721 = nativeImage.options.address
    console.log('\n[Home] New ERC721 token native image has been deployed: ', homeNativeTokenImageERC721)
  } else {
    console.log('\n[Home] Using existing ERC721 native token image: ', homeNativeTokenImageERC721)
  }

  if (foreignBridgeTokenImageERC721 !== homeNativeTokenImageERC721) {
    throw new Error('foreignBridgeTokenImageERC721 should equals homeNativeTokenImageERC721')
  }

  // 3
  let foreignTokenFactory = ERC721_TOKEN_FACTORY
  if (!foreignTokenFactory) {
    console.log('\n[Foreign] Deploying ERC721 token factory storage\n')
    const foreignERC721TokenFactoryStorage = await deployContractByFactoryDeploymentAccount(EternalStorageProxy, [], {
      network: 'foreign',
      nonce: nonceFactoryForeign++,
    })
    console.log('[Foreign] ERC721 token factory Storage: ', foreignERC721TokenFactoryStorage.options.address)

    console.log('\n[Foreign] Deploying ERC721 token factory implementation')
    const foreignERC721TokenFactoryImplementation = await deployContract(ERC721TokenFactory, [], {
      network: 'foreign',
      nonce: nonceForeign++,
    })
    console.log(
      '[Foreign] ERC721 token factory Implementation: ',
      foreignERC721TokenFactoryImplementation.options.address
    )

    console.log('\n[Foreign] Hooking up ERC721 Token Factory storage to ERC721 Token Factory implementation')
    await upgradeProxy({
      network: 'foreign',
      proxy: foreignERC721TokenFactoryStorage,
      implementationAddress: foreignERC721TokenFactoryImplementation.options.address,
      version: '1',
      nonce: nonceFactoryForeign++,
      privateKey: DEPLOYMENT_FACTORY_ACCOUNT_PRIVATE_KEY,
    })

    foreignTokenFactory = foreignERC721TokenFactoryStorage.options.address
  } else {
    console.log('\n[Foreign] Using existing ERC721 token factory: ', foreignTokenFactory)
  }

  let homeTokenFactory = ERC721_TOKEN_FACTORY
  if (!homeTokenFactory) {
    console.log('\n[Home] Deploying ERC721 token factory storage\n')
    const homeERC721TokenFactoryStorage = await deployContractByFactoryDeploymentAccount(EternalStorageProxy, [], {
      network: 'home',
      nonce: nonceFactoryHome++,
    })
    console.log('[Home] ERC721 token factory Storage: ', homeERC721TokenFactoryStorage.options.address)

    console.log('\n[Home] Deploying ERC721 token factory implementation')
    const homeERC721TokenFactoryImplementation = await deployContract(ERC721TokenFactory, [], {
      network: 'home',
      nonce: nonceHome++,
    })
    console.log('[Home] ERC721 token factory Implementation: ', homeERC721TokenFactoryImplementation.options.address)

    console.log('\n[Home] Hooking up ERC721 Token Factory storage to ERC721 Token Factory implementation')
    await upgradeProxy({
      network: 'home',
      proxy: homeERC721TokenFactoryStorage,
      implementationAddress: homeERC721TokenFactoryImplementation.options.address,
      version: '1',
      nonce: nonceFactoryHome++,
      privateKey: DEPLOYMENT_FACTORY_ACCOUNT_PRIVATE_KEY,
    })
    homeTokenFactory = homeERC721TokenFactoryStorage.options.address
  } else {
    console.log('\n[Home] Using existing ERC721 token factory: ', homeTokenFactory)
  }

  if (foreignTokenFactory !== homeTokenFactory) {
    throw new Error('foreignTokenFactory should equals homeTokenFactory')
  }

  return {
    foreignNativeTokenImageERC721: { address: foreignNativeTokenImageERC721 },
    homeBridgeTokenImageERC721: { address: homeBridgeTokenImageERC721 },
    foreignBridgeTokenImageERC721: { address: foreignBridgeTokenImageERC721 },
    homeNativeTokenImageERC721: { address: homeNativeTokenImageERC721 },
    foreignTokenFactory: { address: foreignTokenFactory },
    homeTokenFactory: { address: homeTokenFactory },
  }
}

module.exports = deployFactory
