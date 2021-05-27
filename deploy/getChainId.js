const Web3 = require('web3')

const web3 = new Web3(process.env.RPC_URL)
web3.eth.getChainId().then(console.log)
