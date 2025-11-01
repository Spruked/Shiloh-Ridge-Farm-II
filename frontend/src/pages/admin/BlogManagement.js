import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../../components/ui/buttons";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BlogManagement = () => {
  const [blogData, setBlogData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "Farm Blog",
    posts: []
  });

  useEffect(() => {
    fetchBlogData();
  }, []);

  const fetchBlogData = async () => {
    try {
      const token = localStorage.getItem("admin_token");

      // Skip API call in demo mode
      if (token === "demo-token-2025") {
        const savedBlogData = localStorage.getItem('admin_blog_data');
        if (savedBlogData) {
          const parsedBlogData = JSON.parse(savedBlogData);
          setBlogData(parsedBlogData);
          setFormData({
            title: parsedBlogData.title || "Farm Blog",
            posts: parsedBlogData.posts || []
          });
        } else {
          // Demo data
          const demoBlogData = {
            title: "Farm Blog",
            posts: [
              {
                id: 'demo-post-1',
                title: 'Welcome to Shiloh Ridge Farm',
                content: 'We are excited to share our journey and knowledge about Katahdin sheep farming. Our blog will feature updates on our livestock, farming tips, and insights into sustainable agriculture.',
                author: 'Shiloh Ridge Farm',
                published_date: new Date().toISOString().split('T')[0],
                tags: ['welcome', 'introduction'],
                featured: true
              }
            ]
          };
          setBlogData(demoBlogData);
          setFormData({
            title: demoBlogData.title,
            posts: demoBlogData.posts
          });
          localStorage.setItem('admin_blog_data', JSON.stringify(demoBlogData));
        }
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API}/blog`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlogData(response.data);
      setFormData({
        title: response.data.title || "Farm Blog",
        posts: response.data.posts || []
      });
      // Save to localStorage for persistence
      localStorage.setItem('admin_blog_data', JSON.stringify(response.data));
    } catch (error) {
      console.error("Error fetching blog data:", error);
      // Try to load from localStorage as fallback
      const savedBlogData = localStorage.getItem('admin_blog_data');
      if (savedBlogData) {
        try {
          const parsedBlogData = JSON.parse(savedBlogData);
          setBlogData(parsedBlogData);
          setFormData({
            title: parsedBlogData.title || "Farm Blog",
            posts: parsedBlogData.posts || []
          });
        } catch (parseError) {
          console.error("Error parsing saved blog data:", parseError);
        }
      }
      toast.error("Failed to load blog data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");

      // Demo mode handling
      if (token === "demo-token-2025") {
        localStorage.setItem('admin_blog_data', JSON.stringify(formData));
        setBlogData(formData);
        toast.success("Blog updated successfully! (Demo mode)");
        setSaving(false);
        return;
      }

      await axios.put(`${API}/blog`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Blog updated successfully");
      fetchBlogData(); // Refresh data
    } catch (error) {
      console.error("Error saving blog data:", error);
      toast.error("Failed to save blog data");
    } finally {
      setSaving(false);
    }
  };

  const handlePostChange = (index, field, value) => {
    const updatedPosts = [...formData.posts];
    updatedPosts[index] = { ...updatedPosts[index], [field]: value };
    setFormData({ ...formData, posts: updatedPosts });
  };

  const addNewPost = () => {
    const newPost = {
      id: `post-${Date.now()}`,
      title: "",
      content: "",
      author: "Shiloh Ridge Farm",
      published_date: new Date().toISOString().split('T')[0],
      tags: [],
      featured: false
    };
    setFormData({
      ...formData,
      posts: [...formData.posts, newPost]
    });
  };

  const removePost = (index) => {
    const updatedPosts = formData.posts.filter((_, i) => i !== index);
    setFormData({ ...formData, posts: updatedPosts });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3d5a3d]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#3d5a3d]">Blog Management</h2>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#3d5a3d] hover:bg-[#2e472e] text-white"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Blog Title */}
      <div className="bg-white p-6 rounded-lg shadow">
        <Label htmlFor="blog-title" className="text-lg font-semibold">Blog Title</Label>
        <Input
          id="blog-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="mt-2"
          placeholder="Enter blog title"
        />
      </div>

      {/* Blog Posts */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-[#3d5a3d]">Blog Posts</h3>
          <Button
            onClick={addNewPost}
            className="bg-[#3d5a3d] hover:bg-[#2e472e] text-white"
          >
            Add New Post
          </Button>
        </div>

        {formData.posts.map((post, index) => (
          <div key={post.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-semibold">Post #{index + 1}</h4>
              <Button
                onClick={() => removePost(index)}
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                Remove
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor={`post-title-${index}`}>Title</Label>
                <Input
                  id={`post-title-${index}`}
                  value={post.title}
                  onChange={(e) => handlePostChange(index, 'title', e.target.value)}
                  placeholder="Post title"
                />
              </div>
              <div>
                <Label htmlFor={`post-author-${index}`}>Author</Label>
                <Input
                  id={`post-author-${index}`}
                  value={post.author}
                  onChange={(e) => handlePostChange(index, 'author', e.target.value)}
                  placeholder="Author name"
                />
              </div>
            </div>

            <div className="mb-4">
              <Label htmlFor={`post-date-${index}`}>Published Date</Label>
              <Input
                id={`post-date-${index}`}
                type="date"
                value={post.published_date}
                onChange={(e) => handlePostChange(index, 'published_date', e.target.value)}
              />
            </div>

            <div className="mb-4">
              <Label htmlFor={`post-tags-${index}`}>Tags (comma-separated)</Label>
              <Input
                id={`post-tags-${index}`}
                value={post.tags ? post.tags.join(', ') : ''}
                onChange={(e) => handlePostChange(index, 'tags', e.target.value.split(',').map(tag => tag.trim()))}
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <div className="mb-4">
              <Label htmlFor={`post-content-${index}`}>Content</Label>
              <Textarea
                id={`post-content-${index}`}
                value={post.content}
                onChange={(e) => handlePostChange(index, 'content', e.target.value)}
                rows={10}
                placeholder="Write your blog post content here..."
                className="mt-2"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`post-featured-${index}`}
                checked={post.featured || false}
                onChange={(e) => handlePostChange(index, 'featured', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor={`post-featured-${index}`}>Featured Post</Label>
            </div>
          </div>
        ))}

        {formData.posts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No blog posts yet. Click "Add New Post" to create your first post.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogManagement;