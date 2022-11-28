const { web3Foreign, deploymentFactoryAddress, web3Home } = require('../web3')
const { ERC721TokenFactory } = require('../loadContracts')
const { sendRawTxForeign, transferOwnership, sendRawTxHome } = require('../deploymentUtils')

const {
  HOME_TOKEN_FACTORY_OWNER,
  FOREIGN_TOKEN_FACTORY_OWNER,
  DEPLOYMENT_FACTORY_ACCOUNT_PRIVATE_KEY,
} = require('../loadEnv')

async function initializeForeign({ factory, bridge, oppositeBridge }) {
  let nonce = await web3Foreign.eth.getTransactionCount(deploymentFactoryAddress)
  const contract = new web3Foreign.eth.Contract(ERC721TokenFactory.abi, factory)

  console.log('\n[Foreign] Set bridge for ERC721 token factory:')

  const setBridgeForeignData = contract.methods.setBridge(bridge).encodeABI()

  await sendRawTxForeign({
    data: setBridgeForeignData,
    nonce: nonce++,
    to: factory,
    privateKey: DEPLOYMENT_FACTORY_ACCOUNT_PRIVATE_KEY,
  })

  console.log('\n[Foreign] Set opposite bridge for ERC721 token factory:')

  const setOppositeBridgeForeignData = contract.methods.setOppositeBridge(oppositeBridge).encodeABI()

  await sendRawTxForeign({
    data: setOppositeBridgeForeignData,
    nonce: nonce++,
    to: factory,
    privateKey: DEPLOYMENT_FACTORY_ACCOUNT_PRIVATE_KEY,
  })

  console.log('\n[Foreign] Transferring token factory ownership to admin')

  await transferOwnership({
    contract,
    newOwner: FOREIGN_TOKEN_FACTORY_OWNER,
    nonce: nonce++,
    network: 'foreign',
    privateKey: DEPLOYMENT_FACTORY_ACCOUNT_PRIVATE_KEY,
  })
}

async function initializeHome({ factory, bridge, oppositeBridge }) {
  let nonce = await web3Home.eth.getTransactionCount(deploymentFactoryAddress)
  const contract = new web3Home.eth.Contract(ERC721TokenFactory.abi, factory)

  console.log('\n[Home] Set bridge for ERC721 token factory:')

  const setBridgeHomeData = contract.methods.setBridge(bridge).encodeABI()

  await sendRawTxHome({
    data: setBridgeHomeData,
    nonce: nonce++,
    to: factory,
    privateKey: DEPLOYMENT_FACTORY_ACCOUNT_PRIVATE_KEY,
  })

  console.log('\n[Home] Set opposite bridge for ERC721 token factory:')

  const setOppositeBridgeHomeData = contract.methods.setOppositeBridge(oppositeBridge).encodeABI()

  await sendRawTxHome({
    data: setOppositeBridgeHomeData,
    nonce: nonce++,
    to: factory,
    privateKey: DEPLOYMENT_FACTORY_ACCOUNT_PRIVATE_KEY,
  })

  console.log('\n[Home] Transferring token factory ownership to admin')

  await transferOwnership({
    contract,
    newOwner: HOME_TOKEN_FACTORY_OWNER,
    nonce: nonce++,
    network: 'home',
    privateKey: DEPLOYMENT_FACTORY_ACCOUNT_PRIVATE_KEY,
  })
}

module.exports = {
  initializeTokenFactoryForeign: initializeForeign,
  initializeTokenFactoryHome: initializeHome,
}
