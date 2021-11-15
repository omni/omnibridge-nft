pragma solidity 0.7.5;
// solhint-disable-next-line compiler-version
pragma abicoder v2;

import "./BasicNFTOmnibridge.sol";
import "./components/common/GasLimitManager.sol";
import "../../tokens/ERC1155BridgeToken.sol";

/**
 * @title ForeignNFTOmnibridge
 * @dev Foreign side implementation for multi-token ERC721 mediator intended to work on top of AMB bridge.
 * It is designed to be used as an implementation contract of EternalStorageProxy contract.
 */
contract ForeignNFTOmnibridge is BasicNFTOmnibridge, GasLimitManager {
    constructor(string memory _suffix) BasicNFTOmnibridge(_suffix) {}

    /**
     * @dev Stores the initial parameters of the mediator.
     * @param _bridgeContract the address of the AMB bridge contract.
     * @param _mediatorContract the address of the mediator contract on the other network.
     * @param _requestGasLimit the gas limit for the message execution.
     * @param _owner address of the owner of the mediator contract.
     * @param _imageERC721 address of the ERC721 token image.
     * @param _imageERC1155 address of the ERC1155 token image.
     */
    function initialize(
        address _bridgeContract,
        address _mediatorContract,
        uint256 _requestGasLimit,
        address _owner,
        address _imageERC721,
        address _imageERC1155
    ) external onlyRelevantSender {
        require(!isInitialized());

        _setBridgeContract(_bridgeContract);
        _setMediatorContractOnOtherSide(_mediatorContract);
        _setRequestGasLimit(_requestGasLimit);
        _setOwner(_owner);
        _setTokenImageERC721(_imageERC721);
        _setTokenImageERC1155(_imageERC1155);

        setInitialize();
    }

    /**
     * @dev Function for updating metadata on the bridged token from the other side.
     * Used for permission-less updates of owner() and token URIs.
     * @param _token address of the native token from the other side of the bridge.
     * @param _data calldata for executing on the token contract.
     */
    function updateBridgedTokenMetadata(address _token, bytes memory _data) external onlyMediator {
        require(_data.length >= 4);
        bytes4 selector;
        assembly {
            selector := shl(224, mload(add(_data, 4)))
        }
        // we are using this method only for calling setOwner/setTokenURI on the underlying token contract
        // this check is here to prevent unintentional calls of sensitive methods
        require(
            selector != IBurnableMintableERC721Token.mint.selector &&
                selector != IBurnableMintableERC721Token.burn.selector &&
                selector != IBurnableMintableERC1155Token.mint.selector &&
                selector != IBurnableMintableERC1155Token.burn.selector &&
                selector != ERC1155BridgeToken.setBridgeContract.selector
        );
        (bool status, ) = bridgedTokenAddress(_token).call(_data);
        require(status);
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
}
