import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "./ui/buttons";
import { useTheme } from "../ThemeContext";

const Navigation = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

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
              Katahdin Info
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
              Katahdin Info
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