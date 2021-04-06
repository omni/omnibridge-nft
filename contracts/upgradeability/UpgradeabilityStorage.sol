pragma solidity 0.7.5;

/**
 * @title UpgradeabilityStorage
 * @dev This contract holds all the necessary state variables to support the upgrade functionality
 */
contract UpgradeabilityStorage {
    /**
     * @dev Tells the version name of the current implementation
     * @return version uint256 representing the name of the current version
     */
    function version() public view returns (uint256 version) {
        assembly {
            // EIP 1967
            // bytes32(uint256(keccak256('eip1967.proxy.version')) - 1)
            version := sload(0x460994c355dbc8229336897ed9def5884fb6b26b0a995b156780d056c758577d)
        }
    }

    /**
     * @dev Tells the address of the current implementation
     * @return impl address of the current implementation
     */
    function implementation() public view virtual returns (address impl) {
        assembly {
            // EIP 1967
            // bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
            impl := sload(0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc)
        }
    }

    /**
     * Internal function for updating version of the implementation contract.
     * @param _version new version number.
     */
    function _setVersion(uint256 _version) internal {
        assembly {
            // EIP 1967
            // bytes32(uint256(keccak256('eip1967.proxy.version')) - 1)
            sstore(0x460994c355dbc8229336897ed9def5884fb6b26b0a995b156780d056c758577d, _version)
        }
    }

    /**
     * Internal function for updating implementation contract address.
     * @param _impl new implementation contract address.
     */
    function _setImplementation(address _impl) internal {
        assembly {
            // EIP 1967
            // bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
            sstore(0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc, _impl)
        }
    }
}
