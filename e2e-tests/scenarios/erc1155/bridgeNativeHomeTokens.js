const { ZERO_ADDRESS } = require('../../utils')

async function run({ foreign, home, users }) {
  console.log('Bridging Native Home token to Foreign chain')
  const { erc1155Token, mediator } = home

  const id = await home.mintERC1155()

  console.log('Sending token to the Home Mediator')
  const receipt1 = await home.relayTokenERC1155(erc1155Token, id)
  const relayTxHash1 = await foreign.waitUntilProcessed(receipt1)
  const bridgedToken = await foreign.getBridgedTokenERC1155(erc1155Token)

  await foreign.checkTransferERC1155(relayTxHash1, bridgedToken, ZERO_ADDRESS, users[0], id)

  console.log('\nSending token to the Foreign Mediator')
  const receipt2 = await foreign.relayTokenERC1155(bridgedToken, id)
  const relayTxHash2 = await home.waitUntilProcessed(receipt2)

  await home.checkTransferBatchERC1155(relayTxHash2, erc1155Token, mediator, users[0], id)
}

module.exports = {
  name: 'Bridging of native Home ERC1155 tokens in both directions',
  shouldRun: () => true,
  run,
}
