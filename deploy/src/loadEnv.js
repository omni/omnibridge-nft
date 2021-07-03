const path = require('path')
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
})
const { isAddress, toBN } = require('web3').utils
const envalid = require('envalid')

const bigNumValidator = envalid.makeValidator((x) => toBN(x))
const validateAddress = (address) => {
  if (isAddress(address)) {
    return address
  }

  throw new Error(`Invalid address: ${address}`)
}
const validateOptionalAddress = (address) => (address && address !== '0x' ? validateAddress(address) : '')
const validateOptionalAddressOrFalse = (address) => (address === 'false' ? false : validateOptionalAddress(address))
const addressValidator = envalid.makeValidator(validateAddress)
const optionalAddressValidator = envalid.makeValidator(validateOptionalAddress)
const optionalAddressOrFalseValidator = envalid.makeValidator(validateOptionalAddressOrFalse)
const validateStringMaxLength = (maxLength) => (str) => {
  if (typeof str !== 'string') {
    throw new Error(`${str} is not a string`)
  }
  if (str.length > maxLength) {
    throw new Error(`${str} length is beyond the max limit of ${maxLength} characters`)
  }
  return str
}
const suffixValidator = envalid.makeValidator(validateStringMaxLength(32))

const { BRIDGE_MODE } = process.env

// Types validations

let validations = {
  DEPLOYMENT_ACCOUNT_PRIVATE_KEY: envalid.str(),
  DEPLOYMENT_GAS_LIMIT_EXTRA: envalid.num(),
  HOME_DEPLOYMENT_GAS_PRICE: bigNumValidator(),
  FOREIGN_DEPLOYMENT_GAS_PRICE: bigNumValidator(),
  HOME_RPC_URL: envalid.str(),
  HOME_BRIDGE_OWNER: addressValidator(),
  HOME_UPGRADEABLE_ADMIN: addressValidator(),
  FOREIGN_RPC_URL: envalid.str(),
  FOREIGN_BRIDGE_OWNER: addressValidator(),
  FOREIGN_UPGRADEABLE_ADMIN: addressValidator(),
}

switch (BRIDGE_MODE) {
  case 'OMNIBRIDGE_NFT':
    validations = {
      ...validations,
      HOME_AMB_BRIDGE: addressValidator(),
      FOREIGN_AMB_BRIDGE: addressValidator(),
      HOME_MEDIATOR_REQUEST_GAS_LIMIT: bigNumValidator(),
      FOREIGN_MEDIATOR_REQUEST_GAS_LIMIT: bigNumValidator(),
      HOME_ERC721_TOKEN_IMAGE: optionalAddressValidator(),
      HOME_ERC1155_TOKEN_IMAGE: optionalAddressValidator(),
      FOREIGN_ERC721_TOKEN_IMAGE: optionalAddressValidator(),
      FOREIGN_ERC1155_TOKEN_IMAGE: optionalAddressValidator(),
      HOME_FORWARDING_RULES_MANAGER_IMPLEMENTATION: optionalAddressOrFalseValidator(),
      HOME_GAS_LIMIT_MANAGER_IMPLEMENTATION: optionalAddressValidator(),
      HOME_TOKEN_NAME_SUFFIX: suffixValidator(),
      FOREIGN_TOKEN_NAME_SUFFIX: suffixValidator(),
    }
    break
  default:
    throw new Error(`Invalid BRIDGE_MODE=${BRIDGE_MODE}. Only OMNIBRIDGE_NFT is supported.`)
}

const env = envalid.cleanEnv(process.env, validations)

module.exports = env
