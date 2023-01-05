const assert = require('assert')

async function run({ foreign, home, users }) {
  console.log('Bridging Native Home token to Foreign chain')
  const { erc721Token } = home

  const id = await home.mintERC721()

  console.log('Sending token to the Home Mediator')
  try {
    const receipt1 = await home.relayTokenERC721(erc721Token, id)
    await foreign.executeManually(receipt1, users[1])
    assert.equal(1, 0, 'Should never happen')
  } catch (error) {
    // EVM revert
  }
}

module.exports = {
  name: 'Bridging of native Home ERC721 tokens in both directions',
  shouldRun: () => true,
  run,
}
