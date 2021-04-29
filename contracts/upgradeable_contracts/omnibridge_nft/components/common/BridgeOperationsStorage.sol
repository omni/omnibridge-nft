pragma solidity 0.7.5;

import "../../../../upgradeability/EternalStorage.sol";

/**
 * @title BridgeOperationsStorage
 * @dev Functionality for storing processed bridged operations.
 */
abstract contract BridgeOperationsStorage is EternalStorage {
    function setMessageChecksum(bytes32 _messageId, bytes32 _hash) internal {
        uintStorage[keccak256(abi.encodePacked("messageChecksum", _messageId))] = uint256(_hash);
    }

    function getMessageChecksum(bytes32 _messageId) internal view returns (bytes32) {
        return bytes32(uintStorage[keccak256(abi.encodePacked("messageChecksum", _messageId))]);
    }

    /**
     * @dev Calculates message checksum, used for verifying correctness of the given parameters when fixing message.
     */
    function _messageChecksum(
        address _token,
        address _sender,
        uint256[] memory _tokenIds,
        uint256[] memory _values
    ) internal pure returns (bytes32) {
        bytes32 hash1 = keccak256(abi.encodePacked(_tokenIds));
        bytes32 hash2 = keccak256(abi.encodePacked(_values));
        return keccak256(abi.encodePacked(_token, _sender, hash1, hash2));
    }
}
