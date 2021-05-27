const IPFS = require('ipfs-http-client')
const shell = require('shelljs')
const path = require('path')

async function main() {
  const ipfs = IPFS.create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
  })

  const artifactPaths = shell.ls('./build/contracts/*.json')

  console.log('Uploading sources & metadata to IPFS (Infura Gateway)...')
  console.log('========================================================')

  for (const p of artifactPaths) {
    const artifact = require(path.join(process.cwd(), p))

    console.log()
    console.log(artifact.contractName)
    console.log('-'.repeat(artifact.contractName.length))

    const res1 = await ipfs.add(artifact.metadata)
    console.log(`metadata: ${res1.path}`)

    const res2 = await ipfs.add(artifact.source)
    console.log(`source:   ${res2.path}`)
  }

  console.log()
  console.log('Finished.')
  console.log()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err)
    process.exit(1)
  })
