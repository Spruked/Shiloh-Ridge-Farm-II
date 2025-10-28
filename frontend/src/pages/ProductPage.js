import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/buttons';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ShoppingCart, Clock, Package, AlertTriangle } from 'lucide-react';
import Navigation from '../components/Navigation';
import PriceTicker from '../components/PriceTicker';
import Footer from '../components/Footer';

const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState({});
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    notes: ''
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API = `${BACKEND_URL}/api`;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API}/products`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateCart = (productId, quantity) => {
    setCart(prev => ({
      ...prev,
      [productId]: Math.max(0, quantity)
    }));
  };

  const getCartTotal = () => {
    return products.reduce((total, product) => {
      const quantity = cart[product.id] || 0;
      return total + (quantity * product.price_per_unit);
    }, 0);
  };

  const getCartItems = () => {
    return products.filter(product => cart[product.id] > 0).map(product => ({
      product_id: product.id,
      quantity: cart[product.id],
      price_per_unit: product.price_per_unit
    }));
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();

    const orderItems = getCartItems();
    if (orderItems.length === 0) {
      alert('Please add items to your cart before ordering.');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...orderForm,
          order_items: orderItems
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to place order');
      }

      alert('Order placed successfully! We will contact you soon.');
      setCart({});
      setShowOrderForm(false);
      setOrderForm({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_address: '',
        notes: ''
      });
    } catch (err) {
      alert('Failed to place order: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6]">
        <Navigation />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3d5a3d]"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#faf9f6]">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Alert className="max-w-md mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error loading products: {error}
            </AlertDescription>
          </Alert>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navigation />
      <PriceTicker />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Farm Products</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Fresh, locally-raised products from Shiloh Ridge Farm. All products are pre-orders
            and will be available based on our production schedule.
          </p>
        </div>

        <Alert className="max-w-4xl mx-auto mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Pre-Order Notice:</strong> All products are available for pre-order only.
            Delivery times vary based on production cycles. We will contact you when your order
            is ready for pickup or delivery.
          </AlertDescription>
        </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {products.map((product) => (
          <Card key={product.id} className="h-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="ml-2">
                  ${product.price_per_unit.toFixed(2)}/{product.unit}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Package className="h-4 w-4 mr-2" />
                  <span>Min Order: {product.minimum_order} {product.unit}</span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Lead Time: {product.lead_time_days} days</span>
                </div>

                {product.inventory_count > 0 && (
                  <div className="text-sm text-green-600">
                    {product.inventory_count} {product.unit} available
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCart(product.id, (cart[product.id] || 0) - 1)}
                    disabled={(cart[product.id] || 0) <= 0}
                  >
                    -
                  </Button>
                  <span className="w-12 text-center">
                    {cart[product.id] || 0}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCart(product.id, (cart[product.id] || 0) + 1)}
                  >
                    +
                  </Button>
                  <span className="text-sm text-gray-500 ml-2">
                    {product.unit}
                  </span>
                </div>

                {cart[product.id] > 0 && (
                  <div className="text-sm font-medium">
                    Subtotal: ${(cart[product.id] * product.price_per_unit).toFixed(2)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {getCartItems().length > 0 && (
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {getCartItems().map(item => {
                  const product = products.find(p => p.id === item.product_id);
                  return (
                    <div key={item.product_id} className="flex justify-between text-sm">
                      <span>{product.name} ({item.quantity} {product.unit})</span>
                      <span>${(item.quantity * item.price_per_unit).toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="border-t pt-2 font-medium">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span>${getCartTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowOrderForm(true)}
                className="w-full"
              >
                Proceed to Checkout
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {showOrderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Complete Your Order</CardTitle>
              <CardDescription>
                Please provide your contact information for delivery.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOrderSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border rounded-md"
                    value={orderForm.customer_name}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customer_name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full p-2 border rounded-md"
                    value={orderForm.customer_email}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customer_email: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    className="w-full p-2 border rounded-md"
                    value={orderForm.customer_phone}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Address</label>
                  <textarea
                    required
                    rows={3}
                    className="w-full p-2 border rounded-md"
                    value={orderForm.customer_address}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customer_address: e.target.value }))}
                    placeholder="Full address for delivery"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Special Instructions (Optional)</label>
                  <textarea
                    rows={2}
                    className="w-full p-2 border rounded-md"
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any special delivery instructions or notes"
                  />
                </div>

                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">
                    Place Order
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowOrderForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
      <Footer />
    </div>
  );
};

export default ProductPage;