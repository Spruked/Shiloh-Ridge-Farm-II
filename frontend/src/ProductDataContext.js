import React, { createContext, useContext, useEffect, useState } from "react";

import { getApiBaseUrl } from "./lib/backend";

const API = getApiBaseUrl();
const ProductDataContext = createContext(null);

const sampleProducts = [
  {
    id: "1",
    name: "Premium Katahdin Lamb",
    category: "sheep",
    type: "lamb_meat",
    description: "Whole or half lamb cuts from our premium Katahdin sheep. Grass-fed and pasture-raised.",
    price_per_unit: 8.5,
    unit: "lb",
    min_order_quantity: 20,
    estimated_lead_time: "2 weeks",
    available_quantity: 0,
    is_available: true,
  },
  {
    id: "2",
    name: "Fresh Lamb Chops",
    category: "sheep",
    type: "lamb_chops",
    description: "Tender rib and loin chops from our Katahdin lambs. Perfect for grilling.",
    price_per_unit: 12,
    unit: "lb",
    min_order_quantity: 2,
    estimated_lead_time: "1 week",
    available_quantity: 0,
    is_available: true,
  },
];

export function ProductDataProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        const response = await fetch(`${API}/products`);
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        const data = await response.json();
        if (!cancelled) {
          setProducts(data);
          setError(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setProducts(sampleProducts);
          setError(fetchError.message || "Backend unavailable");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProductDataContext.Provider value={{ products, loading, error }}>
      {children}
    </ProductDataContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductDataContext);
  if (!context) {
    throw new Error("useProducts must be used inside a ProductDataProvider");
  }
  return context;
}
