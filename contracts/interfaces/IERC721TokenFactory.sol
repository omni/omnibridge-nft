
pragma solidity 0.7.5;

interface IERC721TokenFactory {
    function deployCollection(
        string memory _name,
        string memory _symbol,
        address _bridgeContract
    ) external returns(address);
}