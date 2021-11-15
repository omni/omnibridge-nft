module.exports = {
  contracts_build_directory: './build/contracts',
  networks: {
    for_etherscan_verification: {
      network_id: process.env.VERIFICATION_CHAIN_ID,
      host: process.env.VERIFICATION_RPC_URL,
    },
    ganache: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
      gasPrice: 100000000000,
      gas: 10000000,
      disableConfirmationListener: true,
    },
  },
  compilers: {
    solc: {
      version: '0.7.5',
      settings: {
        optimizer: {
          enabled: true,
          runs: 10,
        },
        evmVersion: 'istanbul',
      },
    },
  },
  plugins: ['solidity-coverage', 'truffle-plugin-verify'],
  api_keys: {
    etherscan: process.env.VERIFICATION_ETHERSCAN_API_KEY,
  },
}
