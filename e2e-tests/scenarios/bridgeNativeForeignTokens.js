const { ZERO_ADDRESS } = require('../utils')

async function run({ foreign, home, users }) {
  console.log('Bridging Native Foreign token to Home chain')
  const { token, mediator } = foreign

  const id = await foreign.mint()

  console.log('Sending token to the Foreign Mediator')
  const receipt1 = await foreign.relayToken(token, id)
  const relayTxHash1 = await home.waitUntilProcessed(receipt1)
  const bridgedToken = await home.getBridgedToken(token)

  await home.checkTransfer(relayTxHash1, bridgedToken, ZERO_ADDRESS, users[0], id)

  console.log('\nSending token to the Home Mediator')
  const receipt2 = await home.relayToken(bridgedToken, id)
  const relayTxHash2 = await foreign.waitUntilProcessed(receipt2)

  await foreign.checkTransfer(relayTxHash2, token, mediator, users[0], id)
}

module.exports = {
  name: 'Bridging of native Foreign tokens in both directions',
  shouldRun: () => true,
  run,
}
