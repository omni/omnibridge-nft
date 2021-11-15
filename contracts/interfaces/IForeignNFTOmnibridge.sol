pragma solidity 0.7.5;

interface IForeignNFTOmnibridge {
    function updateBridgedTokenMetadata(address _token, bytes calldata _data) external;
}
