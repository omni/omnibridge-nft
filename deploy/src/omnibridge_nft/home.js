const { web3Home, deploymentAddress } = require('../web3')
const { deployContract, upgradeProxy } = require('../deploymentUtils')
const {
  EternalStorageProxy,
  HomeNFTOmnibridge,
  ERC721BridgeToken,
  MultiTokenForwardingRulesManager,
  SelectorTokenGasLimitManager,
} = require('../loadContracts')
const {
  HOME_ERC721_TOKEN_IMAGE,
  HOME_FORWARDING_RULES_MANAGER,
  HOME_BRIDGE_OWNER,
  HOME_AMB_BRIDGE,
  HOME_MEDIATOR_REQUEST_GAS_LIMIT,
} = require('../loadEnv')
const { ZERO_ADDRESS } = require('../constants')

async function deployHome() {
  let nonce = await web3Home.eth.getTransactionCount(deploymentAddress)

  console.log('\n[Home] Deploying Bridge Mediator storage\n')
  const homeBridgeStorage = await deployContract(EternalStorageProxy, [], {
    nonce: nonce++,
  })
  console.log('[Home] Bridge Mediator Storage: ', homeBridgeStorage.options.address)

  let tokenImage = HOME_ERC721_TOKEN_IMAGE
  if (!tokenImage) {
    console.log('\n[Home] Deploying new token image')
    const image = await deployContract(ERC721BridgeToken, ['', '', ZERO_ADDRESS], {
      nonce: nonce++,
    })
    tokenImage = image.options.address
    console.log('\n[Home] New token image has been deployed: ', tokenImage)
  } else {
    console.log('\n[Home] Using existing token image: ', tokenImage)
  }

  let forwardingRulesManager = HOME_FORWARDING_RULES_MANAGER === false ? ZERO_ADDRESS : HOME_FORWARDING_RULES_MANAGER
  if (forwardingRulesManager === '') {
    console.log(`\n[Home] Deploying Forwarding Rules Manager contract with the following parameters:
    OWNER: ${HOME_BRIDGE_OWNER}
    `)
    const manager = await deployContract(MultiTokenForwardingRulesManager, [HOME_BRIDGE_OWNER], { nonce: nonce++ })
    forwardingRulesManager = manager.options.address
    console.log('\n[Home] New Forwarding Rules Manager has been deployed: ', forwardingRulesManager)
  } else {
    console.log('\n[Home] Using existing Forwarding Rules Manager: ', forwardingRulesManager)
  }

  console.log(`\n[Home] Deploying gas limit manager contract with the following parameters:
    HOME_AMB_BRIDGE: ${HOME_AMB_BRIDGE}
    OWNER: ${HOME_BRIDGE_OWNER}
    HOME_MEDIATOR_REQUEST_GAS_LIMIT: ${HOME_MEDIATOR_REQUEST_GAS_LIMIT}
  `)
  const gasLimitManager = await deployContract(
    SelectorTokenGasLimitManager,
    [HOME_AMB_BRIDGE, HOME_BRIDGE_OWNER, HOME_MEDIATOR_REQUEST_GAS_LIMIT],
    { nonce: nonce++ }
  )
  console.log('\n[Home] New Gas Limit Manager has been deployed: ', gasLimitManager.options.address)
  console.log('[Home] Manual setup of request gas limits in the manager is recommended.')
  console.log('[Home] Please, call setCommonRequestGasLimits on the Gas Limit Manager contract.')

  console.log('\n[Home] Deploying Bridge Mediator implementation\n')
  const homeBridgeImplementation = await deployContract(HomeNFTOmnibridge, [], {
    nonce: nonce++,
  })
  console.log('[Home] Bridge Mediator Implementation: ', homeBridgeImplementation.options.address)

  console.log('\n[Home] Hooking up Mediator storage to Mediator implementation')
  await upgradeProxy({
    proxy: homeBridgeStorage,
    implementationAddress: homeBridgeImplementation.options.address,
    version: '1',
    nonce: nonce++,
  })

  console.log('\nHome part of OMNIBRIDGE_NFT has been deployed\n')
  return {
    homeBridgeMediator: { address: homeBridgeStorage.options.address },
    tokenImage: { address: tokenImage },
    gasLimitManager: { address: gasLimitManager.options.address },
    forwardingRulesManager: { address: forwardingRulesManager },
  }
}

module.exports = deployHome
