import HomePage from "../pages/HomePage";
import LivestockPage from "../pages/LivestockPage";
import LivestockDetail from "../pages/LivestockDetail";
import AboutPage from "../pages/AboutPage";
import BlogPage from "../pages/BlogPage";
import KatahdinPage from "../pages/KatahdinPage";
import AuctionsPage from "../pages/AuctionsPage";
import ContactPage from "../pages/ContactPage";
import ProductPage from "../pages/ProductPage";
import CartPage from "../pages/CartPage";
import CheckoutPage from "../pages/CheckoutPage";
import CustomerLoginPage from "../pages/CustomerLoginPage";
import CustomerRegisterPage from "../pages/CustomerRegisterPage";
import CustomerDashboardPage from "../pages/CustomerDashboardPage";
import MobileCapturePage from "../pages/MobileCapturePage";
import LegalPage from "../pages/LegalPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AboutManagement from "../pages/admin/AboutManagement";
import AccountingPage from "../pages/admin/AccountingPage";
import AnalyticsPage from "../pages/admin/AnalyticsPage";
import BlogManagement from "../pages/admin/BlogManagement";
import ButchAdmin from "../pages/admin/ButchAdmin";
import ContactManagement from "../pages/admin/ContactManagement";
import CustomersPage from "../pages/admin/CustomersPage";
import FarmPricingPage from "../pages/admin/FarmPricingPage";
import InventoryPage from "../pages/admin/InventoryPage";
import LivestockManagement from "../pages/admin/LivestockManagement";
import NFTManagement from "../pages/admin/NFTManagement";
import OrderManagement from "../pages/admin/OrderManagement";
import ProductManagement from "../pages/admin/ProductManagement";
import ReviewQueuePage from "../pages/admin/ReviewQueuePage";
import SalesPage from "../pages/admin/SalesPage";
import SettingsManagement from "../pages/admin/SettingsManagement";

export const publicRoutes = [
  { path: "/", Component: HomePage },
  { path: "/livestock", Component: LivestockPage },
  { path: "/livestock/:id", Component: LivestockDetail },
  { path: "/about", Component: AboutPage },
  { path: "/blog", Component: BlogPage },
  { path: "/katahdin", Component: KatahdinPage },
  { path: "/auctions", Component: AuctionsPage },
  { path: "/contact", Component: ContactPage },
  { path: "/products", Component: ProductPage },
  { path: "/cart", Component: CartPage },
  { path: "/checkout", Component: CheckoutPage },
  { path: "/account/login", Component: CustomerLoginPage },
  { path: "/account/register", Component: CustomerRegisterPage },
  { path: "/account/dashboard", Component: CustomerDashboardPage },
  { path: "/mobile", Component: MobileCapturePage },
  { path: "/privacy", Component: LegalPage },
  { path: "/terms", Component: LegalPage },
];

export const adminRoutes = [
  { path: "/admin/dashboard", Component: AdminDashboard, withLogout: true },
  { path: "/admin/analytics", Component: AnalyticsPage },
  { path: "/admin/butch", Component: ButchAdmin },
  { path: "/admin/about", Component: AboutManagement },
  { path: "/admin/accounting", Component: AccountingPage },
  { path: "/admin/blog", Component: BlogManagement },
  { path: "/admin/contacts", Component: ContactManagement },
  { path: "/admin/customers", Component: CustomersPage },
  { path: "/admin/farm-pricing", Component: FarmPricingPage },
  { path: "/admin/inventory", Component: InventoryPage },
  { path: "/admin/livestock", Component: LivestockManagement },
  { path: "/admin/nft", Component: NFTManagement },
  { path: "/admin/orders", Component: OrderManagement },
  { path: "/admin/products", Component: ProductManagement },
  { path: "/admin/review-queue", Component: ReviewQueuePage },
  { path: "/admin/sales", Component: SalesPage },
  { path: "/admin/settings", Component: SettingsManagement },
];
