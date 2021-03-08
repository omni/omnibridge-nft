pragma solidity 0.7.5;

import "@openzeppelin/contracts/utils/Address.sol";
import "./VersionableModule.sol";
import "../../../interfaces/IOwnable.sol";

/**
 * @title OmnibridgeModule
 * @dev Common functionality for Omnibridge extension non-upgradeable module.
 */
abstract contract OmnibridgeModule is VersionableModule {
    IOwnable public mediator;

    /**
     * @dev Initializes this contract.
     * @param _mediator address of the Omnibridge mediator contract that is allowed to perform additional actions on the particular module.
     */
    constructor(IOwnable _mediator) {
        mediator = _mediator;
    }

    /**
     * @dev Throws if sender is not the owner of this contract.
     */
    modifier onlyOwner {
        require(msg.sender == mediator.owner());
        _;
    }
}
