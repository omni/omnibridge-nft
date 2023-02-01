const assert = require('assert')
const { ZERO_ADDRESS, toAddress } = require('../../utils')

async function run({ foreign, home, users }) {
  console.log('Bridging Native Home token to Foreign chain')
  const { erc721UsingTokenFactory, mediator } = home

  const id = await home.mintERC721NativeToken()

  console.log('Sending token to the Home Mediator')
  const receipt1 = await home.relayTokenERC721(erc721UsingTokenFactory, id)
  const relayTxHash1 = await foreign.executeManually(receipt1)
  const bridgedToken = await foreign.getBridgedTokenERC721(erc721UsingTokenFactory)

  assert.equal(
    toAddress(bridgedToken),
    toAddress(erc721UsingTokenFactory),
    'Bridged token address must same address with native token'
  )

  await foreign.checkTransferERC721(relayTxHash1, bridgedToken, ZERO_ADDRESS, users[0], id)

  console.log('\nSending token to the Foreign Mediator')
  const receipt2 = await foreign.relayTokenERC721(bridgedToken, id)
  const relayTxHash2 = await home.waitUntilProcessed(receipt2)

  await home.checkTransferERC721(relayTxHash2, erc721UsingTokenFactory, mediator, users[0], id)
}

module.exports = {
  name: 'Bridging of native Home ERC721 tokens issued by token factory in both directions',
  shouldRun: () => true,
  run,
}
