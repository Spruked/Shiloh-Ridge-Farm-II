import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Boxes,
  ClipboardList,
  DollarSign,
  Package,
  PieChart,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "../../components/ui/buttons";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { getApiBaseUrl } from "../../lib/backend";

const API = getApiBaseUrl();

const DEMO_DATA = {
  livestock: [
    { id: "demo-sheep-1", animal_type: "sheep", status: "available", price: 325, registration_number: "KHSI-DEMO-001", capture_confidence: 0.92 },
    { id: "demo-sheep-2", animal_type: "sheep", status: "breeding_stock", price: 450, registration_number: "KHSI-DEMO-002", capture_confidence: 0.86 },
    { id: "demo-hog-1", animal_type: "hog", status: "available", price: 280, requires_review: true, capture_confidence: 0.48 },
  ],
  products: [
    { id: "demo-prod-1", name: "Lamb Share", category: "lamb", price_per_unit: 9.5, available_quantity: 12, is_available: true },
    { id: "demo-prod-2", name: "Half Hog", category: "pork", price_per_unit: 5.25, available_quantity: 3, is_available: true },
  ],
  orders: [
    { id: "demo-order-1", status: "pending", total_amount: 285, created_at: "2026-05-01T12:00:00Z" },
    { id: "demo-order-2", status: "completed", total_amount: 640, created_at: "2026-05-08T12:00:00Z" },
  ],
  sales: [
    { id: "demo-sale-1", sale_type: "breeding_stock", payment_status: "paid", total_amount: 450, date: "2026-05-05" },
    { id: "demo-sale-2", sale_type: "market", payment_status: "pending", total_amount: 280, date: "2026-05-12" },
  ],
  customers: [{ id: "demo-customer-1" }, { id: "demo-customer-2" }],
  contacts: [
    { id: "demo-contact-1", status: "new", inquiry_type: "livestock", created_at: "2026-05-13T12:00:00Z" },
    { id: "demo-contact-2", status: "read", inquiry_type: "products", created_at: "2026-05-15T12:00:00Z" },
  ],
  inventory: [
    { id: "demo-inv-1", animal_type: "sheep", status: "available", estimated_value: 325, current_weight: 145 },
    { id: "demo-inv-2", animal_type: "sheep", status: "breeding", estimated_value: 450, current_weight: 172 },
    { id: "demo-inv-3", animal_type: "hog", status: "market", estimated_value: 280, current_weight: 245 },
  ],
  expenses: [
    { id: "demo-exp-1", category: "feed_supplements", amount: 245.5, date: "2026-05-04" },
    { id: "demo-exp-2", category: "veterinary_health", amount: 125, date: "2026-05-11" },
  ],
  revenue: [
    { id: "demo-rev-1", type: "livestock_sales", amount: 450, date: "2026-05-05" },
    { id: "demo-rev-2", type: "product_sales", amount: 285, date: "2026-05-14" },
  ],
};

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function percent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(1)}%`;
}

function normalizeLabel(value) {
  return String(value || "unknown").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getMonthKey(record) {
  const rawDate = record?.date || record?.sale_date || record?.created_at || record?.updated_at;
  const parsed = rawDate ? new Date(rawDate) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "Unscheduled";
  return parsed.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function groupBy(records, keyGetter, valueGetter = () => 1) {
  return records.reduce((acc, record) => {
    const key = keyGetter(record);
    acc[key] = (acc[key] || 0) + valueGetter(record);
    return acc;
  }, {});
}

function toRows(grouped) {
  return Object.entries(grouped)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function maxValue(rows) {
  return Math.max(1, ...rows.map((row) => row.value));
}

function DataBarList({ rows, formatter = (value) => value }) {
  const max = maxValue(rows);

  if (!rows.length) {
    return <p className="text-sm text-stone-500">No records yet.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-stone-700">{normalizeLabel(row.label)}</span>
            <span className="tabular-nums text-stone-500">{formatter(row.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-stone-100">
            <div
              className="h-2 rounded-full bg-[#0f5132]"
              style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ title, value, caption, icon: Icon, tone = "green" }) {
  const toneClass = tone === "gold" ? "bg-[#f6ead5] text-[#8f6428]" : "bg-[#e7eddc] text-[#0f5132]";

  return (
    <Card className="border-stone-200 shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{title}</p>
            <p className="mt-2 text-2xl font-bold text-[#0f5132]">{value}</p>
            {caption && <p className="mt-1 text-sm text-stone-600">{caption}</p>}
          </div>
          <div className={`rounded-lg p-2 ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsMatrix({ rows }) {
  const maxCount = Math.max(1, ...rows.map((row) => row.count));

  return (
    <Card className="border-stone-200 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#0f5132]">
          <BarChart3 className="h-5 w-5 text-[#b6863a]" />
          Analytics Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-[#e7eddc] text-[#0f5132]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Area</th>
                <th className="px-4 py-3 text-right font-semibold">Count</th>
                <th className="px-4 py-3 text-right font-semibold">Value</th>
                <th className="px-4 py-3 text-right font-semibold">Active / Open</th>
                <th className="px-4 py-3 text-right font-semibold">Needs Attention</th>
                <th className="px-4 py-3 text-left font-semibold">Count Graph</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-stone-100">
                  <td className="px-4 py-3 font-medium text-stone-800">{row.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{currency(row.value)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.active}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={row.attention > 0 ? "font-semibold text-[#b6863a]" : "text-stone-500"}>
                      {row.attention}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-2.5 rounded-full bg-stone-100">
                      <div
                        className="h-2.5 rounded-full bg-[#0f5132]"
                        style={{ width: `${Math.max(3, (row.count / maxCount) * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ColumnChart({ title, rows, formatter = (value) => value }) {
  const max = maxValue(rows);

  return (
    <Card className="border-stone-200 shadow-md">
      <CardHeader>
        <CardTitle className="text-[#0f5132]">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">No records yet.</p>
        ) : (
          <div className="flex h-56 items-end gap-3 border-b border-l border-stone-200 px-3 pt-4">
            {rows.map((row) => (
              <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="text-xs font-medium text-stone-600">{formatter(row.value)}</div>
                <div
                  className="w-full rounded-t-md bg-[#0f5132]"
                  style={{ height: `${Math.max(8, (row.value / max) * 160)}px` }}
                  title={`${normalizeLabel(row.label)}: ${formatter(row.value)}`}
                />
                <div className="w-full truncate text-center text-xs text-stone-500">{normalizeLabel(row.label)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DonutChart({ title, rows }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const colors = ["#0f5132", "#b6863a", "#5f7f45", "#8f6428", "#6b7280", "#164e63"];
  let cursor = 0;
  const gradient = rows.length
    ? rows.map((row, index) => {
        const start = cursor;
        const end = cursor + (row.value / Math.max(total, 1)) * 100;
        cursor = end;
        return `${colors[index % colors.length]} ${start}% ${end}%`;
      }).join(", ")
    : "#e7e5e4 0% 100%";

  return (
    <Card className="border-stone-200 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#0f5132]">
          <PieChart className="h-5 w-5 text-[#b6863a]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[180px,1fr] md:items-center">
        <div
          className="mx-auto flex h-40 w-40 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${gradient})` }}
        >
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
            <span className="text-2xl font-bold text-[#0f5132]">{total}</span>
            <span className="text-xs text-stone-500">total</span>
          </div>
        </div>
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="truncate text-stone-700">{normalizeLabel(row.label)}</span>
              </span>
              <span className="tabular-nums text-stone-500">{row.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsPage() {
  const [datasets, setDatasets] = useState(DEMO_DATA);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const requests = [
      ["livestock", axios.get(`${API}/livestock`)],
      ["products", axios.get(`${API}/products`)],
      ["orders", axios.get(`${API}/orders`, { headers })],
      ["sales", axios.get(`${API}/sales`, { headers })],
      ["customers", axios.get(`${API}/sales/customers`, { headers })],
      ["contacts", axios.get(`${API}/contact`, { headers })],
      ["inventory", axios.get(`${API}/inventory`, { headers })],
      ["expenses", axios.get(`${API}/accounting/expenses`, { headers })],
      ["revenue", axios.get(`${API}/accounting/revenue`, { headers })],
    ];

    const settled = await Promise.allSettled(requests.map(([, request]) => request));
    const next = { ...DEMO_DATA };
    const nextErrors = [];

    settled.forEach((result, index) => {
      const key = requests[index][0];
      if (result.status === "fulfilled") {
        next[key] = Array.isArray(result.value.data) ? result.value.data : [];
      } else {
        nextErrors.push(key);
      }
    });

    setDatasets(next);
    setErrors(nextErrors);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const analytics = useMemo(() => {
    const livestock = datasets.livestock || [];
    const products = datasets.products || [];
    const orders = datasets.orders || [];
    const sales = datasets.sales || [];
    const customers = datasets.customers || [];
    const contacts = datasets.contacts || [];
    const inventory = datasets.inventory || [];
    const expenses = datasets.expenses || [];
    const revenue = datasets.revenue || [];

    const orderRevenue = orders.reduce((sum, order) => sum + toNumber(order.total_amount), 0);
    const salesRevenue = sales.reduce((sum, sale) => sum + toNumber(sale.total_amount), 0);
    const accountingRevenue = revenue.reduce((sum, item) => sum + toNumber(item.amount), 0);
    const expenseTotal = expenses.reduce((sum, item) => sum + toNumber(item.amount), 0);
    const productValue = products.reduce((sum, item) => {
      const quantity = item.available_quantity == null ? 1 : toNumber(item.available_quantity);
      return sum + (toNumber(item.price_per_unit || item.price) * quantity);
    }, 0);
    const grossRevenue = Math.max(orderRevenue + salesRevenue, accountingRevenue);
    const netProfit = grossRevenue - expenseTotal;
    const inventoryValue = inventory.reduce((sum, item) => sum + toNumber(item.estimated_value || item.sale_price), 0);
    const livestockValue = livestock.reduce((sum, item) => sum + toNumber(item.price), 0);
    const reviewCount = livestock.filter((item) => item.requires_review || toNumber(item.capture_confidence) < 0.55).length;
    const registeredCount = livestock.filter((item) => item.registration_number).length;
    const lowStockProducts = products.filter((item) => item.available_quantity != null && toNumber(item.available_quantity) <= 3).length;
    const pendingOrders = orders.filter((item) => ["pending", "confirmed", "processing"].includes(item.status)).length;
    const unpaidSales = sales.filter((item) => item.payment_status && item.payment_status !== "paid").length;
    const newContacts = contacts.filter((item) => item.status === "new").length;
    const activeProducts = products.filter((item) => item.is_available !== false).length;
    const activeLivestock = livestock.filter((item) => ["available", "breeding_stock", "breeding"].includes(item.status)).length;
    const activeInventory = inventory.filter((item) => !["sold", "archived"].includes(item.status)).length;
    const paidSales = sales.filter((item) => item.payment_status === "paid").length;
    const receivedRevenue = revenue.filter((item) => !item.payment_status || item.payment_status === "received").length;
    const unpaidExpenses = expenses.filter((item) => item.payment_status && item.payment_status !== "paid").length;

    const matrixRows = [
      { label: "Livestock", count: livestock.length, value: livestockValue, active: activeLivestock, attention: reviewCount },
      { label: "Inventory", count: inventory.length, value: inventoryValue, active: activeInventory, attention: inventory.filter((item) => item.status === "market").length },
      { label: "Products", count: products.length, value: productValue, active: activeProducts, attention: lowStockProducts },
      { label: "Orders", count: orders.length, value: orderRevenue, active: pendingOrders, attention: pendingOrders },
      { label: "Sales", count: sales.length, value: salesRevenue, active: paidSales, attention: unpaidSales },
      { label: "Customers", count: customers.length, value: 0, active: customers.length, attention: 0 },
      { label: "Contacts", count: contacts.length, value: 0, active: newContacts, attention: newContacts },
      { label: "Revenue Records", count: revenue.length, value: accountingRevenue, active: receivedRevenue, attention: 0 },
      { label: "Expense Records", count: expenses.length, value: expenseTotal, active: expenses.length - unpaidExpenses, attention: unpaidExpenses },
    ];

    const attentionRows = [
      { label: "Review Captures", value: reviewCount },
      { label: "Unpaid Sales", value: unpaidSales },
      { label: "Low Stock Products", value: lowStockProducts },
      { label: "New Contacts", value: newContacts },
      { label: "Unpaid Expenses", value: unpaidExpenses },
    ].filter((row) => row.value > 0);

    return {
      grossRevenue,
      expenseTotal,
      netProfit,
      margin: grossRevenue ? (netProfit / grossRevenue) * 100 : 0,
      inventoryValue,
      livestockValue,
      productValue,
      pendingOrders,
      unpaidSales,
      reviewCount,
      registeredCount,
      lowStockProducts,
      newContacts,
      matrixRows,
      attentionRows,
      counts: {
        livestock: livestock.length,
        products: products.length,
        orders: orders.length,
        customers: customers.length,
        contacts: contacts.length,
        inventory: inventory.length,
      },
      rows: {
        matrixCounts: matrixRows.map((row) => ({ label: row.label, value: row.count })),
        matrixValues: matrixRows.filter((row) => row.value > 0).map((row) => ({ label: row.label, value: row.value })),
        livestockByType: toRows(groupBy(livestock, (item) => item.animal_type)),
        livestockByStatus: toRows(groupBy(livestock, (item) => item.status)),
        inventoryByType: toRows(groupBy(inventory, (item) => item.animal_type)),
        inventoryByStatus: toRows(groupBy(inventory, (item) => item.status)),
        ordersByStatus: toRows(groupBy(orders, (item) => item.status)),
        salesByType: toRows(groupBy(sales, (item) => item.sale_type)),
        expensesByCategory: toRows(groupBy(expenses, (item) => item.category, (item) => toNumber(item.amount))),
        revenueByType: toRows(groupBy(revenue, (item) => item.type, (item) => toNumber(item.amount))),
        contactsByStatus: toRows(groupBy(contacts, (item) => item.status)),
        monthlyRevenue: toRows(groupBy([...orders, ...sales, ...revenue], getMonthKey, (item) => toNumber(item.total_amount || item.amount))),
        monthlyExpenses: toRows(groupBy(expenses, getMonthKey, (item) => toNumber(item.amount))),
      },
    };
  }, [datasets]);

  return (
    <div className="min-h-screen bg-[#f3efdf] px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-lg md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link to="/admin/dashboard">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Badge variant="outline" className="border-[#b6863a] text-[#8f6428]">Full Analytics</Badge>
            </div>
            <h1 className="text-3xl font-bold text-[#0f5132]">Farm Analytics</h1>
            <p className="max-w-3xl text-sm text-stone-600">
              One place for revenue, expenses, orders, inventory, livestock health signals, products, customers, and owner attention items.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            {lastUpdated && (
              <span className="text-xs text-stone-500">
                Updated {lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            <Button type="button" onClick={fetchAnalytics} disabled={loading} className="gap-2 bg-[#0f5132] hover:bg-[#0a3c24]">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {errors.length > 0 && (
          <Card className="border-[#e5c789] bg-[#fff9eb] shadow-sm">
            <CardContent className="flex gap-3 p-4 text-sm text-[#7b551f]">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Some protected analytics feeds could not be loaded: {errors.map(normalizeLabel).join(", ")}.
                The page is showing available live data plus safe demo placeholders where needed.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Gross Revenue" value={currency(analytics.grossRevenue)} caption={`${currency(analytics.netProfit)} net`} icon={TrendingUp} />
          <StatCard title="Expenses" value={currency(analytics.expenseTotal)} caption={`${percent(analytics.margin)} margin`} icon={TrendingDown} tone="gold" />
          <StatCard title="Orders" value={analytics.counts.orders} caption={`${analytics.pendingOrders} active orders`} icon={ClipboardList} />
          <StatCard title="Customers" value={analytics.counts.customers} caption="Known buyer records" icon={Users} tone="gold" />
          <StatCard title="Livestock" value={analytics.counts.livestock} caption={`${analytics.registeredCount} with registration numbers`} icon={Users} />
          <StatCard title="Inventory Value" value={currency(analytics.inventoryValue || analytics.livestockValue)} caption={`${analytics.counts.inventory} inventory records`} icon={Boxes} />
          <StatCard title="Products" value={analytics.counts.products} caption={`${analytics.lowStockProducts} low stock listings`} icon={Package} tone="gold" />
          <StatCard title="Needs Attention" value={analytics.reviewCount + analytics.unpaidSales + analytics.lowStockProducts} caption="Review, unpaid, or low stock" icon={AlertTriangle} tone="gold" />
        </div>

        <AnalyticsMatrix rows={analytics.matrixRows} />

        <div className="grid gap-5 lg:grid-cols-2">
          <ColumnChart title="Counts Across The Farm" rows={analytics.rows.matrixCounts} />
          <ColumnChart title="Dollar Value By Area" rows={analytics.rows.matrixValues} formatter={currency} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <DonutChart title="Livestock Count By Type" rows={analytics.rows.livestockByType} />
          <DonutChart title="Order Count By Status" rows={analytics.rows.ordersByStatus} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-stone-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#0f5132]">
                <AlertTriangle className="h-5 w-5 text-[#b6863a]" />
                Attention Counts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataBarList rows={analytics.attentionRows} />
            </CardContent>
          </Card>
          <Card className="border-stone-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-[#0f5132]">Contact Counts</CardTitle>
            </CardHeader>
            <CardContent>
              <DataBarList rows={analytics.rows.contactsByStatus} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-stone-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#0f5132]">
                <DollarSign className="h-5 w-5 text-[#b6863a]" />
                Financial Mix
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-700">Revenue By Type</h3>
                <DataBarList rows={analytics.rows.revenueByType} formatter={currency} />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-700">Expenses By Category</h3>
                <DataBarList rows={analytics.rows.expensesByCategory} formatter={currency} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#0f5132]">
                <BarChart3 className="h-5 w-5 text-[#b6863a]" />
                Monthly Movement
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-700">Revenue</h3>
                <DataBarList rows={analytics.rows.monthlyRevenue} formatter={currency} />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-700">Expenses</h3>
                <DataBarList rows={analytics.rows.monthlyExpenses} formatter={currency} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="border-stone-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-[#0f5132]">Livestock Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-700">By Animal Type</h3>
                <DataBarList rows={analytics.rows.livestockByType} />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-700">By Status</h3>
                <DataBarList rows={analytics.rows.livestockByStatus} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-[#0f5132]">Inventory Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-700">By Animal Type</h3>
                <DataBarList rows={analytics.rows.inventoryByType} />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-700">By Status</h3>
                <DataBarList rows={analytics.rows.inventoryByStatus} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-[#0f5132]">Sales And Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-700">Orders By Status</h3>
                <DataBarList rows={analytics.rows.ordersByStatus} />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-700">Sales By Type</h3>
                <DataBarList rows={analytics.rows.salesByType} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-stone-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-[#0f5132]">Owner Attention Queue</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Link to="/admin/review-queue" className="rounded-lg border border-stone-200 p-4 transition-colors hover:bg-stone-50">
              <p className="text-sm font-semibold text-[#0f5132]">Field Captures To Review</p>
              <p className="mt-2 text-3xl font-bold text-[#b6863a]">{analytics.reviewCount}</p>
              <p className="mt-1 text-xs text-stone-500">Low confidence or flagged livestock records.</p>
            </Link>
            <Link to="/admin/sales" className="rounded-lg border border-stone-200 p-4 transition-colors hover:bg-stone-50">
              <p className="text-sm font-semibold text-[#0f5132]">Unpaid Sales</p>
              <p className="mt-2 text-3xl font-bold text-[#b6863a]">{analytics.unpaidSales}</p>
              <p className="mt-1 text-xs text-stone-500">Sales records not marked paid.</p>
            </Link>
            <Link to="/admin/products" className="rounded-lg border border-stone-200 p-4 transition-colors hover:bg-stone-50">
              <p className="text-sm font-semibold text-[#0f5132]">Low Stock Products</p>
              <p className="mt-2 text-3xl font-bold text-[#b6863a]">{analytics.lowStockProducts}</p>
              <p className="mt-1 text-xs text-stone-500">Products with three or fewer units listed.</p>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AnalyticsPage;
