// Alchemy Demo Script
// This script demonstrates basic interactions with the Alchemy NFT API and Web3 API for Ethereum/Polygon.

const { Alchemy, Network } = require('alchemy-sdk');
const https = require('https');

// NFT API Key
const NFT_API_KEY = 'ycGf05E6sGgzu-AJlA6gd';

// Optional config for Alchemy SDK (Web3 API)
const config = {
  apiKey: process.env.ALCHEMY_API_KEY || 'ycGf05E6sGgzu-AJlA6gd', // Using the same key for Web3
  network: Network.POLYGONZKEVM_MAINNET, // Polygon zkEVM mainnet
};

const alchemy = new Alchemy(config);

// Function to make NFT API requests
function nftApiRequest(endpoint, params = {}) {
  const url = new URL(`https://polygonzkevm-mainnet.g.alchemy.com/nft/v3/${NFT_API_KEY}${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Testing Alchemy APIs...');

  // Web3 API tests
  console.log('\n--- Web3 API Tests ---');
  try {
    // Get the latest block number
    const latestBlock = await alchemy.core.getBlockNumber();
    console.log('Latest block number:', latestBlock);

    // Get gas price
    const gasPrice = await alchemy.core.getGasPrice();
    console.log('Current gas price:', gasPrice.toString(), 'wei');
  } catch (error) {
    console.error('Web3 API error:', error.message);
  }

  // NFT API tests
  console.log('\n--- NFT API Tests ---');
  try {
    // Get NFTs for an owner (example address)
    const ownerAddress = '0x0000000000000000000000000000000000000000'; // Replace with actual address
    const nfts = await nftApiRequest(`/getNFTsForOwner`, {
      owner: ownerAddress,
      pageSize: 5
    });
    console.log('NFTs for owner:', nfts.ownedNfts ? nfts.ownedNfts.length : 0, 'NFTs found');

    // Get contract metadata (example contract)
    const contractAddress = '0x0000000000000000000000000000000000000000'; // Replace with actual contract
    const contract = await nftApiRequest(`/getContractMetadata`, {
      contractAddress: contractAddress
    });
    console.log('Contract metadata:', contract.name || 'No name');

  } catch (error) {
    console.error('NFT API error:', error.message);
  }

  console.log('\nAlchemy APIs test complete!');
}

main().catch(console.error);