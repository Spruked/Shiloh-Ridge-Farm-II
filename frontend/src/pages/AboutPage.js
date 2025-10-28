import { useState, useEffect } from "react";
import axios from "axios";
import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AboutPage = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAboutContent();
  }, []);

  const fetchAboutContent = async () => {
    try {
      const response = await axios.get(`${API}/about`);
      setContent(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching about content:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navigation />
      <PriceTicker />

      <section className="py-20 px-6 max-w-5xl mx-auto" data-testid="about-page">
        {loading ? (
          <div className="text-center py-20" data-testid="about-loading">
            <div className="spinner w-12 h-12 border-4 border-[#3d5a3d] border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-16">
              <img 
                src="http://localhost:8000/images/ShilohRidgeFarmicon256.png" 
                alt="Shiloh Ridge Farm"
                className="w-40 h-40 mx-auto mb-8"
                data-testid="about-logo"
              />
              <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-[#3d5a3d]" data-testid="about-title">
                {content?.title || "About Shiloh Ridge Farm"}
              </h1>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 mb-12">
              <p className="text-lg text-gray-700 leading-relaxed mb-8" data-testid="about-content">
                {content?.content}
              </p>

              {content?.mission && (
                <div className="mb-8" data-testid="about-mission-section">
                  <h2 className="text-3xl font-bold text-[#3d5a3d] mb-4" data-testid="about-mission-title">Our Mission</h2>
                  <p className="text-lg text-gray-700 leading-relaxed" data-testid="about-mission">
                    {content.mission}
                  </p>
                </div>
              )}

              {content?.history && (
                <div data-testid="about-history-section">
                  <h2 className="text-3xl font-bold text-[#3d5a3d] mb-4" data-testid="about-history-title">Our History</h2>
                  <p className="text-lg text-gray-700 leading-relaxed" data-testid="about-history">
                    {content.history}
                  </p>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-[#e8f4e8] rounded-2xl p-8 text-center" data-testid="about-value-integrity">
                <div className="w-16 h-16 bg-[#3d5a3d] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl text-white">✔️</span>
                </div>
                <h3 className="text-xl font-bold text-[#3d5a3d] mb-2">Integrity</h3>
                <p className="text-gray-700">Our backbone in every transaction</p>
              </div>

              <div className="bg-[#e8f4e8] rounded-2xl p-8 text-center" data-testid="about-value-honesty">
                <div className="w-16 h-16 bg-[#3d5a3d] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl text-white">💪</span>
                </div>
                <h3 className="text-xl font-bold text-[#3d5a3d] mb-2">Honesty</h3>
                <p className="text-gray-700">The muscle behind our operations</p>
              </div>

              <div className="bg-[#e8f4e8] rounded-2xl p-8 text-center" data-testid="about-value-quality">
                <div className="w-16 h-16 bg-[#3d5a3d] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl text-white">🏆</span>
                </div>
                <h3 className="text-xl font-bold text-[#3d5a3d] mb-2">Quality</h3>
                <p className="text-gray-700">Excellence in every animal</p>
              </div>
            </div>
          </>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;