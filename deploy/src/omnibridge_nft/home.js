const { web3Home, deploymentAddress } = require('../web3')
const { deployContract, upgradeProxy, upgradeProxyAndCall } = require('../deploymentUtils')
const {
  EternalStorageProxy,
  OwnedUpgradeabilityProxy,
  HomeNFTOmnibridge,
  ERC721BridgeToken,
  NFTForwardingRulesManager,
  SelectorTokenGasLimitManager,
} = require('../loadContracts')
const {
  HOME_AMB_BRIDGE,
  HOME_MEDIATOR_REQUEST_GAS_LIMIT,
  HOME_ERC721_TOKEN_IMAGE,
  HOME_FORWARDING_RULES_MANAGER,
} = require('../loadEnv')
const { ZERO_ADDRESS } = require('../constants')

async function deployThroughProxy(contract, args, nonce) {
  console.log(`\n[Home] Deploying ${contract.contractName} proxy\n`)
  const proxy = await deployContract(OwnedUpgradeabilityProxy, [], { nonce })
  console.log(`[Home] ${contract.contractName} proxy: `, proxy.options.address)

  console.log(`\n[Home] Deploying ${contract.contractName} implementation\n`)
  const impl = await deployContract(contract, [], { nonce: nonce + 1 })
  console.log(`[Home] ${contract.contractName} implementation: `, impl.options.address)

  console.log(`\n[Home] Hooking up ${contract.contractName} proxy to implementation`)
  await upgradeProxyAndCall({
    proxy,
    implementationAddress: impl.options.address,
    version: '1',
    nonce: nonce + 2,
    data: impl.methods.initialize(...args).encodeABI(),
  })

  impl.options.address = proxy.options.address
  return impl
}

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
    MEDIATOR: ${homeBridgeStorage.options.address}
    `)
    const manager = await deployThroughProxy(NFTForwardingRulesManager, [homeBridgeStorage.options.address], nonce)
    nonce += 3
    forwardingRulesManager = manager.options.address
    console.log('\n[Home] New Forwarding Rules Manager has been deployed: ', forwardingRulesManager)
  } else {
    console.log('\n[Home] Using existing Forwarding Rules Manager: ', forwardingRulesManager)
  }

  console.log(`\n[Home] Deploying gas limit manager contract with the following parameters:
     HOME_AMB_BRIDGE: ${HOME_AMB_BRIDGE}
     MEDIATOR: ${homeBridgeStorage.options.address}
     HOME_MEDIATOR_REQUEST_GAS_LIMIT: ${HOME_MEDIATOR_REQUEST_GAS_LIMIT}
   `)
  const gasLimitManager = await deployThroughProxy(
    SelectorTokenGasLimitManager,
    [HOME_AMB_BRIDGE, homeBridgeStorage.options.address, HOME_MEDIATOR_REQUEST_GAS_LIMIT],
    nonce
  )
  nonce += 3
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
