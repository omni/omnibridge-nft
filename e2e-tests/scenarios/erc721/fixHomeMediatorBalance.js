const { ZERO_ADDRESS } = require('../../utils')

async function run({ home, foreign, users, owner }) {
  console.log('Fixing mediator balance of the home mediator')
  const { mediator, erc721UsingTokenFactory } = home

  const id = await home.mintERC721NativeToken()

  console.log('Sending token to the Home Mediator')
  await erc721UsingTokenFactory.methods.transferFrom(users[0], mediator.options.address, id).send()

  console.log('Sending fixMediatorBalance request to the Home Mediator')
  const receipt = await mediator.methods
    .fixMediatorBalanceERC721(erc721UsingTokenFactory.options.address, users[0], [id])
    .send({ from: owner })
  const relayTxHash = await foreign.waitUntilProcessed(receipt)
  const bridgedToken = await foreign.getBridgedTokenERC721(erc721UsingTokenFactory)

  await foreign.checkTransferERC721(relayTxHash, bridgedToken, ZERO_ADDRESS, users[0], id)
}

module.exports = {
  name: 'Fixing mediator balance of the home mediator',
  shouldRun: async ({ home, owner }) => {
    const isRegistered = await home.mediator.methods
      .isTokenRegistered(home.erc721UsingTokenFactory.options.address)
      .call()
    return owner && isRegistered
  },
  run,
}
