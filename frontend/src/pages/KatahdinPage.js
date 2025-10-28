import { useState } from "react";
import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";

const KatahdinPage = () => {
  const [activeSection, setActiveSection] = useState("introduction");

  const sections = [
    { id: "introduction", title: "Introduction" },
    { id: "origins", title: "Origins & Breed Culture" },
    { id: "traits", title: "Key Traits & Why They Matter" },
    { id: "registries", title: "Registries & Genetic Improvement" },
    { id: "regional", title: "Practical Considerations" },
    { id: "markets", title: "Regional Markets & Auctions" },
    { id: "future", title: "The Future of Sheep" },
    { id: "strategy", title: "Our Strategy at Shiloh Ridge" },
    { id: "conclusion", title: "Conclusion" },
    { id: "links", title: "Useful Links" }
  ];

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navigation />
      <PriceTicker />

      <section className="py-20 px-6 max-w-6xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 text-[#3d5a3d]">
          Katahdin Sheep – Heritage, Culture, Performance & the Future of the Flock
        </h1>
        <p className="text-center text-gray-600 mb-12 text-lg max-w-4xl mx-auto">
          A comprehensive guide to Katahdin hair sheep at Shiloh Ridge Farm
        </p>

        {/* Table of Contents */}
        <div className="bg-white rounded-2xl p-6 mb-12 shadow-lg">
          <h2 className="text-2xl font-bold text-[#3d5a3d] mb-6">Table of Contents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`text-left p-3 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-[#e8f4e8] text-[#3d5a3d] font-semibold'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Introduction */}
          <div id="introduction" className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6">Introduction</h2>
                <div className="prose prose-lg max-w-none">
                  <p className="mb-4">
                    Hair sheep have quietly been gaining ground in the American sheep-industry landscape. Among them, the Katahdin stands out as a breed of intelligent design, excellent functionality and broad applicability. At Shiloh Ridge Farm, we believe understanding the culture of Katahdin sheep—and how they integrate into today's sheep market—sets us apart.
                  </p>
                  <p className="mb-4">
                    What follows is a deeper dive: the breed's origins, culture, performance advantages, the role of genetic improvement (via programs like National Sheep Improvement Program [NSIP]), practical considerations, and a look ahead at sheep-industry trends in our region and beyond.
                  </p>
                </div>
              </div>
              <div className="text-center">
                <img 
                  src="http://localhost:8000/images/katahdin-sheep-grazing_orig.jpg" 
                  alt="Katahdin sheep grazing in pasture" 
                  className="rounded-lg shadow-lg max-w-full h-auto"
                />
                <p className="text-sm text-gray-500 mt-2">Katahdin sheep thriving in pasture-based systems</p>
              </div>
            </div>
          </div>

          {/* Origins & Breed Culture */}
          <div id="origins" className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6">Origins & Breed Culture</h2>
            <div className="prose prose-lg max-w-none">
              <p className="mb-4">
                The Katahdin sheep originated in the United States, named for Mount Katahdin in Maine. According to breed history, the founder crossed African hair sheep from the Virgin Islands with meat-type English breeds to develop a hair-sheep that could thrive in diverse U.S. environments.
              </p>
              <p className="mb-4">
                From this foundation grew a community of breeders committed to practicality, low-input systems and hardy genetics. The culture around Katahdins is not about maximal numbers, but about smart production: well-balanced animals, sustainable systems, and a focus on productivity over gimmicks. They fit well in regenerative, pasture-based systems and in smaller, value-driven operations—like ours—where labour, cost and health matter just as much as raw output.
              </p>
            </div>
          </div>

          {/* Key Traits */}
          <div id="traits" className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6">Key Traits & Why They Matter</h2>
                <div className="prose prose-lg max-w-none">
                  <p className="mb-4">Here are the traits that put Katahdins ahead in many operations:</p>
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li><strong>Shedding coat:</strong> No need for annual shearing or heavy maintenance of fleece. Simplifies shepherding.</li>
                    <li><strong>Mothering & fertility:</strong> Good lambing percentages, prolificacy and strong maternal ability.</li>
                    <li><strong>Parasite resistance:</strong> A major benefit in humid/mixed-pasture regions where internal parasites limit production.</li>
                    <li><strong>Adaptability:</strong> They perform well under diverse management systems—commercial crossbreeding, pasture finishing, ethnic markets, light lamb markets.</li>
                    <li><strong>Market versatility:</strong> Whether purebred or commercial, Katahdins bring reliable carcass merits, especially in lighter weight lamb markets (&lt;100 lbs) where premium niche markets exist.</li>
                  </ul>
                </div>
              </div>
              <div className="text-center">
                <img 
                  src="http://localhost:8000/images/flockofdominicskatahdins.jpeg" 
                  alt="Flock of Katahdin sheep" 
                  className="rounded-lg shadow-lg max-w-full h-auto"
                />
                <p className="text-sm text-gray-500 mt-2">Healthy Katahdin flock showing breed characteristics</p>
              </div>
            </div>
          </div>

          {/* Registries & Genetic Improvement */}
          <div id="registries" className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6">The Role of Registries & Genetic Improvement</h2>
            <div className="prose prose-lg max-w-none">
              <p className="mb-4">
                A breed is only as strong as its data and structure behind it—and this is where the national registries and genetic programs come to the fore.
              </p>

              <div className="bg-[#e8f4e8] p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold text-[#3d5a3d] mb-3">KHSI (Katahdin Hair Sheep International)</h3>
                <p className="mb-3">
                  The primary breed association and registry for Katahdins in the U.S. The registry is accessible online via the "Digital Katahdin" system, allowing breeders to register stock, search databases and manage records.
                </p>
                <a
                  href="https://katahdins.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3d5a3d] hover:underline font-medium"
                >
                  Visit KHSI Website →
                </a>
              </div>

              <div className="bg-[#e8f4e8] p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold text-[#3d5a3d] mb-3">NSIP (National Sheep Improvement Program)</h3>
                <p className="mb-3">
                  This program is critical for progressive sheep breeders. Simply put: it collects performance data, computes Estimated Breeding Values (EBVs) for key traits (birth weight, weaning weight, lambs born/weaned, fecal egg counts for parasites, etc), and gives commercial and purebred producers tools to select better stock rather than relying solely on 'looks'.
                </p>
                <p className="mb-3">
                  For example, Katahdin flocks participating in NSIP can track traits like birth weight (BWT), maternal/weaning weight, number of lambs born/weaned, fecal egg count (WFEC/PFEC) for parasite resistance.
                </p>
                <a
                  href="https://nsip.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3d5a3d] hover:underline font-medium"
                >
                  Visit NSIP Website →
                </a>
              </div>

              <p className="mb-4">
                Why does this matter for us at Shiloh Ridge? Because using genetics and data means we can build a flock not just for the present, but for the future—resilient, productive, and efficient. It means our daughter's legacy has strength.
              </p>
            </div>
          </div>

          {/* Practical Considerations */}
          <div id="regional" className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6">Practical Considerations for our Region (IA/MO/KS/NE)</h2>
            <div className="prose prose-lg max-w-none">
              <p className="mb-4">
                We're based in the Midwest heartland, and while the Katahdin breed has roots in the East and South, they fit well here—with some specifics:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>With our mix of pasture, seasonal weather swings, and variable parasite pressure, the hair sheep advantage (less labour, less shearing, better parasite resilience) gives us a competitive edge.</li>
                <li>We must pay attention to market niche: Many mainstream lamb markets push heavier weights, heavier-grain finishing. Katahdins often shine in the 90-110 lb lamb market, pasture or light-feed finished, or ethnic markets where lighter lambs are preferred.</li>
                <li>Because we're in an area with robust livestock auction infrastructure, we have strong access to markets and genetic sales.</li>
              </ul>
            </div>
          </div>

          {/* Regional Markets */}
          <div id="markets" className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6">Regional Auction / Market Links & Opportunities</h2>
            <div className="prose prose-lg max-w-none">
              <p className="mb-4">
                Here are useful links and resources for livestock/small ruminant auctions in our states—great for buying, selling, building your network:
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[#f8f9fa] p-4 rounded-lg">
                  <h3 className="font-semibold text-[#3d5a3d] mb-2">Iowa</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• <a href="https://iowaagriculture.gov" target="_blank" rel="noopener noreferrer" className="text-[#3d5a3d] hover:underline">Iowa Department of Agriculture</a></li>
                    <li>• <a href="https://kalonasalesbarn.com" target="_blank" rel="noopener noreferrer" className="text-[#3d5a3d] hover:underline">Kalona Sales Barn Inc.</a></li>
                  </ul>
                </div>

                <div className="bg-[#f8f9fa] p-4 rounded-lg">
                  <h3 className="font-semibold text-[#3d5a3d] mb-2">Kansas</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• <a href="https://colbylivestockauction.com" target="_blank" rel="noopener noreferrer" className="text-[#3d5a3d] hover:underline">Colby Livestock Auction</a></li>
                    <li>• JCCC Livestock Sales (Clay Center/Junction City)</li>
                  </ul>
                </div>

                <div className="bg-[#f8f9fa] p-4 rounded-lg">
                  <h3 className="font-semibold text-[#3d5a3d] mb-2">Nebraska</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• <a href="https://wahoosalesbarn.com" target="_blank" rel="noopener noreferrer" className="text-[#3d5a3d] hover:underline">Wahoo Livestock Sales</a></li>
                  </ul>
                </div>

                <div className="bg-[#f8f9fa] p-4 rounded-lg">
                  <h3 className="font-semibold text-[#3d5a3d] mb-2">National Resources</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• <a href="https://nsip.org" target="_blank" rel="noopener noreferrer" className="text-[#3d5a3d] hover:underline">NSIP Sales & Events</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Future Outlook */}
          <div id="future" className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6">The Future & Speculation on Sheep (and Katahdins)</h2>
            <div className="prose prose-lg max-w-none">
              <p className="mb-4">
                I'm going to be blunt: the sheep business is not runaway growth like cattle or hogs right now—but that's precisely why being smart, lean and differentiated matters. Here's what I see coming—and how Katahdins play into it:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Labour/cost pressures will increase:</strong> Shepherding and sheep production will face higher labour, health, regulatory and feed costs. Breeds that demand less (shearing, tail-docking, heavy parasite treatment) will win. Katahdins check those boxes.</li>
                <li><strong>Niche markets will grow:</strong> Ethnic lamb, pasture-finished lamb, local/regional farms, value-added lamb products—these are areas where smaller scale, better quality sheep fit. Hair sheep like Katahdins can do well here.</li>
                <li><strong>Genetic data drives profit:</strong> As input costs rise, the margin for error shrinks. Beef and hog industries have long embraced data; sheep are catching up. Programs like NSIP will become standard practice—not optional.</li>
                <li><strong>Climate/resilience matters:</strong> In the face of weather extremes, parasites, pasture pressure, drought, breeds that are hardy and low input will be sought after. Katahdins align well.</li>
                <li><strong>Consolidation and specialization:</strong> Many smaller flocks will merge, focus on niche lamb or hair sheep, or exit. Crossbred commercial systems will still dominate, but foundation ewes and hair sheep breeds will gain more use.</li>
              </ul>
            </div>
          </div>

          {/* Our Strategy */}
          <div id="strategy" className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6">What We're Doing at Shiloh Ridge Farm</h2>
            <div className="prose prose-lg max-w-none">
              <p className="mb-4">In line with the above, here's our strategy:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Register and track our Katahdin stock (via KHSI) so we have sellable, pedigreed animals.</li>
                <li>Participate (or at least monitor) NSIP data and performance; select breeding stock not just on looks but on EBVs for traits like parasite resistance, prolificacy, weaning weight.</li>
                <li>Build relationships in our regional livestock auction network (IA, MO, KS, NE) so we are both buyers and sellers—not just consumers.</li>
                <li>Focus on lamb finish weights and niche markets where Katahdins excel (for example, grass/pasture lambs under 110 lbs, or high-health premium markets) rather than trying to chase heavy commodity lamb loads.</li>
                <li>Feed the vision: this is not just about business, but about legacy—providing stability, presence, and opportunity for our daughter, for our family farm, for the next generation.</li>
              </ul>
            </div>
          </div>

          {/* Conclusion */}
          <div id="conclusion" className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6">Conclusion</h2>
            <div className="prose prose-lg max-w-none">
              <p className="mb-4">
                If you combine an intelligent breed (like the Katahdin), sound management, genetic data and a clear market niche, you have a recipe for sheep-flock success in today's landscape. The old "just raise sheep and hope for lambs" approach won't cut it anymore.
              </p>
              <p className="mb-4">
                At Shiloh Ridge Farm we're building toward that future—today. We believe in heritage (how things have always been done), but we're also very much forward-thinking. The sheep will be part of that bridge.
              </p>
              <p className="mb-4">
                If you're ready to go deeper, explore breeding stock, talk genetics, or build an aligned flock—let's connect. We're in it for the long game.
              </p>
            </div>
          </div>

          {/* Useful Links */}
          <div id="links" className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6">Useful Links</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-[#3d5a3d] mb-4">Breed Resources</h3>
                <ul className="space-y-3">
                  <li>
                    <a href="https://katahdins.org" target="_blank" rel="noopener noreferrer" className="text-[#3d5a3d] hover:underline font-medium">
                      KHSI Registry: Register sheep
                    </a>
                  </li>
                  <li>
                    <a href="https://katahdins.org" target="_blank" rel="noopener noreferrer" className="text-[#3d5a3d] hover:underline font-medium">
                      KHSI Online Database
                    </a>
                  </li>
                  <li>
                    <a href="https://nsip.org" target="_blank" rel="noopener noreferrer" className="text-[#3d5a3d] hover:underline font-medium">
                      NSIP (National Sheep Improvement Program)
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-[#3d5a3d] mb-4">Regional Auctions</h3>
                <ul className="space-y-3">
                  <li>
                    <a href="https://iowaagriculture.gov" target="_blank" rel="noopener noreferrer" className="text-[#3d5a3d] hover:underline font-medium">
                      Iowa Livestock Auctions
                    </a>
                  </li>
                  <li>
                    <a href="https://kalonasalesbarn.com" target="_blank" rel="noopener noreferrer" className="text-[#3d5a3d] hover:underline font-medium">
                      Kalona Sales Barn (Iowa)
                    </a>
                  </li>
                  <li>
                    <a href="https://colbylivestockauction.com" target="_blank" rel="noopener noreferrer" className="text-[#3d5a3d] hover:underline font-medium">
                      Colby Livestock Auction (Kansas)
                    </a>
                  </li>
                  <li>
                    <a href="https://wahoosalesbarn.com" target="_blank" rel="noopener noreferrer" className="text-[#3d5a3d] hover:underline font-medium">
                      Wahoo Livestock Sales (Nebraska)
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default KatahdinPage;