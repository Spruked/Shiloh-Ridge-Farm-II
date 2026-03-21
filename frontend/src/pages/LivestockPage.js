import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/buttons";
import SkeletonLoader from "../components/ui/SkeletonLoader";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";
import { getApiBaseUrl } from "../lib/backend";
import { resolveMediaUrl } from "../lib/media";

const API = getApiBaseUrl();

const LivestockPage = () => {
  const [livestock, setLivestock] = useState([]);
  const [filteredLivestock, setFilteredLivestock] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLivestock();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [livestock, filterType, searchQuery]);

  const fetchLivestock = async () => {
    try {
      const response = await axios.get(`${API}/livestock`);
      const availableLivestock = response.data.filter(l => l.status === "available");
      setLivestock(availableLivestock);
      // Save to localStorage for persistence
      localStorage.setItem('livestock_data', JSON.stringify(availableLivestock));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching livestock:", error);
      // Try to load from localStorage as fallback
      const savedLivestock = localStorage.getItem('livestock_data');
      if (savedLivestock) {
        try {
          const parsedLivestock = JSON.parse(savedLivestock);
          setLivestock(parsedLivestock);
        } catch (parseError) {
          console.error("Error parsing saved livestock data:", parseError);
        }
      }
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = livestock;

    if (filterType !== "all") {
      filtered = filtered.filter(l => l.animal_type === filterType);
    }

    if (searchQuery) {
      filtered = filtered.filter(l => 
        l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.tag_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.bloodline?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLivestock(filtered);
  };

  const getAnimalPhotos = (animal) =>
    (animal?.photos || []).map((photo) => resolveMediaUrl(photo)).filter(Boolean);

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navigation />
      <PriceTicker />

      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 text-[#3d5a3d]" data-testid="livestock-page-title">
          Available Livestock
        </h1>
        <p className="text-center text-gray-600 mb-12 text-lg">
          Browse our current inventory of quality livestock
        </p>

        {/* Filters */}
        <div className="mb-12 flex flex-col md:flex-row gap-4" data-testid="livestock-filters">
          <Input
            placeholder="Search by name, tag, or bloodline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="md:flex-1 rounded-full border-gray-300 focus:border-[#3d5a3d]"
            data-testid="livestock-search-input"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="md:w-64 rounded-full" data-testid="livestock-filter-select">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="sheep">Sheep</SelectItem>
              <SelectItem value="hog">Hogs</SelectItem>
              <SelectItem value="cattle">Cattle</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Livestock Grid */}
        {loading ? (
          <SkeletonLoader count={6} />
        ) : filteredLivestock.length === 0 ? (
          <div className="text-center py-20" data-testid="livestock-empty">
            <p className="text-xl text-gray-600">No livestock found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="livestock-grid">
            {filteredLivestock.map((animal) => (
              <div key={animal.id} className="card-hover bg-white rounded-2xl overflow-hidden shadow-lg flex flex-col">
                <Link to={`/livestock/${animal.id}`}>
                  <div className="h-64 bg-[#e8f4e8] flex items-center justify-center relative">
                    {getAnimalPhotos(animal).length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto max-w-full px-2">
                        {getAnimalPhotos(animal).map((photo, idx) => (
                          <img key={idx} src={photo} alt={animal.name || animal.tag_number} className="w-32 h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:scale-105 transition-transform" />
                        ))}
                      </div>
                    ) : (
                      <span className="text-6xl">
                        {animal.animal_type === 'sheep' ? '🐑' : animal.animal_type === 'hog' ? '🐖' : '🐄'}
                      </span>
                    )}
                  </div>
                </Link>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <Link to={`/livestock/${animal.id}`} className="min-w-0">
                        <h3 className="text-2xl font-bold text-[#3d5a3d] hover:text-[#2d4a2d]">{animal.name || animal.tag_number}</h3>
                      </Link>
                      {animal.nft_minted && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">NFT</span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2 capitalize">{animal.animal_type}</p>
                    <p className="text-sm text-gray-500 mb-2">Tag: {animal.tag_number}</p>
                    {animal.bloodline && (
                      <p className="text-sm text-gray-500 mb-4">Bloodline: {animal.bloodline}</p>
                    )}
                    {animal.price && (
                      <p className="text-2xl font-bold text-[#3d5a3d]">${animal.price.toLocaleString()}</p>
                    )}

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <Link to={`/contact?animal=${animal.id}&type=buy`}>
                        <Button className="w-full bg-[#3d5a3d] hover:bg-[#2d4a2d]">
                          Buy Now
                        </Button>
                      </Link>
                      <Link to={`/contact?animal=${animal.id}&type=offer`}>
                        <Button variant="outline" className="w-full border-[#3d5a3d] text-[#3d5a3d] hover:bg-[#3d5a3d] hover:text-white">
                          Submit Offer
                        </Button>
                      </Link>
                    </div>
                  </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default LivestockPage;
