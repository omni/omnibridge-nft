const { ZERO_ADDRESS } = require('../../utils')

async function run({ home, foreign, users, owner }) {
  console.log('Fixing mediator balance of the foreign mediator')
  const { mediator, erc721UsingTokenFactory } = foreign

  const id = await foreign.mintERC721NativeToken()

  console.log('Sending token to the Foreign Mediator')
  await erc721UsingTokenFactory.methods.transferFrom(users[0], mediator.options.address, id).send()

  console.log('Sending fixMediatorBalance request to the Foreign Mediator')
  const receipt = await mediator.methods
    .fixMediatorBalanceERC721(erc721UsingTokenFactory.options.address, users[0], [id])
    .send({ from: owner })
  const relayTxHash = await home.waitUntilProcessed(receipt)
  const bridgedToken = await home.getBridgedTokenERC721(erc721UsingTokenFactory)

  await home.checkTransferERC721(relayTxHash, bridgedToken, ZERO_ADDRESS, users[0], id)
}

module.exports = {
  name: 'Fixing mediator balance of the foreign mediator',
  shouldRun: async ({ foreign, owner }) => {
    const isRegistered = await foreign.mediator.methods
      .isTokenRegistered(foreign.erc721UsingTokenFactory.options.address)
      .call()
    return owner && isRegistered
  },
  run,
}
