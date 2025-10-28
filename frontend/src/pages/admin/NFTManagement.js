import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../../components/ui/buttons";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NFTManagement = () => {
  const [livestock, setLivestock] = useState([]);
  const [nftRecords, setNftRecords] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const [livestockRes, nftRes, settingsRes] = await Promise.all([
        axios.get(`${API}/livestock`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/nft`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/settings`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setLivestock(livestockRes.data);
      setNftRecords(nftRes.data);
      setSettings(settingsRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const printNFTCertificate = (animal, nftRecord) => {
    const printWindow = window.open('', '_blank');
    const certificateHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>NFT Certificate - ${animal?.name || animal?.tag_number}</title>
          <style>
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 20px;
              background: #faf9f6;
            }
            .certificate {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border: 2px solid #3d5a3d;
              border-radius: 10px;
              padding: 40px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #3d5a3d;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              width: 80px;
              height: 80px;
              margin: 0 auto 20px;
              display: block;
            }
            .title {
              font-size: 32px;
              font-weight: bold;
              color: #3d5a3d;
              margin: 0;
            }
            .subtitle {
              font-size: 18px;
              color: #666;
              margin: 10px 0 0 0;
            }
            .nft-image {
              width: 200px;
              height: 200px;
              object-fit: cover;
              border-radius: 10px;
              border: 2px solid #3d5a3d;
              margin: 20px auto;
              display: block;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin: 30px 0;
            }
            .info-item {
              margin-bottom: 15px;
            }
            .info-label {
              font-weight: bold;
              color: #3d5a3d;
              margin-bottom: 5px;
            }
            .info-value {
              color: #333;
            }
            .nft-details {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 30px 0;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { background: white; }
              .certificate { box-shadow: none; border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header">
              <img src="http://localhost:8000/images/ShilohRidgeFarmicon256.png" alt="Shiloh Ridge Farm" class="logo">
              <h1 class="title">NFT Certificate of Ownership</h1>
              <p class="subtitle">Digital Livestock Registration</p>
            </div>

            ${animal?.photos && animal.photos.length > 0 ? 
              `<img src="${animal.photos[0]}" alt="${animal?.name || animal?.tag_number}" class="nft-image">` :
              '<div style="width: 200px; height: 200px; background: #f0f0f0; border: 2px solid #3d5a3d; border-radius: 10px; margin: 20px auto; display: flex; align-items: center; justify-content: center; color: #666;">No Image Available</div>'
            }

            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Tag Number:</div>
                <div class="info-value">${animal?.tag_number || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Name:</div>
                <div class="info-value">${animal?.name || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Animal Type:</div>
                <div class="info-value">${animal?.animal_type ? animal.animal_type.charAt(0).toUpperCase() + animal.animal_type.slice(1) : 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Registration Number:</div>
                <div class="info-value">${animal?.registration_number || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date of Birth:</div>
                <div class="info-value">${animal?.date_of_birth || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Bloodline:</div>
                <div class="info-value">${animal?.bloodline || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Weight:</div>
                <div class="info-value">${animal?.weight ? `${animal.weight} lbs` : 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Color:</div>
                <div class="info-value">${animal?.color || 'N/A'}</div>
              </div>
            </div>

            <div class="nft-details">
              <h3 style="color: #3d5a3d; margin-bottom: 15px;">NFT Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Token ID:</div>
                  <div class="info-value">${nftRecord?.token_id || 'Pending'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Mint Date:</div>
                  <div class="info-value">${new Date(nftRecord?.created_at).toLocaleDateString()}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Status:</div>
                  <div class="info-value">${nftRecord?.status ? nftRecord.status.charAt(0).toUpperCase() + nftRecord.status.slice(1) : 'Unknown'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Network:</div>
                  <div class="info-value">Polygon (Matic)</div>
                </div>
              </div>
            </div>

            ${animal?.description ? `
              <div class="info-item" style="margin-top: 20px;">
                <div class="info-label">Description:</div>
                <div class="info-value">${animal.description}</div>
              </div>
            ` : ''}

            <div class="footer">
              <p>This NFT represents ownership of the registered livestock listed above.</p>
              <p>Certificate generated on ${new Date().toLocaleDateString()} by Shiloh Ridge Farm</p>
              <p>Shiloh Ridge Farm Livestock NFT System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(certificateHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const handleMintNFT = async (livestockId) => {
    if (!settings?.polygon_wallet_address || !settings?.polygon_api_key) {
      toast.error("Please configure Polygon settings first in the Settings tab");
      return;
    }

    try {
      const token = localStorage.getItem("admin_token");
      await axios.post(`${API}/nft/mint`, { livestock_id: livestockId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("NFT minting initiated! This feature is ready for deployment.");
      fetchData();
    } catch (error) {
      console.error("Error minting NFT:", error);
      toast.error("Failed to initiate NFT minting");
    }
  };

  if (loading) {
    return <div className="text-center py-20" data-testid="nft-loading">Loading...</div>;
  }

  return (
    <div className="space-y-8" data-testid="nft-management">
      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6" data-testid="nft-info-banner">
        <h3 className="text-xl font-bold text-purple-900 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          NFT Certificate Minting (Polygon Network)
        </h3>
        <p className="text-purple-700 mb-4">
          This feature allows you to mint NFT certificates for your livestock on the Polygon blockchain.
          Each NFT contains registration details, bloodline information, and can be updated with health records,
          vaccinations, and breeding information.
        </p>

        {/* NFT Benefits Section */}
        <div className="bg-white rounded-lg p-6 mb-4">
          <h4 className="text-lg font-semibold text-purple-900 mb-3">🚀 How NFTs Transform the Livestock Market</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-semibold text-purple-800 mb-2">Market Advantages</h5>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Global Accessibility:</strong> Reach buyers worldwide without geographical limitations</li>
                <li>• <strong>Transparent Pricing:</strong> Immutable blockchain records prevent price manipulation</li>
                <li>• <strong>Instant Verification:</strong> Buyers can instantly verify animal authenticity and history</li>
                <li>• <strong>24/7 Market:</strong> Trading available around the clock, no auction house hours</li>
                <li>• <strong>Reduced Intermediaries:</strong> Direct breeder-to-buyer transactions save costs</li>
                <li>• <strong>Market Data Analytics:</strong> Track pricing trends and demand patterns</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-purple-800 mb-2">Breeder Advantages</h5>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Proven Pedigree:</strong> Digital certificates prove bloodline quality instantly</li>
                <li>• <strong>Health Transparency:</strong> Complete medical history visible to all buyers</li>
                <li>• <strong>Breeding Records:</strong> Track genetic performance and breeding success</li>
                <li>• <strong>Premium Pricing:</strong> Verified quality commands higher market prices</li>
                <li>• <strong>Insurance Benefits:</strong> Digital records improve insurance coverage and claims</li>
                <li>• <strong>Legacy Preservation:</strong> Eternal record of your breeding program's success</li>
              </ul>
            </div>
          </div>
        </div>

        {/* NFT Definition */}
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-6 mb-4">
          <h4 className="text-lg font-semibold text-purple-900 mb-3">🎯 What is a Minted NFT Certificate?</h4>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>Definition:</strong> A minted NFT certificate is a unique, immutable digital asset on the Polygon blockchain
              that represents ownership and complete documentation of your registered livestock.
            </p>
            <div className="bg-white rounded p-4">
              <h5 className="font-semibold text-purple-800 mb-2">When Finished & Minted, Your NFT Contains:</h5>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h6 className="font-medium text-purple-700 mb-1">📋 Animal Identity</h6>
                  <ul className="text-xs space-y-1">
                    <li>• Unique tag number and registration</li>
                    <li>• Name, breed, and physical description</li>
                    <li>• Date of birth and gender</li>
                    <li>• High-resolution animal photograph</li>
                  </ul>
                </div>
                <div>
                  <h6 className="font-medium text-purple-700 mb-1">🧬 Genetic & Health Data</h6>
                  <ul className="text-xs space-y-1">
                    <li>• Complete bloodline and pedigree</li>
                    <li>• Parentage verification (sire/dam)</li>
                    <li>• Health records and vaccinations</li>
                    <li>• Breeding history and performance</li>
                  </ul>
                </div>
                <div>
                  <h6 className="font-medium text-purple-700 mb-1">⚖️ Legal & Commercial</h6>
                  <ul className="text-xs space-y-1">
                    <li>• Ownership transfer records</li>
                    <li>• Bill of sale documentation</li>
                    <li>• Insurance and warranty information</li>
                    <li>• Market valuation history</li>
                  </ul>
                </div>
                <div>
                  <h6 className="font-medium text-purple-700 mb-1">🔗 Blockchain Benefits</h6>
                  <ul className="text-xs space-y-1">
                    <li>• Tamper-proof digital certificate</li>
                    <li>• Globally verifiable authenticity</li>
                    <li>• Transferable digital ownership</li>
                    <li>• Eternal record preservation</li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="text-xs text-purple-600 italic">
              <strong>Market Impact:</strong> These NFT certificates create unprecedented transparency and trust in livestock transactions,
              potentially increasing the value of registered animals by 20-40% due to verified quality and provenance.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 space-y-2">
          <p className="text-sm text-gray-700"><strong>Current Status:</strong></p>
          <div className="flex items-center gap-2">
            {settings?.polygon_wallet_address ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Clock className="w-4 h-4 text-yellow-600" />
            )}
            <span className="text-sm">
              Wallet: {settings?.polygon_wallet_address || "Not configured"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {settings?.polygon_api_key ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Clock className="w-4 h-4 text-yellow-600" />
            )}
            <span className="text-sm">
              Polygon API: {settings?.polygon_api_key ? "Configured" : "Not configured"}
            </span>
          </div>
        </div>
        <p className="text-sm text-purple-600 mt-4">
          <strong>Note:</strong> NFT minting is ready for deployment. Smart contract deployment will be initiated when you mint your first NFT.
        </p>
      </div>

      {/* NFT Records */}
      {nftRecords.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-8" data-testid="nft-records-section">
          <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6">Minted NFTs</h2>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="nft-records-table">
              <thead className="bg-[#e8f4e8]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Image</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Livestock ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Token ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {nftRecords.map((record) => {
                  const animal = livestock.find(l => l.id === record.livestock_id);
                  return (
                    <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50" data-testid={`nft-record-${record.id}`}>
                      <td className="px-4 py-3">
                        {animal?.photos && animal.photos.length > 0 ? (
                          <img
                            src={animal.photos[0]}
                            alt={animal?.name || animal?.tag_number}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-xs">
                            No Image
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {animal?.name || animal?.tag_number || record.livestock_id}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={record.status === "minted" ? "default" : "secondary"}>
                          {record.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{record.token_id || "-"}</td>
                      <td className="px-4 py-3">{new Date(record.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => printNFTCertificate(animal, record)}
                          className="rounded-full"
                        >
                          Print Certificate
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Available Livestock for Minting */}
      <div className="bg-white rounded-2xl shadow-lg p-8" data-testid="available-livestock-section">
        <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6">Available Livestock for NFT Minting</h2>
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="available-livestock-table">
            <thead className="bg-[#e8f4e8]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Tag</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Registration #</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">NFT Status</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Action</th>
              </tr>
            </thead>
            <tbody>
              {livestock.map((animal) => (
                <tr key={animal.id} className="border-b border-gray-200 hover:bg-gray-50" data-testid={`livestock-nft-row-${animal.id}`}>
                  <td className="px-4 py-3">{animal.tag_number}</td>
                  <td className="px-4 py-3">{animal.name || "-"}</td>
                  <td className="px-4 py-3 capitalize">{animal.animal_type}</td>
                  <td className="px-4 py-3">{animal.registration_number || "-"}</td>
                  <td className="px-4 py-3">
                    {animal.nft_minted ? (
                      <Badge variant="default" className="bg-purple-600">Minted</Badge>
                    ) : (
                      <Badge variant="secondary">Not Minted</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {animal.nft_minted ? (
                      <span className="text-gray-500 text-sm">Already minted</span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleMintNFT(animal.id)}
                        className="bg-purple-600 hover:bg-purple-700 rounded-full"
                        data-testid={`mint-nft-${animal.id}`}
                      >
                        Mint NFT
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Smart Contract Info */}
      <div className="bg-white rounded-2xl shadow-lg p-8" data-testid="smart-contract-info">
        <h2 className="text-2xl font-bold text-[#3d5a3d] mb-4">Smart Contract Details</h2>
        <div className="space-y-3 text-gray-700">
          <p><strong>Network:</strong> Polygon (Matic)</p>
          <p><strong>Contract Type:</strong> ERC-721 with Updatable Metadata</p>
          <p><strong>Features:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Livestock registration certificate as NFT</li>
            <li>Updatable metadata for health records</li>
            <li>Vaccination tracking</li>
            <li>Breeding history</li>
            <li>Ownership transfer support</li>
          </ul>
          <p className="text-sm text-gray-600 mt-4">
            <strong>Deployment:</strong> The smart contract will be deployed on-demand when you mint your first NFT. 
            Gas fees will be paid from your configured wallet.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NFTManagement;
