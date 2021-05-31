// This script is to be used from Remix IDE to deploy NFT OB AMB extension

(async () => {
  try {
    const suffix = ' from Mainnet'
    const compiled_json = 'contracts/upgradeable_contracts/omnibridge_nft/artifacts/HomeNFTOmnibridge.json'
    
    console.log('deploy...')

    const metadata = JSON.parse(await remix.call('fileManager', 
                                                 'getFile', 
                                                 compiled_json))
    const accounts = await web3.eth.getAccounts()

    let contract = new web3.eth.Contract(metadata.abi)

    contract = await contract.deploy({
      data: metadata.data.bytecode.object,
      arguments: [suffix]
    }).send({
      from: accounts[0]
    })

    console.log(contract.options.address)
  } catch (e) {
    console.log(e.message)
  }
})()
