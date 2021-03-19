const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const toAddress = (contract) => (typeof contract === 'string' ? contract : contract.options.address)

function addPendingTxLogger(provider) {
  const send = provider.send.bind(provider)
  // eslint-disable-next-line no-param-reassign
  provider.send = function (payload, callback) {
    send(payload, (err, result) => {
      if (payload.method === 'eth_sendRawTransaction') {
        console.log(`pending tx: ${result.result}`)
      }
      callback(err, result)
    })
  }
  return provider
}

function signatureToVRS(rawSignature) {
  const signature = rawSignature.slice(2)
  const v = signature.slice(128)
  const r = signature.slice(0, 64)
  const s = signature.slice(64, 128)
  return { v, r, s }
}

function packSignatures(array) {
  const msgLength = array.length.toString(16).padStart(2, '0')
  const [v, r, s] = array.reduce(([vs, rs, ss], { v, r, s }) => [vs + v, rs + r, ss + s], ['', '', ''])
  return `0x${msgLength}${v}${r}${s}`
}

module.exports = {
  ZERO_ADDRESS,
  toAddress,
  addPendingTxLogger,
  signatureToVRS,
  packSignatures,
}
