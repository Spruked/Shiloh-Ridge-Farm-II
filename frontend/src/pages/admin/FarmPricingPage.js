import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { getApiBaseUrl, adminAuthHeader } from "../../lib/backend";

const API = getApiBaseUrl();

const SPECIES = ["lamb", "sheep", "hog", "cattle"];
const PRICING_TYPES = ["hoof_live", "hanging_weight", "packaged_retail"];
const MARKET_UNITS = ["per_live_lb", "per_cwt", "per_hanging_lb", "per_packaged_lb"];

const PRICING_TYPE_LABELS = {
  hoof_live: "Hoof / Live Sale",
  hanging_weight: "Hanging Weight",
  packaged_retail: "Packaged / Retail",
};

const MARKET_UNIT_LABELS = {
  per_live_lb: "$/live lb",
  per_cwt: "$/cwt (per 100 lb)",
  per_hanging_lb: "$/hanging lb",
  per_packaged_lb: "$/packaged lb",
};

const EMPTY_FORM = {
  species: "lamb",
  pricing_type: "hoof_live",
  market_price: "",
  market_unit: "per_live_lb",
  farm_cost_per_head: "",
  processing_cost_per_head: "",
  target_sale_price: "",
  estimated_weight: "",
  source_name: "",
  source_url: "",
  effective_date: "",
  notes: "",
};

function fmt(n) {
  if (n === null || n === undefined || n === "") return "—";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(n) {
  if (n === null || n === undefined) return "—";
  return `${Number(n).toFixed(2)}%`;
}

function ProfitBadge({ value }) {
  if (value === null || value === undefined) return null;
  const good = value >= 0;
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${good ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
      {good ? "+" : ""}${fmt(value)}
    </span>
  );
}

function PctBadge({ value, label }) {
  if (value === null || value === undefined) return null;
  const good = value >= 0;
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${good ? "text-green-700" : "text-red-600"}`}>{pct(value)}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

export default function FarmPricingPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/farm-pricing`, { headers: adminAuthHeader() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Unable to load farm pricing");
      }
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
      setError("");
    } catch (loadError) {
      setRecords([]);
      setError(loadError.message);
    }
    setLoading(false);
  }

  function startNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function startEdit(rec) {
    setEditing(rec.id);
    setForm({
      species: rec.species,
      pricing_type: rec.pricing_type,
      market_price: rec.market_price ?? "",
      market_unit: rec.market_unit,
      farm_cost_per_head: rec.farm_cost_per_head ?? "",
      processing_cost_per_head: rec.processing_cost_per_head ?? "",
      target_sale_price: rec.target_sale_price ?? "",
      estimated_weight: rec.estimated_weight ?? "",
      source_name: rec.source_name ?? "",
      source_url: rec.source_url ?? "",
      effective_date: rec.effective_date ?? "",
      notes: rec.notes ?? "",
    });
    setError("");
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
    setError("");
  }

  function field(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    const payload = {
      ...form,
      market_price: parseFloat(form.market_price) || 0,
      farm_cost_per_head: parseFloat(form.farm_cost_per_head) || 0,
      processing_cost_per_head: parseFloat(form.processing_cost_per_head) || 0,
      target_sale_price: parseFloat(form.target_sale_price) || 0,
      estimated_weight: parseFloat(form.estimated_weight) || 0,
    };
    try {
      const url = editing
        ? `${API}/admin/farm-pricing/${editing}`
        : `${API}/admin/farm-pricing`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...adminAuthHeader() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Save failed");
      }
      await load();
      setShowForm(false);
      setEditing(null);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this pricing record?")) return;
    await fetch(`${API}/admin/farm-pricing/${id}`, { method: "DELETE", headers: adminAuthHeader() });
    await load();
  }

  return (
    <div className="min-h-screen bg-[#f3efdf] px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/dashboard" className="text-[#0f5132] hover:underline flex items-center gap-1 text-sm">
              <ArrowLeft size={16} /> Dashboard
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-[#0f5132]">Farm Pricing</h1>
          </div>
          <button
            onClick={startNew}
            className="flex items-center gap-2 bg-[#0f5132] hover:bg-[#0a3c24] text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus size={16} /> Add Record
          </button>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            ["Market price", "Outside benchmark — what the market says it's worth"],
            ["Farm cost", "What Shiloh Ridge invested to raise it"],
            ["Sale price", "What the customer pays"],
            ["Markup vs Margin", "Markup = profit ÷ cost · Margin = profit ÷ sale"],
          ].map(([title, desc]) => (
            <div key={title} className="bg-white rounded-xl p-4 shadow-sm border border-[#e7eddc]">
              <div className="font-semibold text-[#0f5132] mb-1">{title}</div>
              <div className="text-gray-500 text-xs">{desc}</div>
            </div>
          ))}
        </div>

        {/* Add / Edit Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-[#e7eddc]">
            <h2 className="text-lg font-bold text-[#0f5132] mb-5">
              {editing ? "Edit Pricing Record" : "New Pricing Record"}
            </h2>

            {error && <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1 — Animal & Type */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Animal</div>
                <div>
                  <label className="text-sm text-gray-600">Species</label>
                  <select value={form.species} onChange={field("species")} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]">
                    {SPECIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Pricing type</label>
                  <select value={form.pricing_type} onChange={field("pricing_type")} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]">
                    {PRICING_TYPES.map(t => <option key={t} value={t}>{PRICING_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Effective date</label>
                  <input type="date" value={form.effective_date} onChange={field("effective_date")} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]" />
                </div>
              </div>

              {/* Column 2 — Market & Weight */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Market Benchmark</div>
                <div>
                  <label className="text-sm text-gray-600">Market price</label>
                  <input type="number" step="0.01" placeholder="0.00" value={form.market_price} onChange={field("market_price")} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Market unit</label>
                  <select value={form.market_unit} onChange={field("market_unit")} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]">
                    {MARKET_UNITS.map(u => <option key={u} value={u}>{MARKET_UNIT_LABELS[u]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Estimated weight (lb)</label>
                  <input type="number" step="0.1" placeholder="0" value={form.estimated_weight} onChange={field("estimated_weight")} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]" />
                </div>
              </div>

              {/* Column 3 — Costs & Sale */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Farm Cost & Sale</div>
                <div>
                  <label className="text-sm text-gray-600">Farm cost / head ($)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={form.farm_cost_per_head} onChange={field("farm_cost_per_head")} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Processing cost / head ($)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={form.processing_cost_per_head} onChange={field("processing_cost_per_head")} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Target sale price ($/lb)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={form.target_sale_price} onChange={field("target_sale_price")} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]" />
                </div>
              </div>
            </div>

            {/* Notes & source */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="text-sm text-gray-600">Source name</label>
                <input type="text" placeholder="e.g. USDA AMS, local sale barn" value={form.source_name} onChange={field("source_name")} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Source URL</label>
                <input type="url" placeholder="https://" value={form.source_url} onChange={field("source_url")} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Notes</label>
                <input type="text" value={form.notes} onChange={field("notes")} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]" />
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={cancelForm} className="flex items-center gap-1 px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">
                <X size={15} /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 bg-[#0f5132] hover:bg-[#0a3c24] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                <Check size={15} /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Records */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : records.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No pricing records yet. Add one above.</div>
        ) : (
          <div className="space-y-4">
            {records.map((rec) => (
              <div key={rec.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-lg font-bold text-[#0f5132] capitalize">{rec.species}</span>
                    <span className="ml-2 text-sm text-gray-500">{PRICING_TYPE_LABELS[rec.pricing_type]}</span>
                    {rec.effective_date && <span className="ml-2 text-xs text-gray-400">· {rec.effective_date}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(rec)} className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-[#0f5132]"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(rec.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Market price</div>
                    <div className="font-semibold text-gray-800">${fmt(rec.market_price)}</div>
                    <div className="text-xs text-gray-400">{MARKET_UNIT_LABELS[rec.market_unit]}</div>
                    {rec.market_unit === "per_cwt" && (
                      <div className="text-xs text-gray-500 mt-0.5">${fmt(rec.market_price_per_lb)}/lb</div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 mb-1">Farm cost</div>
                    <div className="font-semibold text-gray-800">${fmt(rec.farm_cost_per_head)}</div>
                    <div className="text-xs text-gray-400">raise / head</div>
                    {rec.processing_cost_per_head > 0 && (
                      <div className="text-xs text-gray-500">+${fmt(rec.processing_cost_per_head)} process</div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 mb-1">Total cost</div>
                    <div className="font-semibold text-gray-800">${fmt(rec.total_cost_per_head)}</div>
                    <div className="text-xs text-gray-400">/ head</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 mb-1">Sale price</div>
                    <div className="font-semibold text-gray-800">${fmt(rec.target_sale_price)}/lb</div>
                    <div className="text-xs text-gray-400">{fmt(rec.estimated_weight)} lb</div>
                    <div className="text-xs text-gray-500 mt-0.5">Total ${fmt(rec.estimated_sale_total)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 mb-1">Profit</div>
                    <ProfitBadge value={rec.estimated_profit} />
                    <div className="text-xs text-gray-400 mt-1">per head</div>
                  </div>

                  <div className="flex gap-4 items-center justify-center col-span-1">
                    <PctBadge value={rec.markup_percent} label="Markup" />
                    <div className="w-px h-10 bg-gray-200" />
                    <PctBadge value={rec.margin_percent} label="Margin" />
                  </div>
                </div>

                {rec.notes && (
                  <div className="mt-3 text-xs text-gray-400 italic">{rec.notes}</div>
                )}
                {rec.source_name && (
                  <div className="mt-1 text-xs text-gray-400">
                    Source: {rec.source_url
                      ? <a href={rec.source_url} target="_blank" rel="noopener noreferrer" className="underline">{rec.source_name}</a>
                      : rec.source_name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
