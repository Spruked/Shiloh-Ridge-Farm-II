import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../../components/ui/buttons";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { getApiBaseUrl } from "../../lib/backend";
import { resolveMediaUrl } from "../../lib/media";

const API = getApiBaseUrl();
const FALLBACK_CERT_LOGO = "/ShilohRidgeFarmicon256.png";

const escapeHtml = (value) => String(value ?? "N/A")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const titleCase = (value) => {
  if (!value || typeof value !== "string") return "N/A";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatDisplayDate = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
};

const toAbsoluteUrl = (source) => {
  if (!source) return null;
  try {
    return new URL(source, window.location.origin).toString();
  } catch (_error) {
    return source;
  }
};

const getCertificatePhotoUrl = (animal) => toAbsoluteUrl(resolveMediaUrl(animal?.photos?.[0]));
const getCertificateLogoUrl = () => toAbsoluteUrl(FALLBACK_CERT_LOGO);

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
    const mintedImageUrl = resolveMediaUrl(nftRecord?.image_uri);
    if (mintedImageUrl) {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Popup blocked. Please allow popups to print the NFT image.");
        return;
      }
      const imageTitle = escapeHtml(animal?.name || animal?.tag_number || "NFT Certificate");
      const printable = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>${imageTitle}</title>
            <style>
              body { margin: 0; padding: 20px; background: #f3efe3; display: flex; justify-content: center; }
              .frame { background: #fff; border: 2px solid #0f5132; border-radius: 12px; padding: 14px; box-shadow: 0 10px 24px rgba(0,0,0,0.15); }
              img { max-width: min(95vw, 1100px); max-height: 90vh; display: block; }
              @media print {
                body { background: #fff; padding: 0; }
                .frame { border: 0; box-shadow: none; padding: 0; }
                img { max-width: 100%; max-height: none; }
              }
            </style>
          </head>
          <body>
            <div class="frame">
              <img id="nftImage" src="${mintedImageUrl}" alt="${imageTitle}" />
            </div>
            <script>
              const img = document.getElementById("nftImage");
              const printNow = () => setTimeout(() => window.print(), 120);
              if (img.complete) { printNow(); }
              else {
                img.addEventListener("load", printNow, { once: true });
                img.addEventListener("error", printNow, { once: true });
              }
            </script>
          </body>
        </html>
      `;
      printWindow.document.open();
      printWindow.document.write(printable);
      printWindow.document.close();
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to print the certificate.");
      return;
    }

    const logoUrl = getCertificateLogoUrl();
    const photoUrl = getCertificatePhotoUrl(animal);
    const animalTitle = escapeHtml(animal?.name || animal?.tag_number || "Livestock Record");
    const mintedAt = formatDisplayDate(nftRecord?.created_at);

    const certificateHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>NFT Certificate - ${animalTitle}</title>
          <style>
            :root {
              --forest: #0f5132;
              --forest-dark: #08311f;
              --gold: #b6863a;
              --paper: #f8f4e8;
              --ink: #1f2a1f;
            }
            body {
              font-family: "Georgia", "Times New Roman", serif;
              margin: 0;
              padding: 24px;
              background:
                radial-gradient(circle at 15% 5%, rgba(182, 134, 58, 0.18), transparent 28%),
                radial-gradient(circle at 85% 95%, rgba(15, 81, 50, 0.14), transparent 30%),
                var(--paper);
              color: var(--ink);
            }
            .certificate {
              position: relative;
              max-width: 920px;
              margin: 0 auto;
              background: white;
              border: 2px solid var(--forest);
              border-radius: 14px;
              padding: 34px 36px;
              box-shadow:
                0 24px 52px rgba(4, 18, 12, 0.12),
                0 0 0 10px rgba(182, 134, 58, 0.08);
              overflow: hidden;
            }
            .header {
              text-align: center;
              border-bottom: 3px double var(--forest);
              padding-bottom: 18px;
              margin-bottom: 24px;
            }
            .logo {
              width: 86px;
              height: 86px;
              margin: 0 auto 14px;
              display: block;
            }
            .title {
              font-size: 34px;
              letter-spacing: 0.03em;
              color: var(--forest);
              margin: 0;
            }
            .subtitle {
              font-family: "Segoe UI", Tahoma, sans-serif;
              font-size: 14px;
              letter-spacing: 0.16em;
              text-transform: uppercase;
              color: #465649;
              margin: 10px 0 0 0;
            }
            .hero {
              display: grid;
              grid-template-columns: 240px 1fr;
              gap: 24px;
              align-items: center;
              margin: 8px 0 10px 0;
            }
            .nft-image,
            .image-fallback {
              width: 230px;
              height: 230px;
              object-fit: cover;
              border-radius: 12px;
              border: 2px solid var(--forest);
              background: #eef3ee;
            }
            .image-fallback {
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              font-family: "Segoe UI", Tahoma, sans-serif;
              font-size: 13px;
              color: #55685b;
              padding: 10px;
              box-sizing: border-box;
            }
            .hero-meta {
              font-family: "Segoe UI", Tahoma, sans-serif;
            }
            .hero-chip {
              display: inline-block;
              padding: 5px 10px;
              border: 1px solid var(--gold);
              border-radius: 999px;
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              color: var(--forest-dark);
              background: rgba(182, 134, 58, 0.14);
              margin-bottom: 10px;
            }
            .hero-name {
              font-size: 30px;
              font-weight: 700;
              color: var(--forest);
              margin: 0 0 6px 0;
            }
            .hero-id {
              font-size: 15px;
              color: #4a554e;
              margin: 0;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14px 18px;
              margin: 24px 0;
            }
            .info-item {
              background: #fbfaf6;
              border: 1px solid #e8e2d3;
              border-radius: 10px;
              padding: 10px 12px;
            }
            .info-label {
              font-family: "Segoe UI", Tahoma, sans-serif;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #5c6b61;
              margin-bottom: 4px;
            }
            .info-value {
              font-family: "Segoe UI", Tahoma, sans-serif;
              color: #1f2822;
              font-size: 15px;
              word-break: break-word;
            }
            .nft-details {
              background: linear-gradient(135deg, #f8f6f0, #f0f6f2);
              border: 1px solid #d7dfd8;
              padding: 16px;
              border-radius: 12px;
              margin: 26px 0 18px;
            }
            .nft-title {
              margin: 0 0 12px;
              color: var(--forest);
              font-size: 18px;
            }
            .description {
              margin-top: 18px;
              padding: 12px;
              border: 1px dashed #b7c1b9;
              border-radius: 10px;
              background: #fcfdf9;
              font-family: "Segoe UI", Tahoma, sans-serif;
            }
            .watermark {
              position: absolute;
              right: -22px;
              bottom: -8px;
              font-family: "Segoe UI", Tahoma, sans-serif;
              font-size: 72px;
              font-weight: 800;
              letter-spacing: 0.08em;
              color: rgba(15, 81, 50, 0.05);
              pointer-events: none;
              user-select: none;
            }
            .footer {
              text-align: center;
              margin-top: 26px;
              padding-top: 16px;
              border-top: 1px solid #d9dfda;
              font-family: "Segoe UI", Tahoma, sans-serif;
              font-size: 12px;
              color: #4f5c54;
            }
            @media print {
              body { background: #fff; padding: 8px; }
              .certificate {
                box-shadow: none;
                border-width: 1px;
                break-inside: avoid;
              }
            }
            @media (max-width: 720px) {
              .hero {
                grid-template-columns: 1fr;
              }
              .nft-image,
              .image-fallback {
                width: 100%;
                max-width: 280px;
                margin: 0 auto;
              }
              .info-grid {
                grid-template-columns: 1fr;
              }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header">
              <img src="${logoUrl}" alt="Shiloh Ridge Farm" class="logo">
              <h1 class="title">NFT Certificate of Ownership</h1>
              <p class="subtitle">Digital Livestock Registration · Verified Record</p>
            </div>

            <section class="hero">
              ${photoUrl
                ? `<img src="${photoUrl}" alt="${animalTitle}" class="nft-image" />`
                : '<div class="image-fallback">No image available for this livestock record.</div>'
              }
              <div class="hero-meta">
                <span class="hero-chip">Minted Ownership Asset</span>
                <h2 class="hero-name">${animalTitle}</h2>
                <p class="hero-id">Tag: ${escapeHtml(animal?.tag_number || "N/A")} · Registration: ${escapeHtml(animal?.registration_number || "N/A")}</p>
              </div>
            </section>

            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Animal Type</div>
                <div class="info-value">${escapeHtml(titleCase(animal?.animal_type))}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date of Birth</div>
                <div class="info-value">${escapeHtml(formatDisplayDate(animal?.date_of_birth))}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Bloodline</div>
                <div class="info-value">${escapeHtml(animal?.bloodline)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Weight</div>
                <div class="info-value">${escapeHtml(animal?.weight ? `${animal.weight} lbs` : "N/A")}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Color</div>
                <div class="info-value">${escapeHtml(animal?.color)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Record ID</div>
                <div class="info-value">${escapeHtml(animal?.id || nftRecord?.livestock_id || "N/A")}</div>
              </div>
            </div>

            <div class="nft-details">
              <h3 class="nft-title">NFT Details</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Token ID</div>
                  <div class="info-value">${escapeHtml(nftRecord?.token_id || "Pending")}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Mint Date</div>
                  <div class="info-value">${escapeHtml(mintedAt)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Status</div>
                  <div class="info-value">${escapeHtml(titleCase(nftRecord?.status || "Unknown"))}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Network</div>
                  <div class="info-value">Polygon (Matic)</div>
                </div>
              </div>
            </div>

            ${animal?.description ? `
              <div class="description">
                <div class="info-label">Description</div>
                <div class="info-value">${escapeHtml(animal.description)}</div>
              </div>
            ` : ""}

            <div class="footer">
              <p>This NFT certifies the livestock ownership record shown above.</p>
              <p>Generated on ${escapeHtml(formatDisplayDate(new Date().toISOString()))} by Shiloh Ridge Farm</p>
              <p>Shiloh Ridge Farm Livestock NFT System</p>
            </div>
            <div class="watermark">CERTIFIED</div>
          </div>
          <script>
            (function waitForCertificateImagesThenPrint() {
              const images = Array.from(document.images || []);
              let completeCount = 0;
              let printed = false;

              function tryPrint() {
                if (printed) return;
                if (completeCount >= images.length) {
                  printed = true;
                  setTimeout(function () {
                    window.focus();
                    window.print();
                  }, 180);
                }
              }

              if (!images.length) {
                printed = true;
                setTimeout(function () {
                  window.focus();
                  window.print();
                }, 120);
                return;
              }

              images.forEach(function (img) {
                if (img.complete) {
                  completeCount += 1;
                  tryPrint();
                  return;
                }
                img.addEventListener("load", function () {
                  completeCount += 1;
                  tryPrint();
                }, { once: true });
                img.addEventListener("error", function () {
                  completeCount += 1;
                  tryPrint();
                }, { once: true });
              });

              setTimeout(function () {
                if (!printed) {
                  printed = true;
                  window.focus();
                  window.print();
                }
              }, 2000);
            }());
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(certificateHTML);
    printWindow.document.close();
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
      <div className="flex justify-end">
        <Link to="/admin/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>
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
          <h4 className="text-lg font-semibold text-purple-900 mb-3">How NFTs Transform the Livestock Market</h4>
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
          <h4 className="text-lg font-semibold text-purple-900 mb-3">What is a Minted NFT Certificate?</h4>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>Definition:</strong> A minted NFT certificate is a unique, immutable digital asset on the Polygon blockchain
              that represents ownership and complete documentation of your registered livestock.
            </p>
            <div className="bg-white rounded p-4">
              <h5 className="font-semibold text-purple-800 mb-2">When Finished & Minted, Your NFT Contains:</h5>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h6 className="font-medium text-purple-700 mb-1">Animal Identity</h6>
                  <ul className="text-xs space-y-1">
                    <li>• Unique tag number and registration</li>
                    <li>• Name, breed, and physical description</li>
                    <li>• Date of birth and gender</li>
                    <li>• High-resolution animal photograph</li>
                  </ul>
                </div>
                <div>
                  <h6 className="font-medium text-purple-700 mb-1">Genetic &amp; Health Data</h6>
                  <ul className="text-xs space-y-1">
                    <li>• Complete bloodline and pedigree</li>
                    <li>• Parentage verification (sire/dam)</li>
                    <li>• Health records and vaccinations</li>
                    <li>• Breeding history and performance</li>
                  </ul>
                </div>
                <div>
                  <h6 className="font-medium text-purple-700 mb-1">Legal &amp; Commercial</h6>
                  <ul className="text-xs space-y-1">
                    <li>• Ownership transfer records</li>
                    <li>• Bill of sale documentation</li>
                    <li>• Insurance and warranty information</li>
                    <li>• Market valuation history</li>
                  </ul>
                </div>
                <div>
                  <h6 className="font-medium text-purple-700 mb-1">Blockchain Benefits</h6>
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
          <h2 className="text-3xl font-bold text-[#0f5132] mb-6">Minted NFTs</h2>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="nft-records-table">
              <thead className="bg-[#e7eddc]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#0f5132]">Image</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#0f5132]">Livestock ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#0f5132]">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#0f5132]">Token ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#0f5132]">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#0f5132]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {nftRecords.map((record) => {
                  const animal = livestock.find(l => l.id === record.livestock_id);
                  const nftPreviewImage = resolveMediaUrl(record.image_uri) || resolveMediaUrl(animal?.photos?.[0]) || animal?.photos?.[0] || null;
                  return (
                    <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50" data-testid={`nft-record-${record.id}`}>
                      <td className="px-4 py-3">
                        {nftPreviewImage ? (
                          <img
                            src={nftPreviewImage}
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
        <h2 className="text-3xl font-bold text-[#0f5132] mb-6">Available Livestock for NFT Minting</h2>
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="available-livestock-table">
            <thead className="bg-[#e7eddc]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#0f5132]">Tag</th>
                <th className="px-4 py-3 text-left font-semibold text-[#0f5132]">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-[#0f5132]">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-[#0f5132]">Registration #</th>
                <th className="px-4 py-3 text-left font-semibold text-[#0f5132]">NFT Status</th>
                <th className="px-4 py-3 text-left font-semibold text-[#0f5132]">Action</th>
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
        <h2 className="text-2xl font-bold text-[#0f5132] mb-4">Smart Contract Details</h2>
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
