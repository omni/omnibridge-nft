pragma solidity 0.7.5;

import "@openzeppelin/contracts/utils/Address.sol";

import "../bridged/ERC721TokenProxy.sol";
import "../../../../tokens/ERC721BridgeToken.sol";
import "../../../Initializable.sol";
import "../../../Upgradeable.sol";
import "../../../Ownable.sol";

contract ERC721TokenFactory is Initializable, Upgradeable, Ownable {
  event ERC721NativeContractCreated(address indexed _collection);
  event ERC721BridgeContractCreated(address indexed _collection);

  bytes32 internal constant ERC721_TOKEN_BRIDGE_IMAGE_CONTRACT =
    0x6aad256926877203e89d1aabd3c123bafa04b2c16f96dbd769d5c99fe3c51eb1; // keccak256(abi.encodePacked("tokenBridgeImageContract"))
  bytes32 internal constant ERC721_TOKEN_NATIVE_IMAGE_CONTRACT =
    0x02d5fe70e145b5080c327371a50b630311beed4bc3e8d113faae24c37a9a0eb5; // keccak256(abi.encodePacked("tokenNativeImageContract"))
  bytes32 internal constant BRIDGE_CONTRACT =
    0x811bbb11e8899da471f0e69a3ed55090fc90215227fc5fb1cb0d6e962ea7b74f; // keccak256(abi.encodePacked("bridgeContract"))
  bytes32 internal constant OPPOSITE_BRIDGE_CONTRACT =
    0x0d08697256e2e2b685af08a799cc64c20780e39b71d57bd5b0b4bd226518f510; // keccak256(abi.encodePacked("oppositeBridgeContract"))
  bytes32 internal constant ID_COUNTER =
    0xbe093699e7df0bed5814a55556d286cd5307e86409f33918b4e10a236fcdae16; // keccak256(abi.encodePacked("idCounter"))

  modifier onlyBridge() {
    require(msg.sender == addressStorage[BRIDGE_CONTRACT]);
    _;
  } 
  
  function initialize(
      address erc721BridgeImage_,
      address erc721NativeImage_,
      address bridge_,
      address oppositeBridge_,
      address _owner
  ) external onlyRelevantSender returns (bool) {
      require(!isInitialized());

      _setERC721BridgeImage(erc721BridgeImage_);
      _setERC721NativeImage(erc721NativeImage_);
      _setBridge(bridge_);
      _setOppositeBridge(oppositeBridge_);
      _setOwner(_owner);
      
      setInitialize();

      return isInitialized();
  }
  

  function erc721BridgeImage() public view returns (address) {
    return addressStorage[ERC721_TOKEN_BRIDGE_IMAGE_CONTRACT];
  }

  function setERC721BridgeImage(address erc721BridgeImage_) public onlyOwner {
    _setERC721BridgeImage(erc721BridgeImage_);
  }

  function erc721NativeImage() public view returns (address) {
    return addressStorage[ERC721_TOKEN_NATIVE_IMAGE_CONTRACT];
  }

  function setERC721NativeImage(address erc721NativeImage_) public onlyOwner {
    _setERC721NativeImage(erc721NativeImage_);
  }

  function bridge() public view returns (address) {
    return addressStorage[BRIDGE_CONTRACT];
  }

  function setBridge(address bridge_) public onlyOwner {
    _setBridge(bridge_);
  }

  function oppositeBridge() public view returns (address) {
    return addressStorage[OPPOSITE_BRIDGE_CONTRACT];
  }

  function setOppositeBridge(address oppositeBridge_) public onlyOwner {
    _setOppositeBridge(oppositeBridge_);
  }

  function nativeTokenOf(uint256 id_) public view returns (address) {
    return addressStorage[keccak256(abi.encodePacked("nativeTokens", id_))];
  }

  function deployERC721BridgeContract(
    string memory _name,
    string memory _symbol,
    uint256 _collectionId,
    address owner_
  ) external onlyBridge returns(address) {
    require(addressStorage[ERC721_TOKEN_BRIDGE_IMAGE_CONTRACT] != address(0));

    bytes32 _salt = keccak256(abi.encodePacked(_collectionId));
    address collection = address(new ERC721TokenProxy{salt: _salt}(
      addressStorage[ERC721_TOKEN_BRIDGE_IMAGE_CONTRACT],
      _name,
      _symbol,
      addressStorage[BRIDGE_CONTRACT],
      address(this),
      _collectionId,
      owner_
    ));

    emit ERC721BridgeContractCreated(collection);
    return collection;
  }

  function deployERC721NativeContract(
    string memory _name,
    string memory _symbol
  ) external returns(address) {
    require(addressStorage[ERC721_TOKEN_NATIVE_IMAGE_CONTRACT] != address(0));

    uint256 _collectionId = uintStorage[ID_COUNTER];
    uintStorage[ID_COUNTER] += 1;

    bytes32 _salt = keccak256(abi.encodePacked(_collectionId));
    address collection = address(new ERC721TokenProxy{salt: _salt}(
      addressStorage[ERC721_TOKEN_NATIVE_IMAGE_CONTRACT],
      _name,
      _symbol,
      addressStorage[OPPOSITE_BRIDGE_CONTRACT],
      address(this),
      _collectionId,
      msg.sender
    ));

    addressStorage[keccak256(abi.encodePacked("nativeTokens", _collectionId))] = collection;
    emit ERC721NativeContractCreated(collection);
    return collection;
  }

  function _setERC721BridgeImage(address erc721BridgeImage_) internal {
    require(Address.isContract(erc721BridgeImage_));
    addressStorage[ERC721_TOKEN_BRIDGE_IMAGE_CONTRACT] = erc721BridgeImage_;
  }

  function _setERC721NativeImage(address erc721NativeImage_) internal {
    require(Address.isContract(erc721NativeImage_));
    addressStorage[ERC721_TOKEN_NATIVE_IMAGE_CONTRACT] = erc721NativeImage_;
  }

  function _setBridge(address bridge_) internal {
    require(Address.isContract(bridge_));
    addressStorage[BRIDGE_CONTRACT] = bridge_;
  }

  function _setOppositeBridge(address oppositeBridge_) internal {
    addressStorage[OPPOSITE_BRIDGE_CONTRACT] = oppositeBridge_;
  }
}