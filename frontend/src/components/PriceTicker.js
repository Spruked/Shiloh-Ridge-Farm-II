import { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PriceTicker = () => {
  const [tickerData, setTickerData] = useState({ sheep: {}, hog: {}, cattle: {} });

  useEffect(() => {
    fetchTickerData();
    const interval = setInterval(fetchTickerData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTickerData = async () => {
    try {
      const response = await axios.get(`${API}/ticker`);
      setTickerData(response.data);
    } catch (error) {
      console.error("Error fetching ticker data:", error);
    }
  };

  return (
    <div className="bg-[#3d5a3d] text-white py-3 overflow-hidden" data-testid="price-ticker">
      <div className="ticker-animation flex gap-12 whitespace-nowrap">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="flex gap-12 items-center">
            <div className="flex items-center gap-3" data-testid="ticker-sheep">
              <span className="font-bold text-lg">SHEEP:</span>
              <span className="text-lg">${tickerData.sheep.price}/lb</span>
              <span className={`text-sm ${tickerData.sheep.change >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {tickerData.sheep.change >= 0 ? '▲' : '▼'} {Math.abs(tickerData.sheep.change || 0)}
              </span>
            </div>
            
            <div className="flex items-center gap-3" data-testid="ticker-hog">
              <span className="font-bold text-lg">HOG:</span>
              <span className="text-lg">${tickerData.hog.price}/cwt</span>
              <span className={`text-sm ${tickerData.hog.change >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {tickerData.hog.change >= 0 ? '▲' : '▼'} {Math.abs(tickerData.hog.change || 0)}
              </span>
            </div>
            
            <div className="flex items-center gap-3" data-testid="ticker-cattle">
              <span className="font-bold text-lg">CATTLE:</span>
              <span className="text-lg">${tickerData.cattle.price}/cwt</span>
              <span className={`text-sm ${tickerData.cattle.change >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {tickerData.cattle.change >= 0 ? '▲' : '▼'} {Math.abs(tickerData.cattle.change || 0)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PriceTicker;