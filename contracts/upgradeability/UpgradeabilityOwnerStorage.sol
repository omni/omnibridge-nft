pragma solidity 0.7.5;

/**
 * @title UpgradeabilityOwnerStorage
 * @dev This contract keeps track of the upgradeability owner
 */
contract UpgradeabilityOwnerStorage {
    /**
     * @dev Tells the address of the owner
     * @return owner the address of the owner
     */
    function upgradeabilityOwner() public view returns (address owner) {
        assembly {
            // EIP 1967
            // bytes32(uint256(keccak256('eip1967.proxy.admin')) - 1)
            owner := sload(0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103)
        }
    }

    /**
     * @dev Sets the address of the owner
     */
    function setUpgradeabilityOwner(address newUpgradeabilityOwner) internal {
        assembly {
            // EIP 1967
            // bytes32(uint256(keccak256('eip1967.proxy.admin')) - 1)
            sstore(0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103, newUpgradeabilityOwner)
        }
    }
}
