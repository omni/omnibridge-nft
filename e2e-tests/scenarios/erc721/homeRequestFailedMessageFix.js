const assert = require('assert')
const { ZERO_ADDRESS } = require('../../utils')

async function run({ home, foreign, users, owner, findMessageId }) {
  const homeBridgedToken = await home.getBridgedTokenERC721(foreign.erc721Token)

  async function waitUntilFailedThenFix(receipt, token, tokenId) {
    const status = await home.waitUntilProcessed(receipt)
    assert.ok(!status, 'Message should have been failed')
    const messageId = findMessageId(receipt)

    console.log(`Requesting failed message fix for message id ${messageId}`)
    const receipt2 = await home.mediator.methods
      .requestFailedMessageFix(messageId, token.options.address, users[0], [tokenId], [])
      .send({ from: owner })
    return foreign.executeManually(receipt2)
  }

  await home.withDisabledExecution(homeBridgedToken, async () => {
    const id = await foreign.mintERC721()

    console.log('Sending token to the Foreign Mediator')
    const receipt = await foreign.relayTokenERC721(foreign.erc721Token, id)
    const relayTxHash = await waitUntilFailedThenFix(receipt, foreign.erc721Token, id)

    await foreign.checkTransferERC721(relayTxHash, foreign.erc721Token, foreign.mediator, users[0], id)
  })

  const id = await home.mintERC721()

  console.log('Sending token to the Home Mediator')
  const receipt2 = await home.relayTokenERC721(home.erc721Token, id)
  await foreign.executeManually(receipt2)
  const foreignBridgedToken = await foreign.getBridgedTokenERC721(home.erc721Token)

  await home.withDisabledExecution(home.erc721Token, async () => {
    console.log('Sending token to the Foreign Mediator')
    const receipt = await foreign.relayTokenERC721(foreignBridgedToken, id)
    const relayTxHash = await waitUntilFailedThenFix(receipt, foreignBridgedToken, id)

    await foreign.checkTransferERC721(relayTxHash, foreignBridgedToken, ZERO_ADDRESS, users[0], id)
  })
}

module.exports = {
  name: 'Fixing failed bridge operations on the home side for ERC721 tokens',
  shouldRun: async ({ home, foreign, owner }) => {
    const token = await home.mediator.methods.bridgedTokenAddress(foreign.erc721Token.options.address).call()
    return owner && token !== ZERO_ADDRESS
  },
  run,
}
