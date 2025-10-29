import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BlogPage = () => {
  const [blogData, setBlogData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogData();
  }, []);

  const fetchBlogData = async () => {
    try {
      const response = await axios.get(`${API}/blog`);
      setBlogData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching blog data:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6]">
        <Navigation />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3d5a3d]"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navigation />
      <PriceTicker />

      <section className="py-20 px-6 max-w-4xl mx-auto">
        {/* Hero Image */}
        <div className="mb-12 text-center">
          <img 
            src="/Sheep+Grazing+Sunset.webp" 
            alt="Sheep grazing at sunset on Shiloh Ridge Farm" 
            className="rounded-2xl shadow-lg max-w-full h-auto mx-auto"
            style={{ maxHeight: '400px', objectFit: 'cover' }}
          />
          <p className="text-sm text-gray-500 mt-4">Sunset on the pastures at Shiloh Ridge Farm</p>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 text-[#3d5a3d]">
          {blogData?.title || "Farm Blog"}
        </h1>
        <p className="text-center text-gray-600 mb-12 text-lg">
          Stories and insights from Shiloh Ridge Farm
        </p>

        {/* Important Links Section */}
        <div className="bg-white rounded-2xl p-8 mb-12 shadow-lg">
          <h2 className="text-2xl font-bold text-[#3d5a3d] mb-6">Important Resources for Breeders</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://katahdins.org/register-sheep/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#e8f4e8] p-6 rounded-xl hover:bg-[#d4edda] transition-colors group"
            >
              <h3 className="text-lg font-semibold text-[#3d5a3d] mb-2 group-hover:text-[#2e472e]">
                KHSI Sheep Registration
              </h3>
              <p className="text-gray-600 text-sm">
                Register your Katahdin sheep with the Katahdin Hair Sheep International registry.
              </p>
            </a>
            <a
              href="https://katahdins.org/nsip/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#e8f4e8] p-6 rounded-xl hover:bg-[#d4edda] transition-colors group"
            >
              <h3 className="text-lg font-semibold text-[#3d5a3d] mb-2 group-hover:text-[#2e472e]">
                National Sheep Improvement Program (NSIP)
              </h3>
              <p className="text-gray-600 text-sm">
                Important resource for new and experienced breeders tracking genetic improvement.
              </p>
            </a>
          </div>
          <div className="mt-6 text-center">
            <Link
              to="/katahdin"
              className="inline-block bg-[#3d5a3d] text-white px-6 py-3 rounded-lg hover:bg-[#2e472e] transition-colors font-medium"
            >
              Learn More About Katahdin Sheep →
            </Link>
          </div>
        </div>

        {/* Blog Posts */}
        {blogData?.posts && blogData.posts.length > 0 ? (
          <div className="space-y-12">
            {blogData.posts.map((post) => (
              <article key={post.id} className="bg-white rounded-2xl p-8 shadow-lg">
                <header className="mb-6">
                  <h2 className="text-3xl font-bold text-[#3d5a3d] mb-4">
                    {post.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>By {post.author}</span>
                    <span>•</span>
                    <span>{new Date(post.published_date).toLocaleDateString()}</span>
                    {post.tags && post.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex gap-2">
                          {post.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="bg-[#e8f4e8] text-[#3d5a3d] px-2 py-1 rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </header>

                <div className="prose prose-lg max-w-none">
                  {post.content.split('\n').map((paragraph, index) => {
                    if (paragraph.trim() === '') return null;

                    // Check if it's a numbered list item
                    if (/^\d+\./.test(paragraph.trim())) {
                      return (
                        <div key={index} className="mb-4">
                          <strong className="text-[#3d5a3d]">{paragraph.trim()}</strong>
                        </div>
                      );
                    }

                    return (
                      <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-gray-600">No blog posts available yet.</p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default BlogPage;