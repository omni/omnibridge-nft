pragma solidity 0.7.5;

import "./modules/forwarding_rules/NFTForwardingRulesConnector.sol";
import "./modules/gas_limit/SelectorTokenGasLimitConnector.sol";

/**
 * @title HomeNFTOmnibridge
 * @dev Home side implementation for multi-token ERC721 mediator intended to work on top of AMB bridge.
 * It is designed to be used as an implementation contract of EternalStorageProxy contract.
 */
contract HomeNFTOmnibridge is NFTForwardingRulesConnector, SelectorTokenGasLimitConnector {
    /**
     * @dev Stores the initial parameters of the mediator.
     * @param _bridgeContract the address of the AMB bridge contract.
     * @param _mediatorContract the address of the mediator contract on the other network.
     * @param _gasLimitManager the gas limit manager contract address.
     * @param _owner address of the owner of the mediator contract.
     * @param _image address of the ERC721 token image.
     * @param _forwardingRulesManager address of the NFTForwardingRulesManager contract that will be used for managing lane permissions.
     */
    function initialize(
        address _bridgeContract,
        address _mediatorContract,
        address _gasLimitManager,
        address _owner,
        address _image,
        address _forwardingRulesManager
    ) external onlyRelevantSender returns (bool) {
        require(!isInitialized());

        _setBridgeContract(_bridgeContract);
        _setMediatorContractOnOtherSide(_mediatorContract);
        _setGasLimitManager(_gasLimitManager);
        _setOwner(_owner);
        _setTokenImage(_image);
        _setForwardingRulesManager(_forwardingRulesManager);

        setInitialize();

        return isInitialized();
    }

    /**
     * @dev Internal function for sending an AMB message to the mediator on the other side.
     * @param _data data to be sent to the other side of the bridge.
     * @param _useOracleLane true, if the message should be sent to the oracle driven lane.
     * @return id of the sent message.
     */
    function _passMessage(bytes memory _data, bool _useOracleLane) internal override returns (bytes32) {
        address executor = mediatorContractOnOtherSide();
        uint256 gasLimit = _chooseRequestGasLimit(_data);
        IAMB bridge = bridgeContract();

        return
            _useOracleLane
                ? bridge.requireToPassMessage(executor, _data, gasLimit)
                : bridge.requireToConfirmMessage(executor, _data, gasLimit);
    }

    /**
     * @dev Internal function for transforming the bridged token name. Appends a side-specific suffix.
     * @param _name bridged token from the other side.
     * @return token name for this side of the bridge.
     */
    function _transformName(string memory _name) internal pure override returns (string memory) {
        return string(abi.encodePacked(_name, " on xDai"));
    }
}
