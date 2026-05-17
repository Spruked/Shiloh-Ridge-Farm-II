import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/buttons';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import { getApiBaseUrl } from '../../lib/backend';

const API = getApiBaseUrl();

const normalizeProductForUi = (product) => ({
  ...product,
  category: product.category || 'sheep',
  type: product.type || 'lamb_meat',
  unit: product.unit || 'lb',
  price_per_unit: Number(product.price_per_unit ?? product.price ?? 0),
  min_order_quantity: product.min_order_quantity ?? product.minimum_order ?? 1,
  available_quantity: product.available_quantity ?? product.inventory_count ?? 0,
  estimated_lead_time: product.estimated_lead_time || (product.lead_time_days ? `${product.lead_time_days} days` : '1-2 weeks'),
  is_available: product.is_available ?? true,
  photos: Array.isArray(product.photos) ? product.photos : []
});

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'sheep',
    type: 'lamb_meat',
    description: '',
    price_per_unit: '',
    unit: 'lb',
    min_order_quantity: '1',
    estimated_lead_time: '1-2 weeks',
    available_quantity: '',
    is_available: true
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('admin_token');

      // Skip API call in demo mode
      if (token === "demo-token-2025") {
        const savedProducts = localStorage.getItem('admin_products_data');
        if (savedProducts) {
          const parsedProducts = JSON.parse(savedProducts).map(normalizeProductForUi);
          setProducts(parsedProducts);
        } else {
          // Demo data
          const demoProducts = [
            {
              id: 'demo-product-1',
              name: 'Premium Katahdin Lamb',
              category: 'sheep',
              type: 'lamb_meat',
              description: 'Whole or half lamb cuts from our premium Katahdin sheep.',
              price_per_unit: 8.50,
              unit: 'lb',
              min_order_quantity: 20,
              estimated_lead_time: '2 weeks',
              available_quantity: 0,
              is_available: true
            },
            {
              id: 'demo-product-2',
              name: 'Fresh Lamb Chops',
              category: 'sheep',
              type: 'lamb_chops',
              description: 'Tender rib and loin chops from our Katahdin lambs.',
              price_per_unit: 12.00,
              unit: 'lb',
              min_order_quantity: 2,
              estimated_lead_time: '1 week',
              available_quantity: 0,
              is_available: true
            }
          ].map(normalizeProductForUi);
          setProducts(demoProducts);
          localStorage.setItem('admin_products_data', JSON.stringify(demoProducts));
        }
        setLoading(false);
        return;
      }

      const response = await fetch(`${API}/products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      const normalizedProducts = data.map(normalizeProductForUi);
      setProducts(normalizedProducts);
      // Save to localStorage for persistence
      localStorage.setItem('admin_products_data', JSON.stringify(normalizedProducts));
    } catch (err) {
      setError(err.message);
      // Try to load from localStorage as fallback
      const savedProducts = localStorage.getItem('admin_products_data');
      if (savedProducts) {
        try {
          const parsedProducts = JSON.parse(savedProducts).map(normalizeProductForUi);
          setProducts(parsedProducts);
        } catch (parseError) {
          console.error("Error parsing saved products data:", parseError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('admin_token');
      const payload = {
        name: formData.name,
        category: formData.category,
        type: formData.type,
        description: formData.description,
        price_per_unit: parseFloat(formData.price_per_unit),
        unit: formData.unit,
        min_order_quantity: parseInt(formData.min_order_quantity, 10) || 1,
        available_quantity: formData.available_quantity === '' ? null : parseInt(formData.available_quantity, 10),
        is_available: formData.is_available,
        estimated_lead_time: formData.estimated_lead_time,
        photos: editingProduct?.photos || []
      };

      // Demo mode handling
      if (!token) {
        throw new Error('Please log in as an admin first');
      }

      if (token === "demo-token-2025") {
        const currentProducts = JSON.parse(localStorage.getItem('admin_products_data') || '[]').map(normalizeProductForUi);

        if (editingProduct) {
          // Update existing product
          const updatedProducts = currentProducts.map(product =>
            product.id === editingProduct.id
              ? {
                  ...product,
                  ...payload
                }
              : product
          );
          localStorage.setItem('admin_products_data', JSON.stringify(updatedProducts));
          setProducts(updatedProducts);
        } else {
          // Add new product
          const newProduct = {
            id: `demo-product-${Date.now()}`,
            ...payload
          };
          const updatedProducts = [...currentProducts, newProduct];
          localStorage.setItem('admin_products_data', JSON.stringify(updatedProducts));
          setProducts(updatedProducts);
        }

        alert('Product saved successfully! (Demo mode)');
        setShowForm(false);
        setEditingProduct(null);
        resetForm();
        return;
      }

      const url = editingProduct
        ? `${API}/products/${editingProduct.id}`
        : `${API}/products`;

      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      await fetchProducts();
      setShowForm(false);
      setEditingProduct(null);
      resetForm();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (product) => {
    const normalizedProduct = normalizeProductForUi(product);
    setEditingProduct(product);
    setFormData({
      name: normalizedProduct.name,
      category: normalizedProduct.category,
      type: normalizedProduct.type,
      description: normalizedProduct.description,
      price_per_unit: normalizedProduct.price_per_unit.toString(),
      unit: normalizedProduct.unit,
      min_order_quantity: normalizedProduct.min_order_quantity.toString(),
      estimated_lead_time: normalizedProduct.estimated_lead_time,
      available_quantity: normalizedProduct.available_quantity?.toString() ?? '',
      is_available: normalizedProduct.is_available
    });
    setShowForm(true);
  };

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');

      // Demo mode handling
      if (token === "demo-token-2025") {
        const currentProducts = JSON.parse(localStorage.getItem('admin_products_data') || '[]');
        const updatedProducts = currentProducts.filter(product => product.id !== productId);
        localStorage.setItem('admin_products_data', JSON.stringify(updatedProducts));
        setProducts(updatedProducts);
        alert('Product deleted successfully! (Demo mode)');
        return;
      }

      const response = await fetch(`${API}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      await fetchProducts();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'sheep',
      type: 'lamb_meat',
      description: '',
      price_per_unit: '',
      unit: 'lb',
      min_order_quantity: '1',
      estimated_lead_time: '1-2 weeks',
      available_quantity: '',
      is_available: true
    });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    resetForm();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading products: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-600">Manage farm products and inventory</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
          <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingProduct(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription>
                Configure product details and pricing.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Fresh Eggs"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Product description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sheep">Sheep</SelectItem>
                      <SelectItem value="hog">Hog</SelectItem>
                      <SelectItem value="eggs">Eggs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type">Product Type</Label>
                  <Input
                    id="type"
                    required
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    placeholder="e.g., lamb_meat"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price per Unit</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    required
                    value={formData.price_per_unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_per_unit: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lb">Pound</SelectItem>
                      <SelectItem value="each">Each</SelectItem>
                      <SelectItem value="dozen">Dozen</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minOrder">Minimum Order</Label>
                  <Input
                    id="minOrder"
                    type="number"
                    required
                    value={formData.min_order_quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_order_quantity: e.target.value }))}
                    placeholder="1"
                  />
                </div>

                <div>
                  <Label htmlFor="leadTime">Estimated Lead Time</Label>
                  <Input
                    id="leadTime"
                    required
                    value={formData.estimated_lead_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_lead_time: e.target.value }))}
                    placeholder="e.g., 1-2 weeks"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="inventory">Available Quantity</Label>
                <Input
                  id="inventory"
                  type="number"
                  value={formData.available_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, available_quantity: e.target.value }))}
                  placeholder="Leave blank for pre-order only"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.is_available}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_available: e.target.checked }))}
                />
                <Label htmlFor="available">Available for ordering</Label>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">
                  {editingProduct ? 'Update' : 'Create'} Product
                </Button>
                <Button type="button" variant="outline" onClick={closeForm} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </div>
                <Badge variant={product.is_available ? "default" : "secondary"}>
                  {product.is_available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Price:</span>
                  <span className="font-medium">${product.price_per_unit.toFixed(2)}/{product.unit}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Min Order:</span>
                  <span>{product.min_order_quantity} {product.unit}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Lead Time:</span>
                  <span>{product.estimated_lead_time}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Inventory:</span>
                  <span>{product.available_quantity ?? 'Pre-order'} {product.available_quantity != null ? product.unit : ''}</span>
                </div>

                <div className="flex space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
          <p className="text-gray-600">Get started by adding your first farm product.</p>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
