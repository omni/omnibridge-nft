pragma solidity 0.7.5;

interface IERC721TokenFactory {
    function deployERC721BridgeContract(
        string memory _name,
        string memory _symbol,
        uint256 _id
    ) external returns (address);
}