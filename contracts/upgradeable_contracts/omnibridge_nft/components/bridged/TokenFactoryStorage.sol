pragma solidity 0.7.5;

import "@openzeppelin/contracts/utils/Address.sol";
import "../../../Ownable.sol";

/**
 * @title TokenFactoryStorage
 * @dev Storage functionality for working with ERC721/ERC1155 factory contract.
 */
contract TokenFactoryStorage is Ownable {
    bytes32 internal constant ERC721_TOKEN_FACTORY_CONTRACT =
        0x269c5905f777ee6391c7a361d17039a7d62f52ba9fffeb98c5ade342705731a3; // keccak256(abi.encodePacked("tokenFactoryContract"))

    /**
     * @dev Updates address of the used ERC721 token factory.
     * Only owner can call this method.
     * @param _factory address of the new token factory.
     */
    function setTokenFactoryERC721(address _factory) external onlyOwner {
        _setTokenFactoryERC721(_factory);
    }

    /**
     * @dev Tells the address of the used ERC721 token factory.
     * @return address of the used token factory.
     */
    function tokenFactoryERC721() public view returns (address) {
        return addressStorage[ERC721_TOKEN_FACTORY_CONTRACT];
    }

    /**
     * @dev Internal function for updating address of the used ERC721 token factory.
     * @param _factory address of the new token factory.
     */
    function _setTokenFactoryERC721(address _factory) internal {
        require(Address.isContract(_factory));
        addressStorage[ERC721_TOKEN_FACTORY_CONTRACT] = _factory;
    }
}
