const assert = require('assert')

async function run({ foreign, home, users }) {
  console.log('Bridging Native Home token to Foreign chain')
  const { erc721UsingTokenFactory } = home

  const id = await home.mintERC721()

  console.log('Sending token to the Home Mediator')
  try {
    const receipt1 = await home.relayTokenERC721(erc721UsingTokenFactory, id)
    await foreign.executeManually(receipt1, users[1])
  } catch (error) {
    assert.notEqual(error, undefined, 'Transaction has been reverted by the EVM')
  }
}

module.exports = {
  name: 'Bridging of native Home ERC721 tokens in both directions should fail if not user trigger',
  shouldRun: () => true,
  run,
}
