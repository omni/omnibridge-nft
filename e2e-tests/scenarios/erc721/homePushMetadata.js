const assert = require('assert')

const NEW_EXAMPLE_URI = 'https://example.com'

async function run({ home, foreign, users }) {
  console.log('Bridging Native Home token to Foreign chain')
  const id = await home.mintERC721()

  console.log('Sending token to the Home Mediator')
  await foreign.waitUntilProcessed(await home.relayTokenERC721(home.erc721Token, id))
  const bridgedToken = await foreign.getBridgedTokenERC721(home.erc721Token)

  await home.erc721Token.methods.setOwner(users[0]).send()
  await home.erc721Token.methods.setTokenURI(id, NEW_EXAMPLE_URI).send()

  console.log('Push metadata updates to Foreign chain')
  const receipt1 = await home.pushTokenOwnerUpdate(home.erc721Token)
  const receipt2 = await home.pushERC721URIUpdate(home.erc721Token, id)
  const receipt3 = await home.pushERC1155URIUpdate(home.erc721Token, id).catch(() => ({ status: false }))

  const relayTxHash1 = await foreign.executeManually(receipt1)
  const relayTxHash2 = await foreign.executeManually(receipt2)

  assert.ok(!!relayTxHash1, 'AMB request should have been executed')
  assert.ok(!!relayTxHash2, 'AMB request should have been executed')
  assert.ok(!receipt3.status, 'AMB request should have been failed')

  assert.strictEqual(await bridgedToken.methods.owner().call(), users[0], 'Owner is not updated')
  assert.strictEqual(await bridgedToken.methods.tokenURI(id).call(), NEW_EXAMPLE_URI, 'Token URI is not updated')
}

module.exports = {
  name: 'Pushing updated metadata to the bridged foreign token',
  shouldRun: () => true,
  run,
}
