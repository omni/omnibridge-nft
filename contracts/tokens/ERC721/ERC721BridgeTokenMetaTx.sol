pragma solidity 0.7.5;

import "../../gsn/BaseRelayRecipient.sol";
import "./ERC721BridgeToken.sol";
import "../BaseMetaTransactions.sol";

/**
 * @title ERC721BridgeTokenMetaTx
 * @dev template token contract for bridged ERC721 tokens with support of meta transactions through GSN and native meta-methods.
 */
contract ERC721BridgeTokenMetaTx is BaseRelayRecipient, ERC721BridgeToken, BaseMetaTransactions {
    // keccak256('metaSafeTransferFrom(address from,address to,uint256 tokenId,bytes data,uint256 nonce)');
    bytes32 internal constant META_TX_TYPEHASH = 0x0b130153be95a6b437663158a4f1a4edd8fccd076205b1dcd5215185a8a9beb6;

    // keccak256('metaSetApprovalForAll(address holder,address operator,bool approved,uint256 nonce)');
    bytes32 internal constant META_APPROVAL_TYPEHASH =
        0xa33deb374742ec905f38e4b6d18cc9e8fb13bc3b2348037e38d217c7fb6bcb5b;

    constructor() BaseMetaTransactions("MetaTxERC721", "1") {}

    /**
     * @dev Updates address of the used GSN trusted forwarder.
     * Should be called by the owner or bridge contract, once new GSN deployment is available.
     * @param _forwarder address of the new trusted forwarder contract.
     */
    function setTrustedForwarder(address _forwarder) external onlyOwner {
        _setTrustedForwarder(_forwarder);
    }

    /**
     * @dev Meta version of safeTransferFrom method.
     * @param _from tokens sender.
     * @param _to tokens receiver.
     * @param _tokenId transferred token id.
     * @param _data extra data passed to the receiver callback.
     * @param _nonce meta-transaction nonce, should be within 100 range of the current nonce saved for message signer.
     * @param _signature encoded signature for EIP712 message, 66 bytes, (r, s, v, sig_type).
     * Recovered address should be equal to _from.
     */
    function metaSafeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId,
        bytes memory _data,
        uint256 _nonce,
        bytes memory _signature
    ) public {
        _signatureValidation(
            _from,
            abi.encode(META_TX_TYPEHASH, _from, _to, _tokenId, keccak256(_data), _nonce),
            _signature
        );

        _verifyNonce(_from, _nonce);

        _safeTransfer(_from, _to, _tokenId, _data);
    }

    /**
     * @dev Meta version of setApprovalForAll method.
     * @param _holder tokens holder address.
     * @param _operator tokens approved operator address.
     * @param _approved true, if approving operator to transfer any of holder's tokens. false to redeem approval.
     * @param _nonce meta-transaction nonce, should be within 100 range of the current nonce saved for message signer.
     * @param _signature encoded signature for EIP712 message, 66 bytes, (r, s, v, sig_type).
     * Recovered address should be equal to _holder.
     */
    function metaSetApprovalForAll(
        address _holder,
        address _operator,
        bool _approved,
        uint256 _nonce,
        bytes memory _signature
    ) public {
        _signatureValidation(
            _holder,
            abi.encode(META_APPROVAL_TYPEHASH, _holder, _operator, _approved, _nonce),
            _signature
        );

        _verifyNonce(_holder, _nonce);

        _setApprovalForAll(_holder, _operator, _approved);
    }

    function _msgSender() internal view override(Context, BaseRelayRecipient) returns (address payable) {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData() internal view override(Context, BaseRelayRecipient) returns (bytes memory) {
        return BaseRelayRecipient._msgData();
    }
}
