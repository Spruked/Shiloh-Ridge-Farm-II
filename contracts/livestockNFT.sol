// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LivestockNFT
 * @dev ERC721 NFT for Shiloh Ridge Farm livestock certificates with updatable metadata
 * 
 * Features:
 * - Mint NFT certificates for livestock
 * - Transfer ownership (simulating livestock sale)
 * - Update breeding information (offspring records)
 * - Update health records (vaccinations, treatments)
 * - View complete history and lineage
 */
contract LivestockNFT is ERC721, ERC721URIStorage, Ownable {
    
    // Counter for token IDs
    uint256 private _tokenIdCounter;
    
    // Struct for livestock basic information
    struct LivestockInfo {
        string tagNumber;
        string animalType;
        string registrationNumber;
        string bloodline;
        string sire;
        string dam;
        uint256 dateOfBirth;
        string gender;
        uint256 mintDate;
    }
    
    // Struct for breeding record
    struct BreedingRecord {
        uint256 date;
        string mateTagNumber;
        string offspringTagNumber;
        string notes;
    }
    
    // Struct for health record
    struct HealthRecord {
        uint256 date;
        string recordType; // vaccination, treatment, checkup
        string description;
        string veterinarian;
    }
    
    // Struct for ownership history
    struct OwnershipTransfer {
        address from;
        address to;
        uint256 date;
        uint256 salePrice;
    }
    
    // Mappings
    mapping(uint256 => LivestockInfo) public livestockInfo;
    mapping(uint256 => BreedingRecord[]) public breedingHistory;
    mapping(uint256 => HealthRecord[]) public healthRecords;
    mapping(uint256 => OwnershipTransfer[]) public ownershipHistory;
    mapping(string => uint256) public tagNumberToTokenId;
    
    // Events
    event LivestockMinted(uint256 indexed tokenId, string tagNumber, string animalType);
    event BreedingRecordAdded(uint256 indexed tokenId, string offspringTag);
    event HealthRecordAdded(uint256 indexed tokenId, string recordType);
    event OwnershipTransferred(uint256 indexed tokenId, address from, address to, uint256 price);
    event MetadataUpdated(uint256 indexed tokenId);
    
    constructor() ERC721("Shiloh Ridge Farm Livestock", "SRFLIVE") Ownable(msg.sender) {
        _tokenIdCounter = 1;
    }
    
    /**
     * @dev Mint a new livestock NFT certificate
     */
    function mintLivestock(
        address to,
        string memory tagNumber,
        string memory animalType,
        string memory registrationNumber,
        string memory bloodline,
        string memory sire,
        string memory dam,
        uint256 dateOfBirth,
        string memory gender,
        string memory tokenURI
    ) public onlyOwner returns (uint256) {
        require(tagNumberToTokenId[tagNumber] == 0, "Tag number already exists");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        livestockInfo[tokenId] = LivestockInfo({
            tagNumber: tagNumber,
            animalType: animalType,
            registrationNumber: registrationNumber,
            bloodline: bloodline,
            sire: sire,
            dam: dam,
            dateOfBirth: dateOfBirth,
            gender: gender,
            mintDate: block.timestamp
        });
        
        tagNumberToTokenId[tagNumber] = tokenId;
        
        // Record initial ownership
        ownershipHistory[tokenId].push(OwnershipTransfer({
            from: address(0),
            to: to,
            date: block.timestamp,
            salePrice: 0
        }));
        
        emit LivestockMinted(tokenId, tagNumber, animalType);
        
        return tokenId;
    }
    
    /**
     * @dev Add breeding record to a livestock NFT
     */
    function addBreedingRecord(
        uint256 tokenId,
        string memory mateTagNumber,
        string memory offspringTagNumber,
        string memory notes
    ) public {
        require(ownerOf(tokenId) == msg.sender || owner() == msg.sender, "Not authorized");
        
        breedingHistory[tokenId].push(BreedingRecord({
            date: block.timestamp,
            mateTagNumber: mateTagNumber,
            offspringTagNumber: offspringTagNumber,
            notes: notes
        }));
        
        emit BreedingRecordAdded(tokenId, offspringTagNumber);
        emit MetadataUpdated(tokenId);
    }
    
    /**
     * @dev Add health record to a livestock NFT
     */
    function addHealthRecord(
        uint256 tokenId,
        string memory recordType,
        string memory description,
        string memory veterinarian
    ) public {
        require(ownerOf(tokenId) == msg.sender || owner() == msg.sender, "Not authorized");
        
        healthRecords[tokenId].push(HealthRecord({
            date: block.timestamp,
            recordType: recordType,
            description: description,
            veterinarian: veterinarian
        }));
        
        emit HealthRecordAdded(tokenId, recordType);
        emit MetadataUpdated(tokenId);
    }
    
    /**
     * @dev Override transfer to track ownership history with sale price
     */
    function transferWithPrice(
        address from,
        address to,
        uint256 tokenId,
        uint256 salePrice
    ) public {
        require(ownerOf(tokenId) == msg.sender || getApproved(tokenId) == msg.sender, "Not authorized");
        
        _transfer(from, to, tokenId);
        
        ownershipHistory[tokenId].push(OwnershipTransfer({
            from: from,
            to: to,
            date: block.timestamp,
            salePrice: salePrice
        }));
        
        emit OwnershipTransferred(tokenId, from, to, salePrice);
    }
    
    /**
     * @dev Override standard transfer to track ownership
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        if (from != address(0) && to != address(0)) {
            // Only record if not already recorded by transferWithPrice
            bool alreadyRecorded = false;
            OwnershipTransfer[] memory history = ownershipHistory[tokenId];
            if (history.length > 0) {
                OwnershipTransfer memory lastTransfer = history[history.length - 1];
                if (lastTransfer.to == to && block.timestamp == lastTransfer.date) {
                    alreadyRecorded = true;
                }
            }
            
            if (!alreadyRecorded) {
                ownershipHistory[tokenId].push(OwnershipTransfer({
                    from: from,
                    to: to,
                    date: block.timestamp,
                    salePrice: 0
                }));
            }
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Get livestock basic information
     */
    function getLivestockInfo(uint256 tokenId) public view returns (LivestockInfo memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return livestockInfo[tokenId];
    }
    
    /**
     * @dev Get all breeding records for a livestock
     */
    function getBreedingHistory(uint256 tokenId) public view returns (BreedingRecord[] memory) {
        return breedingHistory[tokenId];
    }
    
    /**
     * @dev Get all health records for a livestock
     */
    function getHealthRecords(uint256 tokenId) public view returns (HealthRecord[] memory) {
        return healthRecords[tokenId];
    }
    
    /**
     * @dev Get ownership history for a livestock
     */
    function getOwnershipHistory(uint256 tokenId) public view returns (OwnershipTransfer[] memory) {
        return ownershipHistory[tokenId];
    }
    
    /**
     * @dev Get token ID by tag number
     */
    function getTokenIdByTag(string memory tagNumber) public view returns (uint256) {
        uint256 tokenId = tagNumberToTokenId[tagNumber];
        require(tokenId != 0, "Tag number not found");
        return tokenId;
    }
    
    /**
     * @dev Update token URI (metadata)
     */
    function updateTokenURI(uint256 tokenId, string memory newTokenURI) public onlyOwner {
        _setTokenURI(tokenId, newTokenURI);
        emit MetadataUpdated(tokenId);
    }
    
    /**
     * @dev Get total number of offspring for a livestock
     */
    function getOffspringCount(uint256 tokenId) public view returns (uint256) {
        return breedingHistory[tokenId].length;
    }
    
    /**
     * @dev Get total number of health records
     */
    function getHealthRecordCount(uint256 tokenId) public view returns (uint256) {
        return healthRecords[tokenId].length;
    }
    
    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
