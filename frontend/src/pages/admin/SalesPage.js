import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../../components/ui/buttons";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, DollarSign, FileText, Search, User, Package, Download, Printer } from "lucide-react";
import SkeletonLoader from "../../components/ui/SkeletonLoader";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [customerForm, setCustomerForm] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    customer_type: "individual",
    notes: ""
  });

  const [saleForm, setSaleForm] = useState({
    customer_id: "",
    items: [],
    sale_type: "market",
    tax_amount: 0,
    discount_amount: 0,
    payment_method: "cash",
    payment_status: "pending",
    due_date: "",
    notes: "",
    delivery_status: "pending"
  });

  const [itemForm, setItemForm] = useState({
    inventory_id: "",
    quantity: 1,
    unit_price: "",
    description: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");

      if (token === "demo-token-2025") {
        // Demo data - show demo data but don't save to localStorage
        const demoCustomers = [
          {
            id: 'demo-cust-1',
            name: 'John Smith',
            address: '123 Farm Road, Rural Town, ST 12345',
            email: 'john@example.com',
            phone: '(555) 123-4567',
            customer_type: 'individual',
            notes: 'Regular customer, interested in Katahdin sheep'
          }
        ];
        setCustomers(demoCustomers);

        const demoSales = [
          {
            id: 'demo-sale-1',
            invoice_id: 'INV-20251029-001',
            date: '2025-10-29',
            customer_id: 'demo-cust-1',
            customer_info: {
              name: 'John Smith',
              address: '123 Farm Road, Rural Town, ST 12345',
              email: 'john@example.com',
              phone: '(555) 123-4567'
            },
            items: [
              {
                inventory_id: 'demo-1',
                animal_id: 'DEMO001',
                animal_type: 'sheep',
                quantity: 1,
                unit_price: 275.00,
                description: 'Katahdin Ewe - Foundation Line'
              }
            ],
            sale_type: 'breeding_stock',
            subtotal: 275.00,
            tax_amount: 0.00,
            discount_amount: 0.00,
            total_amount: 275.00,
            payment_method: 'cash',
            payment_status: 'paid',
            notes: 'Cash sale at farm',
            delivery_status: 'pickup'
          }
        ];
        setSales(demoSales);

        // Get inventory from demo data
        const demoInventory = [
          {
            id: 'demo-1',
            animal_id: 'DEMO001',
            animal_type: 'sheep',
            breed: 'Katahdin',
            sex: 'female',
            status: 'available',
            estimated_value: 275
          }
        ];
        setInventory(demoInventory);
      } else {
        const [salesRes, customersRes, inventoryRes] = await Promise.all([
          axios.get(`${API}/sales`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/sales/customers`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/inventory`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setSales(salesRes.data);
        setCustomers(customersRes.data);
        setInventory(inventoryRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("admin_token");

      if (token === "demo-token-2025") {
        // In demo mode, just show success message without saving
        toast.success("Customer created successfully! (Demo mode - data not persisted)");
      } else {
        await axios.post(`${API}/sales/customers`, customerForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Customer created successfully!");
        fetchData();
      }

      setIsCustomerDialogOpen(false);
      setCustomerForm({
        name: "",
        address: "",
        email: "",
        phone: "",
        customer_type: "individual",
        notes: ""
      });
    } catch (error) {
      console.error("Error creating customer:", error);
      toast.error("Failed to create customer");
    }
  };

  const handleCreateSale = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("admin_token");

      // Calculate totals
      const subtotal = saleForm.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const total = subtotal + saleForm.tax_amount - saleForm.discount_amount;

      const saleData = {
        ...saleForm,
        subtotal,
        total_amount: total
      };

      if (token === "demo-token-2025") {
        // In demo mode, just show success message without saving
        toast.success("Sale created successfully! (Demo mode - data not persisted)");
      } else {
        await axios.post(`${API}/sales`, saleData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Sale created successfully!");
        fetchData();
      }

      setIsSaleDialogOpen(false);
      resetSaleForm();
    } catch (error) {
      console.error("Error creating sale:", error);
      toast.error("Failed to create sale");
    }
  };

  const handleAddItem = () => {
    if (!itemForm.inventory_id || !itemForm.unit_price) {
      toast.error("Please select an item and set a price");
      return;
    }

    const inventoryItem = inventory.find(item => item.id === itemForm.inventory_id);
    if (!inventoryItem) {
      toast.error("Selected item not found");
      return;
    }

    const newItem = {
      inventory_id: itemForm.inventory_id,
      animal_id: inventoryItem.animal_id,
      animal_type: inventoryItem.animal_type,
      quantity: itemForm.quantity,
      unit_price: parseFloat(itemForm.unit_price),
      description: itemForm.description || `${inventoryItem.animal_type} - ${inventoryItem.breed || 'Unknown breed'}`
    };

    setSaleForm({
      ...saleForm,
      items: [...saleForm.items, newItem]
    });

    setItemForm({
      inventory_id: "",
      quantity: 1,
      unit_price: "",
      description: ""
    });
  };

  const handleRemoveItem = (index) => {
    setSaleForm({
      ...saleForm,
      items: saleForm.items.filter((_, i) => i !== index)
    });
  };

  const resetSaleForm = () => {
    setSaleForm({
      customer_id: "",
      items: [],
      sale_type: "market",
      tax_amount: 0,
      discount_amount: 0,
      payment_method: "cash",
      payment_status: "pending",
      due_date: "",
      notes: "",
      delivery_status: "pending"
    });
  };

  const updatePaymentStatus = async (saleId, status) => {
    try {
      const token = localStorage.getItem("admin_token");

      if (token === "demo-token-2025") {
        const currentSales = JSON.parse(localStorage.getItem('admin_sales_data') || '[]');
        const updatedSales = currentSales.map(sale =>
          sale.id === saleId ? { ...sale, payment_status: status } : sale
        );
        localStorage.setItem('admin_sales_data', JSON.stringify(updatedSales));
        setSales(updatedSales);
        toast.success("Payment status updated! (Demo mode)");
      } else {
        await axios.put(`${API}/sales/${saleId}/payment-status`, { status }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Payment status updated!");
        fetchData();
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Failed to update payment status");
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.customer_info?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || sale.payment_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const variants = {
      pending: "outline",
      paid: "default",
      overdue: "destructive",
      cancelled: "secondary"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus && filterStatus !== "all") params.append('status', filterStatus);

      const response = await axios.get(`${API}/sales/export/csv?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sales_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("CSV export downloaded successfully!");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export CSV");
    }
  };

  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus && filterStatus !== "all") params.append('status', filterStatus);

      const response = await axios.get(`${API}/sales/export/pdf?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sales_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF report downloaded successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <User className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Address *</Label>
                  <Textarea
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Customer Type</Label>
                  <Select value={customerForm.customer_type} onValueChange={(value) => setCustomerForm({...customerForm, customer_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="breeder">Breeder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={customerForm.notes}
                    onChange={(e) => setCustomerForm({...customerForm, notes: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Customer</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetSaleForm}>
                <Plus className="w-4 h-4 mr-2" />
                New Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Sale</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSale} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer *</Label>
                    <Select value={saleForm.customer_id} onValueChange={(value) => setSaleForm({...saleForm, customer_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sale Type</Label>
                    <Select value={saleForm.sale_type} onValueChange={(value) => setSaleForm({...saleForm, sale_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="market">Market</SelectItem>
                        <SelectItem value="breeding_stock">Breeding Stock</SelectItem>
                        <SelectItem value="meat">Meat</SelectItem>
                        <SelectItem value="show">Show</SelectItem>
                        <SelectItem value="custom_order">Custom Order</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={saleForm.payment_method} onValueChange={(value) => setSaleForm({...saleForm, payment_method: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="crypto">Crypto</SelectItem>
                        <SelectItem value="nft">NFT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Status</Label>
                    <Select value={saleForm.payment_status} onValueChange={(value) => setSaleForm({...saleForm, payment_status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={saleForm.due_date}
                      onChange={(e) => setSaleForm({...saleForm, due_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Delivery Status</Label>
                    <Select value={saleForm.delivery_status} onValueChange={(value) => setSaleForm({...saleForm, delivery_status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="pickup">Pickup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add Items Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sale Items</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label>Item</Label>
                        <Select value={itemForm.inventory_id} onValueChange={(value) => setItemForm({...itemForm, inventory_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventory.filter(item => item.status === 'available').map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.animal_id} - {item.animal_type} ({item.breed || 'Unknown'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={itemForm.quantity}
                          onChange={(e) => setItemForm({...itemForm, quantity: parseInt(e.target.value)})}
                        />
                      </div>
                      <div>
                        <Label>Unit Price ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={itemForm.unit_price}
                          onChange={(e) => setItemForm({...itemForm, unit_price: e.target.value})}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="button" onClick={handleAddItem} className="w-full">
                          Add Item
                        </Button>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                      {saleForm.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <span className="font-medium">{item.animal_id}</span> - {item.description}
                            <span className="text-sm text-gray-500 ml-2">
                              Qty: {item.quantity} × ${item.unit_price} = ${(item.quantity * item.unit_price).toFixed(2)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>

                    {saleForm.items.length > 0 && (
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>${saleForm.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label>Tax ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={saleForm.tax_amount}
                              onChange={(e) => setSaleForm({...saleForm, tax_amount: parseFloat(e.target.value) || 0})}
                            />
                          </div>
                          <div className="flex-1">
                            <Label>Discount ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={saleForm.discount_amount}
                              onChange={(e) => setSaleForm({...saleForm, discount_amount: parseFloat(e.target.value) || 0})}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Total:</span>
                          <span>${(saleForm.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) + saleForm.tax_amount - saleForm.discount_amount).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={saleForm.notes}
                    onChange={(e) => setSaleForm({...saleForm, notes: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsSaleDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saleForm.items.length === 0}>
                    Create Sale
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by invoice or customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Records ({filteredSales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Invoice</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">Items</th>
                  <th className="text-left p-2">Total</th>
                  <th className="text-left p-2">Payment</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{sale.invoice_id}</td>
                    <td className="p-2">{sale.sale_date}</td>
                    <td className="p-2">{sale.customer_info?.name || 'Unknown'}</td>
                    <td className="p-2">{sale.items?.length || 0} items</td>
                    <td className="p-2 font-medium">${sale.total_amount?.toFixed(2)}</td>
                    <td className="p-2">{getStatusBadge(sale.payment_status)}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        {sale.payment_status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => updatePaymentStatus(sale.id, 'paid')}
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesPage;