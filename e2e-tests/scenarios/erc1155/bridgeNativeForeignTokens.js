const { ZERO_ADDRESS } = require('../../utils')

async function run({ foreign, home, users }) {
  console.log('Bridging Native Foreign token to Home chain')
  const { erc1155Token, mediator } = foreign

  const id = await foreign.mintERC1155()

  console.log('Sending token to the Foreign Mediator')
  const receipt1 = await foreign.relayTokenERC1155(erc1155Token, id)
  const relayTxHash1 = await home.waitUntilProcessed(receipt1)
  const bridgedToken = await home.getBridgedTokenERC1155(erc1155Token)

  await home.checkTransferERC1155(relayTxHash1, bridgedToken, ZERO_ADDRESS, users[0], id)

  console.log('\nSending token to the Home Mediator')
  const receipt2 = await home.relayTokenERC1155(bridgedToken, id)
  const relayTxHash2 = await foreign.waitUntilProcessed(receipt2)

  await foreign.checkTransferBatchERC1155(relayTxHash2, erc1155Token, mediator, users[0], id)
}

module.exports = {
  name: 'Bridging of native Foreign ERC1155 tokens in both directions',
  shouldRun: () => true,
  run,
}
