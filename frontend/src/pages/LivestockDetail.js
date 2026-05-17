import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/buttons";
import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";
import { getApiBaseUrl } from "../lib/backend";
import { resolveMediaUrl } from "../lib/media";

const API = getApiBaseUrl();

const LivestockDetail = () => {
  const { id } = useParams();
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnimal();
  }, [id]);

  const fetchAnimal = async () => {
    try {
      const response = await axios.get(`${API}/livestock/${id}`);
      setAnimal(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching animal:", error);
      setLoading(false);
    }
  };

  const primaryPhoto = resolveMediaUrl(animal?.photos?.[0]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f3e7]">
        <Navigation />
        <PriceTicker />
        <div className="text-center py-20" data-testid="detail-loading">
          <div className="spinner w-12 h-12 border-4 border-[#0f5132] border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="min-h-screen bg-[#f7f3e7]">
        <Navigation />
        <PriceTicker />
        <div className="text-center py-20" data-testid="detail-not-found">
          <p className="text-xl text-gray-600">Animal not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3e7]">
      <Navigation />
      <PriceTicker />

      <section className="py-20 px-6 max-w-6xl mx-auto" data-testid="livestock-detail">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Image Section */}
          <div>
            <div className="bg-[#e7eddc] rounded-2xl overflow-hidden shadow-xl h-96 flex items-center justify-center">
              {primaryPhoto ? (
                <img src={primaryPhoto} alt={animal.name} className="w-full h-full object-cover" data-testid="detail-photo" />
              ) : (
                <span className="text-base font-semibold text-[#0f5132] uppercase tracking-widest">
                  {animal.animal_type || 'Animal'}
                </span>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-4xl font-bold text-[#0f5132]" data-testid="detail-title">{animal.name || animal.tag_number}</h1>
              {animal.nft_minted && (
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium" data-testid="detail-nft-badge">
                  NFT Certified
                </span>
              )}
            </div>
            
            <p className="text-xl text-gray-600 mb-6 capitalize" data-testid="detail-type">{animal.animal_type}</p>

            {animal.price && (
              <div className="mb-8">
                <p className="text-4xl font-bold text-[#0f5132]" data-testid="detail-price">${animal.price.toLocaleString()}</p>
              </div>
            )}

            <div className="space-y-4 mb-8">
              {animal.tag_number && (
                <div className="flex justify-between py-3 border-b border-gray-200" data-testid="detail-tag">
                  <span className="font-semibold text-gray-700">Tag Number:</span>
                  <span className="text-gray-600">{animal.tag_number}</span>
                </div>
              )}
              {animal.date_of_birth && (
                <div className="flex justify-between py-3 border-b border-gray-200" data-testid="detail-dob">
                  <span className="font-semibold text-gray-700">Date of Birth:</span>
                  <span className="text-gray-600">{animal.date_of_birth}</span>
                </div>
              )}
              {animal.gender && (
                <div className="flex justify-between py-3 border-b border-gray-200" data-testid="detail-gender">
                  <span className="font-semibold text-gray-700">Gender:</span>
                  <span className="text-gray-600 capitalize">{animal.gender}</span>
                </div>
              )}
              {animal.weight && (
                <div className="flex justify-between py-3 border-b border-gray-200" data-testid="detail-weight">
                  <span className="font-semibold text-gray-700">Weight:</span>
                  <span className="text-gray-600">{animal.weight} lbs</span>
                </div>
              )}
              {animal.color && (
                <div className="flex justify-between py-3 border-b border-gray-200" data-testid="detail-color">
                  <span className="font-semibold text-gray-700">Color:</span>
                  <span className="text-gray-600">{animal.color}</span>
                </div>
              )}
              {animal.registration_number && (
                <div className="flex justify-between py-3 border-b border-gray-200" data-testid="detail-registration">
                  <span className="font-semibold text-gray-700">Registration #:</span>
                  <span className="text-gray-600">{animal.registration_number}</span>
                </div>
              )}
              {animal.bloodline && (
                <div className="flex justify-between py-3 border-b border-gray-200" data-testid="detail-bloodline">
                  <span className="font-semibold text-gray-700">Bloodline:</span>
                  <span className="text-gray-600">{animal.bloodline}</span>
                </div>
              )}
              {animal.sire && (
                <div className="flex justify-between py-3 border-b border-gray-200" data-testid="detail-sire">
                  <span className="font-semibold text-gray-700">Sire:</span>
                  <span className="text-gray-600">{animal.sire}</span>
                </div>
              )}
              {animal.dam && (
                <div className="flex justify-between py-3 border-b border-gray-200" data-testid="detail-dam">
                  <span className="font-semibold text-gray-700">Dam:</span>
                  <span className="text-gray-600">{animal.dam}</span>
                </div>
              )}
            </div>

            {animal.description && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-[#0f5132] mb-3" data-testid="detail-description-title">Description</h3>
                <p className="text-gray-700 leading-relaxed" data-testid="detail-description">{animal.description}</p>
              </div>
            )}

            {animal.health_records && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-[#0f5132] mb-3" data-testid="detail-health-title">Health Records</h3>
                <p className="text-gray-700 leading-relaxed" data-testid="detail-health">{animal.health_records}</p>
              </div>
            )}

            <div className="flex gap-4">
              <Link to={`/contact?animal=${animal.id}&type=buy`} className="flex-1">
                <Button 
                  className="w-full btn-hover bg-[#0f5132] hover:bg-[#0a3c24] text-white font-semibold py-6 rounded-full"
                  data-testid="detail-inquire-btn"
                >
                  Buy Now
                </Button>
              </Link>
              <Link to={`/contact?animal=${animal.id}&type=offer`} className="flex-1">
                <Button 
                  variant="outline"
                  className="w-full btn-hover border-2 border-[#0f5132] text-[#0f5132] hover:bg-[#0f5132] hover:text-white font-semibold py-6 rounded-full"
                  data-testid="detail-offer-btn"
                >
                  Submit Offer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LivestockDetail;
