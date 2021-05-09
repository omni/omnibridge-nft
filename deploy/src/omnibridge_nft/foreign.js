const { web3Foreign, deploymentAddress } = require('../web3')
const { deployContract, upgradeProxy } = require('../deploymentUtils')
const { EternalStorageProxy, ForeignNFTOmnibridge, ERC721BridgeToken, ERC1155BridgeToken } = require('../loadContracts')
const { FOREIGN_ERC721_TOKEN_IMAGE, FOREIGN_ERC1155_TOKEN_IMAGE, FOREIGN_TOKEN_NAME_SUFFIX } = require('../loadEnv')
const { ZERO_ADDRESS } = require('../constants')

async function deployForeign() {
  let nonce = await web3Foreign.eth.getTransactionCount(deploymentAddress)

  console.log('\n[Foreign] Deploying Bridge Mediator storage\n')
  const foreignBridgeStorage = await deployContract(EternalStorageProxy, [], {
    network: 'foreign',
    nonce: nonce++,
  })
  console.log('[Foreign] Bridge Mediator Storage: ', foreignBridgeStorage.options.address)

  let tokenImageERC721 = FOREIGN_ERC721_TOKEN_IMAGE
  if (!tokenImageERC721) {
    console.log('\n[Foreign] Deploying new ERC721 token image')
    const image = await deployContract(ERC721BridgeToken, ['', '', ZERO_ADDRESS], {
      network: 'foreign',
      nonce: nonce++,
    })
    tokenImageERC721 = image.options.address
    console.log('\n[Foreign] New ERC721 token image has been deployed: ', tokenImageERC721)
  } else {
    console.log('\n[Foreign] Using existing ERC721 token image: ', tokenImageERC721)
  }

  let tokenImageERC1155 = FOREIGN_ERC1155_TOKEN_IMAGE
  if (!tokenImageERC1155) {
    console.log('\n[Foreign] Deploying new ERC1155 token image')
    const image = await deployContract(ERC1155BridgeToken, ['', '', ZERO_ADDRESS], {
      network: 'foreign',
      nonce: nonce++,
    })
    tokenImageERC1155 = image.options.address
    console.log('\n[Foreign] New ERC1155 token image has been deployed: ', tokenImageERC1155)
  } else {
    console.log('\n[Foreign] Using existing ERC1155 token image: ', tokenImageERC1155)
  }

  console.log('\n[Foreign] Deploying Bridge Mediator implementation with the following parameters:')
  console.log(`    TOKEN_NAME_SUFFIX: ${FOREIGN_TOKEN_NAME_SUFFIX}\n`)
  const foreignBridgeImplementation = await deployContract(ForeignNFTOmnibridge, [FOREIGN_TOKEN_NAME_SUFFIX], {
    network: 'foreign',
    nonce: nonce++,
  })
  console.log('[Foreign] Bridge Mediator Implementation: ', foreignBridgeImplementation.options.address)

  console.log('\n[Foreign] Hooking up Mediator storage to Mediator implementation')
  await upgradeProxy({
    network: 'foreign',
    proxy: foreignBridgeStorage,
    implementationAddress: foreignBridgeImplementation.options.address,
    version: '1',
    nonce: nonce++,
  })

  console.log('\nForeign part of OMNIBRIDGE_NFT has been deployed\n')
  return {
    foreignBridgeMediator: { address: foreignBridgeStorage.options.address },
    tokenImageERC721: { address: tokenImageERC721 },
    tokenImageERC1155: { address: tokenImageERC1155 },
  }
}

module.exports = deployForeign
