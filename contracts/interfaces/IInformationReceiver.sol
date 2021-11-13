pragma solidity 0.7.5;

interface IInformationReceiver {
    function onInformationReceived(
        bytes32 _messageId,
        bool _status,
        bytes calldata _data
    ) external;
}
