import { lazy } from "react";

import HomePage from "../pages/HomePage";
const LivestockPage = lazy(() => import("../pages/LivestockPage"));
const LivestockDetail = lazy(() => import("../pages/LivestockDetail"));
const AboutPage = lazy(() => import("../pages/AboutPage"));
const BlogPage = lazy(() => import("../pages/BlogPage"));
const KatahdinPage = lazy(() => import("../pages/KatahdinPage"));
const AuctionsPage = lazy(() => import("../pages/AuctionsPage"));
const ContactPage = lazy(() => import("../pages/ContactPage"));
const ProductPage = lazy(() => import("../pages/ProductPage"));
const CartPage = lazy(() => import("../pages/CartPage"));
const CheckoutPage = lazy(() => import("../pages/CheckoutPage"));
const CustomerLoginPage = lazy(() => import("../pages/CustomerLoginPage"));
const CustomerRegisterPage = lazy(() => import("../pages/CustomerRegisterPage"));
const CustomerDashboardPage = lazy(() => import("../pages/CustomerDashboardPage"));
const MobileCapturePage = lazy(() => import("../pages/MobileCapturePage"));
const LegalPage = lazy(() => import("../pages/LegalPage"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AboutManagement = lazy(() => import("../pages/admin/AboutManagement"));
const AccountingPage = lazy(() => import("../pages/admin/AccountingPage"));
const AnalyticsPage = lazy(() => import("../pages/admin/AnalyticsPage"));
const BlogManagement = lazy(() => import("../pages/admin/BlogManagement"));
const ContactManagement = lazy(() => import("../pages/admin/ContactManagement"));
const CustomersPage = lazy(() => import("../pages/admin/CustomersPage"));
const FarmPricingPage = lazy(() => import("../pages/admin/FarmPricingPage"));
const InventoryPage = lazy(() => import("../pages/admin/InventoryPage"));
const LivestockManagement = lazy(() => import("../pages/admin/LivestockManagement"));
const NFTManagement = lazy(() => import("../pages/admin/NFTManagement"));
const OrderManagement = lazy(() => import("../pages/admin/OrderManagement"));
const ProductManagement = lazy(() => import("../pages/admin/ProductManagement"));
const ReviewQueuePage = lazy(() => import("../pages/admin/ReviewQueuePage"));
const SalesPage = lazy(() => import("../pages/admin/SalesPage"));
const SettingsManagement = lazy(() => import("../pages/admin/SettingsManagement"));

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
