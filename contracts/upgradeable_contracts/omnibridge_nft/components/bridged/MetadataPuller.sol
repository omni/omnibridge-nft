pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC721/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155MetadataURI.sol";
import "../../../../interfaces/IBurnableMintableERC721Token.sol";
import "../../../../interfaces/ITokenMetadata.sol";
import "../../../BasicAMBMediator.sol";
import "./BridgedTokensRegistry.sol";

/**
 * @title MetadataPuller
 * @dev Functionality for pull updates of the tokens metadata from the native tokens on the foreign side.
 * Uses async AMB calls functionality for transferring data.
 */
abstract contract MetadataPuller is BasicAMBMediator, BridgedTokensRegistry {
    /**
     * @dev Makes an async information request for an updated token owner field from the other side native token.
     * @param _token address of the bridged token contract, for which to pull the updated owner.
     */
    function pullTokenOwnerUpdate(address _token) external {
        _pullUpdate(_token, abi.encodeWithSelector(ITokenMetadata.owner.selector), 0);
    }

    /**
     * @dev Makes an async information request for an updated token URI field from the other side native token.
     * @param _token address of the bridged token contract, for which to pull the updated URI.
     * @param _id token id of the token.
     * @param _isERC1155 true, if pulling using uri() field, will use tokenURI() otherwise.
     */
    function pullTokenURIUpdate(
        address _token,
        uint256 _id,
        bool _isERC1155
    ) external {
        bytes4 selector = _isERC1155 ? IERC1155MetadataURI.uri.selector : IERC721Metadata.tokenURI.selector;
        _pullUpdate(_token, abi.encodeWithSelector(selector, _id), _id);
    }

    /**
     * @dev Makes an async eth_call request on the other side native token.
     * @param _token address of the bridged token contract, for which to make a request.
     * @param _data encoded calldata.
     * @param _id tokenId to record inside a request context.
     */
    function _pullUpdate(
        address _token,
        bytes memory _data,
        uint256 _id
    ) internal {
        address nativeToken = nativeTokenAddress(_token);
        require(nativeToken != address(0));

        bytes32 requestSelector = keccak256("eth_call(address,bytes)");
        bytes32 messageId = bridgeContract().requireToGetInformation(requestSelector, abi.encode(nativeToken, _data));

        _setMetadataRequestParameters(messageId, _token, _id);
    }

    /**
     * @dev Information receiving callback.
     * @param _messageId id of the message.
     * @param _status request completion status.
     * @param _data received request data.
     */
    function onInformationReceived(
        bytes32 _messageId,
        bool _status,
        bytes calldata _data
    ) external {
        require(msg.sender == address(bridgeContract()));
        require(messageId() == bytes32(0));

        require(_status);
        bytes memory data = abi.decode(_data, (bytes));

        (address token, uint256 id) = _getMetadataRequestParameters(_messageId);

        if (id == 0 && data.length == 32) {
            ITokenMetadata(token).setOwner(abi.decode(data, (address)));
        } else if (data.length > 64) {
            ITokenMetadata(token).setTokenURI(id, abi.decode(data, (string)));
        } else {
            revert();
        }
    }

    /**
     * @dev Internal function for setting request context.
     * @param _messageId id of the sent message.
     * @param _token request token address.
     * @param _id request token id.
     */
    function _setMetadataRequestParameters(
        bytes32 _messageId,
        address _token,
        uint256 _id
    ) private {
        bytes32 key = keccak256(abi.encodePacked("uriRequest", _messageId));
        addressStorage[key] = _token;
        uintStorage[key] = _id;
    }

    /**
     * @dev Internal function for restoring request context.
     * @param _messageId id of the sent message.
     */
    function _getMetadataRequestParameters(bytes32 _messageId) private returns (address, uint256) {
        bytes32 key = keccak256(abi.encodePacked("uriRequest", _messageId));
        (address token, uint256 id) = (addressStorage[key], uintStorage[key]);
        delete addressStorage[key];
        delete uintStorage[key];
        return (token, id);
    }
}
