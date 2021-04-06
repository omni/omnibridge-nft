const assert = require('assert')
const { ZERO_ADDRESS } = require('../utils')

async function run({ home, foreign, users, owner, findMessageId }) {
  const foreignBridgedToken = await foreign.getBridgedToken(home.token)

  async function waitUntilFailedThenFix(receipt) {
    const status = await foreign.waitUntilProcessed(receipt)
    assert.ok(!status, 'Message should have been failed')
    const messageId = findMessageId(receipt)

    console.log(`Requesting failed message fix for message id ${messageId}`)
    const receipt2 = await foreign.mediator.methods.requestFailedMessageFix(messageId).send({ from: owner })
    return home.waitUntilProcessed(receipt2)
  }

  await foreign.withDisabledExecution(foreignBridgedToken, async () => {
    const id = await home.mint()

    console.log('Sending token to the Home Mediator')
    const receipt = await home.relayToken(home.token, id)
    const relayTxHash = await waitUntilFailedThenFix(receipt)

    await home.checkTransfer(relayTxHash, home.token, home.mediator, users[0], id)
  })

  const id = await foreign.mint()

  console.log('Sending token to the Foreign Mediator')
  const receipt = await foreign.relayToken(foreign.token, id)
  await home.waitUntilProcessed(receipt)
  const homeBridgedToken = await home.getBridgedToken(foreign.token)

  await foreign.withDisabledExecution(foreign.token, async () => {
    console.log('Sending token to the Home Mediator')
    const receipt = await home.relayToken(homeBridgedToken, id)
    const relayTxHash = await waitUntilFailedThenFix(receipt)

    // fee was subtracted when the failed message was initiated
    await home.checkTransfer(relayTxHash, homeBridgedToken, ZERO_ADDRESS, users[0], id)
  })
}

module.exports = {
  name: 'Fixing failed bridge operations on the foreign side',
  shouldRun: async ({ home, foreign, owner }) => {
    const token = await foreign.mediator.methods.bridgedTokenAddress(home.token.options.address).call()
    return owner && token !== ZERO_ADDRESS
  },
  run,
}
