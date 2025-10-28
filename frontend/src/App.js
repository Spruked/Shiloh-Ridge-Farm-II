import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import HomePage from "./pages/HomePage";
import LivestockPage from "./pages/LivestockPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import ProductPage from "./pages/ProductPage";
import BlogPage from "./pages/BlogPage";
import KatahdinPage from "./pages/KatahdinPage";
import AuctionsPage from "./pages/AuctionsPage";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import LivestockDetail from "./pages/LivestockDetail";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./ThemeContext";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("admin_token");
      if (token) {
        try {
          // Validate token with backend
          const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setIsAuthenticated(true);
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem("admin_token");
          setIsAuthenticated(false);
        }
      }
      setAuthLoading(false);
    };

    validateToken();
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAuthenticated(false);
  };

  return (
    <ThemeProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/livestock" element={<LivestockPage />} />
            <Route path="/livestock/:id" element={<LivestockDetail />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/katahdin" element={<KatahdinPage />} />
            <Route path="/auctions" element={<AuctionsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/products" element={<ProductPage />} />
            <Route
              path="/admin/login"
              element={
                authLoading ? (
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3d5a3d] mx-auto mb-4"></div>
                      <p>Loading...</p>
                    </div>
                  </div>
                ) : isAuthenticated ? (
                  <Navigate to="/admin/dashboard" />
                ) : (
                  <AdminLogin onLogin={handleLogin} />
                )
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                authLoading ? (
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3d5a3d] mx-auto mb-4"></div>
                      <p>Loading...</p>
                    </div>
                  </div>
                ) : isAuthenticated ? (
                  <AdminDashboard onLogout={handleLogout} />
                ) : (
                  <Navigate to="/admin/login" />
                )
              }
            />
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;