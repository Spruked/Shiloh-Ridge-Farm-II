import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "../../components/ui/buttons";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
      toast.success("Login successful!");
      onLogin();
      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#3d5a3d] to-[#2d4a2d] flex items-center justify-center px-6" data-testid="admin-login-page">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/ShilohRidgeFarmicon256.png" 
            alt="Shiloh Ridge Farm Icon"
            className="w-24 h-24 mx-auto mb-4"
            data-testid="admin-login-logo"
          />
          <h1 className="text-3xl font-bold text-[#3d5a3d]" data-testid="admin-login-title">Admin Login</h1>
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
            className="w-full bg-[#3d5a3d] hover:bg-[#2d4a2d] text-white font-semibold py-6 rounded-full text-lg"
            data-testid="admin-login-submit-btn"
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Default: admin / admin123
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;