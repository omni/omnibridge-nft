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

    function mint(address _to, uint256 _tokenId) external onlyOwner {
        _safeMint(_to, _tokenId);
    }

    function setTokenFactory(address factory_) external onlyOwner {
        require(_factory != address(0));
        _factory = factory_;
    }    
}