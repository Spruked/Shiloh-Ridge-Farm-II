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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";
import { Plus, DollarSign, TrendingUp, TrendingDown, Search, PieChart, BarChart3, Download, Printer, FileText } from "lucide-react";
import SkeletonLoader from "../../components/ui/SkeletonLoader";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AccountingPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isRevenueDialogOpen, setIsRevenueDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingRevenue, setEditingRevenue] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [financialSummary, setFinancialSummary] = useState(null);

  const [expenseForm, setExpenseForm] = useState({
    category: "feed_supplements",
    subcategory: "",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    vendor_supplier: "",
    payment_method: "cash",
    payment_status: "paid",
    is_recurring: false,
    recurring_frequency: "",
    next_due_date: "",
    reference_id: "",
    reference_type: "",
    tax_deductible: false,
    notes: ""
  });

  const [revenueForm, setRevenueForm] = useState({
    type: "livestock_sales",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    source: "",
    payment_method: "cash",
    payment_status: "received",
    reference_id: "",
    reference_type: "",
    tax_category: "",
    notes: ""
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
        const demoExpenses = [
          {
            id: 'demo-exp-1',
            category: 'feed_supplements',
            description: 'Premium sheep feed - 500lbs',
            amount: 245.50,
            date: '2025-10-15',
            vendor_supplier: 'Farmers Co-op',
            payment_method: 'cash',
            payment_status: 'paid',
            tax_deductible: true,
            notes: 'Monthly feed purchase'
          },
          {
            id: 'demo-exp-2',
            category: 'veterinary_health',
            description: 'CDT Vaccination for herd',
            amount: 125.00,
            date: '2025-10-20',
            vendor_supplier: 'Dr. Smith Veterinary',
            payment_method: 'check',
            payment_status: 'paid',
            tax_deductible: true,
            notes: 'Annual vaccination program'
          }
        ];
        setExpenses(demoExpenses);

        const demoRevenue = [
          {
            id: 'demo-rev-1',
            type: 'livestock_sales',
            description: 'Sale of 2 Katahdin ewes',
            amount: 550.00,
            date: '2025-10-25',
            source: 'John Smith',
            payment_method: 'cash',
            payment_status: 'received',
            notes: 'Cash sale at farm auction'
          }
        ];
        setRevenue(demoRevenue);

        // Demo financial summary
        setFinancialSummary({
          expenses: { total: 370.50, by_category: [
            { _id: 'feed_supplements', total: 245.50, count: 1 },
            { _id: 'veterinary_health', total: 125.00, count: 1 }
          ]},
          revenue: { total: 550.00, by_type: [
            { _id: 'livestock_sales', total: 550.00, count: 1 }
          ]},
          profit: { net: 179.50, margin: 32.64 }
        });
      } else {
        const [expensesRes, revenueRes, summaryRes] = await Promise.all([
          axios.get(`${API}/accounting/expenses`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/accounting/revenue`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/accounting/financial-summary`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setExpenses(expensesRes.data);
        setRevenue(revenueRes.data);
        setFinancialSummary(summaryRes.data);
      }
    } catch (error) {
      console.error("Error fetching accounting data:", error);
      toast.error("Failed to load accounting data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("admin_token");

      const expenseData = {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount)
      };

      if (token === "demo-token-2025") {
        // In demo mode, just show success message without saving
        toast.success("Expense recorded successfully! (Demo mode - data not persisted)");
      } else {
        await axios.post(`${API}/accounting/expenses`, expenseData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Expense recorded successfully!");
        fetchData();
      }

      setIsExpenseDialogOpen(false);
      resetExpenseForm();
    } catch (error) {
      console.error("Error creating expense:", error);
      toast.error("Failed to record expense");
    }
  };

  const handleCreateRevenue = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("admin_token");

      const revenueData = {
        ...revenueForm,
        amount: parseFloat(revenueForm.amount)
      };

      if (token === "demo-token-2025") {
        // In demo mode, just show success message without saving
        toast.success("Revenue recorded successfully! (Demo mode - data not persisted)");
      } else {
        await axios.post(`${API}/accounting/revenue`, revenueData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Revenue recorded successfully!");
        fetchData();
      }

      setIsRevenueDialogOpen(false);
      resetRevenueForm();
    } catch (error) {
      console.error("Error creating revenue:", error);
      toast.error("Failed to record revenue");
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;

    try {
      const token = localStorage.getItem("admin_token");

      if (token === "demo-token-2025") {
        // In demo mode, just show success message without deleting
        toast.success("Expense deleted successfully! (Demo mode - data not persisted)");
      } else {
        await axios.delete(`${API}/accounting/expenses/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Expense deleted successfully!");
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const handleDeleteRevenue = async (id) => {
    if (!window.confirm("Are you sure you want to delete this revenue record?")) return;

    try {
      const token = localStorage.getItem("admin_token");

      if (token === "demo-token-2025") {
        // In demo mode, just show success message without deleting
        toast.success("Revenue deleted successfully! (Demo mode - data not persisted)");
      } else {
        await axios.delete(`${API}/accounting/revenue/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Revenue deleted successfully!");
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting revenue:", error);
      toast.error("Failed to delete revenue");
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      category: "feed_supplements",
      subcategory: "",
      description: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      vendor_supplier: "",
      payment_method: "cash",
      payment_status: "paid",
      is_recurring: false,
      recurring_frequency: "",
      next_due_date: "",
      reference_id: "",
      reference_type: "",
      tax_deductible: false,
      notes: ""
    });
  };

  const resetRevenueForm = () => {
    setRevenueForm({
      type: "livestock_sales",
      description: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      source: "",
      payment_method: "cash",
      payment_status: "received",
      reference_id: "",
      reference_type: "",
      tax_category: "",
      notes: ""
    });
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor_supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || expense.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredRevenue = revenue.filter(rev => {
    const matchesSearch = rev.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rev.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || rev.type === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (category, type = "expense") => {
    const categories = type === "expense" ? {
      feed_supplements: "Feed",
      veterinary_health: "Vet",
      equipment_supplies: "Equipment",
      fuel_maintenance: "Fuel",
      utilities: "Utilities",
      labor_services: "Labor",
      facilities_housing: "Facilities",
      marketing_advertising: "Marketing",
      insurance_taxes: "Insurance",
      other: "Other"
    } : {
      livestock_sales: "Sales",
      wool_fiber: "Wool",
      milk_products: "Milk",
      breeding_fees: "Breeding",
      grants_subsidies: "Grants",
      other_revenue: "Other"
    };

    return <Badge variant="outline">{categories[category] || category}</Badge>;
  };

  const handleExportCSV = async (type = "all") => {
    try {
      const token = localStorage.getItem("admin_token");
      const params = new URLSearchParams();
      if (type !== "all") params.append('type_filter', type);

      const response = await axios.get(`${API}/accounting/export/csv?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `accounting_export_${type}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("CSV export downloaded successfully!");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export CSV");
    }
  };

  const handleExportPDF = async (type = "all") => {
    try {
      const token = localStorage.getItem("admin_token");
      const params = new URLSearchParams();
      if (type !== "all") params.append('type_filter', type);

      const response = await axios.get(`${API}/accounting/export/pdf?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `accounting_report_${type}.pdf`);
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
        <h1 className="text-3xl font-bold">Accounting & Financial Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExportCSV()}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExportPDF()}>
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={resetExpenseForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateExpense} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm({...expenseForm, category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feed_supplements">Feed & Supplements</SelectItem>
                        <SelectItem value="veterinary_health">Veterinary & Health</SelectItem>
                        <SelectItem value="equipment_supplies">Equipment & Supplies</SelectItem>
                        <SelectItem value="fuel_maintenance">Fuel & Maintenance</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="labor_services">Labor & Services</SelectItem>
                        <SelectItem value="facilities_housing">Facilities & Housing</SelectItem>
                        <SelectItem value="marketing_advertising">Marketing & Advertising</SelectItem>
                        <SelectItem value="insurance_taxes">Insurance & Taxes</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount ($) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Vendor/Supplier</Label>
                    <Input
                      value={expenseForm.vendor_supplier}
                      onChange={(e) => setExpenseForm({...expenseForm, vendor_supplier: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={expenseForm.payment_method} onValueChange={(value) => setExpenseForm({...expenseForm, payment_method: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Status</Label>
                    <Select value={expenseForm.payment_status} onValueChange={(value) => setExpenseForm({...expenseForm, payment_status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description *</Label>
                  <Input
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="tax_deductible"
                    checked={expenseForm.tax_deductible}
                    onChange={(e) => setExpenseForm({...expenseForm, tax_deductible: e.target.checked})}
                  />
                  <Label htmlFor="tax_deductible">Tax Deductible</Label>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({...expenseForm, notes: e.target.value})}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Record Expense</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isRevenueDialogOpen} onOpenChange={setIsRevenueDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetRevenueForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Revenue
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record New Revenue</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRevenue} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type *</Label>
                    <Select value={revenueForm.type} onValueChange={(value) => setRevenueForm({...revenueForm, type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="livestock_sales">Livestock Sales</SelectItem>
                        <SelectItem value="wool_fiber">Wool & Fiber</SelectItem>
                        <SelectItem value="milk_products">Milk Products</SelectItem>
                        <SelectItem value="breeding_fees">Breeding Fees</SelectItem>
                        <SelectItem value="grants_subsidies">Grants & Subsidies</SelectItem>
                        <SelectItem value="other_revenue">Other Revenue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount ($) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={revenueForm.amount}
                      onChange={(e) => setRevenueForm({...revenueForm, amount: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={revenueForm.date}
                      onChange={(e) => setRevenueForm({...revenueForm, date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Source</Label>
                    <Input
                      value={revenueForm.source}
                      onChange={(e) => setRevenueForm({...revenueForm, source: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={revenueForm.payment_method} onValueChange={(value) => setRevenueForm({...revenueForm, payment_method: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="crypto">Crypto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Status</Label>
                    <Select value={revenueForm.payment_status} onValueChange={(value) => setRevenueForm({...revenueForm, payment_status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description *</Label>
                  <Input
                    value={revenueForm.description}
                    onChange={(e) => setRevenueForm({...revenueForm, description: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={revenueForm.notes}
                    onChange={(e) => setRevenueForm({...revenueForm, notes: e.target.value})}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsRevenueDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Record Revenue</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Financial Summary Cards */}
      {financialSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${financialSummary.revenue.total.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${financialSummary.expenses.total.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <DollarSign className={`h-4 w-4 ${financialSummary.profit.net >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${financialSummary.profit.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${financialSummary.profit.net.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {financialSummary.profit.margin.toFixed(1)}% margin
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search expenses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="feed_supplements">Feed & Supplements</SelectItem>
                    <SelectItem value="veterinary_health">Veterinary & Health</SelectItem>
                    <SelectItem value="equipment_supplies">Equipment & Supplies</SelectItem>
                    <SelectItem value="fuel_maintenance">Fuel & Maintenance</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="labor_services">Labor & Services</SelectItem>
                    <SelectItem value="facilities_housing">Facilities & Housing</SelectItem>
                    <SelectItem value="marketing_advertising">Marketing & Advertising</SelectItem>
                    <SelectItem value="insurance_taxes">Insurance & Taxes</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Records ({filteredExpenses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Vendor</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{expense.date}</td>
                        <td className="p-2">{expense.description}</td>
                        <td className="p-2">{getCategoryBadge(expense.category, "expense")}</td>
                        <td className="p-2">{expense.vendor_supplier || '-'}</td>
                        <td className="p-2 font-medium">${expense.amount.toFixed(2)}</td>
                        <td className="p-2">
                          <Badge variant={expense.payment_status === 'paid' ? 'default' : 'outline'}>
                            {expense.payment_status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search revenue..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="livestock_sales">Livestock Sales</SelectItem>
                    <SelectItem value="wool_fiber">Wool & Fiber</SelectItem>
                    <SelectItem value="milk_products">Milk Products</SelectItem>
                    <SelectItem value="breeding_fees">Breeding Fees</SelectItem>
                    <SelectItem value="grants_subsidies">Grants & Subsidies</SelectItem>
                    <SelectItem value="other_revenue">Other Revenue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Table */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Records ({filteredRevenue.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Source</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRevenue.map((rev) => (
                      <tr key={rev.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{rev.date}</td>
                        <td className="p-2">{rev.description}</td>
                        <td className="p-2">{getCategoryBadge(rev.type, "revenue")}</td>
                        <td className="p-2">{rev.source || '-'}</td>
                        <td className="p-2 font-medium">${rev.amount.toFixed(2)}</td>
                        <td className="p-2">
                          <Badge variant={rev.payment_status === 'received' ? 'default' : 'outline'}>
                            {rev.payment_status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteRevenue(rev.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountingPage;