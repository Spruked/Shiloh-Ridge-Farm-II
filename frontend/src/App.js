import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import AdminLogin from "./pages/admin/AdminLogin";
import { Toaster } from "./components/ui/sonner";
import { AdminCaliOrbBubble } from "./components/orb";
import ButchAssistant from "./components/butcher/ButchAssistant";
import SplashScreen from "./components/SplashScreen";
import { adminRoutes, publicRoutes } from "./config/appRoutes";
import { resolveAssistantContext } from "./config/site";
import { ThemeProvider } from "./ThemeContext";
import { CartProvider } from "./CartContext";
import { CustomerAuthProvider } from "./CustomerAuthContext";
import { ProductDataProvider } from "./ProductDataContext";
import { getApiBaseUrl } from "./lib/backend";
import SeoManager from "./components/SeoManager";
import NotFoundPage from "./pages/NotFoundPage";
import "./App.css";

const TEMP_DEV_ADMIN_BYPASS = (process.env.REACT_APP_ADMIN_BYPASS || "false").toLowerCase() === "true";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3d5a3d] mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    </div>
  );
}

function ChatAssistantManager() {
  const location = useLocation();
  const { pageContext, showButch, hideShep } = resolveAssistantContext(location.pathname);
  if (hideShep) return null;

  return (
    <>
      <AdminCaliOrbBubble pageContext={pageContext} />
      {showButch && <ButchAssistant />}
    </>
  );
}

function App() {
  const apiBaseUrl = getApiBaseUrl();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (TEMP_DEV_ADMIN_BYPASS) {
      setIsAuthenticated(true);
      setAuthLoading(false);
      return;
    }

    const validateToken = async () => {
      const token = localStorage.getItem("admin_token");
      if (token) {
        try {
          // Validate token with backend
          await axios.get(`${apiBaseUrl}/auth/verify`, {
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
  }, [apiBaseUrl]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAuthenticated(false);
  };

  const renderProtectedAdminPage = (element) => {
    if (TEMP_DEV_ADMIN_BYPASS) {
      return element;
    }

    if (authLoading) {
      return <LoadingScreen />;
    }

    return isAuthenticated ? element : <Navigate to="/admin/login" />;
  };

  return (
    <ThemeProvider>
      <ProductDataProvider>
        <CartProvider>
          <CustomerAuthProvider>
            <div className="App">
              <BrowserRouter>
                <SeoManager />
                <Routes>
                  {publicRoutes.map(({ path, Component }) => (
                    <Route key={path} path={path} element={<Component />} />
                  ))}
                  <Route
                    path="/admin/login"
                    element={
                      authLoading ? (
                        <LoadingScreen />
                      ) : isAuthenticated ? (
                        <Navigate to="/admin/dashboard" />
                      ) : TEMP_DEV_ADMIN_BYPASS ? (
                        <Navigate to="/admin/dashboard" />
                      ) : (
                        <AdminLogin onLogin={handleLogin} />
                      )
                    }
                  />
                  {adminRoutes.map(({ path, Component, withLogout }) => (
                    <Route
                      key={path}
                      path={path}
                      element={renderProtectedAdminPage(
                        withLogout ? <Component onLogout={handleLogout} /> : <Component />
                      )}
                    />
                  ))}
                  <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
                  <Route path="/account" element={<Navigate to="/account/login" replace />} />
                  <Route path="/dashboard" element={<Navigate to="/account/dashboard" replace />} />
                  <Route path="/login" element={<Navigate to="/account/login" replace />} />
                  <Route path="/signup" element={<Navigate to="/account/register" replace />} />
                  <Route path="/checkout/success" element={<Navigate to="/account/dashboard" replace />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
                <ChatAssistantManager />
                {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
                <Toaster position="top-right" />
              </BrowserRouter>
            </div>
          </CustomerAuthProvider>
        </CartProvider>
      </ProductDataProvider>
    </ThemeProvider>
  );
}

export default App;
