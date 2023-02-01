const assert = require('assert')
const { ZERO_ADDRESS, toAddress } = require('../../utils')

async function run({ foreign, home, users }) {
  console.log('Bridging Native Foreign token to Home chain')
  const { erc721UsingTokenFactory, mediator } = foreign

  const id = await foreign.mintERC721NativeToken()

  console.log('Sending token to the Foreign Mediator')
  const receipt1 = await foreign.relayTokenERC721(erc721UsingTokenFactory, id)
  const relayTxHash1 = await home.waitUntilProcessed(receipt1)
  const bridgedToken = await home.getBridgedTokenERC721(erc721UsingTokenFactory)

  assert.equal(
    toAddress(bridgedToken),
    toAddress(erc721UsingTokenFactory),
    'Bridged token address must same address with native token'
  )

  await home.checkTransferERC721(relayTxHash1, bridgedToken, ZERO_ADDRESS, users[0], id)

  console.log('\nSending token to the Home Mediator')
  const receipt2 = await home.relayTokenERC721(bridgedToken, id)
  const relayTxHash2 = await foreign.executeManually(receipt2)

  await foreign.checkTransferERC721(relayTxHash2, erc721UsingTokenFactory, mediator, users[0], id)
}

module.exports = {
  name: 'Bridging of native Foreign ERC721 issued by token factory tokens in both directions',
  shouldRun: () => true,
  run,
}
