import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getApiBaseUrl } from "./lib/backend";

const API = getApiBaseUrl();
const TOKEN_KEY = "shiloh_customer_token";

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      setAuthLoading(false);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch(`${API}/customer/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error("Unable to load customer profile");
        }
        const data = await response.json();
        if (!cancelled) {
          setProfile(data);
        }
      } catch (error) {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setToken("");
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      profile,
      isAuthenticated: Boolean(token && profile),
      authLoading,
      async register(payload) {
        const response = await fetch(`${API}/customer/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Registration failed");
        }
        localStorage.setItem(TOKEN_KEY, data.access_token);
        setToken(data.access_token);
        setProfile(data.profile);
        return data;
      },
      async login(payload) {
        const response = await fetch(`${API}/customer/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Login failed");
        }
        localStorage.setItem(TOKEN_KEY, data.access_token);
        setToken(data.access_token);
        setProfile(data.profile);
        return data;
      },
      logout() {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        setProfile(null);
      },
      async refreshProfile() {
        if (!token) {
          return null;
        }
        const response = await fetch(`${API}/customer/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Unable to load profile");
        }
        setProfile(data);
        return data;
      },
      async updateProfile(payload) {
        const response = await fetch(`${API}/customer/profile`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Unable to save profile");
        }
        setProfile(data);
        return data;
      },
      async uploadProfilePhoto(file) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${API}/customer/profile/photo`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Unable to upload photo");
        }
        const refreshed = await fetch(`${API}/customer/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const refreshedData = await refreshed.json();
        if (refreshed.ok) {
          setProfile(refreshedData);
        }
        return data;
      },
    }),
    [token, profile, authLoading],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth must be used inside a CustomerAuthProvider");
  }
  return context;
}
