const assert = require('assert')

const NEW_EXAMPLE_URI = 'https://example.com'

async function run({ home, foreign, users }) {
  console.log('Bridging Native Home token to Foreign chain')
  const id = await home.mintERC1155()

  console.log('Sending token to the Home Mediator')
  await foreign.waitUntilProcessed(await home.relayTokenERC1155(home.erc1155Token, id))
  const bridgedToken = await foreign.getBridgedTokenERC1155(home.erc1155Token)

  await home.erc1155Token.methods.setOwner(users[0]).send()
  await home.erc1155Token.methods.setTokenURI(id, NEW_EXAMPLE_URI).send()

  console.log('Push metadata updates to Foreign chain')
  const receipt1 = await home.pushTokenOwnerUpdate(home.erc1155Token)
  const receipt2 = await home.pushERC721URIUpdate(home.erc1155Token, id).catch(() => ({ status: false }))
  const receipt3 = await home.pushERC1155URIUpdate(home.erc1155Token, id)

  const relayTxHash1 = await foreign.executeManually(receipt1)
  const relayTxHash3 = await foreign.executeManually(receipt3)

  assert.ok(!!relayTxHash1, 'AMB request should have been executed')
  assert.ok(!receipt2.status, 'AMB request should have been failed')
  assert.ok(!!relayTxHash3, 'AMB request should have been executed')

  assert.strictEqual(await bridgedToken.methods.owner().call(), users[0], 'Owner is not updated')
  assert.strictEqual(await bridgedToken.methods.uri(id).call(), NEW_EXAMPLE_URI, 'Token URI is not updated')
}

module.exports = {
  name: 'Pushing updated metadata to the bridged foreign token',
  shouldRun: () => true,
  run,
}
