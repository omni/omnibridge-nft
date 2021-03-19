const assert = require('assert')
const { ZERO_ADDRESS } = require('../utils')

async function run({ home, foreign, users, owner, findMessageId }) {
  const homeBridgedToken = await home.getBridgedToken(foreign.token)

  async function waitUntilFailedThenFix(receipt) {
    const status = await home.waitUntilProcessed(receipt)
    assert.ok(!status, 'Message should have been failed')
    const messageId = findMessageId(receipt)

    console.log(`Requesting failed message fix for message id ${messageId}`)
    const receipt2 = await home.mediator.methods.requestFailedMessageFix(messageId).send({ from: owner })
    return foreign.executeManually(receipt2)
  }

  await home.withDisabledExecution(homeBridgedToken, async () => {
    const id = await foreign.mint()

    console.log('Sending token to the Foreign Mediator')
    const receipt = await foreign.relayToken(foreign.token, id)
    const relayTxHash = await waitUntilFailedThenFix(receipt)

    await foreign.checkTransfer(relayTxHash, foreign.token, foreign.mediator, users[0], id)
  })

  const id = await home.mint()

  console.log('Sending token to the Home Mediator')
  const receipt2 = await home.relayToken(home.token, id)
  await foreign.waitUntilProcessed(receipt2)
  const foreignBridgedToken = await foreign.getBridgedToken(home.token)

  await home.withDisabledExecution(home.token, async () => {
    console.log('Sending token to the Foreign Mediator')
    const receipt = await foreign.relayToken(foreignBridgedToken, id)
    const relayTxHash = await waitUntilFailedThenFix(receipt)

    await foreign.checkTransfer(relayTxHash, foreignBridgedToken, ZERO_ADDRESS, users[0], id)
  })
}

module.exports = {
  name: 'Fixing failed bridge operations on the home side',
  shouldRun: async ({ home, foreign, owner }) => {
    const token = await home.mediator.methods.bridgedTokenAddress(foreign.token.options.address).call()
    return owner && token !== ZERO_ADDRESS
  },
  run,
}
