const { ZERO_ADDRESS } = require('../../utils')

async function run({ foreign, home, users }) {
  console.log('Bridging Native Foreign token to Home chain')
  const { erc721Token, mediator } = foreign

  const id = await foreign.mintERC721()

  console.log('Sending token to the Foreign Mediator')
  const receipt1 = await foreign.relayTokenERC721(erc721Token, id)
  const relayTxHash1 = await home.waitUntilProcessed(receipt1)
  const bridgedToken = await home.getBridgedTokenERC721(erc721Token)

  await home.checkTransferERC721(relayTxHash1, bridgedToken, ZERO_ADDRESS, users[0], id)

  console.log('\nSending token to the Home Mediator')
  const receipt2 = await home.relayTokenERC721(bridgedToken, id)
  const relayTxHash2 = await foreign.executeManually(receipt2)

  await foreign.checkTransferERC721(relayTxHash2, erc721Token, mediator, users[0], id)
}

module.exports = {
  name: 'Bridging of native Foreign ERC721 tokens in both directions',
  shouldRun: () => true,
  run,
}
