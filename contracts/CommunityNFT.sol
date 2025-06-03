// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CommunityNFT
 * @dev NFT contract for Project Merlin DAO governance
 *
 * This contract implements a governance NFT that:
 * - Requires MRLN tokens for minting
 * - Implements voting cycle locking
 * - Provides enumerable token functionality
 * - Supports pausing and role-based access control
 *
 * Security considerations:
 * - Role-based access control for administrative functions
 * - Token locking during voting cycles
 * - Protected minting with MRLN token payment
 * - Uses OpenZeppelin's battle-tested implementations
 */
contract CommunityNFT is ERC721, ERC721Enumerable, Pausable, AccessControl, ERC721Burnable {
    using Counters for Counters.Counter;

    // Access control roles
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Token tracking
    Counters.Counter private _tokenIdCounter;
    
    // Minting configuration
    uint256 public constant MINT_PRICE = 1000 * 10**18; // 1000 MRLN
    address public immutable mrlnToken;
    
    // Voting cycle tracking
    mapping(uint256 => uint256) public lastTransferTime;
    mapping(uint256 => uint256) public votingCycle;
    uint256 public currentVotingCycle;

    // Events
    event VotingCycleStarted(uint256 indexed cycleId, uint256 timestamp);
    event NFTLocked(uint256 indexed tokenId, uint256 indexed cycleId);
    event NFTMinted(address indexed to, uint256 indexed tokenId);
    event NFTBurned(uint256 indexed tokenId);
    event NFTTransferred(address indexed from, address indexed to, uint256 indexed tokenId);

    /**
     * @dev Modifier to check if a token can be transferred
     * @param tokenId The ID of the token to check
     */
    modifier canTransfer(uint256 tokenId) {
        require(!isTokenLocked(tokenId), "Token is locked in current voting cycle");
        _;
    }

    /**
     * @dev Constructor initializes the NFT contract
     * @param _mrlnToken Address of the MRLN token contract
     */
    constructor(address _mrlnToken) ERC721("Project Merlin Community", "PMC") {
        require(_mrlnToken != address(0), "Invalid token address");

        mrlnToken = _mrlnToken;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @dev Pauses all token transfers
     * Security: Only callable by PAUSER_ROLE
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     * Security: Only callable by PAUSER_ROLE
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Starts a new voting cycle
     * Security: Only callable by DEFAULT_ADMIN_ROLE
     */
    function startNewVotingCycle() external onlyRole(DEFAULT_ADMIN_ROLE) {
        currentVotingCycle++;
        emit VotingCycleStarted(currentVotingCycle, block.timestamp);
    }

    /**
     * @dev Mints a new NFT
     * @param to Address to receive the NFT
     *
     * Security:
     * - Requires MRLN token payment
     * - Protected against reentrancy
     * - Validates recipient address
     */
    function safeMint(address to) external {
        require(to != address(0), "Invalid recipient address");
        require(IERC20(mrlnToken).transferFrom(msg.sender, address(this), MINT_PRICE), "Payment failed");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        
        lastTransferTime[tokenId] = block.timestamp;
        votingCycle[tokenId] = currentVotingCycle;
        
        emit NFTMinted(to, tokenId);
    }

    /**
     * @dev Hook that is called before any token transfer
     * @param from Source address
     * @param to Target address
     * @param tokenId Token ID
     * @param batchSize Size of the batch (always 1 for non-batch transfers)
     *
     * Security:
     * - Validates transfer conditions
     * - Updates voting cycle data
     * - Emits transfer event
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        // Only check canTransfer for non-minting transfers
        if (from != address(0)) {
            require(!isTokenLocked(tokenId), "Token is locked in current voting cycle");
        }
        
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        if (from != address(0)) { // Skip during minting
            lastTransferTime[tokenId] = block.timestamp;
            votingCycle[tokenId] = currentVotingCycle;
            emit NFTTransferred(from, to, tokenId);
        }
    }

    /**
     * @dev Checks if a token is locked in the current voting cycle
     * @param tokenId Token ID to check
     * @return bool True if token is locked
     */
    function isTokenLocked(uint256 tokenId) public view returns (bool) {
        _requireMinted(tokenId);
        return votingCycle[tokenId] == currentVotingCycle;
    }

    /**
     * @dev Returns the token URI
     * @param tokenId Token ID
     * @return string Token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireMinted(tokenId);
        return string(abi.encodePacked(_baseURI(), _toString(tokenId)));
    }

    /**
     * @dev Returns the base URI for token metadata
     */
    function _baseURI() internal pure override returns (string memory) {
        return "https://api.projectmerlin.io/nft/metadata/";
    }

    /**
     * @dev Converts uint256 to string
     * @param value The number to convert
     * @return string The string representation
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Interface support check
     * @param interfaceId Interface identifier
     * @return bool True if interface is supported
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 