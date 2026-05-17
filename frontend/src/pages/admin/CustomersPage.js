import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../../components/ui/buttons";
import { getApiBaseUrl } from "../../lib/backend";

const API = getApiBaseUrl();

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const response = await axios.get(`${API}/admin/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomers(response.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (customerId) => {
    try {
      const token = localStorage.getItem("admin_token");
      await axios.delete(`${API}/admin/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfirmDelete(null);
      setSelected(null);
      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3efdf] px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between rounded-2xl bg-white p-6 shadow-md">
          <div>
            <h1 className="text-2xl font-bold text-[#0f5132]">Customer Accounts</h1>
            <p className="text-sm text-stone-500">{customers.length} registered account{customers.length !== 1 ? "s" : ""}</p>
          </div>
          <Link to="/admin/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0f5132]" />
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-md">
            <p className="text-stone-500">No customer accounts yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#e7eddc]">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-[#0f5132]">Name</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-[#0f5132]">Email</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-[#0f5132]">Phone</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-[#0f5132]">Joined</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-[#0f5132]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="px-5 py-3 font-medium text-[#0f5132]">{c.full_name || "—"}</td>
                    <td className="px-5 py-3 text-sm text-stone-600">{c.email}</td>
                    <td className="px-5 py-3 text-sm text-stone-600">{c.phone || "—"}</td>
                    <td className="px-5 py-3 text-sm text-stone-500">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelected(c)}>
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setConfirmDelete(c)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-[#0f5132]">{selected.full_name || "Customer"}</h2>
            <div className="space-y-2 text-sm text-stone-700">
              <p><span className="font-medium">Email:</span> {selected.email}</p>
              <p><span className="font-medium">Phone:</span> {selected.phone || "—"}</p>
              <p><span className="font-medium">Address:</span> {selected.address || "—"}</p>
              {selected.notes && (
                <p><span className="font-medium">Notes:</span> {selected.notes}</p>
              )}
              <p><span className="font-medium">Joined:</span> {selected.created_at ? new Date(selected.created_at).toLocaleString() : "—"}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-red-700">Delete Account?</h2>
            <p className="text-sm text-stone-600">
              This will permanently delete <strong>{confirmDelete.email}</strong> and their profile. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleDelete(confirmDelete.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
