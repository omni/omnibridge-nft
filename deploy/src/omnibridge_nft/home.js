const { web3Home, deploymentAddress } = require('../web3')
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
  HOME_FORWARDING_RULES_MANAGER,
  HOME_TOKEN_NAME_SUFFIX,
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

  let tokenImageERC721 = HOME_ERC721_TOKEN_IMAGE
  if (!tokenImageERC721) {
    console.log('\n[Home] Deploying new ERC721 token image')
    const image = await deployContract(ERC721BridgeToken, ['', '', ZERO_ADDRESS], {
      nonce: nonce++,
    })
    tokenImageERC721 = image.options.address
    console.log('\n[Home] New ERC721 token image has been deployed: ', tokenImageERC721)
  } else {
    console.log('\n[Home] Using existing ERC721 token image: ', tokenImageERC721)
  }

  let tokenImageERC1155 = HOME_ERC1155_TOKEN_IMAGE
  if (!tokenImageERC1155) {
    console.log('\n[Home] Deploying new ERC1155 token image')
    const image = await deployContract(ERC1155BridgeToken, ['', '', ZERO_ADDRESS], {
      nonce: nonce++,
    })
    tokenImageERC1155 = image.options.address
    console.log('\n[Home] New ERC1155 token image has been deployed: ', tokenImageERC1155)
  } else {
    console.log('\n[Home] Using existing ERC1155 token image: ', tokenImageERC1155)
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

  console.log('\n[Home] Deploying Bridge Mediator implementation with the following parameters:')
  console.log(`    TOKEN_NAME_SUFFIX: ${HOME_TOKEN_NAME_SUFFIX}\n`)
  const homeBridgeImplementation = await deployContract(HomeNFTOmnibridge, [HOME_TOKEN_NAME_SUFFIX], {
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
    tokenImageERC721: { address: tokenImageERC721 },
    tokenImageERC1155: { address: tokenImageERC1155 },
    gasLimitManager: { address: gasLimitManager.options.address },
    forwardingRulesManager: { address: forwardingRulesManager },
  }
}

module.exports = deployHome
