import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";
import { getApiBaseUrl } from "../lib/backend";

const API = getApiBaseUrl();

const renderInlineMarkdown = (text = "") => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const isSpecialLine = (line = "") => {
  const trimmed = line.trim();
  return (
    trimmed === "---" ||
    /^!\[[^\]]*\]\(([^)]+)\)$/.test(trimmed) ||
    /^(#{1,3})\s+/.test(trimmed) ||
    /^>\s+/.test(trimmed) ||
    /^\*\s+/.test(trimmed) ||
    /^\d+\.\s+/.test(trimmed)
  );
};

const renderMarkdownContent = (content = "") => {
  const lines = content.split("\n");
  const elements = [];
  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed === "---") {
      elements.push(<hr key={`hr-${index}`} className="my-8 border-slate-200" />);
      index += 1;
      continue;
    }

    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      elements.push(
        <figure key={`image-${index}`} className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
          <img
            src={imageMatch[2]}
            alt={imageMatch[1] || "Blog image"}
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </figure>
      );
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      if (level === 1) {
        elements.push(
          <h2 key={`h1-${index}`} className="mt-10 mb-4 text-3xl font-bold text-[#0f5132] sm:text-4xl">
            {renderInlineMarkdown(headingText)}
          </h2>
        );
      } else if (level === 2) {
        elements.push(
          <h3 key={`h2-${index}`} className="mt-8 mb-3 text-2xl font-bold text-slate-900">
            {renderInlineMarkdown(headingText)}
          </h3>
        );
      } else {
        elements.push(
          <h4 key={`h3-${index}`} className="mt-6 mb-2 text-xl font-semibold text-slate-900">
            {renderInlineMarkdown(headingText)}
          </h4>
        );
      }
      index += 1;
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      elements.push(
        <blockquote key={`quote-${index}`} className="my-6 rounded-r-xl border-l-4 border-[#0f5132] bg-[#eef5ee] px-5 py-4 text-lg font-medium text-slate-700">
          {renderInlineMarkdown(trimmed.replace(/^>\s+/, ""))}
        </blockquote>
      );
      index += 1;
      continue;
    }

    if (/^\*\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^\*\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\*\s+/, ""));
        index += 1;
      }
      elements.push(
        <ul key={`ul-${index}`} className="mb-6 ml-6 list-disc space-y-2 text-gray-700">
          {items.map((item, itemIndex) => (
            <li key={`ul-item-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      elements.push(
        <ol key={`ol-${index}`} className="mb-6 ml-6 list-decimal space-y-2 text-gray-700">
          {items.map((item, itemIndex) => (
            <li key={`ol-item-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isSpecialLine(lines[index])) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    elements.push(
      <p key={`p-${index}`} className="mb-4 text-gray-700 leading-relaxed">
        {renderInlineMarkdown(paragraphLines.join(" "))}
      </p>
    );
  }

  return elements;
};

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
      localStorage.setItem("blog_data", JSON.stringify(response.data));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching blog data:", error);
      const savedBlogData = localStorage.getItem("blog_data");
      if (savedBlogData) {
        try {
          const parsedBlogData = JSON.parse(savedBlogData);
          setBlogData(parsedBlogData);
        } catch (parseError) {
          console.error("Error parsing saved blog data:", parseError);
        }
      }
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f3e7]">
        <Navigation />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0f5132]"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3e7]">
      <Navigation />
      <PriceTicker />

      <section className="py-20 px-6 max-w-4xl mx-auto">
        <div className="mb-12 text-center">
          <img
            src="/flockofdominicskatahdins.jpeg"
            alt="Shiloh Ridge Farm flock in the field"
            className="rounded-2xl shadow-lg w-full mx-auto"
            style={{ maxHeight: "400px", objectFit: "cover" }}
          />
          <p className="text-sm text-gray-500 mt-4">The Shiloh Ridge flock at pasture</p>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 text-[#0f5132]">
          {blogData?.title || "Farm Blog"}
        </h1>
        <p className="text-center text-gray-600 mb-12 text-lg">
          Stories and insights from Shiloh Ridge Farm
        </p>

        <div className="bg-white rounded-2xl p-8 mb-12 shadow-lg">
          <h2 className="text-2xl font-bold text-[#0f5132] mb-6">Important Resources for Breeders</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://katahdins.org/register-sheep/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#e7eddc] p-6 rounded-xl hover:bg-[#dde8d7] transition-colors group"
            >
              <h3 className="text-lg font-semibold text-[#0f5132] mb-2 group-hover:text-[#1a3c22]">
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
              className="bg-[#e7eddc] p-6 rounded-xl hover:bg-[#dde8d7] transition-colors group"
            >
              <h3 className="text-lg font-semibold text-[#0f5132] mb-2 group-hover:text-[#1a3c22]">
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
              className="inline-block bg-[#0f5132] text-white px-6 py-3 rounded-lg hover:bg-[#1a3c22] transition-colors font-medium"
            >
              Learn More About Katahdin Sheep →
            </Link>
          </div>
        </div>

        {blogData?.posts && blogData.posts.length > 0 ? (
          <div className="space-y-12">
            {blogData.posts.map((post) => (
              <article key={post.id} className="bg-white rounded-2xl p-8 shadow-lg">
                <header className="mb-6">
                  <h2 className="text-3xl font-bold text-[#0f5132] mb-4">{post.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                    <span>By {post.author}</span>
                    <span>•</span>
                    <span>{new Date(post.published_date).toLocaleDateString()}</span>
                    {post.tags && post.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex gap-2 flex-wrap">
                          {post.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="bg-[#e7eddc] text-[#0f5132] px-2 py-1 rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </header>

                <div className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-strong:text-slate-900 prose-p:text-gray-700 prose-li:text-gray-700">
                  {renderMarkdownContent(post.content)}
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
