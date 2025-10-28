# Livestock NFT Smart Contract

## Overview
The LivestockNFT smart contract is an ERC-721 compliant NFT that represents digital certificates for Shiloh Ridge Farm livestock. Each NFT contains complete registration information and maintains an immutable, updatable record of the animal's history.

## Contract Address
**Network**: Polygon (Matic) Mainnet
**Contract**: `LivestockNFT.sol`
**Standard**: ERC-721 with ERC721URIStorage

## Features

### 1. Livestock Certificate Minting
Each livestock animal can be minted as an NFT containing:
- Tag number (unique identifier)
- Animal type (sheep, hog, cattle)
- Registration number
- Bloodline information
- Sire and Dam details
- Date of birth
- Gender
- Mint date (blockchain timestamp)

### 2. Ownership Transfer
The contract fully supports ownership transfers, simulating real-world livestock sales:
- Standard ERC-721 `transfer` and `safeTransfer` functions
- `transferWithPrice` function to record sale price on-chain
- Complete ownership history tracking
- Each transfer is timestamped and recorded

**Example Transfer:**
```solidity
// Transfer with sale price recorded
livestockNFT.transferWithPrice(
    currentOwner,
    newOwner,
    tokenId,
    2500 // Sale price in wei or custom unit
);
```

### 3. Breeding Information Updates
Track all breeding activities and offspring:
- Record breeding date
- Mate tag number
- Offspring tag number
- Additional notes

**Functions:**
- `addBreedingRecord()` - Add new breeding record
- `getBreedingHistory()` - Retrieve all breeding records
- `getOffspringCount()` - Get total number of offspring

**Example:**
```solidity
livestockNFT.addBreedingRecord(
    tokenId,
    "SRF-2024-099", // Mate tag number
    "SRF-2025-001", // Offspring tag number
    "Healthy lamb, weighed 8 lbs at birth"
);
```

### 4. Health Records Management
Maintain complete veterinary and health history:
- Vaccination records
- Medical treatments
- Routine checkups
- Veterinarian information

**Functions:**
- `addHealthRecord()` - Add new health record
- `getHealthRecords()` - Retrieve all health records
- `getHealthRecordCount()` - Get total number of records

**Example:**
```solidity
livestockNFT.addHealthRecord(
    tokenId,
    "vaccination",
    "Annual vaccination: CDT vaccine administered",
    "Dr. Smith, DVM"
);
```

### 5. Complete History Tracking
Every NFT maintains:
- Full ownership chain (every owner, every transfer)
- Complete breeding lineage
- All health interventions
- Sale prices (when using `transferWithPrice`)

## Authorization & Security

### Owner Permissions
- Mint new NFTs
- Update metadata URIs
- Administrative functions

### NFT Holder Permissions
- Add breeding records to their animals
- Add health records to their animals
- Transfer ownership
- View all historical data

### Public View Functions
Anyone can query:
- Basic livestock information
- Breeding history
- Health records
- Ownership history
- Look up NFTs by tag number

## Data Structures

### LivestockInfo
```solidity
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
```

### BreedingRecord
```solidity
struct BreedingRecord {
    uint256 date;
    string mateTagNumber;
    string offspringTagNumber;
    string notes;
}
```

### HealthRecord
```solidity
struct HealthRecord {
    uint256 date;
    string recordType;
    string description;
    string veterinarian;
}
```

### OwnershipTransfer
```solidity
struct OwnershipTransfer {
    address from;
    address to;
    uint256 date;
    uint256 salePrice;
}
```

## Events

The contract emits events for all major actions:
- `LivestockMinted` - When a new NFT is created
- `BreedingRecordAdded` - When breeding information is added
- `HealthRecordAdded` - When health records are updated
- `OwnershipTransferred` - When ownership changes
- `MetadataUpdated` - When any data is modified

## Deployment Instructions

### Prerequisites
- Node.js and npm
- Hardhat or Truffle
- Polygon wallet with MATIC for gas fees
- Alchemy or Infura API key for Polygon

### Installation
```bash
npm install @openzeppelin/contracts
npm install --save-dev hardhat
```

### Deployment Script (Hardhat)
```javascript
const hre = require("hardhat");

async function main() {
    const LivestockNFT = await hre.ethers.getContractFactory("LivestockNFT");
    const livestockNFT = await LivestockNFT.deploy();
    await livestockNFT.deployed();
    
    console.log("LivestockNFT deployed to:", livestockNFT.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

### Configuration (hardhat.config.js)
```javascript
require("@nomiclabs/hardhat-ethers");

module.exports = {
    solidity: "0.8.20",
    networks: {
        polygon: {
            url: process.env.POLYGON_RPC_URL,
            accounts: [process.env.PRIVATE_KEY]
        }
    }
};
```

## Usage Examples

### Minting a New Livestock NFT
```javascript
const tx = await livestockNFT.mintLivestock(
    ownerAddress,
    "SRF-2024-001",           // Tag number
    "sheep",                   // Animal type
    "REG123456",              // Registration number
    "Elite Katahdin Line",    // Bloodline
    "Champion Buck 2023",     // Sire
    "Queen Ewe 2022",         // Dam
    1704067200,               // Date of birth (Unix timestamp)
    "female",                 // Gender
    "ipfs://metadata-uri"     // Metadata URI
);
```

### Recording a Sale with Price
```javascript
// Approve the transfer first
await livestockNFT.approve(newOwnerAddress, tokenId);

// Transfer with price
await livestockNFT.transferWithPrice(
    currentOwnerAddress,
    newOwnerAddress,
    tokenId,
    ethers.utils.parseEther("2.5") // 2.5 MATIC
);
```

### Adding Breeding Information
```javascript
await livestockNFT.addBreedingRecord(
    tokenId,
    "SRF-2024-099",                    // Mate
    "SRF-2025-001",                    // Offspring
    "Twin lambs, both healthy"         // Notes
);
```

### Querying Livestock History
```javascript
// Get basic info
const info = await livestockNFT.getLivestockInfo(tokenId);

// Get breeding history
const breeding = await livestockNFT.getBreedingHistory(tokenId);

// Get health records
const health = await livestockNFT.getHealthRecords(tokenId);

// Get ownership history
const owners = await livestockNFT.getOwnershipHistory(tokenId);

// Find by tag number
const tokenId = await livestockNFT.getTokenIdByTag("SRF-2024-001");
```

## Gas Costs (Estimated)
- Mint NFT: ~200,000 gas (~$0.05 on Polygon)
- Add breeding record: ~100,000 gas (~$0.025)
- Add health record: ~100,000 gas (~$0.025)
- Transfer: ~80,000 gas (~$0.02)

## Benefits of On-Chain Livestock Records

1. **Immutable History**: Cannot be altered or deleted
2. **Provenance**: Complete ownership chain from birth
3. **Transparency**: Anyone can verify authenticity
4. **Portability**: Records move with the animal
5. **Lost Records**: Never lose paper certificates
6. **Market Value**: Proven lineage increases value
7. **Breeding Programs**: Track genetic lines across generations
8. **Regulatory Compliance**: Verifiable health and vaccination records

## Integration with Shiloh Ridge Farm Website

The admin dashboard includes an NFT management interface that:
1. Prepares metadata for minting
2. Deploys the contract on first mint (if not already deployed)
3. Mints NFTs for selected livestock
4. Tracks NFT status in the database
5. Displays NFT badges on livestock profiles

## Security Considerations

- Only contract owner can mint new NFTs
- Only NFT holder or contract owner can update records
- All transfers are tracked automatically
- Tag numbers are unique and cannot be duplicated
- OpenZeppelin's audited contracts provide security foundation

## Future Enhancements

- Multi-signature minting for partnerships
- Marketplace integration
- Fractional ownership (breeding shares)
- Automated offspring minting
- DNA verification integration
- Show results and awards tracking

## Support

For questions about the smart contract or deployment:
- Email: dominichanway@gmail.com
- Review contract code: `/app/contracts/LivestockNFT.sol`

---

**Built on Polygon for low-cost, eco-friendly transactions**
