const { deployContract } = require('./src/deploymentUtils')
const { ERC1155BridgeToken } = require('./src/loadContracts')
const { ZERO_ADDRESS } = require('./src/constants')
const { web3Foreign } = require('./src/web3')

async function main() {
  const image = await deployContract(ERC1155BridgeToken, ['', '', ZERO_ADDRESS], {
    nonce: await web3Foreign.eth.getTransactionCount('0x2d5C035F99a7DF3067EDAcDED0e117d7076aBf7c'),
    network: 'foreign',
  })
  console.log(image.options.address)
}

main()
