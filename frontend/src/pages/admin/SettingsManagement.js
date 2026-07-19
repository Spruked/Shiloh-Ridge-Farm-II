import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../../components/ui/buttons";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { getApiBaseUrl } from "../../lib/backend";

const API = getApiBaseUrl();

const SettingsManagement = () => {
  const [formData, setFormData] = useState({
    usda_api_key: "",
    email_api_key: "",
    ticker_api_key: "",
    livestock_api_key: "",
    polygon_wallet_address: "",
    polygon_api_key: ""
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await axios.get(`${API}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("admin_token");
      await axios.put(`${API}/settings`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Settings updated successfully!");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }
    setPasswordLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      await axios.put(
        `${API}/auth/password`,
        {
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
      toast.success("Password updated successfully");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20" data-testid="settings-loading">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8" data-testid="settings-management">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-[#0f5132]" data-testid="settings-title">API Keys & Settings</h2>
        <Link to="/admin/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>
      <p className="text-gray-600 mb-6">
        Manage all your API keys and integrations. These keys are stored securely and used for various features across the site.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="usda_api_key">USDA Market API Key</Label>
          <Input
            id="usda_api_key"
            name="usda_api_key"
            type="text"
            value={formData.usda_api_key || ""}
            onChange={handleChange}
            placeholder="Enter USDA API key"
            data-testid="settings-usda-input"
          />
        </div>

        <div>
          <Label htmlFor="ticker_api_key">Livestock Price Ticker API Key</Label>
          <Input
            id="ticker_api_key"
            name="ticker_api_key"
            type="text"
            value={formData.ticker_api_key || ""}
            onChange={handleChange}
            placeholder="Enter ticker API key (currently using mock data)"
            data-testid="settings-ticker-input"
          />
        </div>

        <div>
          <Label htmlFor="livestock_api_key">Livestock Data API Key</Label>
          <Input
            id="livestock_api_key"
            name="livestock_api_key"
            type="text"
            value={formData.livestock_api_key || ""}
            onChange={handleChange}
            placeholder="Enter livestock API key"
            data-testid="settings-livestock-input"
          />
        </div>

        <div>
          <Label htmlFor="email_api_key">Email Service API Key (SendGrid, etc.)</Label>
          <Input
            id="email_api_key"
            name="email_api_key"
            type="text"
            value={formData.email_api_key || ""}
            onChange={handleChange}
            placeholder="Enter email API key"
            data-testid="settings-email-input"
          />
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-xl font-bold text-[#0f5132] mb-4">Polygon/NFT Settings</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="polygon_wallet_address">Polygon Wallet Address</Label>
              <Input
                id="polygon_wallet_address"
                name="polygon_wallet_address"
                type="text"
                value={formData.polygon_wallet_address || ""}
                onChange={handleChange}
                placeholder="0x..."
                data-testid="settings-wallet-input"
              />
            </div>

            <div>
              <Label htmlFor="polygon_api_key">Polygon API Key (Alchemy, Infura, etc.)</Label>
              <Input
                id="polygon_api_key"
                name="polygon_api_key"
                type="text"
                value={formData.polygon_api_key || ""}
                onChange={handleChange}
                placeholder="Enter Polygon API key"
                data-testid="settings-polygon-input"
              />
            </div>
          </div>
        </div>

        <Button type="submit" className="bg-[#0f5132] hover:bg-[#0a3c24] rounded-full" data-testid="settings-submit-btn">
          Save Settings
        </Button>
      </form>

      <div className="border-t pt-8 mt-10" data-testid="admin-password-reset-section">
        <h3 className="text-xl font-bold text-[#0f5132] mb-2">Change Admin Password</h3>
        <p className="text-gray-600 mb-5">Update the password for the admin account currently signed in.</p>
        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
          <div>
            <Label htmlFor="current_password">Current password</Label>
            <Input
              id="current_password"
              type="password"
              autoComplete="current-password"
              value={passwordData.current_password}
              onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
              required
              data-testid="admin-current-password-input"
            />
          </div>
          <div>
            <Label htmlFor="new_password">New password</Label>
            <Input
              id="new_password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              required
              data-testid="admin-new-password-input"
            />
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <Input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              required
              data-testid="admin-confirm-password-input"
            />
          </div>
          <Button
            type="submit"
            disabled={passwordLoading}
            className="bg-[#0f5132] hover:bg-[#0a3c24] rounded-full"
            data-testid="admin-password-submit-btn"
          >
            {passwordLoading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SettingsManagement;
