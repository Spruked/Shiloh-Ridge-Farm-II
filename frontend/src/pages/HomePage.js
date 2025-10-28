import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/buttons";
import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const [featuredLivestock, setFeaturedLivestock] = useState([]);

  useEffect(() => {
    fetchFeaturedLivestock();
  }, []);

  const fetchFeaturedLivestock = async () => {
    try {
      const response = await axios.get(`${API}/livestock`);
      setFeaturedLivestock(response.data.filter(l => l.status === "available").slice(0, 3));
    } catch (error) {
      console.error("Error fetching livestock:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navigation />
      <PriceTicker />
      
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/shilohsheep1920.WebP)',
            filter: 'brightness(0.6)'
          }}
        />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-[#faf9f6]"></div>
        
        <div className="relative z-10 text-center text-white px-6 max-w-5xl fade-in-up">
          <img 
            src="http://localhost:8000/images/ShilohRidgeFarmicon256.png" 
            alt="Shiloh Ridge Farm"
            className="w-56 h-56 mx-auto mb-8 drop-shadow-2xl"
            data-testid="farm-logo"
          />
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight" data-testid="hero-title">
            Shiloh Ridge Farm
          </h1>
          <p className="text-lg sm:text-xl mb-8 max-w-2xl mx-auto font-light" data-testid="hero-subtitle">
            Quality Katahdin Sheep, Live Hogs & Select Cattle
            <br />
            <span className="text-base mt-2 block italic">Integrity is the Backbone, Honesty the Muscle</span>
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/livestock">
              <Button 
                size="lg" 
                className="btn-hover bg-[#3d5a3d] hover:bg-[#2d4a2d] text-white font-semibold px-8 py-6 text-lg rounded-full"
                data-testid="view-livestock-btn"
              >
                View Livestock
              </Button>
            </Link>
            <Link to="/contact">
              <Button 
                size="lg" 
                variant="outline" 
                className="btn-hover border-2 border-white text-white hover:bg-white hover:text-[#3d5a3d] font-semibold px-8 py-6 text-lg rounded-full"
                data-testid="contact-us-btn"
              >
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto" data-testid="features-section">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card-hover bg-white rounded-2xl p-8 shadow-lg" data-testid="feature-card-sheep">
            <div className="w-16 h-16 bg-[#e8f4e8] rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl">🐑</span>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-[#3d5a3d]">Katahdin Sheep</h3>
            <p className="text-gray-700 leading-relaxed">
              Premium quality Katahdin sheep with complete registration and bloodline documentation. Perfect for meat production and show.
            </p>
          </div>
          
          <div className="card-hover bg-white rounded-2xl p-8 shadow-lg" data-testid="feature-card-hogs">
            <div className="w-16 h-16 bg-[#e8f4e8] rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl">🐖</span>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-[#3d5a3d]">Live Hogs</h3>
            <p className="text-gray-700 leading-relaxed">
              Healthy, well-maintained hogs raised with care. Full health records and breeding information available.
            </p>
          </div>
          
          <div className="card-hover bg-white rounded-2xl p-8 shadow-lg" data-testid="feature-card-cattle">
            <div className="w-16 h-16 bg-[#e8f4e8] rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl">🐄</span>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-[#3d5a3d]">Select Cattle</h3>
            <p className="text-gray-700 leading-relaxed">
              Small selection of quality cattle, carefully chosen and maintained to meet the highest standards.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Livestock */}
      {featuredLivestock.length > 0 && (
        <section className="py-20 px-6 bg-white" data-testid="featured-livestock-section">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-bold text-center mb-4 text-[#3d5a3d]" data-testid="featured-title">
              Featured Livestock
            </h2>
            <p className="text-center text-gray-600 mb-12 text-lg">Available for purchase</p>
            
            <div className="grid md:grid-cols-3 gap-8">
              {featuredLivestock.map((animal) => (
                <Link to={`/livestock/${animal.id}`} key={animal.id}>
                  <div className="card-hover bg-[#faf9f6] rounded-2xl overflow-hidden shadow-lg" data-testid={`featured-animal-${animal.id}`}>
                    <div className="h-64 bg-[#e8f4e8] flex items-center justify-center">
                      {animal.photos && animal.photos.length > 0 ? (
                        <img src={animal.photos[0]} alt={animal.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-6xl">🐑</span>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-2xl font-bold mb-2 text-[#3d5a3d]">{animal.name || animal.tag_number}</h3>
                      <p className="text-gray-600 mb-2 capitalize">{animal.animal_type}</p>
                      {animal.price && (
                        <p className="text-2xl font-bold text-[#3d5a3d]">${animal.price.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Link to="/livestock">
                <Button 
                  size="lg" 
                  className="btn-hover bg-[#3d5a3d] hover:bg-[#2d4a2d] text-white font-semibold px-8 py-4 rounded-full"
                  data-testid="view-all-livestock-btn"
                >
                  View All Livestock
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 px-6 bg-linear-to-br from-[#3d5a3d] to-[#2d4a2d] text-white" data-testid="cta-section">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6" data-testid="cta-title">
            Ready to Expand Your Herd?
          </h2>
          <p className="text-lg mb-8 opacity-90" data-testid="cta-description">
            Contact us today to learn more about our available livestock and make an offer.
          </p>
          <Link to="/contact">
            <Button 
              size="lg" 
              className="btn-hover bg-white text-[#3d5a3d] hover:bg-[#e8f4e8] font-semibold px-8 py-4 rounded-full"
              data-testid="cta-contact-btn"
            >
              Get in Touch
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;