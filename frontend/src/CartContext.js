import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CART_STORAGE_KEY = "shiloh_cart_v1";

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

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadInitialCart);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const value = useMemo(
    () => ({
      cart,
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
      clearCart() {
        setCart({});
      },
    }),
    [cart],
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
