pragma solidity 0.7.5;

import "../interfaces/IInformationReceiver.sol";

contract AMBMock {
    event MockedEvent(bytes32 indexed messageId, address executor, uint8 dataType, bytes data, uint256 gas);
    event MockedInformationRequest(bytes32 indexed messageId, bytes32 indexed selector, bytes data);

    address public messageSender;
    uint256 public immutable maxGasPerTx;
    bytes32 public transactionHash;
    bytes32 public messageId;
    uint256 public nonce;
    uint256 public messageSourceChainId;
    mapping(bytes32 => bool) public messageCallStatus;
    mapping(bytes32 => address) public failedMessageSender;
    mapping(bytes32 => address) public failedMessageReceiver;
    mapping(bytes32 => bytes32) public failedMessageDataHash;

    constructor() {
        maxGasPerTx = 1000000;
    }

    function executeMessageCall(
        address _contract,
        address _sender,
        bytes calldata _data,
        bytes32 _messageId,
        uint256 _gas
    ) external {
        messageSender = _sender;
        messageId = _messageId;
        transactionHash = _messageId;
        messageSourceChainId = 1337;
        (bool status, ) = _contract.call{ gas: _gas }(_data);
        messageSender = address(0);
        messageId = bytes32(0);
        transactionHash = bytes32(0);
        messageSourceChainId = 0;

        messageCallStatus[_messageId] = status;
        if (!status) {
            failedMessageDataHash[_messageId] = keccak256(_data);
            failedMessageReceiver[_messageId] = _contract;
            failedMessageSender[_messageId] = _sender;
        }
    }

    function executeInformationResponse(
        address _sender,
        bytes32 _messageId,
        bool _status,
        bytes calldata _data
    ) external {
        IInformationReceiver(_sender).onInformationReceived(_messageId, _status, _data);
    }

    function requireToPassMessage(
        address _contract,
        bytes calldata _data,
        uint256 _gas
    ) external returns (bytes32) {
        return _sendMessage(_contract, _data, _gas, 0x00);
    }

    function requireToConfirmMessage(
        address _contract,
        bytes calldata _data,
        uint256 _gas
    ) external returns (bytes32) {
        return _sendMessage(_contract, _data, _gas, 0x80);
    }

    function requireToGetInformation(bytes32 _requestSelector, bytes calldata _data) external returns (bytes32) {
        bytes32 _messageId = _newMessageId();
        emit MockedInformationRequest(_messageId, _requestSelector, _data);
        return _messageId;
    }

    function _sendMessage(
        address _contract,
        bytes calldata _data,
        uint256 _gas,
        uint256 _dataType
    ) internal returns (bytes32) {
        bytes32 _messageId = _newMessageId();
        emit MockedEvent(_messageId, _contract, uint8(_dataType), _data, _gas);
        return _messageId;
    }

    function _newMessageId() internal returns (bytes32) {
        require(messageId == bytes32(0));
        bytes32 bridgeId =
            keccak256(abi.encodePacked(uint16(1337), address(this))) &
                0x00000000ffffffffffffffffffffffffffffffffffffffff0000000000000000;

        return bytes32(uint256(0x11223344 << 224)) | bridgeId | bytes32(nonce++);
    }

    function sourceChainId() external pure returns (uint256) {
        return 1337;
    }
}
