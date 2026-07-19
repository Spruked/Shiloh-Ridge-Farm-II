import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CART_STORAGE_KEY = "shiloh_cart_v1";
const CART_PRICE_OVERRIDE_STORAGE_KEY = "shiloh_cart_price_overrides_v1";

const CartContext = createContext(null);

function loadInitialCart() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function loadInitialPriceOverrides() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(CART_PRICE_OVERRIDE_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function getBaseUnitPrice(product) {
  const candidates = [
    product?.price_per_unit,
    product?.price,
    product?.unit_price,
    product?.sale_price,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
  }

  return 0;
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadInitialCart);
  const [priceOverrides, setPriceOverrides] = useState(loadInitialPriceOverrides);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(CART_PRICE_OVERRIDE_STORAGE_KEY, JSON.stringify(priceOverrides));
  }, [priceOverrides]);

  const value = useMemo(
    () => ({
      cart,
      priceOverrides,
      setItemQuantity(productId, quantity) {
        setCart((current) => {
          const nextQuantity = Math.max(0, Number(quantity) || 0);
          if (nextQuantity <= 0) {
            const next = { ...current };
            delete next[productId];
            return next;
          }
          return {
            ...current,
            [productId]: nextQuantity,
          };
        });
      },
      setItemPriceOverride(productId, price) {
        setPriceOverrides((current) => {
          const next = { ...current };
          const value = Number(price);
          if (!Number.isFinite(value) || value <= 0) {
            delete next[productId];
            return next;
          }
          next[productId] = value;
          return next;
        });
      },
      resolveUnitPrice(product) {
        const override = Number(priceOverrides[product?.id]);
        if (Number.isFinite(override) && override > 0) {
          return override;
        }
        return getBaseUnitPrice(product);
      },
      clearCart() {
        setCart({});
        setPriceOverrides({});
      },
    }),
    [cart, priceOverrides],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }
  return context;
}
