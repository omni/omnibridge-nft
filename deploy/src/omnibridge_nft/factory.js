const { web3Foreign, deploymentFactoryAddress, web3Home } = require('../web3')
const { deployContractByFactoryDeploymentAccount } = require('../deploymentUtils')
const { ERC721NativeToken, ERC721BridgeToken, ERC721TokenFactory } = require('../loadContracts')
const { ZERO_ADDRESS } = require('../constants')

const {
  FOREIGN_ERC721_NATIVE_TOKEN_IMAGE,
  FOREIGN_ERC721_BRIDGE_TOKEN_IMAGE,
  HOME_ERC721_NATIVE_TOKEN_IMAGE,
  HOME_ERC721_BRIDGE_TOKEN_IMAGE,
  ERC721_TOKEN_FACTORY,
} = require('../loadEnv')

async function deployFactory() {
  let nonceForeign = await web3Foreign.eth.getTransactionCount(deploymentFactoryAddress)
  let nonceHome = await web3Home.eth.getTransactionCount(deploymentFactoryAddress)

  if (nonceForeign !== nonceHome) {
    throw new Error(`nonceForeign ${nonceForeign} should equals  ${nonceHome}`)
  }

  // 1
  let foreignNativeTokenImageERC721 = FOREIGN_ERC721_NATIVE_TOKEN_IMAGE
  if (!foreignNativeTokenImageERC721) {
    console.log('\n[Foreign] Deploying new ERC721 native token image')
    const nativeImage = await deployContractByFactoryDeploymentAccount(ERC721NativeToken, ['', ''], {
      network: 'foreign',
      nonce: nonceForeign++,
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
      nonce: nonceHome++,
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
      nonce: nonceForeign++,
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
      nonce: nonceHome++,
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
    console.log('\n[Foreign] Deploying new ERC721 token factory')
    const factory = await deployContractByFactoryDeploymentAccount(
      ERC721TokenFactory,
      [foreignBridgeTokenImageERC721, foreignNativeTokenImageERC721],
      {
        network: 'foreign',
        nonce: nonceForeign++,
      }
    )
    foreignTokenFactory = factory.options.address
    console.log('\n[Foreign] New ERC721 token factory has been deployed: ', foreignTokenFactory)
  } else {
    console.log('\n[Foreign] Using existing ERC721 token factory: ', foreignTokenFactory)
  }

  let homeTokenFactory = ERC721_TOKEN_FACTORY
  if (!homeTokenFactory) {
    console.log('\n[Home] Deploying new ERC721 token factory')
    const factory = await deployContractByFactoryDeploymentAccount(
      ERC721TokenFactory,
      [homeBridgeTokenImageERC721, homeNativeTokenImageERC721],
      {
        network: 'home',
        nonce: nonceHome++,
      }
    )
    homeTokenFactory = factory.options.address
    console.log('\n[Home] New ERC721 token factory has been deployed: ', homeTokenFactory)
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
