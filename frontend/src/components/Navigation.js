import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { ShoppingCart, User, Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "../ThemeContext";
import { useCart } from "../CartContext";
import { useCustomerAuth } from "../CustomerAuthContext";

const NAV_LINKS = [
  { to: "/livestock", label: "Livestock" },
  { to: "/products",  label: "Products" },
  { to: "/about",     label: "About" },
  { to: "/katahdin",  label: "Katahdin" },
  { to: "/blog",      label: "Blog" },
  { to: "/auctions",  label: "Auctions" },
  { to: "/contact",   label: "Contact" },
];
const FARM_LOGO_URL = `${process.env.PUBLIC_URL || ""}/ShilohRidgeFarmicon256.png`;

const Navigation = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { cart } = useCart();
  const { isAuthenticated } = useCustomerAuth();
  const cartCount = Object.values(cart).reduce((sum, v) => sum + v, 0);

  const isActive = (path) => location.pathname === path;
  const linkClass = (path) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? "bg-[#e6ede2] text-[#0f5132]"
        : "text-gray-600 hover:text-[#0f5132] hover:bg-gray-50"
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0"
            data-testid="nav-brand"
          >
            <img
              src={FARM_LOGO_URL}
              alt="Shiloh Ridge Farm"
              className="h-11 w-11 object-contain"
              width="44"
              height="45"
              data-testid="nav-logo"
            />
            <span className="hidden sm:block text-lg font-bold text-[#0f5132] leading-tight">
              Shiloh Ridge Farm
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1" data-testid="desktop-nav">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={linkClass(to)}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop utility */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Dark mode */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-500 hover:text-[#0f5132] hover:bg-gray-50 transition-colors"
              aria-label="Toggle dark mode"
              data-testid="nav-darkmode-btn"
            >
              {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Account (prominent) */}
            <Link
              to={isAuthenticated ? "/account/dashboard" : "/account/login"}
              className={`ml-1 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                location.pathname.startsWith("/account")
                  ? "bg-[#0f5132] text-white"
                  : isAuthenticated
                    ? "bg-[#e6ede2] text-[#0f5132] hover:bg-[#d8e4d2]"
                    : "bg-[#b6863a] text-white hover:bg-[#9c702f]"
              }`}
              aria-label={isAuthenticated ? "My Account" : "Customer Sign In"}
              data-testid="nav-account"
            >
              <User size={16} />
              <span>{isAuthenticated ? "My Account" : "Customer Sign In"}</span>
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className={`relative p-2 rounded-md transition-colors ${
                isActive("/cart")
                  ? "text-[#0f5132] bg-[#e6ede2]"
                  : "text-gray-500 hover:text-[#0f5132] hover:bg-gray-50"
              }`}
              aria-label="Cart"
              data-testid="nav-cart"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-[#b6863a] text-[9px] font-bold text-white px-0.5">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Admin — subtle */}
            <Link
              to="/admin/login"
              className="ml-2 text-xs text-gray-400 hover:text-[#0f5132] transition-colors"
              data-testid="nav-admin-btn"
            >
              Admin
            </Link>
          </div>

          {/* Mobile: cart badge + hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            <Link
              to={isAuthenticated ? "/account/dashboard" : "/account/login"}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                isAuthenticated
                  ? "bg-[#e6ede2] text-[#0f5132]"
                  : "bg-[#b6863a] text-white"
              }`}
              data-testid="mobile-nav-account-cta"
            >
              {isAuthenticated ? "Account" : "Sign In"}
            </Link>
            <Link
              to="/cart"
              className="relative p-2 text-gray-500"
              data-testid="mobile-nav-cart"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-[#b6863a] text-[9px] font-bold text-white px-0.5">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              className="p-2 text-[#0f5132]"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              data-testid="mobile-menu-btn"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-5 space-y-1"
          data-testid="mobile-nav"
        >
          <Link
            to="/"
            className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-[#0f5132] hover:bg-gray-50"
            onClick={() => setIsMobileMenuOpen(false)}
            data-testid="mobile-nav-home"
          >
            Home
          </Link>
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(to)
                  ? "bg-[#e6ede2] text-[#0f5132]"
                  : "text-gray-700 hover:text-[#0f5132] hover:bg-gray-50"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
              data-testid={`mobile-nav-${label.toLowerCase()}`}
            >
              {label}
            </Link>
          ))}

          <div className="pt-3 border-t border-gray-100 space-y-2">
            <Link
              to={isAuthenticated ? "/account/dashboard" : "/account/login"}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                isAuthenticated
                  ? "bg-[#e6ede2] text-[#0f5132]"
                  : "bg-[#b6863a] text-white"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
              data-testid="mobile-nav-account"
            >
              <User size={16} /> {isAuthenticated ? "My Account" : "Customer Sign In"}
            </Link>
            {!isAuthenticated && (
              <Link
                to="/account/register"
                className="flex items-center justify-center rounded-md border border-[#0f5132] px-3 py-2 text-sm font-semibold text-[#0f5132]"
                onClick={() => setIsMobileMenuOpen(false)}
                data-testid="mobile-nav-register"
              >
                Create Account
              </Link>
            )}
            <div className="flex items-center justify-end">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-500 hover:text-[#0f5132] hover:bg-gray-50"
                aria-label="Toggle dark mode"
              >
                {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
          </div>

          <Link
            to="/admin/login"
            className="block px-3 py-1.5 text-xs text-gray-400 hover:text-[#0f5132]"
            onClick={() => setIsMobileMenuOpen(false)}
            data-testid="mobile-nav-admin"
          >
            Admin Login
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
