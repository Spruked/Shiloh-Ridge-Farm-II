import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/buttons";
import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";
import { accountBenefits, livestockFeatures } from "../config/homeContent";
import { SITE } from "../config/site";
import { getApiBaseUrl } from "../lib/backend";
import { resolveMediaUrl } from "../lib/media";

const API = getApiBaseUrl();
const FARM_LOGO_URL = `${process.env.PUBLIC_URL || ""}${SITE.logoPath}`;

const HomePage = () => {
  const [featuredLivestock, setFeaturedLivestock] = useState([]);
  const hasLoggedLivestockErrorRef = useRef(false);

  useEffect(() => {
    fetchFeaturedLivestock();
  }, []);

  const fetchFeaturedLivestock = async () => {
    try {
      const response = await axios.get(`${API}/livestock`, { timeout: 8000 });
      setFeaturedLivestock(response.data.filter((l) => l.status === "available").slice(0, 3));
      hasLoggedLivestockErrorRef.current = false;
    } catch (error) {
      if (!hasLoggedLivestockErrorRef.current) {
        console.error("Error fetching livestock:", error);
        hasLoggedLivestockErrorRef.current = true;
      }
      setFeaturedLivestock([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3e7]">
      <Navigation />
      <PriceTicker />
      
      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden pb-16 pt-10">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/Sheep+Grazing+Sunset.webp)',
            filter: 'brightness(0.56)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-[#f7f3e7]" />
        
        <div className="relative z-10 max-w-5xl px-6 text-center text-white fade-in-up">
          <img
            src={FARM_LOGO_URL}
            alt="Shiloh Ridge Farm"
            className="mx-auto mb-4 h-auto w-40 object-contain drop-shadow-2xl sm:w-52 lg:w-60"
            width="256"
            height="260"
            fetchPriority="high"
            data-testid="farm-logo"
          />
          <h1 className="mb-5 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl" data-testid="hero-title">
            {SITE.farmName}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg font-light leading-relaxed sm:text-xl" data-testid="hero-subtitle">
            Quality Katahdin Sheep, Live Hogs & Select Cattle
            <br />
            <span className="text-base mt-2 block italic">{SITE.tagline}</span>
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/livestock">
              <Button 
                size="lg" 
                className="btn-hover rounded-md bg-[#0f5132] px-8 py-6 text-lg font-semibold text-white hover:bg-[#0a3c24]"
                data-testid="view-livestock-btn"
              >
                View Livestock
              </Button>
            </Link>
            <Link to="/contact">
              <Button 
                size="lg" 
                variant="outline" 
                className="btn-hover rounded-md border-2 border-white px-8 py-6 text-lg font-semibold text-white hover:bg-white hover:text-[#0f5132]"
                data-testid="contact-us-btn"
              >
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20" data-testid="features-section">
        <div className="grid gap-6 md:grid-cols-3">
          {livestockFeatures.map(({ icon: Icon, title, description, testId }) => (
            <div className="card-hover rounded-lg bg-white p-7 shadow-md ring-1 ring-[#e7eddc]" data-testid={testId} key={title}>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-md bg-[#e7eddc] text-[#0f5132]">
                <Icon size={26} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <h3 className="mb-4 text-2xl font-bold text-[#0f5132]">{title}</h3>
              <p className="leading-relaxed text-gray-700">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Livestock */}
      {featuredLivestock.length > 0 && (
        <section className="bg-white px-6 py-16 sm:py-20" data-testid="featured-livestock-section">
          <div className="max-w-7xl mx-auto">
            <h2 className="mb-4 text-center text-4xl font-bold text-[#0f5132] sm:text-5xl" data-testid="featured-title">
              Featured Livestock
            </h2>
            <p className="text-center text-gray-600 mb-12 text-lg">Available for purchase</p>
            
            <div className="grid gap-6 md:grid-cols-3">
              {featuredLivestock.map((animal) => (
                <Link to={`/livestock/${animal.id}`} key={animal.id} className="block">
                  <div className="card-hover overflow-hidden rounded-lg bg-[#f7f3e7] shadow-md ring-1 ring-[#e7eddc]" data-testid={`featured-animal-${animal.id}`}>
                    <div className="h-64 bg-[#e7eddc] flex items-center justify-center">
                      {resolveMediaUrl(animal.photos?.[0]) ? (
                        <img
                          src={resolveMediaUrl(animal.photos?.[0])}
                          alt={animal.name || animal.tag_number || "Available livestock"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-[#0f5132] uppercase tracking-widest">{animal.animal_type || "Animal"}</span>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-2xl font-bold mb-2 text-[#0f5132]">{animal.name || animal.tag_number}</h3>
                      <p className="text-gray-600 mb-2 capitalize">{animal.animal_type}</p>
                      {animal.price && (
                        <p className="text-2xl font-bold text-[#0f5132]">${animal.price.toLocaleString()}</p>
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
                  className="btn-hover rounded-md bg-[#0f5132] px-8 py-4 font-semibold text-white hover:bg-[#0a3c24]"
                  data-testid="view-all-livestock-btn"
                >
                  View All Livestock
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Why Create an Account Section */}
      <section className="bg-[#f7f3e7] px-6 py-16 sm:py-20" data-testid="signup-benefits-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="mb-4 inline-block rounded-md bg-[#e7eddc] px-4 py-1 text-sm font-semibold uppercase tracking-wide text-[#0f5132]">
              Free to Join
            </span>
            <h2 className="mb-4 text-4xl font-bold text-[#0f5132] sm:text-5xl">
              Why Create an Account?
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Join the Shiloh Ridge Farm family and get exclusive access to member benefits, early availability, and direct farm updates.
            </p>
          </div>

          <div className="mb-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {accountBenefits.map(({ icon: Icon, title, description }) => (
              <div className="card-hover rounded-lg border border-[#e7eddc] bg-white p-7 shadow-md" key={title}>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-[#e7eddc] text-[#0f5132]">
                  <Icon size={23} strokeWidth={1.9} aria-hidden="true" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-[#0f5132]">{title}</h3>
                <p className="leading-relaxed text-gray-600">{description}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/account/register">
              <Button
                size="lg"
                className="btn-hover rounded-md bg-[#0f5132] px-10 py-4 text-lg font-semibold text-white hover:bg-[#0a3c24]"
                data-testid="signup-cta-btn"
              >
                Create Free Account
              </Button>
            </Link>
            <Link to="/account/login">
              <Button
                size="lg"
                variant="outline"
                className="btn-hover rounded-md border-2 border-[#0f5132] px-10 py-4 text-lg font-semibold text-[#0f5132] hover:bg-[#e7eddc]"
                data-testid="login-cta-btn"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-[#0f5132] to-[#0a3c24] px-6 py-16 text-white sm:py-20" data-testid="cta-section">
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
              className="btn-hover rounded-md bg-white px-8 py-4 font-semibold text-[#0f5132] hover:bg-[#e7eddc]"
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
