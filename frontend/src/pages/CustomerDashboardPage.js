import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Download, LogOut, PackageCheck, RefreshCw, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useCustomerAuth } from "../CustomerAuthContext";
import { getApiBaseUrl } from "../lib/backend";

const API = getApiBaseUrl();

function CustomerDashboardPage() {
  const { token, profile, isAuthenticated, authLoading, logout, updateProfile, uploadProfilePhoto } = useCustomerAuth();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        notes: profile.notes || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!token) {
      setLoadingOrders(false);
      return;
    }

    let cancelled = false;
    async function fetchOrders() {
      try {
        const response = await fetch(`${API}/customer/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Unable to load orders");
        }
        if (!cancelled) {
          setOrders(data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingOrders(false);
        }
      }
    }

    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const activeOrders = useMemo(
    () => orders.filter((order) => !["completed", "cancelled"].includes(order.status)),
    [orders],
  );

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/account/login" replace />;
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      await uploadProfilePhoto(file);
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function openInvoice(orderId) {
    const response = await fetch(`${API}/customer/orders/${orderId}/invoice`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      toast.error("Invoice not available");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen bg-[#f7f3e7]">
      <Navigation />
      <PriceTicker />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-lg md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-[#e7eddc]">
              {profile?.profile_image_url ? (
                <img src={profile.profile_image_url} alt={profile.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#0f5132]">
                  {(profile?.full_name || "S").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b6863a]">Customer Dashboard</p>
              <h1 className="text-3xl font-bold text-[#0f5132]">{profile?.full_name}</h1>
              <p className="text-sm text-stone-600">{profile?.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/products">
              <Button variant="outline">Keep Shopping</Button>
            </Link>
            <Button variant="outline" className="gap-2" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          <Card className="border-stone-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-[#0f5132]">Profile</CardTitle>
              <CardDescription>Keep your farm contact details current so Dominic can serve you quickly.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSaveProfile}>
                <Input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} />
                <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" />
                <Textarea rows={3} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Address" />
                <Textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Customer notes or preferences" />
                <label className="block rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-600">
                  <span className="mb-2 inline-flex items-center gap-2 font-medium text-[#0f5132]">
                    <UploadCloud className="h-4 w-4" />
                    Upload profile photo
                  </span>
                  <input type="file" accept="image/*" className="mt-2 block w-full" onChange={handlePhotoUpload} />
                </label>
                <Button type="submit" disabled={saving} className="w-full bg-[#0f5132] hover:bg-[#0a3c24]">
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-stone-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-[#0f5132]">Active orders</CardTitle>
                <CardDescription>Orders still moving through the farm workflow.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="text-sm text-stone-600">Loading orders...</div>
                ) : activeOrders.length === 0 ? (
                  <Alert>
                    <AlertDescription>No active orders right now.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {activeOrders.map((order) => (
                      <OrderCard key={order.id} order={order} onOpenInvoice={openInvoice} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-stone-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-[#0f5132]">Past orders</CardTitle>
                <CardDescription>Finished or cancelled orders stay here for your records.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orders.filter((order) => ["completed", "cancelled"].includes(order.status)).map((order) => (
                    <OrderCard key={order.id} order={order} onOpenInvoice={openInvoice} />
                  ))}
                  {!loadingOrders && orders.filter((order) => ["completed", "cancelled"].includes(order.status)).length === 0 && (
                    <Alert>
                      <AlertDescription>No completed orders yet.</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function OrderCard({ order, onOpenInvoice }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-[#0f5132]">Order #{order.id.slice(-8)}</p>
          <p className="text-sm text-stone-600">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <Badge className="bg-[#e7eddc] text-[#0f5132]">{order.status}</Badge>
      </div>
      <div className="mt-3 text-sm text-stone-600">
        {order.order_items?.map((item, index) => (
          <p key={`${order.id}-${index}`}>
            {item.quantity} x {item.product_name || item.product_id}
          </p>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold text-[#8f6428]">${Number(order.total_amount || 0).toFixed(2)}</span>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => onOpenInvoice(order.id)}>
          <Download className="h-4 w-4" />
          Invoice
        </Button>
      </div>
    </div>
  );
}

export default CustomerDashboardPage;
