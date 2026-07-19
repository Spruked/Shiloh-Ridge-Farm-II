import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getApiBaseUrl } from "../lib/backend";

const API = getApiBaseUrl();
const DEFAULT_TICKER_DATA = {
  sheep: { price: 2.85, change: 0.05, unit: "lb" },
  hog: { price: 95.5, change: -1.25, unit: "cwt" },
  cattle: { price: 185.75, change: 2.3, unit: "cwt" },
};

const normalizeTickerItem = (item, fallback) => ({
  ...fallback,
  ...(item || {}),
  price: Number(item?.price ?? fallback.price),
  change: Number(item?.change ?? fallback.change ?? 0),
  unit: item?.unit || fallback.unit,
});

const formatPrice = (value) => Number(value || 0).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PriceTicker = () => {
  const [tickerData, setTickerData] = useState(DEFAULT_TICKER_DATA);
  const hasLoggedNetworkErrorRef = useRef(false);

  useEffect(() => {
    fetchTickerData();
    const interval = setInterval(fetchTickerData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTickerData = async () => {
    try {
      const response = await axios.get(`${API}/ticker`, { timeout: 8000 });
      setTickerData({
        sheep: normalizeTickerItem(response.data?.sheep, DEFAULT_TICKER_DATA.sheep),
        hog: normalizeTickerItem(response.data?.hog, DEFAULT_TICKER_DATA.hog),
        cattle: normalizeTickerItem(response.data?.cattle, DEFAULT_TICKER_DATA.cattle),
      });
      hasLoggedNetworkErrorRef.current = false;
    } catch (error) {
      if (!hasLoggedNetworkErrorRef.current) {
        console.error("Error fetching ticker data:", error);
        hasLoggedNetworkErrorRef.current = true;
      }
    }
  };

  return (
    <div className="bg-[#0f5132] text-white py-3 overflow-hidden" data-testid="price-ticker">
      <div className="ticker-animation flex gap-12 whitespace-nowrap">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="flex gap-12 items-center">
            <div className="flex items-center gap-3" data-testid="ticker-sheep">
              <span className="font-bold text-lg">SHEEP:</span>
              <span className="text-lg">${formatPrice(tickerData.sheep.price)}/{tickerData.sheep.unit}</span>
              <span className={`text-sm ${tickerData.sheep.change >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {tickerData.sheep.change >= 0 ? '▲' : '▼'} {Math.abs(tickerData.sheep.change || 0)}
              </span>
            </div>
            
            <div className="flex items-center gap-3" data-testid="ticker-hog">
              <span className="font-bold text-lg">HOG:</span>
              <span className="text-lg">${formatPrice(tickerData.hog.price)}/{tickerData.hog.unit}</span>
              <span className={`text-sm ${tickerData.hog.change >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {tickerData.hog.change >= 0 ? '▲' : '▼'} {Math.abs(tickerData.hog.change || 0)}
              </span>
            </div>
            
            <div className="flex items-center gap-3" data-testid="ticker-cattle">
              <span className="font-bold text-lg">CATTLE:</span>
              <span className="text-lg">${formatPrice(tickerData.cattle.price)}/{tickerData.cattle.unit}</span>
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
