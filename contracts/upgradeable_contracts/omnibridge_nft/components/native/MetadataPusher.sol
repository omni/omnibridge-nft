pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC721/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155MetadataURI.sol";
import "../../../../interfaces/IBurnableMintableERC721Token.sol";
import "../../../../interfaces/IForeignNFTOmnibridge.sol";
import "../../../../interfaces/ITokenMetadata.sol";
import "../../../BasicAMBMediator.sol";
import "./NativeTokensRegistry.sol";
import "./MetadataReader.sol";

/**
 * @title MetadataPusher
 * @dev Functionality for push updates of the tokens metadata from the native tokens on the home side.
 * Uses regular AMB requests for transferring data.
 */
abstract contract MetadataPusher is BasicAMBMediator, NativeTokensRegistry, MetadataReader {
    /**
     * @dev Send an AMB message with the token owner update to the other side.
     * @param _token address of the native token contract.
     */
    function pushTokenOwnerUpdate(address _token) external {
        address owner = Ownable(_token).owner();

        _pushUpdate(_token, abi.encodeWithSelector(ITokenMetadata.setOwner.selector, owner));
    }

    /**
     * @dev Send an AMB message with the token owner update to the other side.
     * @param _token address of the native token contract.
     * @param _id token id of the token.
     * @param _isERC1155 true, if reading using uri() field, will use tokenURI() otherwise.
     */
    function pushTokenURIUpdate(
        address _token,
        uint256 _id,
        bool _isERC1155
    ) external {
        string memory uri = _isERC1155 ? _readERC1155TokenURI(_token, _id) : _readERC721TokenURI(_token, _id);
        require(bytes(uri).length > 0);

        _pushUpdate(_token, abi.encodeWithSelector(ITokenMetadata.setTokenURI.selector, _id, uri));
    }

    /**
     * @dev Internal function for pushing native token metadata field update to the other side.
     * @param _token address of the native token contract.
     * @param _data encoded data parameter for the updateBridgedTokenMetadata method on the other side.
     */
    function _pushUpdate(address _token, bytes memory _data) internal {
        require(isRegisteredAsNativeToken(_token));

        bytes memory data =
            abi.encodeWithSelector(IForeignNFTOmnibridge.updateBridgedTokenMetadata.selector, _token, _data);
        _passMessage(data, false);
    }
}
