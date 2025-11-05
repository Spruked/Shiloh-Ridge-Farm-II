import React from "react";
import InventoryPage from "./InventoryPage";
import SalesPage from "./SalesPage";
import AccountingPage from "./AccountingPage";
import logo from "/public/ShilohRidgeFarmIcon256.png"; // ✅ correct import

const AdminDashboard = ({ onLogout }) => {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img
          src={logo}
          alt="Shiloh Ridge Farm"
          className="w-16 h-16 md:w-14 md:h-14"
          data-testid="admin-header-logo"
        />
        <h1
          className="text-2xl font-bold text-[#3d5a3d]"
          data-testid="admin-header-title"
        >
          Admin Dashboard
        </h1>
      </div>
    </div>
  );
};

export default AdminDashboard;
