pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../interfaces/IOwnable.sol";

contract ERC721NativeToken is ERC721 {
    address private bridgeContract;
    address private _factory;
    uint256 private _id;

    constructor(
        string memory _name,
        string memory _symbol,
        address factory_,
        uint256 id_
    ) ERC721(_name, _symbol) {
        _factory = factory_;
        _id = id_;
    }

    function id() public view returns(uint256) {
        return _id;
    }

    modifier onlyFactory() {
        require(msg.sender == _factory);
        _;
    } 

    modifier onlyOwner() {
        require(msg.sender == IOwnable(_factory).owner());
        _;
    }

    function factory () public view returns (address) {
        return _factory;
    }

    function mint(address _to, uint256 _tokenId, string memory _uri) external onlyOwner {
        _safeMint(_to, _tokenId);
        _setTokenURI(_tokenId, _uri);
    }

    function setTokenFactory(address factory_) external onlyOwner {
        require(_factory != address(0));
        _factory = factory_;
    }

    /**
     * @dev Tells if this contract implements the interface defined by
     * `interfaceId`. See the corresponding EIP165.
     * @return true, if interface is implemented.
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC165) returns (bool) {
        bytes4 INTERFACE_ID_ERC165 = 0x01ffc9a7;
        bytes4 INTERFACE_ID_ERC721 = 0x80ac58cd;
        bytes4 INTERFACE_ID_ERC721_METADATA = 0x5b5e139f;
        bytes4 INTERFACE_ID_ERC721_ENUMERABLE = 0x780e9d63;
        return
            interfaceId == INTERFACE_ID_ERC165 ||
            interfaceId == INTERFACE_ID_ERC721 ||
            interfaceId == INTERFACE_ID_ERC721_METADATA ||
            interfaceId == INTERFACE_ID_ERC721_ENUMERABLE;
    }

    /**
     * @dev Stub for preventing unneeded storage writes.
     * All supported interfaces are hardcoded in the supportsInterface function.
     */
    function _registerInterface(bytes4) internal override {}
}