import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "./ui/buttons";
import { useTheme } from "../ThemeContext";
import { useCart } from "../CartContext";
import { useCustomerAuth } from "../CustomerAuthContext";

const Navigation = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { cart } = useCart();
  const { isAuthenticated } = useCustomerAuth();
  const cartCount = Object.values(cart).reduce((sum, value) => sum + value, 0);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/ShilohRidgeFarmicon256.png" 
              alt="Shiloh Ridge Farm" 
              className="w-16 h-16"
              data-testid="nav-logo"
            />
            <span className="text-2xl font-bold text-[#3d5a3d]" data-testid="nav-brand">Shiloh Ridge Farm</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8" data-testid="desktop-nav">
            <Link 
              to="/" 
              className={`font-medium transition-colors ${isActive('/') ? 'text-[#3d5a3d]' : 'text-gray-700 hover:text-[#3d5a3d]'}`}
              data-testid="nav-home"
            >
              Home
            </Link>
            <Link 
              to="/livestock" 
              className={`font-medium transition-colors ${isActive('/livestock') ? 'text-[#3d5a3d]' : 'text-gray-700 hover:text-[#3d5a3d]'}`}
              data-testid="nav-livestock"
            >
              Livestock
            </Link>
            <Link 
              to="/products" 
              className={`font-medium transition-colors ${isActive('/products') ? 'text-[#3d5a3d]' : 'text-gray-700 hover:text-[#3d5a3d]'}`}
              data-testid="nav-products"
            >
              Products
            </Link>
            <Link 
              to="/about" 
              className={`font-medium transition-colors ${isActive('/about') ? 'text-[#3d5a3d]' : 'text-gray-700 hover:text-[#3d5a3d]'}`}
              data-testid="nav-about"
            >
              About
            </Link>
            <Link 
              to="/katahdin" 
              className={`font-medium transition-colors ${isActive('/katahdin') ? 'text-[#3d5a3d]' : 'text-gray-700 hover:text-[#3d5a3d]'}`}
              data-testid="nav-katahdin"
            >
              Katahdin
            </Link>
            <Link 
              to="/blog" 
              className={`font-medium transition-colors ${isActive('/blog') ? 'text-[#3d5a3d]' : 'text-gray-700 hover:text-[#3d5a3d]'}`}
              data-testid="nav-blog"
            >
              Blog
            </Link>
            <Link 
              to="/auctions" 
              className={`font-medium transition-colors ${isActive('/auctions') ? 'text-[#3d5a3d]' : 'text-gray-700 hover:text-[#3d5a3d]'}`}
              data-testid="nav-auctions"
            >
              Auctions
            </Link>
            <Link 
              to="/contact" 
              className={`font-medium transition-colors ${isActive('/contact') ? 'text-[#3d5a3d]' : 'text-gray-700 hover:text-[#3d5a3d]'}`}
              data-testid="nav-contact"
            >
              Contact
            </Link>
            <Link
              to={isAuthenticated ? "/account/dashboard" : "/account/login"}
              className={`font-medium transition-colors ${location.pathname.startsWith('/account') ? 'text-[#3d5a3d]' : 'text-gray-700 hover:text-[#3d5a3d]'}`}
              data-testid="nav-account"
            >
              Account
            </Link>
            <Link
              to="/cart"
              className={`relative font-medium transition-colors ${isActive('/cart') ? 'text-[#3d5a3d]' : 'text-gray-700 hover:text-[#3d5a3d]'}`}
              data-testid="nav-cart"
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Cart
              </span>
              {cartCount > 0 && (
                <span className="absolute -right-4 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7b4b2a] px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link to="/admin/login">
              <Button 
                variant="outline" 
                className="border-[#3d5a3d] text-[#3d5a3d] hover:bg-[#3d5a3d] hover:text-white font-medium rounded-full"
                data-testid="nav-admin-btn"
              >
                Admin Login
              </Button>
            </Link>
                {/* Dark mode toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="ml-2"
                  aria-label="Toggle dark mode"
                  data-testid="nav-darkmode-btn"
                >
                  {theme === "dark" ? "🌙" : "☀️"}
                </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-[#3d5a3d]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="mobile-menu-btn"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3" data-testid="mobile-nav">
            <Link to="/" className="block font-medium text-gray-700 hover:text-[#3d5a3d]" data-testid="mobile-nav-home">
              Home
            </Link>
            <Link to="/livestock" className="block font-medium text-gray-700 hover:text-[#3d5a3d]" data-testid="mobile-nav-livestock">
              Livestock
            </Link>
            <Link to="/products" className="block font-medium text-gray-700 hover:text-[#3d5a3d]" data-testid="mobile-nav-products">
              Products
            </Link>
            <Link to="/about" className="block font-medium text-gray-700 hover:text-[#3d5a3d]" data-testid="mobile-nav-about">
              About
            </Link>
            <Link to="/katahdin" className="block font-medium text-gray-700 hover:text-[#3d5a3d]" data-testid="mobile-nav-katahdin">
              Katahdin
            </Link>
            <Link to="/blog" className="block font-medium text-gray-700 hover:text-[#3d5a3d]" data-testid="mobile-nav-blog">
              Blog
            </Link>
            <Link to="/auctions" className="block font-medium text-gray-700 hover:text-[#3d5a3d]" data-testid="mobile-nav-auctions">
              Auctions
            </Link>
            <Link to="/contact" className="block font-medium text-gray-700 hover:text-[#3d5a3d]" data-testid="mobile-nav-contact">
              Contact
            </Link>
            <Link to={isAuthenticated ? "/account/dashboard" : "/account/login"} className="block font-medium text-gray-700 hover:text-[#3d5a3d]">
              Account
            </Link>
            <Link to="/cart" className="block font-medium text-gray-700 hover:text-[#3d5a3d]" data-testid="mobile-nav-cart">
              Cart {cartCount > 0 ? `(${cartCount})` : ""}
            </Link>
            <Link to="/admin/login" className="block font-medium text-gray-700 hover:text-[#3d5a3d]" data-testid="mobile-nav-admin">
              Admin Login
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
