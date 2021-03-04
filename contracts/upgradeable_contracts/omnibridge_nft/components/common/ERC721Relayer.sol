pragma solidity 0.7.5;

import "../../../../interfaces/IBurnableMintableERC721Token.sol";
import "../../../../libraries/Bytes.sol";
import "../../../ReentrancyGuard.sol";
import "../../../BasicAMBMediator.sol";

/**
 * @title ERC721Relayer
 * @dev Functionality for bridging multiple tokens to the other side of the bridge.
 */
abstract contract ERC721Relayer is BasicAMBMediator, ReentrancyGuard {
    /**
     * @dev ERC721 transfer callback function.
     * @param _from address of token sender.
     * @param _tokenId id of the transferred token.
     * @param _data additional transfer data, can be used for passing alternative receiver address.
     */
    function onERC721Received(
        address,
        address _from,
        uint256 _tokenId,
        bytes calldata _data
    ) external returns (bytes4) {
        if (!lock()) {
            bytes memory data = new bytes(0);
            address receiver = _from;
            if (_data.length >= 20) {
                assembly {
                    receiver := calldataload(152)
                }
                if (_data.length > 20) {
                    assembly {
                        data := mload(0x40)
                        let size := sub(calldataload(132), 20)
                        mstore(data, size)
                        calldatacopy(add(data, 32), 184, size)
                        mstore(0x40, add(add(data, 32), size))
                    }
                }
            }
            bridgeSpecificActionsOnTokenTransfer(msg.sender, _from, receiver, _tokenId, data);
        }
        return msg.sig;
    }

    /**
     * @dev Initiate the bridge operation for some token from msg.sender.
     * The user should first call Approve method of the ERC721 token.
     * @param token bridged token contract address.
     * @param _receiver address that will receive the token on the other network.
     * @param _tokenId id of the token to be transferred to the other network.
     */
    function relayToken(
        IERC721 token,
        address _receiver,
        uint256 _tokenId
    ) external {
        _relayToken(token, _receiver, _tokenId, new bytes(0));
    }

    /**
     * @dev Initiate the bridge operation for some token from msg.sender to msg.sender on the other side.
     * The user should first call Approve method of the ERC721 token.
     * @param token bridged token contract address.
     * @param _tokenId id of token to be transferred to the other network.
     */
    function relayToken(IERC721 token, uint256 _tokenId) external {
        _relayToken(token, msg.sender, _tokenId, new bytes(0));
    }

    /**
     * @dev Initiate the bridge operation for some amount of tokens from msg.sender.
     * The user should first call Approve method of the ERC721 token.
     * @param token bridged token contract address.
     * @param _receiver address that will receive the native tokens on the other network.
     * @param _tokenId id of token to be transferred to the other network.
     * @param _data additional transfer data to be used on the other side.
     */
    function relayTokenAndCall(
        IERC721 token,
        address _receiver,
        uint256 _tokenId,
        bytes memory _data
    ) external {
        _relayToken(token, _receiver, _tokenId, _data);
    }

    /**
     * @dev Validates that the token amount is inside the limits, calls transferFrom to transfer the token to the contract
     * and invokes the method to burn/lock the token and unlock/mint the token on the other network.
     * The user should first call Approve method of the ERC721 token.
     * @param _token bridge token contract address.
     * @param _receiver address that will receive the token on the other network.
     * @param _tokenId id of the token to be transferred to the other network.
     * @param _data additional transfer data to be used on the other side.
     */
    function _relayToken(
        IERC721 _token,
        address _receiver,
        uint256 _tokenId,
        bytes memory _data
    ) internal {
        // This lock is to prevent calling bridgeSpecificActionsOnTokenTransfer twice.
        // When transferFrom is called, after the transfer, the ERC721 token might call onERC721Received from this contract
        // which will call bridgeSpecificActionsOnTokenTransfer.
        require(!lock());

        setLock(true);
        _token.transferFrom(msg.sender, address(this), _tokenId);
        setLock(false);
        bridgeSpecificActionsOnTokenTransfer(address(_token), msg.sender, _receiver, _tokenId, _data);
    }

    /**
     * @dev Helper function for alternative receiver feature. Chooses the actual receiver out of sender and passed data.
     * @param _from address of the token sender.
     * @param _data passed data in the transfer message.
     * @return recipient address of the receiver on the other side.
     */
    function chooseReceiver(address _from, bytes memory _data) internal pure returns (address recipient) {
        recipient = _from;
        if (_data.length > 0) {
            require(_data.length == 20);
            recipient = Bytes.bytesToAddress(_data);
        }
    }

    function bridgeSpecificActionsOnTokenTransfer(
        address _token,
        address _from,
        address _receiver,
        uint256 _tokenId,
        bytes memory _data
    ) internal virtual;
}
