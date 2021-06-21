module.exports = {
  providerOptions: {
    _chainId: 1337,
    port: 8545,
    seed: 'TestRPC is awesome!'
  },
  mocha: {
    timeout: 30000
  },
  skipFiles: ['mocks']
}
