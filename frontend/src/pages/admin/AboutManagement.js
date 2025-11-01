import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../../components/ui/buttons";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AboutManagement = () => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    mission: "",
    history: ""
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAboutContent();
  }, []);

  const fetchAboutContent = async () => {
    try {
      const token = localStorage.getItem("admin_token");

      // Skip API call in demo mode
      if (token === "demo-token-2025") {
        const savedContent = localStorage.getItem('admin_about_content');
        if (savedContent) {
          const parsedContent = JSON.parse(savedContent);
          setFormData(parsedContent);
        } else {
          // Demo data
          const demoContent = {
            title: "About Shiloh Ridge Farm",
            content: "Welcome to Shiloh Ridge Farm, a family-owned and operated livestock farm specializing in premium Katahdin sheep. We are committed to raising healthy, high-quality animals using sustainable farming practices.",
            mission: "Our mission is to provide the highest quality Katahdin sheep while maintaining the health and welfare of our animals and preserving the natural beauty of our land.",
            history: "Founded in 2020, Shiloh Ridge Farm has grown from a small family operation to a respected breeder of Katahdin sheep in the region."
          };
          setFormData(demoContent);
          localStorage.setItem('admin_about_content', JSON.stringify(demoContent));
        }
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API}/about`);
      setFormData(response.data);
      // Save to localStorage for persistence
      localStorage.setItem('admin_about_content', JSON.stringify(response.data));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching about content:", error);
      // Try to load from localStorage as fallback
      const savedContent = localStorage.getItem('admin_about_content');
      if (savedContent) {
        try {
          const parsedContent = JSON.parse(savedContent);
          setFormData(parsedContent);
        } catch (parseError) {
          console.error("Error parsing saved about content:", parseError);
        }
      }
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

      // Demo mode handling
      if (token === "demo-token-2025") {
        localStorage.setItem('admin_about_content', JSON.stringify(formData));
        toast.success("About page updated successfully! (Demo mode)");
        return;
      }

      await axios.put(`${API}/about`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("About page updated successfully!");
    } catch (error) {
      console.error("Error updating about content:", error);
      toast.error("Failed to update about page");
    }
  };

  if (loading) {
    return <div className="text-center py-20" data-testid="about-management-loading">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8" data-testid="about-management">
      <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6" data-testid="about-management-title">About Page Management</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="title">Page Title</Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            data-testid="about-title-input"
          />
        </div>

        <div>
          <Label htmlFor="content">Main Content</Label>
          <Textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={6}
            data-testid="about-content-input"
          />
        </div>

        <div>
          <Label htmlFor="mission">Mission Statement</Label>
          <Textarea
            id="mission"
            name="mission"
            value={formData.mission}
            onChange={handleChange}
            rows={4}
            data-testid="about-mission-input"
          />
        </div>

        <div>
          <Label htmlFor="history">History</Label>
          <Textarea
            id="history"
            name="history"
            value={formData.history}
            onChange={handleChange}
            rows={4}
            data-testid="about-history-input"
          />
        </div>

        <Button type="submit" className="bg-[#3d5a3d] hover:bg-[#2d4a2d] rounded-full" data-testid="about-submit-btn">
          Update About Page
        </Button>
      </form>
    </div>
  );
};

export default AboutManagement;