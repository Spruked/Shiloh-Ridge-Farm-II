import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";
import { Button } from "../components/ui/buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { getApiBaseUrl } from "../lib/backend";
import { useCart } from "../CartContext";
import { useCustomerAuth } from "../CustomerAuthContext";
import { useProducts } from "../ProductDataContext";
import { DEFAULT_PAYMENT_METHOD, PAYMENT_METHODS } from "../config/paymentMethods";

const API = getApiBaseUrl();

function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, clearCart, resolveUnitPrice } = useCart();
  const { products } = useProducts();
  const { isAuthenticated, profile, token } = useCustomerAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    notes: "",
    delivery_method: "pickup",
    preferred_pickup_date: "",
    payment_method: DEFAULT_PAYMENT_METHOD,
    coupon_code: "",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/account/login?next=/checkout");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setForm((current) => ({
      ...current,
      customer_name: current.customer_name || profile.full_name || "",
      customer_email: current.customer_email || profile.email || "",
      customer_phone: current.customer_phone || profile.phone || "",
      customer_address: current.customer_address || profile.address || "",
      notes: current.notes || profile.notes || "",
    }));
  }, [profile]);

  const items = useMemo(
    () =>
      products
        .filter((product) => (cart[product.id] || 0) > 0)
        .map((product) => ({
          product_id: product.id,
          quantity: cart[product.id],
          price_per_unit: resolveUnitPrice(product),
          product,
        })),
    [products, cart, resolveUnitPrice],
  );

  const total = items.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (items.length === 0) {
      setError("Please add products to your cart before checking out.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          source_app: "shiloh_ridge_farm",
          order_items: items.map(({ product_id, quantity, price_per_unit }) => ({
            product_id,
            quantity,
            price_per_unit,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || "Checkout failed");
      }

      clearCart();
      setSuccessMessage(
        "Your pre-order was submitted successfully. Dominic will follow up by email about confirmation, pickup, delivery, or shipping timing.",
      );
      setTimeout(() => {
        navigate("/products");
      }, 1800);
    } catch (submitError) {
      setError(submitError.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f3e7]">
      <Navigation />
      <PriceTicker />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b6863a]">Checkout</p>
          <h1 className="text-4xl font-bold text-[#0f5132]">Complete your pre-order</h1>
          <p className="mx-auto max-w-3xl text-stone-600">
            This checkout uses the farm’s pre-order system. Dominic will confirm availability and email the customer when the order is confirmed, in process, ready, delivered, or shipped.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
          <Card className="border-stone-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-[#0f5132]">Customer details</CardTitle>
              <CardDescription>
                Keep this simple and clear so the owner can follow up and the customer can receive order updates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                  <Alert>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {successMessage && (
                  <Alert>
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    placeholder="Full name"
                    value={form.customer_name}
                    onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={form.customer_email}
                    onChange={(event) => setForm((current) => ({ ...current, customer_email: event.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    placeholder="Phone"
                    value={form.customer_phone}
                    onChange={(event) => setForm((current) => ({ ...current, customer_phone: event.target.value }))}
                    required
                  />
                  <Input
                    type="date"
                    value={form.preferred_pickup_date}
                    onChange={(event) => setForm((current) => ({ ...current, preferred_pickup_date: event.target.value }))}
                  />
                </div>

                <Textarea
                  rows={3}
                  placeholder="Delivery address"
                  value={form.customer_address}
                  onChange={(event) => setForm((current) => ({ ...current, customer_address: event.target.value }))}
                  required
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-stone-700">
                    <span>Fulfillment method</span>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      value={form.delivery_method}
                      onChange={(event) => setForm((current) => ({ ...current, delivery_method: event.target.value }))}
                    >
                      <option value="pickup">Pickup</option>
                      <option value="local_delivery">Local Delivery</option>
                      <option value="shipping">Shipping</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-stone-700">
                    <span>Payment method</span>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      value={form.payment_method}
                      onChange={(event) => setForm((current) => ({ ...current, payment_method: event.target.value }))}
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <Input
                  placeholder="Coupon code (optional)"
                  value={form.coupon_code}
                  onChange={(event) => setForm((current) => ({ ...current, coupon_code: event.target.value.toUpperCase() }))}
                />

                <Textarea
                  rows={4}
                  placeholder="Special instructions, cut requests, or delivery notes"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />

                <Button
                  type="submit"
                  disabled={submitting || items.length === 0}
                  className="w-full bg-[#0f5132] hover:bg-[#0a3c24]"
                >
                  {submitting ? "Submitting..." : "Submit Pre-Order"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-stone-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-[#0f5132]">Order summary</CardTitle>
              <CardDescription>Based on the products currently in the cart.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.product_id} className="rounded-xl bg-stone-50 p-3 text-sm text-stone-700">
                  <div className="flex justify-between gap-3">
                    <span>{item.product.name}</span>
                    <span>${(item.quantity * item.price_per_unit).toFixed(2)}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {item.quantity} {item.product.unit || "unit"} at ${item.price_per_unit.toFixed(2)} each
                  </p>
                </div>
              ))}

              <div className="border-t border-stone-200 pt-4">
                <div className="flex justify-between text-lg font-semibold text-stone-900">
                  <span>Estimated total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-[#f3efdf] p-4 text-sm text-stone-600">
                This integrates the added checkout module ideas into the farm system: payment choice, coupon field, and structured order metadata, while keeping the Shiloh pre-order workflow intact.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default CheckoutPage;
