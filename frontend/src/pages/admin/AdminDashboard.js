import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Button } from "../../components/ui/buttons";
import LivestockManagement from "./LivestockManagement";
import ContactManagement from "./ContactManagement";
import AboutManagement from "./AboutManagement";
import SettingsManagement from "./SettingsManagement";
import NFTManagement from "./NFTManagement";
import ProductManagement from "./ProductManagement";
import OrderManagement from "./OrderManagement";
import BlogManagement from "./BlogManagement";
import InventoryPage from "./InventoryPage";
import SalesPage from "./SalesPage";
import AccountingPage from "./AccountingPage";
import logo from "../../../public/ShilohRidgeFarmicon256.png";

const AdminDashboard = ({ onLogout }) => {
  return (
    <div className="min-h-screen bg-[#faf9f6]" data-testid="admin-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="Shiloh Ridge Farm"
              className="w-16 h-16"
              data-testid="admin-header-logo"
            />
            <h1 className="text-2xl font-bold text-[#3d5a3d]" data-testid="admin-header-title">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="border-[#3d5a3d] text-[#3d5a3d] hover:bg-[#3d5a3d] hover:text-white rounded-full"
              data-testid="admin-return-website-btn"
            >
              Return to Website
            </Button>
            <Button 
              onClick={onLogout}
              variant="outline"
              className="border-[#3d5a3d] text-[#3d5a3d] hover:bg-[#3d5a3d] hover:text-white rounded-full"
              data-testid="admin-logout-btn"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={handleExportPDF}
            className="bg-[#3d5a3d] text-white px-4 py-2 rounded-lg shadow hover:bg-[#2e472e] transition-colors"
            data-testid="admin-export-pdf-btn"
          >
            Export KHSI PDF
          </button>
        </div>
        <Tabs defaultValue="livestock" className="w-full" data-testid="admin-tabs">
          <TabsList className="flex flex-wrap h-auto bg-white rounded-lg p-1" data-testid="admin-tabs-list">
            <TabsTrigger value="livestock" className="rounded-md" data-testid="admin-tab-livestock">Livestock</TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-md" data-testid="admin-tab-inventory">Inventory</TabsTrigger>
            <TabsTrigger value="sales" className="rounded-md" data-testid="admin-tab-sales">Sales</TabsTrigger>
            <TabsTrigger value="accounting" className="rounded-md" data-testid="admin-tab-accounting">Accounting</TabsTrigger>
            <TabsTrigger value="products" className="rounded-md" data-testid="admin-tab-products">Products</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-md" data-testid="admin-tab-orders">Orders</TabsTrigger>
            <TabsTrigger value="contact" className="rounded-md" data-testid="admin-tab-contact">Contact</TabsTrigger>
            <TabsTrigger value="about" className="rounded-md" data-testid="admin-tab-about">About</TabsTrigger>
            <TabsTrigger value="blog" className="rounded-md" data-testid="admin-tab-blog">Blog</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-md" data-testid="admin-tab-settings">Settings</TabsTrigger>
            <TabsTrigger value="nft" className="rounded-md" data-testid="admin-tab-nft">NFT</TabsTrigger>
          </TabsList>

          <TabsContent value="livestock">
            <LivestockManagement />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryPage />
          </TabsContent>

          <TabsContent value="sales">
            <SalesPage />
          </TabsContent>

          <TabsContent value="accounting">
            <AccountingPage />
          </TabsContent>

          <TabsContent value="products">
            <ProductManagement />
          </TabsContent>

          <TabsContent value="orders">
            <OrderManagement />
          </TabsContent>

          <TabsContent value="contact">
            <ContactManagement />
          </TabsContent>

          <TabsContent value="about">
            <AboutManagement />
          </TabsContent>

          <TabsContent value="blog">
            <BlogManagement />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsManagement />
          </TabsContent>

          <TabsContent value="nft">
            <NFTManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
  function handleExportPDF() {
    // Example: Use jsPDF to generate a simple PDF. Replace with KHSI-style mapping and fillable form logic as needed.
    import('jspdf').then(jsPDFModule => {
      const { jsPDF } = jsPDFModule;
      const doc = new jsPDF();
      doc.text("KHSI Livestock Export", 10, 10);
      // TODO: Map livestock data and style to match content.pdf
      doc.save("KHSI_Livestock_Export.pdf");
    });
  }
};

export default AdminDashboard;