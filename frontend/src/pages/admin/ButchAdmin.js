import React, { useEffect, useState } from 'react';
import { ArrowLeft, Database, Search, Sparkles, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/buttons';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { getApiBaseUrl } from '../../lib/backend';

const API = getApiBaseUrl();


const ButchAdmin = () => {
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(10);
  const [customerLookup, setCustomerLookup] = useState('');
  const [customerData, setCustomerData] = useState(null);
  const [health, setHealth] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const token = localStorage.getItem('admin_token');

  const authHeaders = token
    ? {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    : {
        'Content-Type': 'application/json',
      };

  const fetchHealth = async () => {
    try {
      const response = await fetch(`${API}/butch/health`);
      if (!response.ok) {
        throw new Error('Unable to read Butch health');
      }
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Butch health failed:', error);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const addPromo = async () => {
    setStatusMessage('');
    try {
      const response = await fetch(`${API}/butch/admin/promo`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          code: promoCode,
          discount_percent: discount,
          applicable_cuts: ['all'],
          authorized_by: 'Dominic Hanway',
        }),
      });

      if (!response.ok) {
        throw new Error('Promo activation failed');
      }

      setStatusMessage(`Promo ${promoCode} activated.`);
      setPromoCode('');
      fetchHealth();
    } catch (error) {
      console.error('Add promo failed:', error);
      setStatusMessage('Promo activation failed. Confirm you are logged in as admin.');
    }
  };

  const lookupCustomer = async () => {
    setStatusMessage('');
    try {
      const response = await fetch(`${API}/butch/customer/${encodeURIComponent(customerLookup)}`, {
        headers: authHeaders,
      });
      if (!response.ok) {
        throw new Error('Customer lookup failed');
      }
      const data = await response.json();
      setCustomerData(data);
    } catch (error) {
      console.error('Customer lookup failed:', error);
      setCustomerData(null);
      setStatusMessage('Customer not found or admin token is missing.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f4ee] px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#8f6428]">Butch SKG Admin</h1>
            <p className="mt-1 text-sm text-stone-600">Memory, promos, and voice health for the butcher assistant.</p>
          </div>
          <Link to="/admin/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back To Dashboard
            </Button>
          </Link>
        </div>

        {statusMessage && (
          <div className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700 shadow-sm">
            {statusMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-[#b6863a]" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-stone-700">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <Badge className="bg-green-100 text-green-800">
                  {health?.status || 'unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Memory Nodes</span>
                <span className="font-semibold">{health?.memory_nodes ?? '--'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Customer Profiles</span>
                <span className="font-semibold">{health?.customer_profiles ?? '--'}</span>
              </div>
              <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
                Voice backend:
                {' '}
                {health?.voice?.python_backend ? 'Python Kokoro' : health?.voice?.wsl_bridge ? 'WSL Kokoro bridge' : health?.voice?.local_cli ? 'Local Kokoro CLI' : 'Browser fallback'}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-[#b6863a]" />
                Active Promotions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[2fr,1fr,auto]">
                <div>
                  <Label htmlFor="promoCode">Promo Code</Label>
                  <Input
                    id="promoCode"
                    value={promoCode}
                    onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                    placeholder="BUTCHVIP"
                  />
                </div>
                <div>
                  <Label htmlFor="promoDiscount">Discount %</Label>
                  <Input
                    id="promoDiscount"
                    type="number"
                    value={discount}
                    onChange={(event) => setDiscount(parseInt(event.target.value || '0', 10))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addPromo} className="w-full bg-[#b6863a] hover:bg-[#7a5724]">
                    Activate
                  </Button>
                </div>
              </div>
              <p className="text-sm text-stone-600">
                These promotions are surfaced by Butch when the visitor qualifies or when Dominic wants to offer a specific deal.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-[#b6863a]" />
              Customer Lookup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Customer ID, email, or name"
                value={customerLookup}
                onChange={(event) => setCustomerLookup(event.target.value)}
              />
              <Button onClick={lookupCustomer} className="bg-[#b6863a] hover:bg-[#7a5724]">
                Lookup
              </Button>
            </div>

            {customerData && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#b6863a]" />
                    <span className="font-semibold">Profile</span>
                  </div>
                  <p><strong>Name:</strong> {customerData.profile.name || 'Unknown'}</p>
                  <p><strong>Email:</strong> {customerData.profile.email || 'Unknown'}</p>
                  <p><strong>Tier:</strong> {customerData.profile.loyalty_tier}</p>
                  <p><strong>Interactions:</strong> {customerData.interaction_count}</p>
                  <p><strong>Total Spent:</strong> ${Number(customerData.total_spent || 0).toFixed(2)}</p>
                  <p><strong>Preferred Cuts:</strong> {(customerData.preferred_cuts || []).join(', ') || 'None yet'}</p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                  <div className="mb-2 font-semibold text-stone-800">Recent Orders</div>
                  {(customerData.recent_orders || []).length > 0 ? (
                    customerData.recent_orders.map((order, index) => (
                      <div key={`${order.date || 'order'}_${index}`} className="mb-3 rounded-lg bg-stone-50 p-3 last:mb-0">
                        <div><strong>Status:</strong> {order.status || 'unknown'}</div>
                        <div><strong>Total:</strong> ${Number(order.total || 0).toFixed(2)}</div>
                        <div><strong>Date:</strong> {order.date || 'n/a'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg bg-stone-50 p-3 text-stone-500">No recent orders recorded for this profile yet.</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


export default ButchAdmin;
