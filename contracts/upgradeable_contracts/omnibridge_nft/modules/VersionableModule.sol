pragma solidity 0.7.5;

/**
 * @title VersionableModule
 * @dev Interface for Omnibridge module versioning.
 */
interface VersionableModule {
    function getModuleInterfacesVersion()
        external
        pure
        returns (
            uint64 major,
            uint64 minor,
            uint64 patch
        );
}
