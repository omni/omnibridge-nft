const { web3Home } = require('../web3')
const { deployContract, upgradeProxy, upgradeProxyAndCall } = require('../deploymentUtils')
const {
  EternalStorageProxy,
  OwnedUpgradeabilityProxy,
  HomeNFTOmnibridge,
  ERC721BridgeToken,
  ERC1155BridgeToken,
  NFTForwardingRulesManager,
  SelectorTokenGasLimitManager,
} = require('../loadContracts')
const {
  HOME_AMB_BRIDGE,
  HOME_MEDIATOR_REQUEST_GAS_LIMIT,
  HOME_ERC721_TOKEN_IMAGE,
  HOME_ERC1155_TOKEN_IMAGE,
  HOME_FORWARDING_RULES_MANAGER_IMPLEMENTATION,
  HOME_GAS_LIMIT_MANAGER_IMPLEMENTATION,
  HOME_TOKEN_NAME_SUFFIX,
} = require('../loadEnv')
const { ZERO_ADDRESS } = require('../constants')

async function deployThroughProxy(contract, args, implementation) {
  console.log(`\n[Home] Deploying ${contract.contractName} proxy\n`)
  const proxy = await deployContract('home', OwnedUpgradeabilityProxy, [])
  console.log(`[Home] ${contract.contractName} proxy: `, proxy.options.address)

  let impl
  if (implementation) {
    console.log(`\n[Home] Using existing implementation: ${implementation}`)
    impl = new web3Home.eth.Contract(contract.abi, implementation)
  } else {
    console.log(`\n[Home] Deploying ${contract.contractName} implementation\n`)
    impl = await deployContract('home', contract, [])
    console.log(`[Home] ${contract.contractName} implementation: `, impl.options.address)
  }

  console.log(`\n[Home] Hooking up ${contract.contractName} proxy to implementation`)
  await upgradeProxyAndCall({
    proxy,
    implementationAddress: impl.options.address,
    version: '1',
    data: impl.methods.initialize(...args).encodeABI(),
  })

  impl.options.address = proxy.options.address
  return impl
}

async function deployHome() {
  console.log('\n[Home] Deploying Bridge Mediator storage\n')
  const homeBridgeStorage = await deployContract('home', EternalStorageProxy, [])
  console.log('[Home] Bridge Mediator Storage: ', homeBridgeStorage.options.address)

  let tokenImageERC721 = HOME_ERC721_TOKEN_IMAGE
  if (!tokenImageERC721) {
    console.log('\n[Home] Deploying new ERC721 token image')
    const image = await deployContract('home', ERC721BridgeToken, ['', '', ZERO_ADDRESS])
    tokenImageERC721 = image.options.address
    console.log('\n[Home] New ERC721 token image has been deployed: ', tokenImageERC721)
  } else {
    console.log('\n[Home] Using existing ERC721 token image: ', tokenImageERC721)
  }

  let tokenImageERC1155 = HOME_ERC1155_TOKEN_IMAGE
  if (!tokenImageERC1155) {
    console.log('\n[Home] Deploying new ERC1155 token image')
    const image = await deployContract('home', ERC1155BridgeToken, ['', '', ZERO_ADDRESS])
    tokenImageERC1155 = image.options.address
    console.log('\n[Home] New ERC1155 token image has been deployed: ', tokenImageERC1155)
  } else {
    console.log('\n[Home] Using existing ERC1155 token image: ', tokenImageERC1155)
  }

  let forwardingRulesManager = ZERO_ADDRESS
  // '' or 0x<ADDR>
  if (HOME_FORWARDING_RULES_MANAGER_IMPLEMENTATION !== false) {
    console.log(`\n[Home] Deploying Forwarding Rules Manager contract with the following parameters:
    MEDIATOR: ${homeBridgeStorage.options.address}
    `)
    const manager = await deployThroughProxy(
      NFTForwardingRulesManager,
      [homeBridgeStorage.options.address],
      HOME_FORWARDING_RULES_MANAGER_IMPLEMENTATION
    )
    forwardingRulesManager = manager.options.address
    console.log('\n[Home] New Forwarding Rules Manager has been deployed: ', forwardingRulesManager)
  }

  console.log(`\n[Home] Deploying gas limit manager contract with the following parameters:
     HOME_AMB_BRIDGE: ${HOME_AMB_BRIDGE}
     MEDIATOR: ${homeBridgeStorage.options.address}
     HOME_MEDIATOR_REQUEST_GAS_LIMIT: ${HOME_MEDIATOR_REQUEST_GAS_LIMIT}
   `)
  const gasLimitManager = await deployThroughProxy(
    SelectorTokenGasLimitManager,
    [HOME_AMB_BRIDGE, homeBridgeStorage.options.address, HOME_MEDIATOR_REQUEST_GAS_LIMIT],
    HOME_GAS_LIMIT_MANAGER_IMPLEMENTATION
  )
  console.log('\n[Home] New Gas Limit Manager has been deployed: ', gasLimitManager.options.address)
  console.log('[Home] Manual setup of request gas limits in the manager is recommended.')
  console.log('[Home] Please, call setCommonRequestGasLimits on the Gas Limit Manager contract.')

  console.log('\n[Home] Deploying Bridge Mediator implementation with the following parameters:')
  console.log(`    TOKEN_NAME_SUFFIX: ${HOME_TOKEN_NAME_SUFFIX}\n`)
  const homeBridgeImplementation = await deployContract('home', HomeNFTOmnibridge, [HOME_TOKEN_NAME_SUFFIX])
  console.log('[Home] Bridge Mediator Implementation: ', homeBridgeImplementation.options.address)

  console.log('\n[Home] Hooking up Mediator storage to Mediator implementation')
  await upgradeProxy({
    proxy: homeBridgeStorage,
    implementationAddress: homeBridgeImplementation.options.address,
    version: '1',
  })

  console.log('\nHome part of OMNIBRIDGE_NFT has been deployed\n')
  return {
    homeBridgeMediator: { address: homeBridgeStorage.options.address },
    tokenImageERC721: { address: tokenImageERC721 },
    tokenImageERC1155: { address: tokenImageERC1155 },
    gasLimitManager: { address: gasLimitManager.options.address },
    forwardingRulesManager: { address: forwardingRulesManager },
  }
}

module.exports = deployHome
