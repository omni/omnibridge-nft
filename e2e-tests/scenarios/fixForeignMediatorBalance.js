const { ZERO_ADDRESS } = require('../utils')

async function run({ home, foreign, users, owner }) {
  console.log('Fixing mediator balance of the foreign mediator')
  const { mediator, token } = foreign

  const id = await foreign.mint()

  console.log('Sending token to the Foreign Mediator')
  await token.methods.transferFrom(users[0], mediator.options.address, id).send()

  console.log('Sending fixMediatorBalance request to the Foreign Mediator')
  const receipt = await mediator.methods.fixMediatorBalance(token.options.address, users[0], id).send({ from: owner })
  const relayTxHash = await home.waitUntilProcessed(receipt)
  const bridgedToken = await home.getBridgedToken(token)

  await home.checkTransfer(relayTxHash, bridgedToken, ZERO_ADDRESS, users[0], id)
}

module.exports = {
  name: 'Fixing mediator balance of the foreign mediator',
  shouldRun: async ({ foreign, owner }) => {
    const isRegistered = await foreign.mediator.methods.isTokenRegistered(foreign.token.options.address).call()
    return owner && isRegistered
  },
  run,
}
