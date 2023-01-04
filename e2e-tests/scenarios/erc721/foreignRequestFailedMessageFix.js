const assert = require('assert')
const { ZERO_ADDRESS } = require('../../utils')

async function run({ home, foreign, users, owner, findMessageId }) {
  const foreignBridgedToken = await foreign.getBridgedTokenERC721(home.erc721Token)

  async function waitUntilFailedThenFix(receipt, token, tokenId) {
    const status = await foreign.executeManually(receipt)
    assert.ok(!status, 'Message should have been failed')
    const messageId = findMessageId(receipt)

    console.log(`Requesting failed message fix for message id ${messageId}`)
    const receipt2 = await foreign.mediator.methods
      .requestFailedMessageFix(messageId, token.options.address, users[0], [tokenId], [])
      .send({ from: owner })
    return home.waitUntilProcessed(receipt2)
  }

  await foreign.withDisabledExecution(foreignBridgedToken, async () => {
    const id = await home.mintERC721()

    console.log('Sending token to the Home Mediator')
    const receipt = await home.relayTokenERC721(home.erc721Token, id)
    const relayTxHash = await waitUntilFailedThenFix(receipt, home.erc721Token, id)

    await home.checkTransferERC721(relayTxHash, home.erc721Token, home.mediator, users[0], id)
  })

  const id = await foreign.mintERC721()

  console.log('Sending token to the Foreign Mediator')
  const receipt = await foreign.relayTokenERC721(foreign.erc721Token, id)
  await home.waitUntilProcessed(receipt)
  const homeBridgedToken = await home.getBridgedTokenERC721(foreign.erc721Token)

  await foreign.withDisabledExecution(foreign.erc721Token, async () => {
    console.log('Sending token to the Home Mediator')
    const receipt = await home.relayTokenERC721(homeBridgedToken, id)
    const relayTxHash = await waitUntilFailedThenFix(receipt, homeBridgedToken, id)

    await home.checkTransferERC721(relayTxHash, homeBridgedToken, ZERO_ADDRESS, users[0], id)
  })
}

module.exports = {
  name: 'Fixing failed bridge operations on the foreign side for ERC721 tokens',
  shouldRun: async ({ home, foreign, owner }) => {
    const token = await foreign.mediator.methods.bridgedTokenAddress(home.erc721Token.options.address).call()
    return owner && token !== ZERO_ADDRESS
  },
  run,
}
