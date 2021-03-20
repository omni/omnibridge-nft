const assert = require('assert')
const path = require('path')
require('dotenv').config({
  path: path.join(__dirname, '.env'),
})
const Web3 = require('web3')

const filterEvents = (arr) => arr.filter((x) => x.type === 'event')

const HOMEAMBABI = [
  {
    name: 'requiredSignatures',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    type: 'function',
  },
  {
    name: 'signature',
    inputs: [
      {
        name: '',
        type: 'bytes32',
      },
      {
        name: '',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bytes',
      },
    ],
    type: 'function',
  },
]

const FOREIGNAMBABI = [
  {
    name: 'executeSignatures',
    inputs: [
      {
        name: '',
        type: 'bytes',
      },
      {
        name: '',
        type: 'bytes',
      },
    ],
    outputs: [],
    type: 'function',
  },
]

const AMBABI = require('../build/contracts/IAMB.json').abi

const AMBEventABI = filterEvents(AMBABI)

const HomeABI = [...require('../build/contracts/HomeNFTOmnibridge.json').abi, ...AMBEventABI]
const ForeignABI = [...require('../build/contracts/ForeignNFTOmnibridge.json').abi, ...AMBEventABI]

const ERC721 = require('../build/contracts/ERC721BridgeToken.json')

const scenarios = [
  require('./scenarios/bridgeNativeForeignTokens'),
  require('./scenarios/bridgeNativeHomeTokens'),
  require('./scenarios/bridgeNativeForeignTokensToOtherUser'),
  require('./scenarios/bridgeNativeHomeTokensToOtherUser'),
  require('./scenarios/fixForeignMediatorBalance'),
  require('./scenarios/fixHomeMediatorBalance'),
  require('./scenarios/homeRequestFailedMessageFix'),
  require('./scenarios/foreignRequestFailedMessageFix'),
]
const { ZERO_ADDRESS, toAddress, addPendingTxLogger, signatureToVRS, packSignatures } = require('./utils')

const TokenABI = [...ERC721.abi, ...filterEvents(HomeABI), ...AMBEventABI]

const {
  HOME_RPC_URL,
  FOREIGN_RPC_URL,
  HOME_MEDIATOR_ADDRESS,
  FOREIGN_MEDIATOR_ADDRESS,
  HOME_TOKEN_ADDRESS,
  FOREIGN_TOKEN_ADDRESS,
  HOME_GAS_PRICE,
  FOREIGN_GAS_PRICE,
  TEST_ACCOUNT_PRIVATE_KEY,
  SECOND_TEST_ACCOUNT_PRIVATE_KEY,
  OWNER_ACCOUNT_PRIVATE_KEY,
} = process.env

function deploy(web3, options, abi, bytecode, args) {
  return new web3.eth.Contract(abi, ZERO_ADDRESS, options)
    .deploy({
      data: bytecode,
      arguments: args,
    })
    .send({
      gas: 5000000,
    })
}

async function deployToken(web3, options, bytecode = ERC721.bytecode) {
  const token = await deploy(web3, options, TokenABI, bytecode, ['Test Token', 'TST', options.from])
  console.log(`Deployed token ${token.options.address}`)
  return token
}

const findMessageId = (receipt) =>
  Object.values(receipt.events)
    .flat()
    .find((e) => e.returnValues.messageId).returnValues.messageId

function makeWaitUntilProcessed(contract, finalizationEvent, blockNumber) {
  return async (receipt) => {
    assert.ok(receipt.status, 'Transaction with AMB request has failed')
    const messageId = findMessageId(receipt)
    assert.ok(!!messageId, 'No event with messageId field was found')
    console.log(`Waiting for message ${messageId} to be processed`)
    let attempt = 0
    while (attempt++ < 20) {
      await new Promise((res) => setTimeout(res, 5000))
      const events = await contract.getPastEvents(finalizationEvent, {
        filter: {
          messageId,
        },
        fromBlock: blockNumber,
        toBlock: 'latest',
      })
      if (events.length > 0) {
        return events[0].returnValues.status && events[0].transactionHash
      }
    }
    throw new Error('Message is not processed after 2 minutes, check if AMB validators are working correctly')
  }
}

async function makeExecuteManually(homeAMB, foreignAMB, web3, homeBlockNumber) {
  console.log('Fetching required number of signatures')
  const requiredSignatures = parseInt(await homeAMB.methods.requiredSignatures().call(), 10)

  return async (receipt) => {
    assert.ok(receipt.status, 'Transaction with AMB request has failed')
    const event = Object.values(receipt.events)
      .flat()
      .find((e) => e.returnValues && e.returnValues.messageId)
    assert.ok(!!event, 'No event with messageId field was found')
    const { messageId, encodedData } = event.returnValues
    const hashMsg = web3.utils.soliditySha3Raw(encodedData)
    console.log(hashMsg)
    console.log(`Waiting for signatures to be collected for message ${messageId}`)
    let attempt = 0
    while (attempt++ < 20) {
      await new Promise((res) => setTimeout(res, 5000))
      const events = await homeAMB.getPastEvents('CollectedSignatures', {
        fromBlock: homeBlockNumber,
        toBlock: 'latest',
      })
      if (events.some((event) => event.returnValues && event.returnValues.messageHash === hashMsg)) {
        console.log(`Collecting ${requiredSignatures} signatures for message ${messageId}`)
        const collectedSignatures = await Promise.all(
          Array.from(Array(requiredSignatures).keys()).map((i) => homeAMB.methods.signature(hashMsg, i).call())
        )
        const signatures = packSignatures(collectedSignatures.map(signatureToVRS))
        const executionReceipt = await foreignAMB.methods.executeSignatures(encodedData, signatures).send()
        return executionReceipt.events.RelayedMessage.returnValues.status && executionReceipt.transactionHash
      }
    }
    throw new Error('Message is not processed after 2 minutes, check if AMB validators are working correctly')
  }
}

function makeCheckTransfer(web3) {
  return async (txHash, token, from, to, tokenId) => {
    const tokenAddr = toAddress(token)
    const fromAddr = toAddress(from)
    const toAddr = toAddress(to)
    const str = `Transfer(${fromAddr}, ${toAddr}, ${tokenId})`
    console.log(`Checking if transaction has the required ${str}`)
    const { logs } = await web3.eth.getTransactionReceipt(txHash)
    const sig = web3.eth.abi.encodeEventSignature('Transfer(address,address,uint256)')
    const inputs = ERC721.abi.find((e) => e.type === 'event' && e.name === 'Transfer' && e.inputs.length === 3).inputs
    const transfers = logs
      .filter((log) => log.topics[0] === sig && log.address === tokenAddr)
      .map((log) => web3.eth.abi.decodeLog(inputs, log.data, log.topics.slice(1)))
    assert.ok(transfers.length > 0, `No transfers are found for the token ${tokenAddr}`)
    assert.ok(
      transfers.some(
        (transfer) => transfer.from === fromAddr && transfer.to === toAddr && transfer.tokenId === tokenId.toString()
      ),
      `No ${str} was found in the logs, found transfers:\n${transfers
        .map((e) => `- Transfer(${e.from}, ${e.to}, ${e.tokenId})`)
        .join(',\n')}`
    )
  }
}

function makeGetBridgedToken(web3, mediator, options) {
  return async (token) => {
    console.log('Getting address of the bridged token')
    const bridgedAddress = await mediator.methods.bridgedTokenAddress(toAddress(token)).call()
    assert.notStrictEqual(bridgedAddress, ZERO_ADDRESS, 'Bridged token address is not initialized')
    return new web3.eth.Contract(TokenABI, bridgedAddress, options)
  }
}

function makeWithDisabledExecution(mediator, owner) {
  return async (token, f) => {
    const tokenAddr = toAddress(token)
    console.log(`Disabling execution for ${tokenAddr}`)
    await mediator.methods.disableTokenExecution(tokenAddr, true).send({ from: owner })
    await f().finally(() => {
      console.log(`Enabling back execution for ${tokenAddr}`)
      return mediator.methods.disableTokenExecution(tokenAddr, false).send({ from: owner })
    })
  }
}

function makeMint(token, to) {
  let id = 1
  return async () => {
    console.log(`Minting token #${id} to ${to}`)
    await token.methods.mint(to, id).send()
    return id++
  }
}

function makeRelayToken(mediator, defaultFrom) {
  return (token, id, options) => {
    const opts = options || {}
    const from = opts.from || defaultFrom
    const data = opts.to ? toAddress(opts.to) + (opts.data || '0x').slice(2) : '0x'
    const method = token.methods['safeTransferFrom(address,address,uint256,bytes)']
    console.log(`Relaying token #${id}, data: ${data}`)
    return method(from, toAddress(mediator), id, data).send({ from })
  }
}

async function createEnv(web3Home, web3Foreign) {
  console.log('Import accounts')
  const users = []
  users.push(web3Home.eth.accounts.wallet.add(TEST_ACCOUNT_PRIVATE_KEY).address)
  web3Foreign.eth.accounts.wallet.add(TEST_ACCOUNT_PRIVATE_KEY)
  if (SECOND_TEST_ACCOUNT_PRIVATE_KEY) {
    users.push(web3Home.eth.accounts.wallet.add(SECOND_TEST_ACCOUNT_PRIVATE_KEY).address)
    web3Foreign.eth.accounts.wallet.add(SECOND_TEST_ACCOUNT_PRIVATE_KEY)
  }
  let owner = null
  if (OWNER_ACCOUNT_PRIVATE_KEY) {
    owner = web3Home.eth.accounts.wallet.add(OWNER_ACCOUNT_PRIVATE_KEY).address
    web3Foreign.eth.accounts.wallet.add(OWNER_ACCOUNT_PRIVATE_KEY)
  }

  const homeOptions = {
    from: users[0],
    gas: 1000000,
    gasPrice: HOME_GAS_PRICE,
  }
  const foreignOptions = {
    from: users[0],
    gas: 1000000,
    gasPrice: FOREIGN_GAS_PRICE,
  }

  console.log('Initializing mediators contracts')
  const homeMediator = new web3Home.eth.Contract(HomeABI, HOME_MEDIATOR_ADDRESS, homeOptions)
  const foreignMediator = new web3Foreign.eth.Contract(ForeignABI, FOREIGN_MEDIATOR_ADDRESS, foreignOptions)

  console.log('Initializing AMB contracts')
  const foreignAMB = new web3Foreign.eth.Contract(
    [...AMBABI, ...FOREIGNAMBABI],
    await foreignMediator.methods.bridgeContract().call(),
    foreignOptions
  )
  const homeAMB = new web3Home.eth.Contract(
    [...AMBABI, ...HOMEAMBABI],
    await homeMediator.methods.bridgeContract().call(),
    homeOptions
  )

  console.log('Initializing tokens')
  let homeToken
  let foreignToken
  if (HOME_TOKEN_ADDRESS) {
    console.log('Using existing Home token')
    homeToken = new web3Home.eth.Contract(TokenABI, HOME_TOKEN_ADDRESS, homeOptions)
  } else {
    console.log('Deploying test Home token')
    homeToken = await deployToken(web3Home, homeOptions)
  }
  if (FOREIGN_TOKEN_ADDRESS) {
    console.log('Using existing Foreign token')
    foreignToken = new web3Foreign.eth.Contract(TokenABI, FOREIGN_TOKEN_ADDRESS, foreignOptions)
  } else {
    console.log('Deploying test Foreign token')
    foreignToken = await deployToken(web3Foreign, foreignOptions)
  }

  console.log('Fetching block numbers')
  const homeBlockNumber = await web3Home.eth.getBlockNumber()
  const foreignBlockNumber = await web3Foreign.eth.getBlockNumber()

  return {
    home: {
      web3: web3Home,
      mediator: homeMediator,
      amb: homeAMB,
      token: homeToken,
      getBridgedToken: makeGetBridgedToken(web3Home, homeMediator, homeOptions),
      waitUntilProcessed: makeWaitUntilProcessed(homeAMB, 'AffirmationCompleted', homeBlockNumber),
      withDisabledExecution: makeWithDisabledExecution(homeMediator, owner),
      checkTransfer: makeCheckTransfer(web3Home),
      mint: makeMint(homeToken, users[0]),
      relayToken: makeRelayToken(homeMediator, users[0]),
    },
    foreign: {
      web3: web3Foreign,
      mediator: foreignMediator,
      amb: foreignAMB,
      token: foreignToken,
      getBridgedToken: makeGetBridgedToken(web3Foreign, foreignMediator, foreignOptions),
      waitUntilProcessed: makeWaitUntilProcessed(foreignAMB, 'RelayedMessage', foreignBlockNumber),
      withDisabledExecution: makeWithDisabledExecution(foreignMediator, owner),
      checkTransfer: makeCheckTransfer(web3Foreign),
      mint: makeMint(foreignToken, users[0]),
      relayToken: makeRelayToken(foreignMediator, users[0]),
      executeManually: await makeExecuteManually(homeAMB, foreignAMB, web3Home, homeBlockNumber),
    },
    findMessageId,
    users,
    owner,
  }
}

async function main() {
  const homeProvider = new Web3.providers.HttpProvider(HOME_RPC_URL, { keepAlive: false })
  const web3Home = new Web3(addPendingTxLogger(homeProvider))

  const foreignProvider = new Web3.providers.HttpProvider(FOREIGN_RPC_URL, { keepAlive: false })
  const web3Foreign = new Web3(addPendingTxLogger(foreignProvider))

  console.log('Initializing test environment')
  const env = await createEnv(web3Home, web3Foreign)

  const summary = []
  let failed = 0
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i]
    console.log(`\nRunning scenario ${i + 1}/${scenarios.length} - ${scenario.name}\n`)
    try {
      if (await scenario.shouldRun(env)) {
        await scenario.run(env)
        console.log('OK')
        summary.push(`${i + 1}) ${scenario.name} - OK`)
      } else {
        console.log('SKIPPED')
        summary.push(`${i + 1}) ${scenario.name} - SKIPPED`)
      }
    } catch (e) {
      console.log('FAILED: ', e.message)
      summary.push(`${i + 1}) ${scenario.name} - FAILED`)
      failed++
    }
  }
  console.log('\nTests summary:')
  console.log(summary.join('\n'))
  process.exit(failed)
}

main()
