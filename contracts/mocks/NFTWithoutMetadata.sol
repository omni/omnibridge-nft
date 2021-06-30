pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "../interfaces/IERC1155TokenReceiver.sol";

contract NFTWithoutMetadata {
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        bytes memory _data
    ) external {
        IERC721Receiver to = IERC721Receiver(_to);
        require(to.onERC721Received(msg.sender, _from, _id, _data) == to.onERC721Received.selector);
    }

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _amount,
        bytes memory _data
    ) external {
        IERC1155TokenReceiver to = IERC1155TokenReceiver(_to);
        require(to.onERC1155Received(msg.sender, _from, _id, _amount, _data) == to.onERC1155Received.selector);
    }

    function balanceOf(address, uint256) external view returns (uint256) {
        return 1000;
    }

    function ownerOf(uint256) external view returns (address) {
        return msg.sender;
    }
}
