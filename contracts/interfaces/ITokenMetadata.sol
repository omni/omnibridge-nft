pragma solidity 0.7.5;

interface ITokenMetadata {
    function owner() external view returns (address);

    function setOwner(address _owner) external;

    function setTokenURI(uint256 _tokenId, string calldata _tokenURI) external;
}
