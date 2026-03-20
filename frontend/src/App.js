import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import HomePage from "./pages/HomePage";
import LivestockPage from "./pages/LivestockPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import ProductPage from "./pages/ProductPage";
import BlogPage from "./pages/BlogPage";
import KatahdinPage from "./pages/KatahdinPage";
import AuctionsPage from "./pages/AuctionsPage";
import MobileCapturePage from "./pages/MobileCapturePage";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AboutManagement from "./pages/admin/AboutManagement";
import AccountingPage from "./pages/admin/AccountingPage";
import BlogManagement from "./pages/admin/BlogManagement";
import ButchAdmin from "./pages/admin/ButchAdmin";
import ContactManagement from "./pages/admin/ContactManagement";
import InventoryPage from "./pages/admin/InventoryPage";
import LivestockManagement from "./pages/admin/LivestockManagement";
import NFTManagement from "./pages/admin/NFTManagement";
import OrderManagement from "./pages/admin/OrderManagement";
import ProductManagement from "./pages/admin/ProductManagement";
import SalesPage from "./pages/admin/SalesPage";
import SettingsManagement from "./pages/admin/SettingsManagement";
import LivestockDetail from "./pages/LivestockDetail";
import { Toaster } from "./components/ui/sonner";
import WorkerChatBubble from "./components/worker/WorkerChatBubble";
import { ThemeProvider } from "./ThemeContext";
import "./App.css";

function ChatAssistantManager() {
  const location = useLocation();

  if (location.pathname.startsWith("/admin") || location.pathname.startsWith("/mobile")) {
    return null;
  }

  let pageContext = "general";
  if (location.pathname === "/products") {
    pageContext = "products";
  } else if (location.pathname.startsWith("/livestock")) {
    pageContext = "livestock";
  } else if (location.pathname === "/contact") {
    pageContext = "contact";
  }

  return <WorkerChatBubble pageContext={pageContext} userType="visitor" />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("admin_token");
      if (token) {
        try {
          // Validate token with backend
          await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/auth/verify`, {
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

  const renderProtectedAdminPage = (element) => {
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3d5a3d] mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      );
    }

    return isAuthenticated ? element : <Navigate to="/admin/login" />;
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
            <Route path="/mobile" element={<MobileCapturePage />} />
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
              element={renderProtectedAdminPage(<AdminDashboard onLogout={handleLogout} />)}
            />
            <Route
              path="/admin/butch"
              element={renderProtectedAdminPage(<ButchAdmin />)}
            />
            <Route path="/admin/about" element={renderProtectedAdminPage(<AboutManagement />)} />
            <Route path="/admin/accounting" element={renderProtectedAdminPage(<AccountingPage />)} />
            <Route path="/admin/blog" element={renderProtectedAdminPage(<BlogManagement />)} />
            <Route path="/admin/contacts" element={renderProtectedAdminPage(<ContactManagement />)} />
            <Route path="/admin/inventory" element={renderProtectedAdminPage(<InventoryPage />)} />
            <Route path="/admin/livestock" element={renderProtectedAdminPage(<LivestockManagement />)} />
            <Route path="/admin/nft" element={renderProtectedAdminPage(<NFTManagement />)} />
            <Route path="/admin/orders" element={renderProtectedAdminPage(<OrderManagement />)} />
            <Route path="/admin/products" element={renderProtectedAdminPage(<ProductManagement />)} />
            <Route path="/admin/sales" element={renderProtectedAdminPage(<SalesPage />)} />
            <Route path="/admin/settings" element={renderProtectedAdminPage(<SettingsManagement />)} />
          </Routes>
          <ChatAssistantManager />
          <Toaster position="top-right" />
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;
