const ERC1155BridgeToken = artifacts.require('ERC1155BridgeTokenMetaTx')
const ERC1155TokenProxy = artifacts.require('ERC1155TokenProxy')

const { expect } = require('chai')
const { eip712hash, startGSN, stopGSN } = require('./helpers/helpers')

contract('ERC1155BridgeTokenMetaTx', (accounts) => {
  const owner = accounts[0]
  const user = accounts[1]
  const userPK = '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1'
  const otherUser = accounts[2]
  let token

  before(() => {
    web3.extend({
      property: 'eth',
      methods: [{ name: 'signTypedData', call: 'eth_signTypedData', params: 2 }],
    })
  })

  beforeEach(async () => {
    const tokenImage = await ERC1155BridgeToken.new()
    const tokenProxy = await ERC1155TokenProxy.new(tokenImage.address, 'TEST', 'TST', owner)
    token = await ERC1155BridgeToken.at(tokenProxy.address)
    await token.mint(user, [1, 2], [100, 100])
  })

  describe('native meta transactions', () => {
    let typedData
    beforeEach(() => {
      typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          metaSafeTransferFrom: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'id', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
            { name: 'data', type: 'bytes' },
            { name: 'nonce', type: 'uint256' },
          ],
          metaSafeBatchTransferFrom: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'ids', type: 'uint256[]' },
            { name: 'amounts', type: 'uint256[]' },
            { name: 'data', type: 'bytes' },
            { name: 'nonce', type: 'uint256' },
          ],
          metaSetApprovalForAll: [
            { name: 'holder', type: 'address' },
            { name: 'operator', type: 'address' },
            { name: 'approved', type: 'bool' },
            { name: 'nonce', type: 'uint256' },
          ],
        },
        domain: {
          name: 'MetaTxERC1155',
          version: '1',
          chainId: 1337,
          verifyingContract: token.address,
        },
      }
    })

    describe('metaSafeTransferFrom', () => {
      const message = {
        from: user,
        to: otherUser,
        id: 1,
        amount: 2,
        data: '0x',
        nonce: 0,
      }

      beforeEach(() => {
        typedData.primaryType = 'metaSafeTransferFrom'
        typedData.message = message
      })

      it('should transfer token using valid EIP712 signature', async () => {
        const sig = await web3.eth.signTypedData(user, typedData)

        expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('100')
        expect(await token.nonces(user)).to.be.bignumber.equal('0')
        await token.metaSafeTransferFrom(user, otherUser, 1, 2, '0x', 0, `${sig}01`).should.be.fulfilled
        expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('98')
        expect(await token.balanceOf(otherUser, 1)).to.be.bignumber.equal('2')
        expect(await token.nonces(user)).to.be.bignumber.equal('1')
      })

      it('should transfer token using valid EIP712 eth_sign signature', async () => {
        const hash = eip712hash(typedData)
        const { signature } = await web3.eth.accounts.sign(hash, userPK)

        expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('100')
        expect(await token.nonces(user)).to.be.bignumber.equal('0')
        await token.metaSafeTransferFrom(user, otherUser, 1, 2, '0x', 0, `${signature}02`).should.be.fulfilled
        expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('98')
        expect(await token.balanceOf(otherUser, 1)).to.be.bignumber.equal('2')
        expect(await token.nonces(user)).to.be.bignumber.equal('1')
      })

      it('should not accept invalid signatures', async () => {
        const sig = await web3.eth.signTypedData(user, typedData)
        const hash = eip712hash(typedData)
        const { signature } = await web3.eth.accounts.sign(hash, userPK)

        await token.metaSafeTransferFrom(user, otherUser, 1, 2, '0x', 0, `${signature}01`).should.be.rejected
        await token.metaSafeTransferFrom(user, otherUser, 1, 2, '0x', 0, `${sig}02`).should.be.rejected
        await token.metaSafeTransferFrom(user, otherUser, 1, 3, '0x', 0, `${sig}01`).should.be.rejected
        await token.metaSafeTransferFrom(user, otherUser, 1, 3, '0x', 0, `${signature}02`).should.be.rejected
      })

      it('should work for close enough nonces', async () => {
        for (const nonce of [0, 1, 3, 10, 50, 150]) {
          message.nonce = nonce
          const sig = await web3.eth.signTypedData(user, typedData)

          await token.metaSafeTransferFrom(user, otherUser, 1, 2, '0x', nonce, `${sig}01`).should.be.fulfilled
        }

        message.nonce = 300
        const sig = await web3.eth.signTypedData(user, typedData)

        await token.metaSafeTransferFrom(user, otherUser, 1, 2, '0x', 300, `${sig}01`).should.be.rejected
      })
    })

    describe('metaSafeBatchTransferFrom', () => {
      const message = {
        from: user,
        to: otherUser,
        ids: [1, 2],
        amounts: [2, 3],
        data: '0x',
        nonce: 0,
      }

      beforeEach(() => {
        typedData.primaryType = 'metaSafeBatchTransferFrom'
        typedData.message = message
      })

      it('should transfer tokens using valid EIP712 signature', async () => {
        const sig = await web3.eth.signTypedData(user, typedData)

        expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('100')
        expect(await token.balanceOf(user, 2)).to.be.bignumber.equal('100')
        expect(await token.nonces(user)).to.be.bignumber.equal('0')
        await token.metaSafeBatchTransferFrom(user, otherUser, [1, 2], [2, 3], '0x', 0, `${sig}01`).should.be.fulfilled
        expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('98')
        expect(await token.balanceOf(user, 2)).to.be.bignumber.equal('97')
        expect(await token.balanceOf(otherUser, 1)).to.be.bignumber.equal('2')
        expect(await token.balanceOf(otherUser, 2)).to.be.bignumber.equal('3')
        expect(await token.nonces(user)).to.be.bignumber.equal('1')
      })

      it('should transfer tokens using valid EIP712 eth_sign signature', async () => {
        const hash = eip712hash(typedData)
        const { signature } = await web3.eth.accounts.sign(hash, userPK)

        expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('100')
        expect(await token.balanceOf(user, 2)).to.be.bignumber.equal('100')
        expect(await token.nonces(user)).to.be.bignumber.equal('0')
        await token.metaSafeBatchTransferFrom(user, otherUser, [1, 2], [2, 3], '0x', 0, `${signature}02`).should.be
          .fulfilled
        expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('98')
        expect(await token.balanceOf(user, 2)).to.be.bignumber.equal('97')
        expect(await token.balanceOf(otherUser, 1)).to.be.bignumber.equal('2')
        expect(await token.balanceOf(otherUser, 2)).to.be.bignumber.equal('3')
        expect(await token.nonces(user)).to.be.bignumber.equal('1')
      })

      it('should not accept invalid signatures', async () => {
        const sig = await web3.eth.signTypedData(user, typedData)
        const hash = eip712hash(typedData)
        const { signature } = await web3.eth.accounts.sign(hash, userPK)

        await token.metaSafeTransferFrom(user, otherUser, [1, 2], [2, 3], '0x', 0, `${signature}01`).should.be.rejected
        await token.metaSafeTransferFrom(user, otherUser, [1, 2], [2, 3], '0x', 0, `${sig}02`).should.be.rejected
        await token.metaSafeTransferFrom(user, otherUser, [1, 2], [3, 2], '0x', 0, `${sig}01`).should.be.rejected
        await token.metaSafeTransferFrom(user, otherUser, [1, 2], [3, 2], '0x', 0, `${signature}02`).should.be.rejected
      })

      it('should work for close enough nonces', async () => {
        for (const nonce of [0, 1, 3, 10, 50, 150]) {
          message.nonce = nonce
          const sig = await web3.eth.signTypedData(user, typedData)

          await token.metaSafeBatchTransferFrom(user, otherUser, [1, 2], [2, 3], '0x', nonce, `${sig}01`).should.be
            .fulfilled
        }

        message.nonce = 300
        const sig = await web3.eth.signTypedData(user, typedData)

        await token.metaSafeBatchTransferFrom(user, otherUser, [1, 2], [2, 3], '0x', 300, `${sig}01`).should.be.rejected
      })
    })

    describe('metaSetApprovalForAll', () => {
      const message = {
        holder: user,
        operator: otherUser,
        approved: true,
        nonce: 0,
      }

      beforeEach(() => {
        typedData.primaryType = 'metaSetApprovalForAll'
        typedData.message = message
      })

      it('should set allowance using valid EIP712 signature', async () => {
        const sig = await web3.eth.signTypedData(user, typedData)

        expect(await token.isApprovedForAll(user, otherUser)).to.be.equal(false)
        expect(await token.nonces(user)).to.be.bignumber.equal('0')
        await token.metaSetApprovalForAll(user, otherUser, true, 0, `${sig}01`).should.be.fulfilled
        expect(await token.isApprovedForAll(user, otherUser)).to.be.equal(true)
        expect(await token.nonces(user)).to.be.bignumber.equal('1')
      })

      it('should set allowance using valid EIP712 eth_sign signature', async () => {
        const hash = eip712hash(typedData)
        const { signature } = await web3.eth.accounts.sign(hash, userPK)

        expect(await token.isApprovedForAll(user, otherUser)).to.be.equal(false)
        expect(await token.nonces(user)).to.be.bignumber.equal('0')
        await token.metaSetApprovalForAll(user, otherUser, true, 0, `${signature}02`).should.be.fulfilled
        expect(await token.isApprovedForAll(user, otherUser)).to.be.equal(true)
        expect(await token.nonces(user)).to.be.bignumber.equal('1')
      })

      it('should not accept invalid signatures', async () => {
        const sig = await web3.eth.signTypedData(user, typedData)
        const hash = eip712hash(typedData)
        const { signature } = await web3.eth.accounts.sign(hash, userPK)

        await token.metaSetApprovalForAll(user, otherUser, true, 0, `${signature}01`).should.be.rejected
        await token.metaSetApprovalForAll(user, otherUser, true, 0, `${sig}02`).should.be.rejected
        await token.metaSetApprovalForAll(user, otherUser, false, 0, `${sig}01`).should.be.rejected
        await token.metaSetApprovalForAll(user, otherUser, false, 0, `${signature}02`).should.be.rejected
      })

      it('should work for close enough nonces', async () => {
        for (const nonce of [0, 1, 3, 10, 50, 150]) {
          message.nonce = nonce
          const sig = await web3.eth.signTypedData(user, typedData)

          await token.metaSetApprovalForAll(user, otherUser, true, nonce, `${sig}01`).should.be.fulfilled
        }

        message.nonce = 300
        const sig = await web3.eth.signTypedData(user, typedData)

        await token.metaSetApprovalForAll(user, otherUser, true, 300, `${sig}01`).should.be.rejected
      })
    })
  })

  describe('gsn meta transactions', () => {
    let gsn
    before(async () => {
      gsn = await startGSN()
    })

    after(stopGSN)

    beforeEach(async () => {
      await token.setTrustedForwarder(gsn.contractsDeployment.forwarderAddress)

      ERC1155BridgeToken.setProvider(gsn.relayProvider)
      token = await ERC1155BridgeToken.at(token.address)
    })

    afterEach(async () => {
      ERC1155BridgeToken.setProvider(web3.currentProvider)
    })

    it('call safeTransferFrom through GSN', async () => {
      expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('100')
      await token.safeTransferFrom(user, otherUser, 1, 2, '0x', { from: user, gas: 300000 }).should.be.fulfilled
      expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('98')
      expect(await token.balanceOf(otherUser, 1)).to.be.bignumber.equal('2')
    })

    it('call safeBatchTransferFrom through GSN', async () => {
      expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('100')
      expect(await token.balanceOf(user, 2)).to.be.bignumber.equal('100')
      await token.safeBatchTransferFrom(user, otherUser, [1, 2], [2, 3], '0x', { from: user, gas: 300000 }).should.be
        .fulfilled
      expect(await token.balanceOf(user, 1)).to.be.bignumber.equal('98')
      expect(await token.balanceOf(user, 2)).to.be.bignumber.equal('97')
      expect(await token.balanceOf(otherUser, 1)).to.be.bignumber.equal('2')
      expect(await token.balanceOf(otherUser, 2)).to.be.bignumber.equal('3')
    })

    it('call setApprovalForAll through GSN', async () => {
      expect(await token.isApprovedForAll(user, otherUser)).to.be.equal(false)
      await token.setApprovalForAll(otherUser, true, { from: user, gas: 300000 }).should.be.fulfilled
      expect(await token.isApprovedForAll(user, otherUser)).to.be.equal(true)
    })
  })
})
