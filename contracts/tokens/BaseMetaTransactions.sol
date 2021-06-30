pragma solidity 0.7.5;

import "@openzeppelin/contracts/cryptography/ECDSA.sol";

/**
 * @title BaseMetaTransactions
 * @dev Common functionality for supporting native meta-transactions in the token contracts
 */
contract BaseMetaTransactions {
    // it is important to keep this storage slot after all slots in ERC721BridgeToken/ERC1155BridgeToken
    mapping(address => uint256) public nonces;

    event NonceChange(address indexed signer, uint256 newNonce);

    // Allowed signature types (only 0x01, 0x02 are valid)
    enum SignatureType { Illegal, EIP712, EthSign, NSignatureTypes }

    // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
    bytes32 private constant DOMAIN_TYPEHASH = 0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f;
    bytes32 private immutable HASHED_NAME;
    bytes32 private immutable HASHED_VERSION;

    constructor(string memory _name, string memory _version) {
        HASHED_NAME = keccak256(bytes(_name));
        HASHED_VERSION = keccak256(bytes(_version));
    }

    /**
     * @dev Verifies signatures for this contract.
     * @param _signer Address of signer.
     * @param _encMembers Encoded EIP-712 type members.
     * @param _signature Encoded signature parameters (vrs) and its type (66 bytes).
     */
    function _signatureValidation(
        address _signer,
        bytes memory _encMembers,
        bytes memory _signature
    ) internal {
        bytes32 hash = _hashEIP712Message(keccak256(_encMembers));

        require(_isValidSignature(_signer, hash, _signature), "INVALID_SIGNATURE");
    }

    /**
     * @dev Verifies that a hash has been signed by the given signer.
     * @param _signerAddress Address that should have signed the given hash.
     * @param _hash Hash of the EIP-712 encoded data
     * @param _sig Proof that the hash has been signed by signer.
     * Encoded in the form of (bytes32 r, bytes32 s, uint8 v, SignatureType sigType).
     * @return True if the address recovered from the provided signature matches the input signer address.
     */
    function _isValidSignature(
        address _signerAddress,
        bytes32 _hash,
        bytes memory _sig
    ) public view returns (bool) {
        require(_sig.length == 66, "LENGTH_66_REQUIRED");
        require(_signerAddress != address(0x0), "INVALID_SIGNER");

        // Pop last byte off of signature byte array.
        uint8 signatureTypeRaw = uint8(_sig[65]);
        assembly {
            mstore(_sig, 65)
        }

        // Ensure signature is supported
        require(signatureTypeRaw < uint8(SignatureType.NSignatureTypes), "UNSUPPORTED_SIGNATURE");

        // Extract signature type
        SignatureType signatureType = SignatureType(signatureTypeRaw);

        require(signatureType != SignatureType.Illegal, "ILLEGAL_SIGNATURE");

        if (signatureType == SignatureType.EIP712) {
            return _signerAddress == ECDSA.recover(_hash, _sig);
        } else if (signatureType == SignatureType.EthSign) {
            return _signerAddress == ECDSA.recover(ECDSA.toEthSignedMessageHash(_hash), _sig);
        } else {
            revert("UNSUPPORTED_SIGNATURE");
        }
    }

    /**
     * @dev Calculates EIP712 encoding for a hash struct in this EIP712 Domain.
     * @param _hashStruct The EIP712 hash struct.
     * @return EIP712 hash applied to this EIP712 Domain.
     */
    function _hashEIP712Message(bytes32 _hashStruct) internal returns (bytes32) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        bytes32 domainSeparator =
            keccak256(abi.encode(DOMAIN_TYPEHASH, HASHED_NAME, HASHED_VERSION, chainId, address(this)));

        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, _hashStruct));
    }

    /**
     * @dev Internal function for checking if the given nonce is valid. Update nonce after successful check.
     * A valid nonce is a nonce that is within 100 value from the current nonce.
     * @param _signer address of the meta-transaction signer.
     * @param _nonce nonce argument given in the signed meta-transaction message.
     */
    function _verifyNonce(address _signer, uint256 _nonce) internal {
        uint256 currentNonce = nonces[_signer];

        require(_nonce >= currentNonce && _nonce < currentNonce + 100, "INVALID_NONCE");

        nonces[_signer] = _nonce + 1;
        emit NonceChange(_signer, _nonce + 1);
    }
}
