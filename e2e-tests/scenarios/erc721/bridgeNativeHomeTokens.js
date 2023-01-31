const assert = require('assert')

async function run({ home }) {
  console.log('Bridging Native Home token to Foreign chain')
  const { erc721Token } = home

  const id = await home.mintERC721()

  console.log('Sending token to the Home Mediator')
  try {
    await home.relayTokenERC721(erc721Token, id)
  } catch (error) {
    assert.notEqual(error, undefined, 'Transaction has been reverted by the EVM')
  }
}

module.exports = {
  name: 'Bridging of native Home ERC721 tokens in both directions',
  shouldRun: () => true,
  run,
}
