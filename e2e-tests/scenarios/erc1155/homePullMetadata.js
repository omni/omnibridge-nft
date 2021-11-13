const assert = require('assert')
const { sha3 } = require('web3').utils

const NEW_EXAMPLE_URI = 'https://example.com'

async function run({ home, foreign, users, owner }) {
  console.log('Enable async AMB requests')
  await home.amb.methods.enableAsyncRequestSelector(sha3('eth_call(address,bytes)'), true).send({ from: owner })

  console.log('Bridging Native Foreign token to Home chain')
  const id = await foreign.mintERC1155()

  console.log('Sending token to the Foreign Mediator')
  await home.waitUntilProcessed(await foreign.relayTokenERC1155(foreign.erc1155Token, id))
  const bridgedToken = await home.getBridgedTokenERC1155(foreign.erc1155Token)

  await foreign.erc1155Token.methods.setOwner(users[0]).send()
  await foreign.erc1155Token.methods.setTokenURI(id, NEW_EXAMPLE_URI).send()

  console.log('Pull metadata updates from Foreign chain')
  const receipt1 = await home.pullTokenOwnerUpdate(bridgedToken)
  const receipt2 = await home.pullERC721URIUpdate(bridgedToken, id)
  const receipt3 = await home.pullERC1155URIUpdate(bridgedToken, id)

  const relayTxHash1 = await home.waitUntilInformationReceived(receipt1)
  const relayTxHash2 = await home.waitUntilInformationReceived(receipt2)
  const relayTxHash3 = await home.waitUntilInformationReceived(receipt3)

  assert.ok(!!relayTxHash1, 'Information request should have been executed')
  assert.ok(!relayTxHash2, 'Information request should have been failed')
  assert.ok(!!relayTxHash3, 'Information request should have been executed')

  assert.strictEqual(await bridgedToken.methods.owner().call(), users[0], 'Owner is not updated')
  assert.strictEqual(await bridgedToken.methods.uri(id).call(), NEW_EXAMPLE_URI, 'Token URI is not updated')
}

module.exports = {
  name: 'Pulling updated metadata from the native foreign token',
  shouldRun: ({ owner }) => !!owner,
  run,
}
