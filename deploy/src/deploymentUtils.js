/* eslint-disable no-param-reassign */
const BigNumber = require('bignumber.js')
const Web3Utils = require('web3').utils
const assert = require('assert')
const {
  web3Home,
  web3Foreign,
  deploymentAddress,
  GAS_LIMIT_EXTRA,
  HOME_DEPLOYMENT_GAS_PRICE,
  FOREIGN_DEPLOYMENT_GAS_PRICE,
  DEPLOYMENT_ACCOUNT_PRIVATE_KEY,
} = require('./web3')

function getWeb3(network) {
  return network === 'foreign' ? web3Foreign : web3Home
}

async function deployContract(network, contractJson, args) {
  const web3 = getWeb3(network)
  const instance = new web3.eth.Contract(contractJson.abi)
  const result = instance
    .deploy({
      data: contractJson.bytecode,
      arguments: args,
    })
    .encodeABI()
  const receipt = await sendTx(network, {
    data: result,
    to: null,
  })
  instance.options.address = receipt.contractAddress
  instance.deployedBlockNumber = receipt.blockNumber

  return instance
}

const nonces = {}
async function getNonce(network, addr) {
  const web3 = getWeb3(network)
  const key = `${network}-${addr}`
  if (!nonces[key]) {
    nonces[key] = await web3.eth.getTransactionCount(addr)
  }
  return nonces[key]
}

function updateNonce(network, addr) {
  nonces[`${network}-${addr}`]++
}

async function sendTx(network, options) {
  const net = network || 'home'
  const from = deploymentAddress
  const nonce = await getNonce(net, from)
  const gasPrice = net === 'foreign' ? FOREIGN_DEPLOYMENT_GAS_PRICE : HOME_DEPLOYMENT_GAS_PRICE
  const web3 = getWeb3(net)
  const opts = { ...options, from, nonce, gasPrice, web3 }
  const signedTx = await buildTx(opts)
  const receipt = await sendRawTx(web3, signedTx)
  updateNonce(net, from)
  return receipt
}

async function buildTx({ data, nonce, to, web3, gasPrice, value }) {
  const estimatedGas = new BigNumber(
    await web3.eth.estimateGas({
      from: deploymentAddress,
      value,
      to,
      data,
    })
  )

  const blockData = await web3.eth.getBlock('latest')
  const blockGasLimit = new BigNumber(blockData.gasLimit)
  if (estimatedGas.isGreaterThan(blockGasLimit)) {
    throw new Error(
      `estimated gas greater (${estimatedGas.toString()}) than the block gas limit (${blockGasLimit.toString()})`
    )
  }
  let gas = estimatedGas.multipliedBy(new BigNumber(1 + GAS_LIMIT_EXTRA))
  if (gas.isGreaterThan(blockGasLimit)) {
    gas = blockGasLimit
  } else {
    gas = gas.toFixed(0)
  }

  const rawTx = {
    nonce,
    gasPrice: Web3Utils.toHex(gasPrice),
    gasLimit: Web3Utils.toHex(gas),
    to,
    data,
    value,
  }

  return new Promise((res) =>
    web3.eth.accounts.signTransaction(rawTx, DEPLOYMENT_ACCOUNT_PRIVATE_KEY, (err, signedTx) => res(signedTx))
  )
}

async function sendRawTx(web3, signedTx) {
  const receipt = await web3.eth
    .sendSignedTransaction(signedTx.rawTransaction)
    .once('transactionHash', (txHash) => console.log('pending txHash', txHash))
    .on('error', (e) => {
      throw e
    })
  assert.ok(receipt.status, 'Transaction Failed')
  return receipt
}

async function upgradeProxy({ proxy, implementationAddress, version, network }) {
  await sendTx(network, {
    data: proxy.methods.upgradeTo(version, implementationAddress).encodeABI(),
    to: proxy.options.address,
  })
}

async function upgradeProxyAndCall({ proxy, implementationAddress, version, data, network }) {
  await sendTx(network, {
    data: proxy.methods.upgradeToAndCall(version, implementationAddress, data).encodeABI(),
    to: proxy.options.address,
  })
}

async function transferProxyOwnership({ proxy, newOwner, network }) {
  await sendTx(network, {
    data: proxy.methods.transferProxyOwnership(newOwner).encodeABI(),
    to: proxy.options.address,
  })
}

async function transferOwnership({ contract, newOwner, network }) {
  await sendTx(network, {
    data: contract.methods.transferOwnership(newOwner).encodeABI(),
    to: contract.options.address,
  })
}

async function setBridgeContract({ contract, bridgeAddress, network }) {
  await sendTx(network, {
    data: contract.methods.setBridgeContract(bridgeAddress).encodeABI(),
    to: contract.options.address,
  })
}

async function isContract(web3, address) {
  const code = await web3.eth.getCode(address)
  return code !== '0x' && code !== '0x0'
}

module.exports = {
  sendTx,
  deployContract,
  upgradeProxy,
  upgradeProxyAndCall,
  transferProxyOwnership,
  transferOwnership,
  setBridgeContract,
  isContract,
}
