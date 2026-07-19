import { useState, useEffect } from "react";
import axios from "axios";
import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";
import { getApiBaseUrl } from "../lib/backend";
import { resolveMediaUrl } from "../lib/media";

const API = getApiBaseUrl();

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
      // Save to localStorage for persistence
      localStorage.setItem('about_content', JSON.stringify(response.data));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching about content:", error);
      // Try to load from localStorage as fallback
      const savedContent = localStorage.getItem('about_content');
      if (savedContent) {
        try {
          const parsedContent = JSON.parse(savedContent);
          setContent(parsedContent);
        } catch (parseError) {
          console.error("Error parsing saved about content:", parseError);
        }
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3e7]">
      <Navigation />
      <PriceTicker />

      <section className="py-20 px-6 max-w-5xl mx-auto" data-testid="about-page">
        {loading ? (
          <div className="text-center py-20" data-testid="about-loading">
            <div className="spinner w-12 h-12 border-4 border-[#0f5132] border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-16">
              <img 
                src="/ShilohRidgeFarmicon256.png" 
                alt="Shiloh Ridge Farm"
                className="w-56 mx-auto mb-8 object-contain opacity-90"
                data-testid="about-logo"
              />
              <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-[#0f5132]" data-testid="about-title">
                {content?.title || "About Shiloh Ridge Farm"}
              </h1>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 mb-12">
              <p className="text-lg text-gray-700 leading-relaxed mb-8" data-testid="about-content">
                {content?.content}
              </p>

              {content?.mission && (
                <div className="mb-8" data-testid="about-mission-section">
                  <h2 className="text-3xl font-bold text-[#0f5132] mb-4" data-testid="about-mission-title">Our Mission</h2>
                  <p className="text-lg text-gray-700 leading-relaxed" data-testid="about-mission">
                    {content.mission}
                  </p>
                </div>
              )}

              {content?.history && (
                <div data-testid="about-history-section">
                  <h2 className="text-3xl font-bold text-[#0f5132] mb-4" data-testid="about-history-title">Our History</h2>
                  <p className="text-lg text-gray-700 leading-relaxed" data-testid="about-history">
                    {content.history}
                  </p>
                </div>
              )}
            </div>

            <div className="mb-12 rounded-2xl overflow-hidden shadow-lg">
              <img
                src="/katahdin-sheep-grazing_orig.jpg"
                alt="Shiloh Ridge Farm flock resting under shade trees"
                className="w-full object-cover"
                style={{ maxHeight: "380px", objectFit: "cover", objectPosition: "center 40%" }}
              />
            </div>

            <div className="mb-12 overflow-hidden rounded-2xl bg-white p-8 shadow-lg md:p-10" data-testid="about-shep-section">
              <img
                src={resolveMediaUrl("assets/images/best_shep.png")}
                alt="Shep, the beloved farm dog who inspired the Shiloh Ridge website ORB"
                className="mx-auto mb-6 h-52 w-52 rounded-full object-cover shadow-md md:float-left md:mb-3 md:mr-8"
                data-testid="about-shep-image"
              />
              <h2 className="mb-4 text-3xl font-bold text-[#0f5132]">The Story of Shep</h2>
              <p className="text-lg leading-relaxed text-gray-700">
                Shep was a beloved dog who cared for the sheep at Shiloh Ridge Farm for several years. He was a
                steady, familiar presence with the flock and became a cherished part of life on the farm. His years
                of loyal companionship and watchful care are the origin of Shep, our website ORB. Just as the real
                Shep looked after the sheep, the Shep ORB is here to warmly guide visitors around the farm website
                and help them find what they need.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-[#e7eddc] rounded-2xl p-8 text-center" data-testid="about-value-integrity">
                <div className="w-16 h-16 bg-[#0f5132] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-bold text-white">I</span>
                </div>
                <h3 className="text-xl font-bold text-[#0f5132] mb-2">Integrity</h3>
                <p className="text-gray-700">Our backbone in every transaction</p>
              </div>

              <div className="bg-[#e7eddc] rounded-2xl p-8 text-center" data-testid="about-value-honesty">
                <div className="w-16 h-16 bg-[#0f5132] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-bold text-white">H</span>
                </div>
                <h3 className="text-xl font-bold text-[#0f5132] mb-2">Honesty</h3>
                <p className="text-gray-700">The muscle behind our operations</p>
              </div>

              <div className="bg-[#e7eddc] rounded-2xl p-8 text-center" data-testid="about-value-quality">
                <div className="w-16 h-16 bg-[#0f5132] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-bold text-white">Q</span>
                </div>
                <h3 className="text-xl font-bold text-[#0f5132] mb-2">Quality</h3>
                <p className="text-gray-700">Excellence in every animal</p>
              </div>
            </div>

            {/* Katahdin Breeder Registry */}
            <div className="mt-12 bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-[#0f5132] px-8 py-5">
                <h2 className="text-2xl font-bold text-white">Registered Katahdin Breeder</h2>
                <p className="text-green-200 text-sm mt-1">Listed on the Katahdin Sheep Breeders Directory — Missouri</p>
              </div>
              <div className="p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-1">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Shiloh Ridge Farm is a verified Katahdin sheep breeder listed in the national breeder directory on Creatures.com.
                    Katahdin sheep are a hair breed developed for superior meat quality and low-maintenance management — naturally
                    shedding their coat each spring, parasite-resistant, and well-suited to the Missouri Ozarks climate.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    We raise Katahdins focused on maternal performance, muscling, and adaptability.
                    Our breeding stock is selected for growth rate, hardiness, and temperament — traits that matter
                    whether you're building a commercial flock or looking for a proven show prospect.
                  </p>
                </div>
                <a
                  href="https://creatures.com/directory/breeders/shiloh-ridge-farm-1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex flex-col items-center gap-2 rounded-xl border-2 border-[#0f5132] px-6 py-4 text-center hover:bg-[#e7eddc] transition-colors"
                >
                  <span className="text-sm font-semibold text-[#0f5132]">View Our Listing</span>
                  <span className="text-xs text-gray-500">creatures.com</span>
                </a>
              </div>

              {/* Browse all MO breeders link */}
              <div className="border-t border-gray-100 px-8 py-3 bg-stone-50">
                <a
                  href="https://creatures.com/directory/breeders?species=sheep&breed=katahdin&state=MO&page=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#0f5132] hover:underline font-medium"
                >
                  Browse all Katahdin breeders in Missouri →
                </a>
              </div>
            </div>

            {/* Find Us / Map */}
            <div className="mt-8 bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-[#0f5132] px-8 py-5">
                <h2 className="text-2xl font-bold text-white">Find Us</h2>
                <p className="text-green-200 text-sm mt-1">Maitland, Missouri</p>
              </div>
              <div className="flex flex-col md:flex-row">
                {/* Map embed */}
                <div className="w-full md:w-1/2 h-64 md:h-80">
                  <iframe
                    title="Shiloh Ridge Farm location"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=-95.1459%2C40.0897%2C-95.1059%2C40.1297&layer=mapnik&marker=40.109745%2C-95.125950"
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                </div>
                {/* Address + directions */}
                <div className="flex-1 p-8 flex flex-col justify-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#0f5132] mb-1">Shiloh Ridge Farm</h3>
                    <p className="text-gray-700">20705 Quebec Road</p>
                    <p className="text-gray-700">Maitland, Missouri 64466</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href="https://www.google.com/maps/dir/?api=1&destination=40.109745,-95.125950"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0f5132] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a3c24] transition-colors"
                    >
                      Get Directions
                    </a>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=40.109745,-95.125950"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0f5132] px-5 py-2.5 text-sm font-semibold text-[#0f5132] hover:bg-[#e7eddc] transition-colors"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>
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
