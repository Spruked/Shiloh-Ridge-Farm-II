import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getApiBaseUrl } from "../lib/backend";

const API = getApiBaseUrl();
// No made-up numbers: until the live feed answers, items show a dash.
const DEFAULT_TICKER_DATA = {
  sheep: { price: null, change: 0, unit: "cwt" },
  hog: { price: null, change: 0, unit: "cwt" },
  cattle: { price: null, change: 0, unit: "cwt" },
};

const normalizeTickerItem = (item, fallback) => ({
  ...fallback,
  ...(item || {}),
  price: item?.price == null ? null : Number(item.price),
  change: Number(item?.change ?? 0),
  unit: item?.unit || fallback.unit,
});

const formatPrice = (value) => value == null ? "--" : Number(value).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const closedTag = (item) => (item.price != null && item.open === false && item.stale !== true ? " (last close)" : item.stale ? " (delayed)" : "");

const PriceTicker = () => {
  const [tickerData, setTickerData] = useState(DEFAULT_TICKER_DATA);
  const hasLoggedNetworkErrorRef = useRef(false);

  useEffect(() => {
    fetchTickerData();
    const interval = setInterval(fetchTickerData, 60000); // refresh every minute
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
              <span className="font-bold text-lg" title="USDA national lamb carcass cutout">LAMB:</span>
              <span className="text-lg">{tickerData.sheep.price == null ? '' : '$'}{formatPrice(tickerData.sheep.price)}/{tickerData.sheep.unit}{closedTag(tickerData.sheep)}</span>
              <span className={`text-sm ${tickerData.sheep.change >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {tickerData.sheep.change >= 0 ? '▲' : '▼'} {Math.abs(tickerData.sheep.change || 0)}
              </span>
            </div>
            
            <div className="flex items-center gap-3" data-testid="ticker-hog">
              <span className="font-bold text-lg" title="CME lean hog futures">HOG:</span>
              <span className="text-lg">{tickerData.hog.price == null ? '' : '$'}{formatPrice(tickerData.hog.price)}/{tickerData.hog.unit}{closedTag(tickerData.hog)}</span>
              <span className={`text-sm ${tickerData.hog.change >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {tickerData.hog.change >= 0 ? '▲' : '▼'} {Math.abs(tickerData.hog.change || 0)}
              </span>
            </div>
            
            <div className="flex items-center gap-3" data-testid="ticker-cattle">
              <span className="font-bold text-lg" title="CME live cattle futures">CATTLE:</span>
              <span className="text-lg">{tickerData.cattle.price == null ? '' : '$'}{formatPrice(tickerData.cattle.price)}/{tickerData.cattle.unit}{closedTag(tickerData.cattle)}</span>
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
