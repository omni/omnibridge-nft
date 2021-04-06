const { ZERO_ADDRESS } = require('../utils')

async function run({ foreign, home, users }) {
  console.log('Bridging Native Home token to Foreign chain with alternative receiver')
  const { token, mediator } = home

  const id = await home.mint()

  console.log('Sending token to the Home Mediator')
  const receipt1 = await home.relayToken(token, id, { to: users[1] })
  const relayTxHash1 = await foreign.waitUntilProcessed(receipt1)
  const bridgedToken = await foreign.getBridgedToken(token)

  await foreign.checkTransfer(relayTxHash1, bridgedToken, ZERO_ADDRESS, users[1], id)

  console.log('\nSending token to the Foreign Mediator')
  const receipt2 = await foreign.relayToken(bridgedToken, id, { to: users[0], from: users[1] })
  const relayTxHash2 = await home.waitUntilProcessed(receipt2)

  await home.checkTransfer(relayTxHash2, token, mediator, users[0], id)
}

module.exports = {
  name: 'Bridging of native Home tokens in both directions with alternative receiver',
  shouldRun: (env) => env.users.length > 1,
  run,
}
