const assert = require('assert')

async function run({ foreign }) {
  console.log('Bridging Native Foreign token to Home chain')
  const { erc721Token } = foreign

  const id = await foreign.mintERC721()

  console.log('Sending token to the Foreign Mediator')
  try {
    await foreign.relayTokenERC721(erc721Token, id)
  } catch (error) {
    assert.notEqual(error, undefined, 'Transaction has been reverted by the EVM')
  }
}

module.exports = {
  name: 'Bridging of native Foreign ERC721 tokens in both directions',
  shouldRun: () => true,
  run,
}
