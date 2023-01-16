const ERC721TokenFactory = artifacts.require('ERC721TokenFactory')
const ERC721BridgeToken = artifacts.require('ERC721BridgeToken')
const ERC721NativeToken = artifacts.require('ERC721NativeToken')
const OmnibridgeMock = artifacts.require('OmnibridgeMock')

const { expect } = require('chai')
const { getEvents } = require('../helpers/helpers')
const { ZERO_ADDRESS } = require('../setup')

contract.only('ERC721TokenFactory', (accounts) => {
  let tokenFactoryERC721
  let tokenBridgeImageERC721
  let tokenNativeImageERC721
  const oppositeBridge = '0x1e33FBB006F47F78704c954555a5c52C2A7f409D'
  let bridge

  const owner = accounts[0]
  const other = accounts[1]

  async function initialize(options) {
    const opts = options || {}
    const args = [
      opts.erc721BridgeImage || tokenBridgeImageERC721.address,
      opts.erc721NativeImage || tokenNativeImageERC721.address,
      opts.bridge || bridge.address,
      opts.oppositeBridge || oppositeBridge,
      opts.owner || owner,
    ]

    return tokenFactoryERC721.initialize(...args)
  }

  async function deployERC721NativeToken(options) {
    const opts = options || {}

    const args = [opts.name || 'TEST', opts.symbol || 'TST']
    await tokenFactoryERC721.deployERC721NativeContract(...args)
    const event = await getEvents(tokenFactoryERC721, { event: 'ERC721NativeContractCreated' })
    // eslint-disable-next-line no-underscore-dangle
    const collection = event[event.length - 1].returnValues._collection

    return ERC721NativeToken.at(collection)
  }

  before(async () => {
    // OmnibridgeMock or ForeignNFTOmnibridge is same
    bridge = await OmnibridgeMock.new('SUFFIX')
    tokenBridgeImageERC721 = await ERC721BridgeToken.new('TEST', 'TST', owner)
    tokenNativeImageERC721 = await ERC721NativeToken.new('TEST', 'TST')
  })

  beforeEach(async () => {
    tokenFactoryERC721 = await ERC721TokenFactory.new()
  })

  describe('initialize', () => {
    it('should initialize parameters', async () => {
      // Given
      expect(await tokenFactoryERC721.isInitialized()).to.be.equal(false)
      expect(await tokenFactoryERC721.erc721BridgeImage()).to.be.equal(ZERO_ADDRESS)
      expect(await tokenFactoryERC721.erc721NativeImage()).to.be.equal(ZERO_ADDRESS)
      expect(await tokenFactoryERC721.bridge()).to.be.equal(ZERO_ADDRESS)
      expect(await tokenFactoryERC721.oppositeBridge()).to.be.equal(ZERO_ADDRESS)
      expect(await tokenFactoryERC721.owner()).to.be.equal(ZERO_ADDRESS)

      // When
      // not valid bridge address
      await initialize({ erc721BridgeImage: ZERO_ADDRESS }).should.be.rejected
      await initialize({ erc721NativeImage: ZERO_ADDRESS }).should.be.rejected
      await initialize({ bridge: ZERO_ADDRESS }).should.be.rejected
      await initialize({ owner: ZERO_ADDRESS }).should.be.rejected

      await initialize().should.be.fulfilled

      // already initialized
      await initialize().should.be.rejected

      // Then
      expect(await tokenFactoryERC721.isInitialized()).to.be.equal(true)
      expect(await tokenFactoryERC721.erc721BridgeImage()).to.be.equal(tokenBridgeImageERC721.address)
      expect(await tokenFactoryERC721.erc721NativeImage()).to.be.equal(tokenNativeImageERC721.address)
      expect(await tokenFactoryERC721.bridge()).to.be.equal(bridge.address)
      expect(await tokenFactoryERC721.oppositeBridge()).to.be.equal(oppositeBridge)
      expect(await tokenFactoryERC721.owner()).to.be.equal(owner)
    })
  })

  describe('afterInitialization', () => {
    beforeEach(async () => {
      await initialize().should.be.fulfilled
    })

    describe('setERC721BridgeImage', () => {
      it('should allow owner to change erc271 bridge image', async () => {
        const newTokenBridgeImageERC721 = await ERC721BridgeToken.new('TEST', 'TST', owner)
        await tokenFactoryERC721.setERC721BridgeImage(newTokenBridgeImageERC721.address).should.be.fulfilled
        expect(await tokenFactoryERC721.erc721BridgeImage()).to.be.equal(newTokenBridgeImageERC721.address)
      })

      it('should not allow not owner to change erc271 bridge image', async () => {
        const newTokenBridgeImageERC721 = await ERC721BridgeToken.new('TEST', 'TST', owner)
        await tokenFactoryERC721.setERC721BridgeImage(newTokenBridgeImageERC721.address, { from: other }).should.be
          .rejected
      })
    })

    describe('setERC721NativeImage', () => {
      it('should allow owner to change erc271 native image', async () => {
        const newTokenNativeImageERC721 = await ERC721NativeToken.new('TEST', 'TST')
        await tokenFactoryERC721.setERC721NativeImage(newTokenNativeImageERC721.address).should.be.fulfilled
        expect(await tokenFactoryERC721.erc721NativeImage()).to.be.equal(newTokenNativeImageERC721.address)
      })

      it('should not allow not owner to change erc271 native image', async () => {
        const newTokenNativeImageERC721 = await ERC721NativeToken.new('TEST', 'TST')
        await tokenFactoryERC721.setERC721NativeImage(newTokenNativeImageERC721.address, { from: other }).should.be
          .rejected
      })
    })

    describe('setBridge', () => {
      it('should allow owner to change bridge contract', async () => {
        const newBridge = await OmnibridgeMock.new('SUFFIX')
        await tokenFactoryERC721.setBridge(newBridge.address).should.be.fulfilled
        expect(await tokenFactoryERC721.bridge()).to.be.equal(newBridge.address)
      })

      it('should not allow not owner to change bridge contract', async () => {
        const newBridge = await OmnibridgeMock.new('SUFFIX')
        await tokenFactoryERC721.setBridge(newBridge.address, { from: other }).should.be.rejected
      })
    })

    describe('setOppositeBridge', () => {
      it('should allow owner to change opposite bridge contract', async () => {
        const newOppositeBridge = '0xAfb77d544aFc1e2aD3dEEAa20F3c80859E7Fc3C9'
        await tokenFactoryERC721.setOppositeBridge(newOppositeBridge).should.be.fulfilled
        expect(await tokenFactoryERC721.oppositeBridge()).to.be.equal(newOppositeBridge)
      })

      it('should not allow not owner to change bridge contract', async () => {
        const newOppositeBridge = '0xAfb77d544aFc1e2aD3dEEAa20F3c80859E7Fc3C9'
        await tokenFactoryERC721.setOppositeBridge(newOppositeBridge, { from: other }).should.be.rejected
      })
    })

    describe('deployERC721NativeContract', () => {
      it('should allow deploy native contract', async () => {
        expect(await tokenFactoryERC721.nativeTokenOf(0)).to.be.eql(ZERO_ADDRESS)
        const token1 = await deployERC721NativeToken()
        expect(await tokenFactoryERC721.nativeTokenOf(0)).to.be.eql(token1.address)
        const token2 = await deployERC721NativeToken()
        expect(await tokenFactoryERC721.nativeTokenOf(1)).to.be.eql(token2.address)
      })
    })

    describe('deployERC721BridgeContract', () => {
      it('should allow bridge deploy bridged contract', async () => {
        await bridge.deployERC721BridgeToken(tokenFactoryERC721.address, 'TEST', 'TST', 0, owner)
        const event = await getEvents(tokenFactoryERC721, { event: 'ERC721BridgeContractCreated' })
        // eslint-disable-next-line no-underscore-dangle
        const collection = event[event.length - 1].returnValues._collection
        expect(collection).not.to.empty()
      })

      it('should not allow not bridge deploy bridged contract', async () => {
        await tokenFactoryERC721.deployERC721BridgeContract('TEST', 'TST', 0, owner, { from: owner }).should.be.rejected
      })
    })
  })
})
