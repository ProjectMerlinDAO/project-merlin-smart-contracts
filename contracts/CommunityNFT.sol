// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CommunityNFT is ERC721, ERC721Enumerable, Pausable, AccessControl, ERC721Burnable {
    using Counters for Counters.Counter;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    Counters.Counter private _tokenIdCounter;
    
    uint256 public constant MINT_PRICE = 1000 * 10**18; // 1000 MRLN
    address public immutable mrlnToken;
    
    mapping(uint256 => uint256) public lastTransferTime;
    mapping(uint256 => uint256) public votingCycle;
    uint256 public currentVotingCycle;
    
    event VotingCycleStarted(uint256 cycleId, uint256 timestamp);
    event NFTLocked(uint256 tokenId, uint256 cycleId);

    constructor(address _mrlnToken) ERC721("Project Merlin Community", "PMC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        mrlnToken = _mrlnToken;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function startNewVotingCycle() external onlyRole(DEFAULT_ADMIN_ROLE) {
        currentVotingCycle++;
        emit VotingCycleStarted(currentVotingCycle, block.timestamp);
    }

    function safeMint(address to) public {
        require(IERC20(mrlnToken).transferFrom(msg.sender, address(this), MINT_PRICE), "Payment failed");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        
        lastTransferTime[tokenId] = block.timestamp;
        votingCycle[tokenId] = currentVotingCycle;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        if (from != address(0)) { // Skip during minting
            lastTransferTime[tokenId] = block.timestamp;
            votingCycle[tokenId] = currentVotingCycle;
        }
    }

    function isTokenLocked(uint256 tokenId) public view returns (bool) {
        return votingCycle[tokenId] == currentVotingCycle;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireMinted(tokenId);
        // Return base URI + token ID
        // In production, implement proper metadata handling
        return string(abi.encodePacked(super.tokenURI(tokenId)));
    }

    // Required overrides
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://api.projectmerlin.io/nft/metadata/";
    }
} 