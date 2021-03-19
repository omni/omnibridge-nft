pragma solidity 0.7.5;

import "./BasicNFTOmnibridge.sol";
import "./components/common/GasLimitManager.sol";

/**
 * @title ForeignNFTOmnibridge
 * @dev Foreign side implementation for multi-token ERC721 mediator intended to work on top of AMB bridge.
 * It is designed to be used as an implementation contract of EternalStorageProxy contract.
 */
contract ForeignNFTOmnibridge is BasicNFTOmnibridge, GasLimitManager {
    /**
     * @dev Stores the initial parameters of the mediator.
     * @param _bridgeContract the address of the AMB bridge contract.
     * @param _mediatorContract the address of the mediator contract on the other network.
     * @param _requestGasLimit the gas limit for the message execution.
     * @param _owner address of the owner of the mediator contract.
     * @param _image address of the ERC721 token image.
     */
    function initialize(
        address _bridgeContract,
        address _mediatorContract,
        uint256 _requestGasLimit,
        address _owner,
        address _image
    ) external onlyRelevantSender returns (bool) {
        require(!isInitialized());

        _setBridgeContract(_bridgeContract);
        _setMediatorContractOnOtherSide(_mediatorContract);
        _setRequestGasLimit(_requestGasLimit);
        _setOwner(_owner);
        _setTokenImage(_image);

        setInitialize();

        return isInitialized();
    }

    /**
     * @dev Internal function for sending an AMB message to the mediator on the other side.
     * @param _data data to be sent to the other side of the bridge.
     * @param _useOracleLane always true, not used on this side of the bridge.
     * @return id of the sent message.
     */
    function _passMessage(bytes memory _data, bool _useOracleLane) internal override returns (bytes32) {
        (_useOracleLane);

        return bridgeContract().requireToPassMessage(mediatorContractOnOtherSide(), _data, requestGasLimit());
    }

    /**
     * @dev Internal function for transforming the bridged token name. Appends a side-specific suffix.
     * @param _name bridged token from the other side.
     * @return token name for this side of the bridge.
     */
    function _transformName(string memory _name) internal pure override returns (string memory) {
        return string(abi.encodePacked(_name, " on Mainnet"));
    }
}
