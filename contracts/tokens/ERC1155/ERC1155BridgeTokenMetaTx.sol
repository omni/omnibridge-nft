pragma solidity 0.7.5;

import "../../gsn/BaseRelayRecipient.sol";
import "./ERC1155BridgeToken.sol";
import "../BaseMetaTransactions.sol";

/**
 * @title ERC1155BridgeTokenMetaTx
 * @dev template token contract for bridged ERC1155 tokens with support of meta transactions through GSN and native meta-methods.
 */
contract ERC1155BridgeTokenMetaTx is BaseRelayRecipient, ERC1155BridgeToken, BaseMetaTransactions {
    // keccak256('metaSafeTransferFrom(address from,address to,uint256 id,uint256 amount,bytes data,uint256 nonce)');
    bytes32 internal constant META_TX_TYPEHASH = 0x07a3060ea79bfad6630a7d3e7642e65c31b9bb29cd297fa712356e9f39f2e8a2;

    // keccak256('metaSafeBatchTransferFrom(address from,address to,uint256[] ids,uint256[] amounts,bytes data,uint256 nonce)');
    bytes32 internal constant META_BATCH_TX_TYPEHASH =
        0x9698573953afe81d8bade34f5bfaae1e6da34634da86414bfbb7376f578bff0a;

    // keccak256('metaSetApprovalForAll(address holder,address operator,bool approved,uint256 nonce)');
    bytes32 internal constant META_APPROVAL_TYPEHASH =
        0xa33deb374742ec905f38e4b6d18cc9e8fb13bc3b2348037e38d217c7fb6bcb5b;

    constructor() BaseMetaTransactions("MetaTxERC1155", "1") {}

    /**
     * @dev Updates address of the used GSN trusted forwarder.
     * Should be called by the owner or bridge contract, once new GSN deployment is available.
     * Setting to zero-address will disable support for any GSN meta-transactions.
     * @param _forwarder address of the new trusted forwarder contract.
     */
    function setTrustedForwarder(address _forwarder) external onlyOwner {
        _setTrustedForwarder(_forwarder);
    }

    /**
     * @dev Meta version of safeTransferFrom method.
     * @param _from tokens sender.
     * @param _to tokens receiver.
     * @param _id transferred token id.
     * @param _amount transferred tokens amount.
     * @param _data extra data passed to the receiver callback.
     * @param _nonce meta-transaction nonce, should be within 100 range of the current nonce saved for message signer.
     * @param _signature encoded signature for EIP712 message, 66 bytes, (r, s, v, sig_type).
     * Recovered address should be equal to _from.
     */
    function metaSafeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _amount,
        bytes memory _data,
        uint256 _nonce,
        bytes memory _signature
    ) public {
        _signatureValidation(
            _from,
            abi.encode(META_TX_TYPEHASH, _from, _to, _id, _amount, keccak256(_data), _nonce),
            _signature
        );

        _verifyNonce(_from, _nonce);

        _safeTransferFrom(_msgSender(), _from, _to, _id, _amount, _data);
    }

    /**
     * @dev Meta version of safeBatchTransferFrom method.
     * @param _from tokens sender.
     * @param _to tokens receiver.
     * @param _ids transferred tokens ids.
     * @param _amounts transferred tokens amounts.
     * @param _data extra data passed to the receiver callback.
     * @param _nonce meta-transaction nonce, should be within 100 range of the current nonce saved for message signer.
     * @param _signature encoded signature for EIP712 message, 66 bytes, (r, s, v, sig_type).
     * Recovered address should be equal to _from.
     */
    function metaSafeBatchTransferFrom(
        address _from,
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data,
        uint256 _nonce,
        bytes memory _signature
    ) public {
        _signatureValidation(
            _from,
            abi.encode(
                META_BATCH_TX_TYPEHASH,
                _from,
                _to,
                keccak256(abi.encodePacked(_ids)),
                keccak256(abi.encodePacked(_amounts)),
                keccak256(_data),
                _nonce
            ),
            _signature
        );

        _verifyNonce(_from, _nonce);

        _safeBatchTransferFrom(_msgSender(), _from, _to, _ids, _amounts, _data);
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
