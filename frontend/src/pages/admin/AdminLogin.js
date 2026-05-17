import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "../../components/ui/buttons";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { getApiBaseUrl } from "../../lib/backend";

const API = getApiBaseUrl();
const LOGO_URL = "/ShilohRidgeFarmicon256.png";

/**
 * Copyright (c) {new Date().getFullYear()} Shiloh Ridge Farm
 * All rights reserved. Shiloh Ridge Farm Management System.
 */
const AdminLogin = ({ onLogin }) => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, credentials);
      localStorage.setItem("admin_token", response.data.access_token);
      localStorage.setItem("admin_username", (credentials.username || "").trim() || "Dominic");
      toast.success("Login successful!");
      onLogin();
      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Invalid credentials or admin service unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f5132] to-[#0a3c24] flex items-center justify-center px-6" data-testid="admin-login-page">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={LOGO_URL} 
            alt="Shiloh Ridge Farm Icon"
            className="w-28 h-28 mx-auto mb-4"
            data-testid="admin-login-logo"
          />
          <h1 className="text-3xl font-bold text-[#0f5132]" data-testid="admin-login-title">Admin Login</h1>
        </div>

        <form onSubmit={handleSubmit} data-testid="admin-login-form">
          <div className="mb-6">
            <Label htmlFor="username" className="text-gray-700 font-medium mb-2 block">Username</Label>
            <Input
              id="username"
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              required
              className="w-full rounded-lg"
              data-testid="admin-username-input"
            />
          </div>

          <div className="mb-6">
            <Label htmlFor="password" className="text-gray-700 font-medium mb-2 block">Password</Label>
            <Input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              required
              className="w-full rounded-lg"
              data-testid="admin-password-input"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0f5132] hover:bg-[#0a3c24] text-white font-semibold py-6 rounded-full text-lg"
            data-testid="admin-login-submit-btn"
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
