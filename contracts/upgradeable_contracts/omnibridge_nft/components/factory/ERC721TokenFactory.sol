pragma solidity 0.7.5;

import "../bridged/ERC721TokenProxy.sol";
import "../../../../tokens/ERC721BridgeToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC721TokenFactory is Ownable {

  event ERC721NativeContractCreated(address indexed _collection);
  event ERC721BridgeContractCreated(address indexed _collection);

  address private _erc721BridgeImage;
  address private _erc721NativeImage;
  address private _bridge;
  address private _oppositeBridge;

  modifier onlyBridge() {
    require(msg.sender == _bridge);
    _;
  } 
  constructor(
    address erc721BridgeImage_,
    address erc721NativeImage_
  ) {
    _erc721BridgeImage = erc721BridgeImage_;
    _erc721NativeImage = erc721NativeImage_;
  }

  function erc721BridgeImage() view public returns (address) {
    return _erc721BridgeImage;
  }

  function setERC721BridgeImage(address erc721BridgeImage_) public onlyOwner {
    _erc721BridgeImage = erc721BridgeImage_;
  }

  function erc721NativeImage() view public returns (address) {
    return _erc721NativeImage;
  }

  function setERC721NativeImage(address erc721NativeImage_) public onlyOwner {
    _erc721NativeImage = erc721NativeImage_;
  }

  function bridge() view public returns (address) {
    return _bridge;
  }

  function setBridge(address bridge_) public onlyOwner {
    _bridge = bridge_;
  }

  function oppositeBridge() view public returns (address) {
    return _oppositeBridge;
  }

  function setOppositeBridge(address oppositeBridge_) public onlyOwner {
    _oppositeBridge = oppositeBridge_;
  }


  function deployERC721BridgeContract(
    string memory _name,
    string memory _symbol
  ) external onlyBridge returns(address) {
    require(_erc721BridgeImage != address(0));

    bytes32 _salt = keccak256(abi.encodePacked(_name, _symbol));
    address collection = address(new ERC721TokenProxy{salt: _salt}(
      _erc721BridgeImage,
      _name,
      _symbol,
      _bridge,
      address(this)
    ));

    emit ERC721BridgeContractCreated(collection);
    return collection;
  }

  function deployERC721NativeContract(
    string memory _name,
    string memory _symbol
  ) external onlyOwner returns(address) {
    require(_erc721BridgeImage != address(0));
    bytes32 _salt = keccak256(abi.encodePacked(_name, _symbol));
    address collection = address(new ERC721TokenProxy{salt: _salt}(
      _erc721NativeImage,
      _name,
      _symbol,
      _oppositeBridge,
      address(this)
    ));

    emit ERC721NativeContractCreated(collection);
    return collection;
  }
}