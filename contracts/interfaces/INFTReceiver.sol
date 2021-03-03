pragma solidity 0.7.5;

interface INFTReceiver {
    function onTokenBridged(
        address token,
        uint256 tokenId,
        bytes calldata data
    ) external;
}
