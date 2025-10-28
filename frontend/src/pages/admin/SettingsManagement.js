import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../../components/ui/buttons";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SettingsManagement = () => {
  const [formData, setFormData] = useState({
    usda_api_key: "",
    email_api_key: "",
    ticker_api_key: "",
    livestock_api_key: "",
    polygon_wallet_address: "",
    polygon_api_key: ""
  });
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

  if (loading) {
    return <div className="text-center py-20" data-testid="settings-loading">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8" data-testid="settings-management">
      <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6" data-testid="settings-title">API Keys & Settings</h2>
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
          <h3 className="text-xl font-bold text-[#3d5a3d] mb-4">Polygon/NFT Settings</h3>
          
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

        <Button type="submit" className="bg-[#3d5a3d] hover:bg-[#2d4a2d] rounded-full" data-testid="settings-submit-btn">
          Save Settings
        </Button>
      </form>
    </div>
  );
};

export default SettingsManagement;