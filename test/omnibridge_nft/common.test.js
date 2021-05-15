const HomeNFTOmnibridge = artifacts.require('HomeNFTOmnibridge')
const ForeignNFTOmnibridge = artifacts.require('ForeignNFTOmnibridge')
const EternalStorageProxy = artifacts.require('EternalStorageProxy')
const AMBMock = artifacts.require('AMBMock')
const ERC721BridgeToken = artifacts.require('ERC721BridgeToken')
const ERC721TokenProxy = artifacts.require('ERC721TokenProxy')
const ERC1155BridgeToken = artifacts.require('ERC1155BridgeToken')
const ERC1155TokenProxy = artifacts.require('ERC1155TokenProxy')
const ERC1155ReceiverMock = artifacts.require('ERC1155ReceiverMock')
const NFTForwardingRulesManager = artifacts.require('NFTForwardingRulesManager')
const SelectorTokenGasLimitManager = artifacts.require('SelectorTokenGasLimitManager')
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy')
const selectors = {
  deployAndHandleBridgedNFT: '0xf92d7468',
  handleBridgedNFT: '0xb701e094',
  handleNativeNFT: '0x6ca48357',
  fixFailedMessage: '0x276fea8a',
}

const { expect } = require('chai')
const { getEvents, ether, expectEventInLogs } = require('../helpers/helpers')
const { ZERO_ADDRESS, toBN } = require('../setup')

const ZERO = toBN(0)
const exampleMessageId = '0xf308b922ab9f8a7128d9d7bc9bce22cd88b2c05c8213f0e2d8104d78e0a9ecbb'
const otherMessageId = '0x35d3818e50234655f6aebb2a1cfbf30f59568d8a4ec72066fac5a25dbe7b8121'
const failedMessageId = '0x2ebc2ccc755acc8eaf9252e19573af708d644ab63a39619adb080a3500a4ff2e'

function runTests(accounts, isHome) {
  const Mediator = isHome ? HomeNFTOmnibridge : ForeignNFTOmnibridge
  const SUFFIX = ' on Testnet'
  const modifyName = (name) => name + SUFFIX
  const uriFor = (tokenId) => `https://example.com/${tokenId}`
  const otherSideMediator = '0x1e33FBB006F47F78704c954555a5c52C2A7f409D'
  const otherSideToken1 = '0xAfb77d544aFc1e2aD3dEEAa20F3c80859E7Fc3C9'
  const otherSideToken2 = '0x876bD892b01D1c9696D873f74cbeF8fc9Bfb1142'

  let contract
  let token
  let ambBridgeContract
  let tokenImageERC721
  let tokenImageERC1155
  const owner = accounts[0]
  const user = accounts[1]
  const user2 = accounts[2]

  const mintNewERC721 = (() => {
    let tokenId = 100
    return async () => {
      await token.mint(user, tokenId)
      await token.setTokenURI(tokenId, uriFor(tokenId))
      return tokenId++
    }
  })()

  const mintNewERC1155 = (() => {
    let tokenId = 100
    return async (value = 1) => {
      await token.mint(user, [tokenId], [value])
      await token.setTokenURI(tokenId, uriFor(tokenId))
      return tokenId++
    }
  })()

  function deployAndHandleBridgedERC721(options) {
    const opts = options || {}
    return contract.contract.methods
      .deployAndHandleBridgedNFT(
        opts.token || otherSideToken1,
        typeof opts.name === 'string' ? opts.name : 'Test',
        typeof opts.symbol === 'string' ? opts.symbol : 'TST',
        opts.receiver || user,
        [opts.tokenId],
        [],
        [uriFor(opts.tokenId)]
      )
      .encodeABI()
  }

  function handleBridgedERC721(options) {
    const opts = options || {}
    return contract.contract.methods
      .handleBridgedNFT(
        opts.token || otherSideToken1,
        opts.receiver || user,
        [opts.tokenId],
        [],
        [uriFor(opts.tokenId)]
      )
      .encodeABI()
  }

  function handleNativeERC721(options) {
    const opts = options || {}
    return contract.contract.methods
      .handleNativeNFT(opts.token || token.address, opts.receiver || user, [opts.tokenId], [])
      .encodeABI()
  }

  function fixFailedERC721(options) {
    const opts = options || {}
    return contract.contract.methods
      .fixFailedMessage(opts.messageId, opts.token || token.address, opts.sender || user, [opts.tokenId], [])
      .encodeABI()
  }

  function deployAndHandleBridgedERC1155(options) {
    const opts = options || {}
    return contract.contract.methods
      .deployAndHandleBridgedNFT(
        opts.token || otherSideToken1,
        typeof opts.name === 'string' ? opts.name : 'Test',
        typeof opts.symbol === 'string' ? opts.symbol : 'TST',
        opts.receiver || user,
        opts.tokenIds,
        opts.values,
        opts.tokenIds.map(uriFor)
      )
      .encodeABI()
  }

  function handleBridgedERC1155(options) {
    const opts = options || {}
    return contract.contract.methods
      .handleBridgedNFT(
        opts.token || otherSideToken1,
        opts.receiver || user,
        opts.tokenIds,
        opts.values,
        opts.tokenIds.map(uriFor)
      )
      .encodeABI()
  }

  function handleNativeERC1155(options) {
    const opts = options || {}
    return contract.contract.methods
      .handleNativeNFT(opts.token || token.address, opts.receiver || user, opts.tokenIds, opts.values)
      .encodeABI()
  }

  function fixFailedERC1155(options) {
    const opts = options || {}
    return contract.contract.methods
      .fixFailedMessage(opts.messageId, opts.token || token.address, opts.sender || user, opts.tokenIds, opts.values)
      .encodeABI()
  }

  async function executeMessageCall(messageId, data, options) {
    const opts = options || {}
    await ambBridgeContract.executeMessageCall(
      opts.executor || contract.address,
      opts.messageSender || otherSideMediator,
      data,
      messageId,
      opts.gas || 1000000
    ).should.be.fulfilled
    return ambBridgeContract.messageCallStatus(messageId)
  }

  async function initialize(options) {
    const opts = options || {}
    const args = [
      opts.ambContract || ambBridgeContract.address,
      opts.otherSideMediator || otherSideMediator,
      isHome ? opts.gasLimitManager || ZERO_ADDRESS : opts.requestGasLimit || 1000000,
      opts.owner || owner,
      opts.tokenImageERC721 || tokenImageERC721.address,
      opts.tokenImageERC1155 || tokenImageERC1155.address,
    ]
    if (isHome) {
      args.push(opts.forwardingRulesManager || ZERO_ADDRESS)
    }
    return contract.initialize(...args)
  }

  const sendFunctions = [
    async function noAlternativeReceiver(tokenId) {
      const id = tokenId || (await mintNewERC721())
      const method = token.methods['safeTransferFrom(address,address,uint256)']
      return method(user, contract.address, id, { from: user }).then(() => user)
    },
    async function sameAlternativeReceiver(tokenId) {
      const id = tokenId || (await mintNewERC721())
      const method = token.methods['safeTransferFrom(address,address,uint256,bytes)']
      return method(user, contract.address, id, user, { from: user }).then(() => user)
    },
    async function differentAlternativeReceiver(tokenId) {
      const id = tokenId || (await mintNewERC721())
      const method = token.methods['safeTransferFrom(address,address,uint256,bytes)']
      return method(user, contract.address, id, user2, { from: user }).then(() => user2)
    },
    async function simpleRelayToken1(tokenId) {
      const id = tokenId || (await mintNewERC721())
      await token.approve(contract.address, id, { from: user }).should.be.fulfilled
      const method = contract.methods['relayToken(address,uint256)']
      return method(token.address, id, { from: user }).then(() => user)
    },
    async function simpleRelayToken2(tokenId) {
      const id = tokenId || (await mintNewERC721())
      await token.approve(contract.address, id, { from: user }).should.be.fulfilled
      const method = contract.methods['relayToken(address,address,uint256)']
      return method(token.address, user, id, { from: user }).then(() => user)
    },
    async function relayTokenWithAlternativeReceiver(tokenId) {
      const id = tokenId || (await mintNewERC721())
      await token.approve(contract.address, id, { from: user }).should.be.fulfilled
      const method = contract.methods['relayToken(address,address,uint256)']
      return method(token.address, user2, id, { from: user }).then(() => user2)
    },
  ]

  before(async () => {
    tokenImageERC721 = await ERC721BridgeToken.new('TEST', 'TST', owner)
    tokenImageERC1155 = await ERC1155BridgeToken.new('TEST', 'TST', owner)
  })

  beforeEach(async () => {
    contract = await Mediator.new(SUFFIX)
    ambBridgeContract = await AMBMock.new()
    token = await ERC721BridgeToken.new('TEST', 'TST', owner)
  })

  describe('getBridgeMode', () => {
    it('should return mediator mode and interface', async function () {
      const bridgeModeHash = '0xca7fc3dc' // 4 bytes of keccak256('multi-nft-to-nft-amb')
      expect(await contract.getBridgeMode()).to.be.equal(bridgeModeHash)

      const { major, minor, patch } = await contract.getBridgeInterfacesVersion()
      major.should.be.bignumber.gte(ZERO)
      minor.should.be.bignumber.gte(ZERO)
      patch.should.be.bignumber.gte(ZERO)
    })
  })

  describe('initialize', () => {
    it('should initialize parameters', async () => {
      // Given
      expect(await contract.isInitialized()).to.be.equal(false)
      expect(await contract.bridgeContract()).to.be.equal(ZERO_ADDRESS)
      expect(await contract.mediatorContractOnOtherSide()).to.be.equal(ZERO_ADDRESS)
      expect(await contract.owner()).to.be.equal(ZERO_ADDRESS)
      expect(await contract.tokenImageERC721()).to.be.equal(ZERO_ADDRESS)
      expect(await contract.tokenImageERC1155()).to.be.equal(ZERO_ADDRESS)

      // When
      // not valid bridge address
      await initialize({ ambContract: ZERO_ADDRESS }).should.be.rejected

      if (isHome) {
        // gas limit manage is not a contract
        await initialize({ gasLimitManager: owner }).should.be.rejected

        // forwarding rules manager is not a contract
        await initialize({ forwardingRulesManager: owner }).should.be.rejected
      } else {
        // maxGasPerTx > bridge maxGasPerTx
        await initialize({ requestGasLimit: ether('1') }).should.be.rejected
      }

      // not valid owner
      await initialize({ owner: ZERO_ADDRESS }).should.be.rejected

      // token factory is not a contract
      await initialize({ tokenImageERC721: owner }).should.be.rejected
      await initialize({ tokenImageERC1155: owner }).should.be.rejected

      await initialize().should.be.fulfilled

      // already initialized
      await initialize().should.be.rejected

      // Then
      expect(await contract.isInitialized()).to.be.equal(true)
      expect(await contract.bridgeContract()).to.be.equal(ambBridgeContract.address)
      expect(await contract.mediatorContractOnOtherSide()).to.be.equal(otherSideMediator)
      if (isHome) {
        expect(await contract.gasLimitManager()).to.be.equal(ZERO_ADDRESS)
      } else {
        expect(await contract.requestGasLimit()).to.be.bignumber.equal('1000000')
      }
      expect(await contract.owner()).to.be.equal(owner)
      expect(await contract.tokenImageERC721()).to.be.equal(tokenImageERC721.address)
      expect(await contract.tokenImageERC1155()).to.be.equal(tokenImageERC1155.address)
    })
  })

  describe('afterInitialization', () => {
    beforeEach(async () => {
      await initialize().should.be.fulfilled

      const initialEvents = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
      expect(initialEvents.length).to.be.equal(0)
    })

    describe('update mediator parameters', () => {
      describe('disable token operations', () => {
        it('should allow to disable bridging operations globally', async () => {
          await contract.disableTokenBridging(ZERO_ADDRESS, true, { from: user }).should.be.rejected
          await contract.disableTokenExecution(ZERO_ADDRESS, true, { from: user }).should.be.rejected

          const receipt1 = await contract.disableTokenBridging(ZERO_ADDRESS, true, { from: owner }).should.be.fulfilled
          expectEventInLogs(receipt1.logs, 'TokenBridgingDisabled', { token: ZERO_ADDRESS, disabled: true })

          expect(await contract.isTokenBridgingAllowed(ZERO_ADDRESS)).to.be.equal(false)
          expect(await contract.isTokenExecutionAllowed(ZERO_ADDRESS)).to.be.equal(true)

          const receipt2 = await contract.disableTokenExecution(ZERO_ADDRESS, true, { from: owner }).should.be.fulfilled
          expectEventInLogs(receipt2.logs, 'TokenExecutionDisabled', { token: ZERO_ADDRESS, disabled: true })

          expect(await contract.isTokenBridgingAllowed(ZERO_ADDRESS)).to.be.equal(false)
          expect(await contract.isTokenExecutionAllowed(ZERO_ADDRESS)).to.be.equal(false)

          const receipt3 = await contract.disableTokenBridging(ZERO_ADDRESS, false, { from: owner }).should.be.fulfilled
          const receipt4 = await contract.disableTokenExecution(ZERO_ADDRESS, false, { from: owner }).should.be
            .fulfilled
          expectEventInLogs(receipt3.logs, 'TokenBridgingDisabled', { token: ZERO_ADDRESS, disabled: false })
          expectEventInLogs(receipt4.logs, 'TokenExecutionDisabled', { token: ZERO_ADDRESS, disabled: false })

          expect(await contract.isTokenBridgingAllowed(ZERO_ADDRESS)).to.be.equal(true)
          expect(await contract.isTokenExecutionAllowed(ZERO_ADDRESS)).to.be.equal(true)
        })

        it('should allow to disable operations for known tokens', async () => {
          await contract.disableTokenBridging(token.address, true, { from: owner }).should.be.rejected
          await contract.disableTokenExecution(token.address, true, { from: owner }).should.be.rejected

          await token.safeTransferFrom(user, contract.address, await mintNewERC721(), { from: user }).should.be
            .fulfilled

          await contract.disableTokenBridging(token.address, true, { from: owner }).should.be.fulfilled
          await contract.disableTokenExecution(token.address, true, { from: owner }).should.be.fulfilled

          expect(await contract.isTokenBridgingAllowed(token.address)).to.be.equal(false)
          expect(await contract.isTokenExecutionAllowed(token.address)).to.be.equal(false)

          const data = deployAndHandleBridgedERC721({ tokenId: 1 })
          expect(await executeMessageCall(exampleMessageId, data)).to.be.equal(true)
          const bridgedToken = await contract.bridgedTokenAddress(otherSideToken1)

          await contract.disableTokenBridging(bridgedToken, true, { from: owner }).should.be.fulfilled
          await contract.disableTokenExecution(bridgedToken, true, { from: owner }).should.be.fulfilled

          expect(await contract.isTokenBridgingAllowed(bridgedToken)).to.be.equal(false)
          expect(await contract.isTokenExecutionAllowed(bridgedToken)).to.be.equal(false)
        })
      })

      describe('preset token address pair', () => {
        it('should allow to set address pair for not yet bridged token', async () => {
          await contract.setCustomTokenAddressPair(otherSideToken1, token.address, { from: user }).should.be.rejected
          await contract.setCustomTokenAddressPair(otherSideToken1, user).should.be.rejected
          await contract.setCustomTokenAddressPair(otherSideToken1, token.address).should.be.fulfilled
          await contract.setCustomTokenAddressPair(otherSideToken1, token.address).should.be.rejected

          const events = await getEvents(contract, { event: 'NewTokenRegistered' })
          expect(events.length).to.be.equal(1)
          const { nativeToken, bridgedToken } = events[0].returnValues
          expect(nativeToken).to.be.equal(otherSideToken1)
          expect(bridgedToken).to.be.equal(token.address)

          expect(await contract.nativeTokenAddress(bridgedToken)).to.be.equal(nativeToken)
          expect(await contract.bridgedTokenAddress(nativeToken)).to.be.equal(bridgedToken)
        })

        it('should not allow to set address pair if native token is already bridged', async () => {
          const data = deployAndHandleBridgedERC721({ tokenId: 1 })
          expect(await executeMessageCall(exampleMessageId, data)).to.be.equal(true)

          await contract.setCustomTokenAddressPair(otherSideToken1, token.address).should.be.rejected
        })

        it('should not allow to set address pair if bridged token is already registered', async () => {
          await sendFunctions[0]()

          await contract.setCustomTokenAddressPair(otherSideToken1, token.address).should.be.rejected
        })
      })

      if (isHome) {
        describe('gas limit manager', () => {
          let manager
          beforeEach(async () => {
            const proxy = await OwnedUpgradeabilityProxy.new()
            const impl = await SelectorTokenGasLimitManager.new()
            const args = [ambBridgeContract.address, contract.address, 1000000]
            const data = impl.contract.methods.initialize(...args).encodeABI()
            await proxy.upgradeToAndCall(1, impl.address, data)
            manager = await SelectorTokenGasLimitManager.at(proxy.address)
          })

          it('should allow to set new manager', async () => {
            expect(await contract.gasLimitManager()).to.be.equal(ZERO_ADDRESS)

            await contract.setGasLimitManager(manager.address, { from: user }).should.be.rejected
            await contract.setGasLimitManager(manager.address, { from: owner }).should.be.fulfilled

            expect(await contract.gasLimitManager()).to.be.equal(manager.address)
            expect(await manager.mediator()).to.be.equal(contract.address)
            expect(await manager.bridge()).to.be.equal(ambBridgeContract.address)
            expect(await manager.methods['requestGasLimit()']()).to.be.bignumber.equal('1000000')
          })

          it('should allow to set request gas limit for specific selector', async () => {
            await contract.setGasLimitManager(manager.address).should.be.fulfilled

            const method = manager.methods['setRequestGasLimit(bytes4,uint256)']
            await method('0xffffffff', 200000, { from: user }).should.be.rejected
            await method('0xffffffff', 200000, { from: owner }).should.be.fulfilled

            expect(await manager.methods['requestGasLimit(bytes4)']('0xffffffff')).to.be.bignumber.equal('200000')
            expect(await manager.methods['requestGasLimit()']()).to.be.bignumber.equal('1000000')
          })

          it('should use the custom gas limit when bridging tokens', async () => {
            const tokenId1 = await mintNewERC721()
            const tokenId2 = await mintNewERC721()
            await contract.setGasLimitManager(manager.address).should.be.fulfilled

            await sendFunctions[0](tokenId1).should.be.fulfilled
            const reverseData = handleNativeERC721({ tokenId: tokenId1 })
            expect(await executeMessageCall(otherMessageId, reverseData)).to.be.equal(true)
            await sendFunctions[0](tokenId1).should.be.fulfilled

            const method = manager.methods['setRequestGasLimit(bytes4,uint256)']
            await method(selectors.handleBridgedNFT, 200000).should.be.fulfilled

            await sendFunctions[0](tokenId2).should.be.fulfilled

            const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
            expect(events.length).to.be.equal(3)
            expect(events[0].returnValues.gas).to.be.equal('1000000')
            expect(events[1].returnValues.gas).to.be.equal('1000000')
            expect(events[2].returnValues.gas).to.be.equal('200000')
          })

          it('should allow to set request gas limit for specific selector and token', async () => {
            await contract.setGasLimitManager(manager.address).should.be.fulfilled

            const method = manager.methods['setRequestGasLimit(bytes4,address,uint256)']
            await method('0xffffffff', token.address, 200000, { from: user }).should.be.rejected
            await method('0xffffffff', token.address, 200000, { from: owner }).should.be.fulfilled

            expect(
              await manager.methods['requestGasLimit(bytes4,address)']('0xffffffff', token.address)
            ).to.be.bignumber.equal('200000')
            expect(await manager.methods['requestGasLimit(bytes4)']('0xffffffff')).to.be.bignumber.equal('0')
            expect(await manager.methods['requestGasLimit()']()).to.be.bignumber.equal('1000000')
          })

          it('should use the custom gas limit when bridging specific token', async () => {
            const tokenId1 = await mintNewERC721()
            const tokenId2 = await mintNewERC721()
            await contract.setGasLimitManager(manager.address).should.be.fulfilled

            const method1 = manager.methods['setRequestGasLimit(bytes4,uint256)']
            await method1(selectors.handleBridgedNFT, 100000).should.be.fulfilled

            await sendFunctions[0](tokenId1).should.be.fulfilled
            const reverseData = handleNativeERC721({ tokenId: tokenId1 })
            expect(await executeMessageCall(otherMessageId, reverseData)).to.be.equal(true)
            await sendFunctions[0](tokenId1).should.be.fulfilled

            const method2 = manager.methods['setRequestGasLimit(bytes4,address,uint256)']
            await method2(selectors.handleBridgedNFT, token.address, 200000).should.be.fulfilled

            await sendFunctions[0](tokenId2).should.be.fulfilled

            const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
            expect(events.length).to.be.equal(3)
            expect(events[0].returnValues.gas).to.be.equal('1000000')
            expect(events[1].returnValues.gas).to.be.equal('100000')
            expect(events[2].returnValues.gas).to.be.equal('200000')
          })

          describe('common gas limits setters', () => {
            const token = otherSideToken1

            it('should use setCommonRequestGasLimits', async () => {
              const { setCommonRequestGasLimits } = manager
              await setCommonRequestGasLimits([100, 50, 50, 99], { from: user }).should.be.rejected
              await setCommonRequestGasLimits([10, 50, 50, 99], { from: owner }).should.be.rejected
              await setCommonRequestGasLimits([100, 50, 50, 99], { from: owner }).should.be.fulfilled

              const method = manager.methods['requestGasLimit(bytes4)']
              expect(await method(selectors.deployAndHandleBridgedNFT)).to.be.bignumber.equal('100')
              expect(await method(selectors.handleBridgedNFT)).to.be.bignumber.equal('50')
              expect(await method(selectors.handleNativeNFT)).to.be.bignumber.equal('50')
              expect(await method(selectors.fixFailedMessage)).to.be.bignumber.equal('99')
            })

            it('should use setBridgedTokenRequestGasLimits', async () => {
              await manager.setBridgedTokenRequestGasLimits(token, [100], { from: user }).should.be.rejected
              await manager.setBridgedTokenRequestGasLimits(token, [100], { from: owner }).should.be.fulfilled

              const method = manager.methods['requestGasLimit(bytes4,address)']
              expect(await method(selectors.handleNativeNFT, token)).to.be.bignumber.equal('100')
            })

            it('should use setNativeTokenRequestGasLimits', async () => {
              const { setNativeTokenRequestGasLimits } = manager
              await setNativeTokenRequestGasLimits(token, [100, 50], { from: user }).should.be.rejected
              await setNativeTokenRequestGasLimits(token, [10, 50], { from: owner }).should.be.rejected
              await setNativeTokenRequestGasLimits(token, [100, 50], { from: owner }).should.be.fulfilled

              const method = manager.methods['requestGasLimit(bytes4,address)']
              expect(await method(selectors.deployAndHandleBridgedNFT, token)).to.be.bignumber.equal('100')
              expect(await method(selectors.handleBridgedNFT, token)).to.be.bignumber.equal('50')
            })
          })
        })
      } else {
        describe('request gas limit', () => {
          it('should allow to set default gas limit', async () => {
            await contract.setRequestGasLimit(200000, { from: user }).should.be.rejected
            await contract.setRequestGasLimit(200000, { from: owner }).should.be.fulfilled

            expect(await contract.requestGasLimit()).to.be.bignumber.equal('200000')
          })

          it('should use the custom gas limit when bridging tokens', async () => {
            const tokenId1 = await mintNewERC721()
            const tokenId2 = await mintNewERC721()
            await sendFunctions[0](tokenId1).should.be.fulfilled

            await contract.setRequestGasLimit(200000).should.be.fulfilled

            await sendFunctions[0](tokenId2).should.be.fulfilled

            const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
            expect(events.length).to.be.equal(2)
            expect(events[0].returnValues.gas).to.be.equal('1000000')
            expect(events[1].returnValues.gas).to.be.equal('200000')
          })
        })
      }
    })

    describe('ERC721', () => {
      describe('native tokens', () => {
        describe('tokens relay', () => {
          for (const send of sendFunctions) {
            it(`should make calls to deployAndHandleBridgedNFT and handleBridgedNFT using ${send.name}`, async () => {
              const tokenId1 = await mintNewERC721()
              const tokenId2 = await mintNewERC721()
              const receiver = await send(tokenId1).should.be.fulfilled
              await send(tokenId2).should.be.fulfilled

              const reverseData = handleNativeERC721({ tokenId: tokenId1 })

              expect(await contract.isBridgedTokenDeployAcknowledged(token.address)).to.be.equal(false)
              expect(await executeMessageCall(otherMessageId, reverseData)).to.be.equal(true)
              expect(await contract.isBridgedTokenDeployAcknowledged(token.address)).to.be.equal(true)

              await send(tokenId1).should.be.fulfilled

              const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(3)

              for (let i = 0; i < 2; i++) {
                const { data, dataType, executor } = events[i].returnValues
                expect(data.slice(0, 10)).to.be.equal(selectors.deployAndHandleBridgedNFT)
                const args = web3.eth.abi.decodeParameters(
                  ['address', 'string', 'string', 'address', 'uint256[]', 'uint256[]', 'string[]'],
                  data.slice(10)
                )
                expect(dataType).to.be.equal('0')
                expect(executor).to.be.equal(otherSideMediator)
                expect(args[0]).to.be.equal(token.address)
                expect(args[1]).to.be.equal(await token.name())
                expect(args[2]).to.be.equal(await token.symbol())
                expect(args[3]).to.be.equal(receiver)
                const tokenId = [tokenId1, tokenId2][i]
                expect(args[4]).to.be.eql([tokenId.toString()])
                expect(args[5]).to.be.eql([])
                expect(args[6]).to.be.eql([uriFor(tokenId)])
              }

              const { data, dataType } = events[2].returnValues
              expect(dataType).to.be.equal('0')
              expect(data.slice(0, 10)).to.be.equal(selectors.handleBridgedNFT)
              const args = web3.eth.abi.decodeParameters(
                ['address', 'address', 'uint256[]', 'uint256[]', 'string[]'],
                data.slice(10)
              )
              expect(args[0]).to.be.equal(token.address)
              expect(args[1]).to.be.equal(receiver)
              expect(args[2]).to.be.eql([tokenId1.toString()])
              expect(args[3]).to.be.eql([])
              expect(args[4]).to.be.eql([uriFor(tokenId1)])

              expect(await contract.mediatorOwns(token.address, tokenId1)).to.be.bignumber.equal('1')
              expect(await contract.mediatorOwns(token.address, tokenId2)).to.be.bignumber.equal('1')
              expect(await contract.isTokenRegistered(token.address)).to.be.equal(true)
              expect(await token.balanceOf(contract.address)).to.be.bignumber.equal('2')
              expect(await token.tokenURI(tokenId1)).to.be.equal(uriFor(tokenId1))
              expect(await token.tokenURI(tokenId2)).to.be.equal(uriFor(tokenId2))

              const depositEvents = await getEvents(contract, { event: 'TokensBridgingInitiated' })
              expect(depositEvents.length).to.be.equal(3)
              for (let i = 0; i < 3; i++) {
                expect(depositEvents[i].returnValues.token).to.be.equal(token.address)
                expect(depositEvents[i].returnValues.sender).to.be.equal(user)
                const tokenId = i === 1 ? tokenId2 : tokenId1
                expect(depositEvents[i].returnValues.tokenIds).to.be.eql([tokenId.toString()])
                expect(depositEvents[i].returnValues.messageId).to.include('0x11223344')
              }
            })
          }

          it('should respect global bridging restrictions', async () => {
            await contract.disableTokenBridging(ZERO_ADDRESS, true).should.be.fulfilled
            for (const send of sendFunctions) {
              await send().should.be.rejected
            }
            await contract.disableTokenBridging(ZERO_ADDRESS, false).should.be.fulfilled
            for (const send of sendFunctions) {
              await send().should.be.fulfilled
            }
          })

          it('should respect per-token bridging restriction', async () => {
            await sendFunctions[0]().should.be.fulfilled

            await contract.disableTokenBridging(token.address, true).should.be.fulfilled

            await sendFunctions[0]().should.be.rejected

            await contract.disableTokenBridging(ZERO_ADDRESS, true).should.be.fulfilled

            await sendFunctions[0]().should.be.rejected

            await contract.disableTokenBridging(token.address, false).should.be.fulfilled

            await sendFunctions[0]().should.be.rejected

            await contract.disableTokenBridging(ZERO_ADDRESS, false).should.be.fulfilled

            await sendFunctions[0]().should.be.fulfilled
          })

          describe('fixFailedMessage', () => {
            for (const send of sendFunctions) {
              it(`should fix tokens locked via ${send.name}`, async () => {
                // User transfer tokens twice
                const tokenId1 = await mintNewERC721()
                const tokenId2 = await mintNewERC721()
                const tokenId3 = await mintNewERC721()

                await send(tokenId1)
                await send(tokenId3)
                const reverseData = handleNativeERC721({ tokenId: tokenId3 })
                expect(await executeMessageCall(otherMessageId, reverseData)).to.be.equal(true)
                await send(tokenId2)

                expect(await token.balanceOf(contract.address)).to.be.bignumber.equal('2')
                expect(await contract.mediatorOwns(token.address, tokenId1)).to.be.bignumber.equal('1')
                expect(await contract.mediatorOwns(token.address, tokenId2)).to.be.bignumber.equal('1')

                const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
                expect(events.length).to.be.equal(3)
                const transferMessageId1 = events[0].returnValues.messageId
                const transferMessageId2 = events[2].returnValues.messageId
                expect(await contract.messageFixed(transferMessageId1)).to.be.equal(false)
                expect(await contract.messageFixed(transferMessageId2)).to.be.equal(false)

                await contract.fixFailedMessage(transferMessageId2, { from: user }).should.be.rejected
                await contract.fixFailedMessage(transferMessageId2, { from: owner }).should.be.rejected
                const fixData1 = fixFailedERC721({ messageId: transferMessageId1, tokenId: tokenId1 })
                const fixData2 = fixFailedERC721({ messageId: transferMessageId2, tokenId: tokenId2 })

                // Should be called by mediator from other side so it will fail
                expect(await executeMessageCall(failedMessageId, fixData2, { messageSender: owner })).to.be.equal(false)

                expect(await ambBridgeContract.messageCallStatus(failedMessageId)).to.be.equal(false)
                expect(await contract.messageFixed(transferMessageId2)).to.be.equal(false)

                expect(await executeMessageCall(exampleMessageId, fixData2)).to.be.equal(true)
                expect(await token.balanceOf(contract.address)).to.be.bignumber.equal('1')
                expect(await contract.mediatorOwns(token.address, tokenId2)).to.be.bignumber.equal('0')
                expect(await contract.messageFixed(transferMessageId1)).to.be.equal(false)
                expect(await contract.messageFixed(transferMessageId2)).to.be.equal(true)

                expect(await executeMessageCall(otherMessageId, fixData1)).to.be.equal(true)
                expect(await token.balanceOf(contract.address)).to.be.bignumber.equal('0')
                expect(await contract.mediatorOwns(token.address, tokenId1)).to.be.bignumber.equal('0')
                expect(await contract.messageFixed(transferMessageId1)).to.be.equal(true)

                const event = await getEvents(contract, { event: 'FailedMessageFixed' })
                expect(event.length).to.be.equal(2)
                expect(event[0].returnValues.messageId).to.be.equal(transferMessageId2)
                expect(event[0].returnValues.token).to.be.equal(token.address)
                expect(event[1].returnValues.messageId).to.be.equal(transferMessageId1)
                expect(event[1].returnValues.token).to.be.equal(token.address)

                expect(await executeMessageCall(failedMessageId, fixData1)).to.be.equal(false)
                expect(await executeMessageCall(failedMessageId, fixData2)).to.be.equal(false)
              })
            }

            it('should fail to fix message with incorrect params', async () => {
              const tokenId = await mintNewERC721()
              await sendFunctions[0](tokenId)

              const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(1)
              const transferMessageId = events[0].returnValues.messageId
              expect(await contract.messageFixed(transferMessageId)).to.be.equal(false)

              const fixData = fixFailedERC721({ messageId: transferMessageId, tokenId })
              const fixDataInvalid = fixFailedERC721({ messageId: transferMessageId, tokenId, sender: owner })

              expect(await executeMessageCall(exampleMessageId, fixDataInvalid)).to.be.equal(false)
              expect(await executeMessageCall(exampleMessageId, fixData)).to.be.equal(true)

              expect(await token.balanceOf(contract.address)).to.be.bignumber.equal('0')
              expect(await contract.mediatorOwns(token.address, tokenId)).to.be.bignumber.equal('0')
              expect(await contract.messageFixed(transferMessageId)).to.be.equal(true)
            })
          })

          describe('fixMediatorBalanceERC721', () => {
            let tokenId1
            let tokenId2
            let tokenId3
            beforeEach(async () => {
              const storageProxy = await EternalStorageProxy.new()
              await storageProxy.upgradeTo('1', contract.address).should.be.fulfilled
              contract = await Mediator.at(storageProxy.address)

              tokenId1 = await mintNewERC721()
              tokenId2 = await mintNewERC721()
              tokenId3 = await mintNewERC721()

              await initialize().should.be.fulfilled

              await sendFunctions[0](tokenId1).should.be.fulfilled
              await token.transferFrom(user, contract.address, tokenId2, { from: user }).should.be.fulfilled
              await token.transferFrom(user, contract.address, tokenId3, { from: user }).should.be.fulfilled

              expect(await contract.mediatorOwns(token.address, tokenId1)).to.be.bignumber.equal('1')
              expect(await contract.mediatorOwns(token.address, tokenId2)).to.be.bignumber.equal('0')
              expect(await contract.mediatorOwns(token.address, tokenId3)).to.be.bignumber.equal('0')
              expect(await token.balanceOf(contract.address)).to.be.bignumber.equal('3')
              const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(1)
            })

            it('should allow to fix extra mediator balance', async () => {
              await contract.fixMediatorBalanceERC721(token.address, owner, [tokenId2], { from: user }).should.be
                .rejected
              await contract.fixMediatorBalanceERC721(ZERO_ADDRESS, owner, [tokenId2]).should.be.rejected
              await contract.fixMediatorBalanceERC721(token.address, ZERO_ADDRESS, [tokenId2]).should.be.rejected
              await contract.fixMediatorBalanceERC721(token.address, owner, [tokenId1]).should.be.rejected
              await contract.fixMediatorBalanceERC721(token.address, owner, [tokenId2]).should.be.fulfilled
              await contract.fixMediatorBalanceERC721(token.address, owner, [tokenId2]).should.be.rejected

              expect(await contract.mediatorOwns(token.address, tokenId2)).to.be.bignumber.equal('1')
              expect(await token.balanceOf(contract.address)).to.be.bignumber.equal('3')
              const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(2)
              const { data } = events[1].returnValues
              expect(data.slice(0, 10)).to.be.equal(selectors.deployAndHandleBridgedNFT)
            })

            it('should use different methods on the other side', async () => {
              await contract.fixMediatorBalanceERC721(token.address, owner, [tokenId2]).should.be.fulfilled

              const reverseData = handleNativeERC721({ tokenId: tokenId1 })
              expect(await executeMessageCall(otherMessageId, reverseData)).to.be.equal(true)

              await contract.fixMediatorBalanceERC721(token.address, owner, [tokenId3]).should.be.fulfilled

              const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(3)
              expect(events[1].returnValues.data.slice(0, 10)).to.be.equal(selectors.deployAndHandleBridgedNFT)
              expect(events[2].returnValues.data.slice(0, 10)).to.be.equal(selectors.handleBridgedNFT)
            })
          })
        })

        describe('handleNativeNFT', () => {
          it('should unlock tokens on message from amb', async () => {
            const tokenId1 = await mintNewERC721()
            const tokenId2 = await mintNewERC721()
            await sendFunctions[0](tokenId1).should.be.fulfilled
            await sendFunctions[0](tokenId2).should.be.fulfilled

            expect(await token.balanceOf(contract.address)).to.be.bignumber.equal('2')
            expect(await contract.mediatorOwns(token.address, tokenId1)).to.be.bignumber.equal('1')
            expect(await contract.mediatorOwns(token.address, tokenId2)).to.be.bignumber.equal('1')

            // can't be called by user
            await contract.handleNativeNFT(token.address, user, tokenId1, { from: user }).should.be.rejected

            // can't be called by owner
            await contract.handleNativeNFT(token.address, user, tokenId1, { from: owner }).should.be.rejected

            const data = handleNativeERC721({ tokenId: tokenId1 })

            // message must be generated by mediator contract on the other network
            expect(await executeMessageCall(failedMessageId, data, { messageSender: owner })).to.be.equal(false)

            expect(await executeMessageCall(exampleMessageId, data)).to.be.equal(true)

            expect(await contract.mediatorOwns(token.address, tokenId1)).to.be.bignumber.equal('0')
            expect(await contract.mediatorOwns(token.address, tokenId2)).to.be.bignumber.equal('1')
            expect(await token.balanceOf(user)).to.be.bignumber.equal('1')
            expect(await token.balanceOf(contract.address)).to.be.bignumber.equal('1')

            const event = await getEvents(contract, { event: 'TokensBridged' })
            expect(event.length).to.be.equal(1)
            expect(event[0].returnValues.token).to.be.equal(token.address)
            expect(event[0].returnValues.recipient).to.be.equal(user)
            expect(event[0].returnValues.tokenIds).to.be.eql([tokenId1.toString()])
            expect(event[0].returnValues.values).to.be.eql([])
            expect(event[0].returnValues.messageId).to.be.equal(exampleMessageId)
          })

          it('should not allow to use unregistered tokens', async () => {
            const otherToken = await ERC721BridgeToken.new('Test', 'TST', owner)
            await otherToken.mint(user, 1).should.be.fulfilled
            await otherToken.transferFrom(user, contract.address, 1, { from: user }).should.be.fulfilled

            const data = handleNativeERC721({ tokenId: 1 })

            expect(await executeMessageCall(failedMessageId, data)).to.be.equal(false)
          })

          it('should not allow to operate when execution is disabled globally', async () => {
            const tokenId1 = await mintNewERC721()
            await sendFunctions[0](tokenId1).should.be.fulfilled

            const data = handleNativeERC721({ tokenId: tokenId1 })

            await contract.disableTokenExecution(ZERO_ADDRESS, true).should.be.fulfilled

            expect(await executeMessageCall(failedMessageId, data)).to.be.equal(false)

            await contract.disableTokenExecution(ZERO_ADDRESS, false).should.be.fulfilled

            expect(await executeMessageCall(otherMessageId, data)).to.be.equal(true)
          })
        })

        describe('requestFailedMessageFix', () => {
          it('should allow to request a failed message fix', async () => {
            const msgData = handleNativeERC721({ tokenId: 1 })
            expect(await executeMessageCall(failedMessageId, msgData)).to.be.equal(false)

            await contract.requestFailedMessageFix(failedMessageId, token.address, user, [1], []).should.be.fulfilled

            const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
            expect(events.length).to.be.equal(1)
            const { data } = events[0].returnValues
            expect(data.slice(0, 10)).to.be.equal(selectors.fixFailedMessage)
            const args = web3.eth.abi.decodeParameters(
              ['bytes32', 'address', 'address', 'uint256[]', 'uint256[]'],
              data.slice(10)
            )
            expect(args[0]).to.be.equal(failedMessageId)
            expect(args[1]).to.be.equal(token.address)
            expect(args[2]).to.be.equal(user)
            expect(args[3]).to.be.eql(['1'])
            expect(args[4]).to.be.eql([])
          })

          it('should be a failed transaction', async () => {
            const tokenId = await mintNewERC721()
            const msgData = handleNativeERC721({ tokenId })
            await sendFunctions[0](tokenId).should.be.fulfilled

            expect(await executeMessageCall(exampleMessageId, msgData)).to.be.equal(true)

            await contract.requestFailedMessageFix(exampleMessageId, token.address, user, [1], []).should.be.rejected
          })

          it('should be the receiver of the failed transaction', async () => {
            const msgData = handleNativeERC721({ tokenId: 1 })
            expect(
              await executeMessageCall(failedMessageId, msgData, { executor: ambBridgeContract.address })
            ).to.be.equal(false)

            await contract.requestFailedMessageFix(failedMessageId, token.address, user, [1], []).should.be.rejected
          })

          it('message sender should be mediator from other side', async () => {
            const msgData = handleNativeERC721({ tokenId: 1 })
            expect(await executeMessageCall(failedMessageId, msgData, { messageSender: owner })).to.be.equal(false)

            await contract.requestFailedMessageFix(failedMessageId, token.address, user, [1], []).should.be.rejected
          })

          it('should allow to request a fix multiple times', async () => {
            const msgData = handleNativeERC721({ tokenId: 1 })
            expect(await executeMessageCall(failedMessageId, msgData)).to.be.equal(false)

            await contract.requestFailedMessageFix(failedMessageId, token.address, user, [1], []).should.be.fulfilled
            await contract.requestFailedMessageFix(failedMessageId, token.address, user, [1], []).should.be.fulfilled
            await contract.requestFailedMessageFix(failedMessageId, token.address, user, [2], []).should.be.fulfilled

            const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
            expect(events.length).to.be.equal(3)
            expect(events[0].returnValues.data.slice(0, 10)).to.be.equal(selectors.fixFailedMessage)
            expect(events[1].returnValues.data.slice(0, 10)).to.be.equal(selectors.fixFailedMessage)
            expect(events[2].returnValues.data.slice(0, 10)).to.be.equal(selectors.fixFailedMessage)
          })
        })
      })

      describe('bridged tokens', () => {
        describe('tokens relay', () => {
          beforeEach(async () => {
            const deployData = deployAndHandleBridgedERC721({ tokenId: 1 })
            expect(await executeMessageCall(exampleMessageId, deployData)).to.be.equal(true)
            token = await ERC721BridgeToken.at(await contract.bridgedTokenAddress(otherSideToken1))
          })

          for (const send of sendFunctions) {
            it(`should make calls to handleNativeNFT using ${send.name} for bridged token`, async () => {
              const bridgeData = handleBridgedERC721({ tokenId: 2 })
              expect(await executeMessageCall(exampleMessageId, bridgeData)).to.be.equal(true)
              const receiver = await send(1).should.be.fulfilled

              let events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(1)
              const { data, dataType, executor } = events[0].returnValues
              expect(data.slice(0, 10)).to.be.equal(selectors.handleNativeNFT)
              const args = web3.eth.abi.decodeParameters(
                ['address', 'address', 'uint256[]', 'uint256[]'],
                data.slice(10)
              )
              expect(executor).to.be.equal(otherSideMediator)
              expect(args[0]).to.be.equal(otherSideToken1)
              expect(args[1]).to.be.equal(receiver)
              expect(args[2]).to.be.eql(['1'])
              expect(args[3]).to.be.eql([])

              await send(2).should.be.fulfilled

              events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(2)
              const { data: data2, dataType: dataType2 } = events[1].returnValues
              expect(data2.slice(0, 10)).to.be.equal(selectors.handleNativeNFT)
              const args2 = web3.eth.abi.decodeParameters(
                ['address', 'address', 'uint256[]', 'uint256[]'],
                data2.slice(10)
              )
              expect(args2[0]).to.be.equal(otherSideToken1)
              expect(args2[1]).to.be.equal(receiver)
              expect(args2[2]).to.be.eql(['2'])
              expect(args2[3]).to.be.eql([])

              expect(dataType).to.be.equal('0')
              expect(dataType2).to.be.equal('0')
              expect(await contract.isTokenRegistered(token.address)).to.be.equal(true)
              expect(await token.balanceOf(contract.address)).to.be.bignumber.equal(ZERO)

              const depositEvents = await getEvents(contract, { event: 'TokensBridgingInitiated' })
              expect(depositEvents.length).to.be.equal(2)
              expect(depositEvents[0].returnValues.token).to.be.equal(token.address)
              expect(depositEvents[0].returnValues.sender).to.be.equal(user)
              expect(depositEvents[0].returnValues.tokenIds).to.be.eql(['1'])
              expect(depositEvents[0].returnValues.values).to.be.eql([])
              expect(depositEvents[0].returnValues.messageId).to.include('0x11223344')
              expect(depositEvents[1].returnValues.token).to.be.equal(token.address)
              expect(depositEvents[1].returnValues.sender).to.be.equal(user)
              expect(depositEvents[1].returnValues.tokenIds).to.be.eql(['2'])
              expect(depositEvents[1].returnValues.values).to.be.eql([])
              expect(depositEvents[1].returnValues.messageId).to.include('0x11223344')
            })
          }

          it('should respect global execution restriction', async () => {
            await contract.disableTokenBridging(ZERO_ADDRESS, true).should.be.fulfilled
            for (const send of sendFunctions) {
              await send(1).should.be.rejected
            }
            await contract.disableTokenBridging(ZERO_ADDRESS, false).should.be.fulfilled
            await sendFunctions[0](1).should.be.fulfilled
          })

          it('should respect per-token execution restriction', async () => {
            const bridgeData = handleBridgedERC721({ tokenId: 2 })
            expect(await executeMessageCall(exampleMessageId, bridgeData)).to.be.equal(true)

            await sendFunctions[0](1).should.be.fulfilled

            await contract.disableTokenBridging(token.address, true).should.be.fulfilled

            await sendFunctions[0](2).should.be.rejected

            await contract.disableTokenBridging(ZERO_ADDRESS, true).should.be.fulfilled

            await sendFunctions[0](2).should.be.rejected

            await contract.disableTokenBridging(token.address, false).should.be.fulfilled
            await contract.disableTokenBridging(ZERO_ADDRESS, false).should.be.fulfilled

            await sendFunctions[0](2).should.be.fulfilled
          })

          describe('fixFailedMessage', () => {
            for (const send of sendFunctions) {
              it(`should fix tokens locked via ${send.name}`, async () => {
                // User transfer tokens
                await send(1)

                const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
                expect(events.length).to.be.equal(1)
                const transferMessageId = events[0].returnValues.messageId
                expect(await contract.messageFixed(transferMessageId)).to.be.equal(false)

                await contract.fixFailedMessage(transferMessageId, { from: user }).should.be.rejected
                await contract.fixFailedMessage(transferMessageId, { from: owner }).should.be.rejected
                const fixData = fixFailedERC721({ messageId: transferMessageId, tokenId: 1 })

                // Should be called by mediator from other side so it will fail
                expect(await executeMessageCall(failedMessageId, fixData, { messageSender: owner })).to.be.equal(false)

                expect(await ambBridgeContract.messageCallStatus(failedMessageId)).to.be.equal(false)
                expect(await contract.messageFixed(transferMessageId)).to.be.equal(false)

                expect(await executeMessageCall(exampleMessageId, fixData)).to.be.equal(true)
                expect(await token.ownerOf(1)).to.be.equal(user)
                expect(await contract.messageFixed(transferMessageId)).to.be.equal(true)

                const event = await getEvents(contract, { event: 'FailedMessageFixed' })
                expect(event.length).to.be.equal(1)
                expect(event[0].returnValues.messageId).to.be.equal(transferMessageId)
                expect(event[0].returnValues.token).to.be.equal(token.address)

                expect(await executeMessageCall(failedMessageId, fixData)).to.be.equal(false)
              })
            }

            it('should fail to fix message with incorrect params', async () => {
              await sendFunctions[0](1)

              const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(1)
              const transferMessageId = events[0].returnValues.messageId
              expect(await contract.messageFixed(transferMessageId)).to.be.equal(false)

              const fixData = fixFailedERC721({ messageId: transferMessageId, tokenId: 1 })
              const fixDataInvalid1 = fixFailedERC721({ messageId: transferMessageId, tokenId: 1, sender: owner })
              const fixDataInvalid2 = fixFailedERC721({ messageId: transferMessageId, tokenId: 2 })

              expect(await executeMessageCall(exampleMessageId, fixDataInvalid1)).to.be.equal(false)
              expect(await executeMessageCall(exampleMessageId, fixDataInvalid2)).to.be.equal(false)
              expect(await executeMessageCall(exampleMessageId, fixData)).to.be.equal(true)

              expect(await token.balanceOf(contract.address)).to.be.bignumber.equal('0')
              expect(await contract.mediatorOwns(token.address, 1)).to.be.bignumber.equal('0')
              expect(await contract.messageFixed(transferMessageId)).to.be.equal(true)
            })
          })
        })

        describe('deployAndHandleBridgedNFT', () => {
          it('should deploy contract and mint tokens on first message from amb', async () => {
            // can't be called by user
            const args = [otherSideToken1, 'Test', 'TST', user, [1], [], [uriFor(1)]]
            await contract.deployAndHandleBridgedNFT(...args, { from: user }).should.be.rejected

            // can't be called by owner
            await contract.deployAndHandleBridgedNFT(...args, { from: owner }).should.be.rejected

            const data = deployAndHandleBridgedERC721({ tokenId: 1 })

            // message must be generated by mediator contract on the other network
            expect(await executeMessageCall(failedMessageId, data, { messageSender: owner })).to.be.equal(false)

            expect(await executeMessageCall(exampleMessageId, data)).to.be.equal(true)

            const events = await getEvents(contract, { event: 'NewTokenRegistered' })
            expect(events.length).to.be.equal(1)
            const { nativeToken, bridgedToken } = events[0].returnValues
            expect(nativeToken).to.be.equal(otherSideToken1)
            const deployedToken = await ERC721BridgeToken.at(bridgedToken)
            const deployedTokenProxy = await ERC721TokenProxy.at(bridgedToken)

            expect(await deployedToken.name()).to.be.equal(modifyName('Test'))
            const v1 = await deployedToken.getTokenInterfacesVersion()
            const v2 = await deployedTokenProxy.getTokenProxyInterfacesVersion()
            expect(v1.major).to.be.bignumber.gte(ZERO)
            expect(v2.major).to.be.bignumber.gte(ZERO)
            expect(await deployedToken.symbol()).to.be.equal('TST')
            expect(await contract.nativeTokenAddress(bridgedToken)).to.be.equal(nativeToken)
            expect(await contract.bridgedTokenAddress(nativeToken)).to.be.equal(bridgedToken)
            expect(await deployedToken.ownerOf(1)).to.be.bignumber.equal(user)
            expect(await deployedToken.balanceOf(contract.address)).to.be.bignumber.equal(ZERO)
            expect(await deployedToken.tokenURI(1)).to.be.equal(uriFor(1))

            const event = await getEvents(contract, { event: 'TokensBridged' })
            expect(event.length).to.be.equal(1)
            expect(event[0].returnValues.token).to.be.equal(deployedToken.address)
            expect(event[0].returnValues.recipient).to.be.equal(user)
            expect(event[0].returnValues.tokenIds).to.be.eql(['1'])
            expect(event[0].returnValues.values).to.be.eql([])
            expect(event[0].returnValues.messageId).to.be.equal(exampleMessageId)
          })

          it('should not deploy new contract if token is already deployed', async () => {
            const data1 = deployAndHandleBridgedERC721({ tokenId: 1 })
            const data2 = deployAndHandleBridgedERC721({ tokenId: 2 })

            expect(await executeMessageCall(exampleMessageId, data1)).to.be.equal(true)

            expect(await executeMessageCall(otherSideToken1, data2)).to.be.equal(true)

            const events = await getEvents(contract, { event: 'NewTokenRegistered' })
            expect(events.length).to.be.equal(1)
            const event = await getEvents(contract, { event: 'TokensBridged' })
            expect(event.length).to.be.equal(2)
          })

          it('should use modified symbol instead of name if empty', async () => {
            const data = deployAndHandleBridgedERC721({ tokenId: 1, name: '' })

            expect(await executeMessageCall(exampleMessageId, data)).to.be.equal(true)

            const deployedToken = await ERC721BridgeToken.at(await contract.bridgedTokenAddress(otherSideToken1))
            expect(await deployedToken.name()).to.be.equal(modifyName('TST'))
            expect(await deployedToken.symbol()).to.be.equal('TST')
          })

          it('should use modified name instead of symbol if empty', async () => {
            const data = deployAndHandleBridgedERC721({ tokenId: 1, symbol: '' })

            expect(await executeMessageCall(exampleMessageId, data)).to.be.equal(true)

            const deployedToken = await ERC721BridgeToken.at(await contract.bridgedTokenAddress(otherSideToken1))
            expect(await deployedToken.name()).to.be.equal(modifyName('Test'))
            expect(await deployedToken.symbol()).to.be.equal('Test')
          })

          it('should not allow to operate when execution is disabled globally', async () => {
            const data = deployAndHandleBridgedERC721({ tokenId: 1 })

            await contract.disableTokenExecution(ZERO_ADDRESS, true).should.be.fulfilled

            expect(await executeMessageCall(failedMessageId, data)).to.be.equal(false)

            await contract.disableTokenExecution(ZERO_ADDRESS, false).should.be.fulfilled

            expect(await executeMessageCall(otherMessageId, data)).to.be.equal(true)
          })
        })

        describe('handleBridgedNFT', () => {
          let deployedToken
          beforeEach(async () => {
            const data = deployAndHandleBridgedERC721({ tokenId: 1 })

            expect(await executeMessageCall(exampleMessageId, data)).to.be.equal(true)

            const events = await getEvents(contract, { event: 'NewTokenRegistered' })
            expect(events.length).to.be.equal(1)
            const { nativeToken, bridgedToken } = events[0].returnValues
            expect(nativeToken).to.be.equal(otherSideToken1)
            deployedToken = await ERC721BridgeToken.at(bridgedToken)

            expect(await deployedToken.balanceOf(user)).to.be.bignumber.equal('1')
            expect(await deployedToken.balanceOf(contract.address)).to.be.bignumber.equal(ZERO)
            expect(await contract.mediatorOwns(deployedToken.address, 1)).to.be.bignumber.equal('0')
          })

          it('should mint existing tokens on repeated messages from amb', async () => {
            const args = [otherSideToken1, user, [2], [], [uriFor(2)]]
            // can't be called by user
            await contract.handleBridgedNFT(...args, { from: user }).should.be.rejected

            // can't be called by owner
            await contract.handleBridgedNFT(...args, { from: owner }).should.be.rejected

            const data = handleBridgedERC721({ tokenId: 2 })

            // message must be generated by mediator contract on the other network
            expect(await executeMessageCall(failedMessageId, data, { messageSender: owner })).to.be.equal(false)

            expect(await executeMessageCall(exampleMessageId, data)).to.be.equal(true)

            expect(await contract.mediatorOwns(deployedToken.address, 2)).to.be.bignumber.equal('0')
            expect(await deployedToken.balanceOf(user)).to.be.bignumber.equal('2')
            expect(await deployedToken.balanceOf(contract.address)).to.be.bignumber.equal(ZERO)
            expect(await deployedToken.tokenURI(2)).to.be.equal(uriFor(2))

            const event = await getEvents(contract, { event: 'TokensBridged' })
            expect(event.length).to.be.equal(2)
            expect(event[1].returnValues.token).to.be.equal(deployedToken.address)
            expect(event[1].returnValues.recipient).to.be.equal(user)
            expect(event[1].returnValues.tokenIds).to.be.eql(['2'])
            expect(event[1].returnValues.values).to.be.eql([])
            expect(event[1].returnValues.messageId).to.be.equal(exampleMessageId)
          })

          it('should not allow to process unknown tokens', async () => {
            const data = handleNativeERC721({ token: otherSideToken2, tokenId: 2 })

            expect(await executeMessageCall(failedMessageId, data)).to.be.equal(false)
          })

          it('should not allow to operate when execution is disabled globally', async () => {
            const data = handleBridgedERC721({ tokenId: 2 })

            await contract.disableTokenExecution(ZERO_ADDRESS, true).should.be.fulfilled

            expect(await executeMessageCall(failedMessageId, data)).to.be.equal(false)

            await contract.disableTokenExecution(ZERO_ADDRESS, false).should.be.fulfilled

            expect(await executeMessageCall(otherMessageId, data)).to.be.equal(true)
          })
        })

        describe('requestFailedMessageFix', () => {
          let msgData
          beforeEach(() => {
            msgData = deployAndHandleBridgedERC721({ tokenId: 1 })
          })
          it('should allow to request a failed message fix', async () => {
            expect(await executeMessageCall(failedMessageId, msgData, { gas: 100 })).to.be.equal(false)

            await contract.requestFailedMessageFix(failedMessageId, token.address, user, [1], []).should.be.fulfilled

            const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
            expect(events.length).to.be.equal(1)
            const { data } = events[0].returnValues
            expect(data.slice(0, 10)).to.be.equal(selectors.fixFailedMessage)
            const args = web3.eth.abi.decodeParameters(
              ['bytes32', 'address', 'address', 'uint256[]', 'uint256[]'],
              data.slice(10)
            )
            expect(args[0]).to.be.equal(failedMessageId)
            expect(args[1]).to.be.equal(token.address)
            expect(args[2]).to.be.equal(user)
            expect(args[3]).to.be.eql(['1'])
            expect(args[4]).to.be.eql([])
          })

          it('should be a failed transaction', async () => {
            expect(await executeMessageCall(exampleMessageId, msgData)).to.be.equal(true)

            await contract.requestFailedMessageFix(exampleMessageId, token.address, user, [1], []).should.be.rejected
          })

          it('should be the receiver of the failed transaction', async () => {
            expect(
              await executeMessageCall(failedMessageId, msgData, { executor: ambBridgeContract.address })
            ).to.be.equal(false)

            await contract.requestFailedMessageFix(failedMessageId, token.address, user, [1], []).should.be.rejected
          })

          it('message sender should be mediator from other side', async () => {
            expect(await executeMessageCall(failedMessageId, msgData, { messageSender: owner })).to.be.equal(false)

            await contract.requestFailedMessageFix(failedMessageId, token.address, user, [1], []).should.be.rejected
          })

          it('should allow to request a fix multiple times', async () => {
            expect(await executeMessageCall(failedMessageId, msgData, { gas: 100 })).to.be.equal(false)

            await contract.requestFailedMessageFix(failedMessageId, token.address, user, [1], []).should.be.fulfilled
            await contract.requestFailedMessageFix(failedMessageId, token.address, user, [1], []).should.be.fulfilled
            await contract.requestFailedMessageFix(failedMessageId, token.address, user, [2], []).should.be.fulfilled

            const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
            expect(events.length).to.be.equal(3)
            expect(events[0].returnValues.data.slice(0, 10)).to.be.equal(selectors.fixFailedMessage)
            expect(events[1].returnValues.data.slice(0, 10)).to.be.equal(selectors.fixFailedMessage)
            expect(events[2].returnValues.data.slice(0, 10)).to.be.equal(selectors.fixFailedMessage)
          })
        })
      })
    })

    describe('ERC1155', () => {
      beforeEach(async () => {
        token = await ERC1155BridgeToken.new('TEST', 'TST', owner)
        await token.setApprovalForAll(owner, true, { from: user })
      })

      describe('native tokens', () => {
        describe('tokens relay', () => {
          it(`should make calls to deployAndHandleBridgedNFT and handleBridgedNFT when using different ERC1155 transfers`, async () => {
            const tokenId1 = await mintNewERC1155(20)
            const tokenId2 = await mintNewERC1155(20)

            await token.safeTransferFrom(user, contract.address, tokenId1, 2, '0x').should.be.fulfilled
            await token.safeTransferFrom(user, contract.address, tokenId1, 2, user2).should.be.fulfilled
            await token.safeBatchTransferFrom(user, contract.address, [tokenId1, tokenId2], [1, 3], '0x').should.be
              .fulfilled
            await token.safeBatchTransferFrom(user, contract.address, [tokenId1, tokenId2], [1, 3], user2).should.be
              .fulfilled

            const reverseData = handleNativeERC1155({ tokenIds: [tokenId1], values: [1] })
            expect(await contract.isBridgedTokenDeployAcknowledged(token.address)).to.be.equal(false)
            expect(await executeMessageCall(otherMessageId, reverseData)).to.be.equal(true)
            expect(await contract.isBridgedTokenDeployAcknowledged(token.address)).to.be.equal(true)

            await token.safeTransferFrom(user, contract.address, tokenId1, 2, '0x').should.be.fulfilled
            await token.safeTransferFrom(user, contract.address, tokenId1, 2, user2).should.be.fulfilled
            await token.safeBatchTransferFrom(user, contract.address, [tokenId1, tokenId2], [1, 3], '0x').should.be
              .fulfilled
            await token.safeBatchTransferFrom(user, contract.address, [tokenId1, tokenId2], [1, 3], user2).should.be
              .fulfilled

            const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
            expect(events.length).to.be.equal(8)
            const depositEvents = await getEvents(contract, { event: 'TokensBridgingInitiated' })
            expect(depositEvents.length).to.be.equal(8)

            for (let i = 0; i < 8; i++) {
              const { data, dataType, executor } = events[i].returnValues
              expect(dataType).to.be.equal('0')
              expect(executor).to.be.equal(otherSideMediator)

              if (i < 4) {
                expect(data.slice(0, 10)).to.be.equal(selectors.deployAndHandleBridgedNFT)
                const args = web3.eth.abi.decodeParameters(
                  ['address', 'string', 'string', 'address', 'uint256[]', 'uint256[]', 'string[]'],
                  data.slice(10)
                )
                expect(args[0]).to.be.equal(token.address)
                expect(args[1]).to.be.equal('TEST')
                expect(args[2]).to.be.equal('TST')
                expect(args[3]).to.be.equal(i % 2 ? user2 : user)
                expect(args[4]).to.be.eql(i > 1 ? [tokenId1.toString(), tokenId2.toString()] : [tokenId1.toString()])
                expect(args[5]).to.be.eql(i > 1 ? ['1', '3'] : ['2'])
                expect(args[6]).to.be.eql(i > 1 ? [uriFor(tokenId1), uriFor(tokenId2)] : [uriFor(tokenId1)])
              } else {
                expect(data.slice(0, 10)).to.be.equal(selectors.handleBridgedNFT)
                const args = web3.eth.abi.decodeParameters(
                  ['address', 'address', 'uint256[]', 'uint256[]', 'string[]'],
                  data.slice(10)
                )
                expect(args[0]).to.be.equal(token.address)
                expect(args[1]).to.be.equal(i % 2 ? user2 : user)
                expect(args[2]).to.be.eql(i > 5 ? [tokenId1.toString(), tokenId2.toString()] : [tokenId1.toString()])
                expect(args[3]).to.be.eql(i > 5 ? ['1', '3'] : ['2'])
                expect(args[4]).to.be.eql(i > 5 ? [uriFor(tokenId1), uriFor(tokenId2)] : [uriFor(tokenId1)])
              }

              const { sender, tokenIds, values } = depositEvents[i].returnValues
              expect(sender).to.be.equal(user)
              if (tokenIds.length === 2) {
                expect(tokenIds).to.be.eql([tokenId1.toString(), tokenId2.toString()])
                expect(values).to.be.eql(['1', '3'])
              } else {
                expect(tokenIds).to.be.eql([tokenId1.toString()])
                expect(values).to.be.eql(['2'])
              }
            }

            expect(await contract.mediatorOwns(token.address, tokenId1)).to.be.bignumber.equal('11')
            expect(await contract.mediatorOwns(token.address, tokenId2)).to.be.bignumber.equal('12')
            expect(await contract.isTokenRegistered(token.address)).to.be.equal(true)
            expect(await token.balanceOf(contract.address, tokenId1)).to.be.bignumber.equal('11')
            expect(await token.balanceOf(contract.address, tokenId2)).to.be.bignumber.equal('12')
          })

          describe('fixFailedMessage', () => {
            it(`should fix locked tokens`, async () => {
              const tokenId1 = await mintNewERC1155(20)
              const tokenId2 = await mintNewERC1155(20)

              await token.safeBatchTransferFrom(user, contract.address, [tokenId1, tokenId2], [1, 3], user2).should.be
                .fulfilled

              const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(1)
              const transferMessageId = events[0].returnValues.messageId
              expect(await contract.messageFixed(transferMessageId)).to.be.equal(false)

              await contract.fixFailedMessage(transferMessageId, { from: user }).should.be.rejected
              await contract.fixFailedMessage(transferMessageId, { from: owner }).should.be.rejected
              const fixData = fixFailedERC1155({
                messageId: transferMessageId,
                tokenIds: [tokenId1, tokenId2],
                values: [1, 3],
              })

              expect(await token.balanceOf(contract.address, tokenId1)).to.be.bignumber.equal('1')
              expect(await token.balanceOf(contract.address, tokenId2)).to.be.bignumber.equal('3')
              expect(await contract.mediatorOwns(token.address, tokenId1)).to.be.bignumber.equal('1')
              expect(await contract.mediatorOwns(token.address, tokenId2)).to.be.bignumber.equal('3')
              expect(await executeMessageCall(exampleMessageId, fixData)).to.be.equal(true)
              expect(await token.balanceOf(contract.address, tokenId1)).to.be.bignumber.equal('0')
              expect(await token.balanceOf(contract.address, tokenId2)).to.be.bignumber.equal('0')
              expect(await contract.mediatorOwns(token.address, tokenId1)).to.be.bignumber.equal('0')
              expect(await contract.mediatorOwns(token.address, tokenId2)).to.be.bignumber.equal('0')
              expect(await contract.messageFixed(transferMessageId)).to.be.equal(true)

              expect(await executeMessageCall(failedMessageId, fixData)).to.be.equal(false)
            })

            it('should fail to fix message with incorrect params', async () => {
              const tokenId1 = await mintNewERC1155(20)
              const tokenId2 = await mintNewERC1155(20)

              await token.safeBatchTransferFrom(user, contract.address, [tokenId1, tokenId2], [1, 3], user2).should.be
                .fulfilled

              const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(1)
              const transferMessageId = events[0].returnValues.messageId
              expect(await contract.messageFixed(transferMessageId)).to.be.equal(false)

              const fixData = fixFailedERC1155({
                messageId: transferMessageId,
                tokenIds: [tokenId1, tokenId2],
                values: [1, 3],
              })
              const fixDataInvalid1 = fixFailedERC1155({
                messageId: transferMessageId,
                sender: owner,
                tokenIds: [tokenId1, tokenId2],
                values: [1, 3],
              })
              const fixDataInvalid2 = fixFailedERC1155({
                messageId: transferMessageId,
                tokenIds: [tokenId1],
                values: [1],
              })
              const fixDataInvalid3 = fixFailedERC1155({
                messageId: transferMessageId,
                tokenIds: [tokenId1, tokenId2],
                values: [1, 1],
              })
              const fixDataInvalid4 = fixFailedERC1155({
                messageId: transferMessageId,
                tokenIds: [tokenId1, tokenId2],
                values: [],
              })

              expect(await executeMessageCall(exampleMessageId, fixDataInvalid1)).to.be.equal(false)
              expect(await executeMessageCall(exampleMessageId, fixDataInvalid2)).to.be.equal(false)
              expect(await executeMessageCall(exampleMessageId, fixDataInvalid3)).to.be.equal(false)
              expect(await executeMessageCall(exampleMessageId, fixDataInvalid4)).to.be.equal(false)
              expect(await executeMessageCall(exampleMessageId, fixData)).to.be.equal(true)

              expect(await contract.mediatorOwns(token.address, tokenId1)).to.be.bignumber.equal('0')
              expect(await contract.mediatorOwns(token.address, tokenId2)).to.be.bignumber.equal('0')
              expect(await contract.messageFixed(transferMessageId)).to.be.equal(true)
            })
          })

          describe('fixMediatorBalanceERC1155', () => {
            beforeEach(async () => {
              const storageProxy = await EternalStorageProxy.new()
              const dummyImpl = await ERC1155ReceiverMock.new()
              await storageProxy.upgradeTo('1', dummyImpl.address).should.be.fulfilled

              await token.mint(storageProxy.address, [1], [5])
              await token.mint(user, [1], [1])

              await storageProxy.upgradeTo('2', contract.address).should.be.fulfilled
              contract = await Mediator.at(storageProxy.address)

              await initialize().should.be.fulfilled

              await token.safeTransferFrom(user, contract.address, 1, 1, '0x').should.be.fulfilled
            })

            it('should allow to fix extra mediator balance', async () => {
              await contract.fixMediatorBalanceERC1155(token.address, owner, [1], [2], { from: user }).should.be
                .rejected
              await contract.fixMediatorBalanceERC1155(token.address, owner, [1], [2]).should.be.fulfilled
              await contract.fixMediatorBalanceERC1155(token.address, owner, [1], [2]).should.be.fulfilled
              await contract.fixMediatorBalanceERC1155(token.address, owner, [1], [2]).should.be.rejected

              expect(await contract.mediatorOwns(token.address, 1)).to.be.bignumber.equal('5')
              expect(await token.balanceOf(contract.address, 1)).to.be.bignumber.equal('6')
              const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(3)
              expect(events[1].returnValues.data.slice(0, 10)).to.be.equal(selectors.deployAndHandleBridgedNFT)
              expect(events[2].returnValues.data.slice(0, 10)).to.be.equal(selectors.deployAndHandleBridgedNFT)
            })

            it('should use different methods on the other side', async () => {
              await contract.fixMediatorBalanceERC1155(token.address, owner, [1], [2]).should.be.fulfilled

              const reverseData = handleNativeERC1155({ tokenIds: [1], values: [1] })
              expect(await executeMessageCall(otherMessageId, reverseData)).to.be.equal(true)

              await contract.fixMediatorBalanceERC1155(token.address, owner, [1], [2]).should.be.fulfilled

              const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(3)
              expect(events[1].returnValues.data.slice(0, 10)).to.be.equal(selectors.deployAndHandleBridgedNFT)
              expect(events[2].returnValues.data.slice(0, 10)).to.be.equal(selectors.handleBridgedNFT)
            })
          })
        })

        describe('handleNativeNFT', () => {
          it('should unlock tokens on message from amb', async () => {
            const tokenId1 = await mintNewERC1155(10)
            const tokenId2 = await mintNewERC1155(10)
            await token.safeTransferFrom(user, contract.address, tokenId1, 10, '0x').should.be.fulfilled
            await token.safeTransferFrom(user, contract.address, tokenId2, 10, '0x').should.be.fulfilled

            expect(await contract.mediatorOwns(token.address, tokenId1)).to.be.bignumber.equal('10')
            expect(await contract.mediatorOwns(token.address, tokenId2)).to.be.bignumber.equal('10')

            const data = handleNativeERC1155({ tokenIds: [tokenId1, tokenId2], values: [1, 3] })
            expect(await executeMessageCall(exampleMessageId, data)).to.be.equal(true)

            expect(await contract.mediatorOwns(token.address, tokenId1)).to.be.bignumber.equal('9')
            expect(await contract.mediatorOwns(token.address, tokenId2)).to.be.bignumber.equal('7')
            expect(await token.balanceOf(user, tokenId1)).to.be.bignumber.equal('1')
            expect(await token.balanceOf(user, tokenId2)).to.be.bignumber.equal('3')

            const event = await getEvents(contract, { event: 'TokensBridged' })
            expect(event.length).to.be.equal(1)
            expect(event[0].returnValues.token).to.be.equal(token.address)
            expect(event[0].returnValues.recipient).to.be.equal(user)
            expect(event[0].returnValues.tokenIds).to.be.eql([tokenId1.toString(), tokenId2.toString()])
            expect(event[0].returnValues.values).to.be.eql(['1', '3'])
            expect(event[0].returnValues.messageId).to.be.equal(exampleMessageId)
          })
        })

        describe('requestFailedMessageFix', () => {
          it('should allow to request a failed message fix', async () => {
            const msgData = handleNativeERC1155({ tokenIds: [1, 2], values: [1, 1] })
            expect(await executeMessageCall(failedMessageId, msgData)).to.be.equal(false)

            await contract.requestFailedMessageFix(failedMessageId, token.address, user, [1, 2], [1, 1]).should.be
              .fulfilled

            const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
            expect(events.length).to.be.equal(1)
            const { data } = events[0].returnValues
            expect(data.slice(0, 10)).to.be.equal(selectors.fixFailedMessage)
            const args = web3.eth.abi.decodeParameters(
              ['bytes32', 'address', 'address', 'uint256[]', 'uint256[]'],
              data.slice(10)
            )
            expect(args[0]).to.be.equal(failedMessageId)
            expect(args[1]).to.be.equal(token.address)
            expect(args[2]).to.be.equal(user)
            expect(args[3]).to.be.eql(['1', '2'])
            expect(args[4]).to.be.eql(['1', '1'])
          })
        })
      })

      describe('bridged tokens', () => {
        describe('tokens relay', () => {
          beforeEach(async () => {
            const deployData = deployAndHandleBridgedERC1155({ tokenIds: [1, 2], values: [20, 20] })
            expect(await executeMessageCall(exampleMessageId, deployData)).to.be.equal(true)
            token = await ERC1155BridgeToken.at(await contract.bridgedTokenAddress(otherSideToken1))
            await token.setApprovalForAll(owner, true, { from: user })
          })

          it(`should make calls to handleNativeNFT when using when using different ERC1155 transfers`, async () => {
            await token.safeTransferFrom(user, contract.address, 1, 2, '0x').should.be.fulfilled
            await token.safeTransferFrom(user, contract.address, 1, 2, user2).should.be.fulfilled
            await token.safeBatchTransferFrom(user, contract.address, [1, 2], [1, 3], '0x').should.be.fulfilled
            await token.safeBatchTransferFrom(user, contract.address, [1, 2], [1, 3], user2).should.be.fulfilled

            const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
            expect(events.length).to.be.equal(4)
            const depositEvents = await getEvents(contract, { event: 'TokensBridgingInitiated' })
            expect(depositEvents.length).to.be.equal(4)

            for (let i = 0; i < 4; i++) {
              const { data, dataType, executor } = events[i].returnValues
              expect(dataType).to.be.equal('0')
              expect(data.slice(0, 10)).to.be.equal(selectors.handleNativeNFT)
              const args = web3.eth.abi.decodeParameters(
                ['address', 'address', 'uint256[]', 'uint256[]'],
                data.slice(10)
              )
              expect(executor).to.be.equal(otherSideMediator)
              expect(args[0]).to.be.equal(otherSideToken1)
              expect(args[1]).to.be.equal(i % 2 ? user2 : user)
              expect(args[2]).to.be.eql(i > 1 ? ['1', '2'] : ['1'])
              expect(args[3]).to.be.eql(i > 1 ? ['1', '3'] : ['2'])

              expect(depositEvents[i].returnValues.sender).to.be.equal(user)
              expect(depositEvents[i].returnValues.tokenIds).to.be.eql(i > 1 ? ['1', '2'] : ['1'])
              expect(depositEvents[i].returnValues.values).to.be.eql(i > 1 ? ['1', '3'] : ['2'])
            }

            expect(await token.balanceOf(contract.address, 1)).to.be.bignumber.equal(ZERO)
            expect(await token.balanceOf(contract.address, 2)).to.be.bignumber.equal(ZERO)
          })

          describe('fixFailedMessage', () => {
            it(`should fix burned tokens`, async () => {
              await token.safeBatchTransferFrom(user, contract.address, [1, 2], [1, 3], user2).should.be.fulfilled

              const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(1)
              const transferMessageId = events[0].returnValues.messageId
              expect(await contract.messageFixed(transferMessageId)).to.be.equal(false)

              await contract.fixFailedMessage(transferMessageId, { from: user }).should.be.rejected
              await contract.fixFailedMessage(transferMessageId, { from: owner }).should.be.rejected
              const fixData = fixFailedERC1155({ messageId: transferMessageId, tokenIds: [1, 2], values: [1, 3] })

              expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('19')
              expect(await token.balanceOf(user, 2)).to.be.bignumber.equal('17')
              expect(await executeMessageCall(exampleMessageId, fixData)).to.be.equal(true)
              expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('20')
              expect(await token.balanceOf(user, 2)).to.be.bignumber.equal('20')
              expect(await contract.messageFixed(transferMessageId)).to.be.equal(true)

              expect(await executeMessageCall(failedMessageId, fixData)).to.be.equal(false)
            })

            it('should fail to fix message with incorrect params', async () => {
              await token.safeBatchTransferFrom(user, contract.address, [1, 2], [1, 3], user2).should.be.fulfilled

              const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
              expect(events.length).to.be.equal(1)
              const transferMessageId = events[0].returnValues.messageId
              expect(await contract.messageFixed(transferMessageId)).to.be.equal(false)

              const fixData = fixFailedERC1155({ messageId: transferMessageId, tokenIds: [1, 2], values: [1, 3] })
              const fixDataInvalid1 = fixFailedERC1155({
                messageId: transferMessageId,
                sender: owner,
                tokenIds: [1, 2],
                values: [1, 3],
              })
              const fixDataInvalid2 = fixFailedERC1155({ messageId: transferMessageId, tokenIds: [1], values: [1] })
              const fixDataInvalid3 = fixFailedERC1155({
                messageId: transferMessageId,
                tokenIds: [1, 2],
                values: [1, 1],
              })
              const fixDataInvalid4 = fixFailedERC1155({ messageId: transferMessageId, tokenIds: [1, 2], values: [] })

              expect(await executeMessageCall(exampleMessageId, fixDataInvalid1)).to.be.equal(false)
              expect(await executeMessageCall(exampleMessageId, fixDataInvalid2)).to.be.equal(false)
              expect(await executeMessageCall(exampleMessageId, fixDataInvalid3)).to.be.equal(false)
              expect(await executeMessageCall(exampleMessageId, fixDataInvalid4)).to.be.equal(false)
              expect(await executeMessageCall(exampleMessageId, fixData)).to.be.equal(true)
              expect(await contract.messageFixed(transferMessageId)).to.be.equal(true)
            })
          })
        })

        describe('deployAndHandleBridgedNFT', () => {
          it('should deploy contract and mint tokens on first message from amb', async () => {
            const data = deployAndHandleBridgedERC1155({ tokenIds: [1, 2], values: [1, 3] })
            expect(await executeMessageCall(exampleMessageId, data)).to.be.equal(true)

            const events = await getEvents(contract, { event: 'NewTokenRegistered' })
            expect(events.length).to.be.equal(1)
            const { nativeToken, bridgedToken } = events[0].returnValues
            expect(nativeToken).to.be.equal(otherSideToken1)
            const deployedToken = await ERC1155BridgeToken.at(bridgedToken)
            const deployedTokenProxy = await ERC1155TokenProxy.at(bridgedToken)

            expect(await deployedToken.name()).to.be.equal(modifyName('Test'))
            expect(await deployedToken.symbol()).to.be.equal('TST')
            const v1 = await deployedToken.getTokenInterfacesVersion()
            const v2 = await deployedTokenProxy.getTokenProxyInterfacesVersion()
            expect(v1.major).to.be.bignumber.gte(ZERO)
            expect(v2.major).to.be.bignumber.gte(ZERO)
            expect(await contract.nativeTokenAddress(bridgedToken)).to.be.equal(nativeToken)
            expect(await contract.bridgedTokenAddress(nativeToken)).to.be.equal(bridgedToken)

            expect(await deployedToken.balanceOf(contract.address, 1)).to.be.bignumber.equal(ZERO)
            expect(await deployedToken.balanceOf(contract.address, 2)).to.be.bignumber.equal(ZERO)
            expect(await deployedToken.uri(1)).to.be.equal(uriFor(1))
            expect(await deployedToken.uri(2)).to.be.equal(uriFor(2))

            const event = await getEvents(contract, { event: 'TokensBridged' })
            expect(event.length).to.be.equal(1)
            expect(event[0].returnValues.token).to.be.equal(deployedToken.address)
            expect(event[0].returnValues.recipient).to.be.equal(user)
            expect(event[0].returnValues.tokenIds).to.be.eql(['1', '2'])
            expect(event[0].returnValues.values).to.be.eql(['1', '3'])
            expect(event[0].returnValues.messageId).to.be.equal(exampleMessageId)
          })

          it('should not deploy new contract if token is already deployed', async () => {
            const data = deployAndHandleBridgedERC1155({ tokenIds: [1, 2], values: [1, 3] })
            expect(await executeMessageCall(exampleMessageId, data)).to.be.equal(true)
            expect(await executeMessageCall(otherMessageId, data)).to.be.equal(true)

            const events = await getEvents(contract, { event: 'NewTokenRegistered' })
            expect(events.length).to.be.equal(1)
            const event = await getEvents(contract, { event: 'TokensBridged' })
            expect(event.length).to.be.equal(2)
          })
        })

        describe('handleBridgedNFT', () => {
          let deployedToken
          beforeEach(async () => {
            const data = deployAndHandleBridgedERC1155({ tokenIds: [1, 2], values: [1, 3] })
            expect(await executeMessageCall(exampleMessageId, data)).to.be.equal(true)

            const events = await getEvents(contract, { event: 'NewTokenRegistered' })
            expect(events.length).to.be.equal(1)
            const { nativeToken, bridgedToken } = events[0].returnValues
            expect(nativeToken).to.be.equal(otherSideToken1)
            deployedToken = await ERC1155BridgeToken.at(bridgedToken)

            expect(await deployedToken.balanceOf(user, 1)).to.be.bignumber.equal('1')
            expect(await deployedToken.balanceOf(user, 2)).to.be.bignumber.equal('3')
            expect(await contract.mediatorOwns(deployedToken.address, 1)).to.be.bignumber.equal('0')
            expect(await contract.mediatorOwns(deployedToken.address, 2)).to.be.bignumber.equal('0')
          })

          it('should mint existing tokens on repeated messages from amb', async () => {
            const data = handleBridgedERC1155({ tokenIds: [1, 2], values: [1, 3] })
            expect(await executeMessageCall(exampleMessageId, data)).to.be.equal(true)

            expect(await deployedToken.balanceOf(user, 1)).to.be.bignumber.equal('2')
            expect(await deployedToken.balanceOf(user, 2)).to.be.bignumber.equal('6')
            expect(await contract.mediatorOwns(deployedToken.address, 1)).to.be.bignumber.equal('0')
            expect(await contract.mediatorOwns(deployedToken.address, 2)).to.be.bignumber.equal('0')

            const event = await getEvents(contract, { event: 'TokensBridged' })
            expect(event.length).to.be.equal(2)
            expect(event[1].returnValues.token).to.be.equal(deployedToken.address)
            expect(event[1].returnValues.recipient).to.be.equal(user)
            expect(event[1].returnValues.tokenIds).to.be.eql(['1', '2'])
            expect(event[1].returnValues.values).to.be.eql(['1', '3'])
            expect(event[1].returnValues.messageId).to.be.equal(exampleMessageId)
          })
        })
      })
    })

    if (isHome) {
      describe('oracle driven lane permissions', () => {
        let manager
        beforeEach(async () => {
          const proxy = await OwnedUpgradeabilityProxy.new()
          const impl = await NFTForwardingRulesManager.new()
          const data = impl.contract.methods.initialize(contract.address).encodeABI()
          await proxy.upgradeToAndCall(1, impl.address, data)
          manager = await NFTForwardingRulesManager.at(proxy.address)
          expect(await manager.mediator()).to.be.equal(contract.address)
        })

        it('should allow to update manager address', async () => {
          await contract.setForwardingRulesManager(manager.address, { from: user }).should.be.rejected
          await contract.setForwardingRulesManager(manager.address, { from: owner }).should.be.fulfilled

          expect(await contract.forwardingRulesManager()).to.be.equal(manager.address)

          const otherManager = await NFTForwardingRulesManager.new(contract.address)
          await contract.setForwardingRulesManager(otherManager.address).should.be.fulfilled

          expect(await contract.forwardingRulesManager()).to.be.equal(otherManager.address)

          await contract.setForwardingRulesManager(owner).should.be.rejected
          await contract.setForwardingRulesManager(ZERO_ADDRESS).should.be.fulfilled

          expect(await contract.forwardingRulesManager()).to.be.equal(ZERO_ADDRESS)
        })

        it('should allow to set/update lane permissions', async () => {
          expect(await manager.destinationLane(token.address, user, user2)).to.be.bignumber.equal('0')

          await manager.setRuleForTokenToPBO(token.address, true, { from: user }).should.be.rejected
          await manager.setRuleForTokenToPBO(token.address, true, { from: owner }).should.be.fulfilled

          expect(await manager.destinationLane(token.address, user, user2)).to.be.bignumber.equal('1')

          await manager.setRuleForTokenToPBO(token.address, false, { from: owner }).should.be.fulfilled
          await manager.setRuleForTokenAndSenderToPBO(token.address, user, true, { from: user }).should.be.rejected
          await manager.setRuleForTokenAndSenderToPBO(token.address, user, true, { from: owner }).should.be.fulfilled

          expect(await manager.destinationLane(token.address, user, user2)).to.be.bignumber.equal('1')
          expect(await manager.destinationLane(token.address, user2, user2)).to.be.bignumber.equal('0')

          await manager.setRuleForTokenAndSenderToPBO(token.address, user, false, { from: owner }).should.be.fulfilled
          await manager.setRuleForTokenAndReceiverToPBO(token.address, user, true, { from: user }).should.be.rejected
          await manager.setRuleForTokenAndReceiverToPBO(token.address, user, true, { from: owner }).should.be.fulfilled

          expect(await manager.destinationLane(token.address, user, user)).to.be.bignumber.equal('1')
          expect(await manager.destinationLane(token.address, user, user2)).to.be.bignumber.equal('0')

          await manager.setRuleForTokenToPBO(token.address, true, { from: owner }).should.be.fulfilled

          expect(await manager.destinationLane(token.address, user2, user2)).to.be.bignumber.equal('1')

          await manager.setRuleForSenderOfAnyTokenToPBU(user2, true, { from: user }).should.be.rejected
          await manager.setRuleForSenderOfAnyTokenToPBU(user2, true, { from: owner }).should.be.fulfilled

          expect(await manager.destinationLane(token.address, user2, user)).to.be.bignumber.equal('-1')
          expect(await manager.destinationLane(token.address, user2, user)).to.be.bignumber.equal('-1')
          expect(await manager.destinationLane(token.address, user, user)).to.be.bignumber.equal('1')

          await manager.setRuleForReceiverOfAnyTokenToPBU(user2, true, { from: user }).should.be.rejected
          await manager.setRuleForReceiverOfAnyTokenToPBU(user2, true, { from: owner }).should.be.fulfilled

          expect(await manager.destinationLane(token.address, user, user2)).to.be.bignumber.equal('-1')
          expect(await manager.destinationLane(token.address, user, user2)).to.be.bignumber.equal('-1')
          expect(await manager.destinationLane(token.address, user, user)).to.be.bignumber.equal('1')
        })

        it('should send a message to the manual lane', async () => {
          const tokenId1 = await mintNewERC721()
          const tokenId2 = await mintNewERC721()
          const tokenId3 = await mintNewERC721()

          await sendFunctions[0](tokenId1).should.be.fulfilled
          await contract.setForwardingRulesManager(manager.address, { from: owner }).should.be.fulfilled
          await sendFunctions[1](tokenId2).should.be.fulfilled
          await manager.setRuleForTokenToPBO(token.address, true, { from: owner }).should.be.fulfilled
          await sendFunctions[2](tokenId3).should.be.fulfilled

          const events = await getEvents(ambBridgeContract, { event: 'MockedEvent' })
          expect(events.length).to.be.equal(3)
          expect(events[0].returnValues.dataType).to.be.bignumber.equal('0')
          expect(events[1].returnValues.dataType).to.be.bignumber.equal('128')
          expect(events[2].returnValues.dataType).to.be.bignumber.equal('0')
        })
      })
    }
  })
}

contract('ForeignNFTOmnibridge', (accounts) => {
  runTests(accounts, false)
})

contract('HomeNFTOmnibridge', (accounts) => {
  runTests(accounts, true)
})
