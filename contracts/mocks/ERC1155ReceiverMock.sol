pragma solidity 0.7.5;

contract ERC1155ReceiverMock {
    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external returns (bytes4) {
        (_operator, _from, _id, _value, _data);
        return msg.sig;
    }

    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external returns (bytes4) {
        (_operator, _from, _ids, _values, _data);
        return msg.sig;
    }
}
