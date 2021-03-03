pragma solidity 0.7.5;

import "../interfaces/INFTReceiver.sol";

contract TokenReceiver is INFTReceiver {
    address public token;
    address public from;
    uint256 public tokenId;
    bytes public data;

    function onTokenBridged(
        address _token,
        uint256 _tokenId,
        bytes memory _data
    ) external override {
        token = _token;
        from = msg.sender;
        tokenId = _tokenId;
        data = _data;
    }
}
