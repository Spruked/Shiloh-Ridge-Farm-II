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
import { Plus, Edit, Trash2, Search, Filter, FileText, Calendar, Download, Printer } from "lucide-react";
import SkeletonLoader from "../../components/ui/SkeletonLoader";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [healthDialog, setHealthDialog] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);

  const [formData, setFormData] = useState({
    animal_id: "",
    animal_type: "sheep",
    breed: "",
    bloodline: "",
    sex: "",
    birth_type: "Sg",
    date_of_birth: "",
    registration_number: "",
    sire_name: "",
    sire_tag: "",
    dam_name: "",
    dam_tag: "",
    current_weight: "",
    weight_unit: "lbs",
    status: "available",
    health_records: [],
    sale_price: "",
    estimated_value: "",
    blockchain_id: "",
    location: "",
    notes: "",
    photos: []
  });

  const [healthRecord, setHealthRecord] = useState({
    date: "",
    type: "",
    description: "",
    veterinarian: "",
    cost: "",
    notes: ""
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");

      if (token === "demo-token-2025") {
        // Demo mode - show demo data but don't save to localStorage
        const demoData = [
          {
            id: 'demo-1',
            animal_id: 'DEMO001',
            animal_type: 'sheep',
            breed: 'Katahdin',
            bloodline: 'Foundation Line',
            sex: 'female',
            birth_type: 'Sg',
            date_of_birth: '2023-01-15',
            registration_number: 'KHSI-2023-001',
            current_weight: 145,
            weight_unit: 'lbs',
            status: 'available',
            health_records: [
              {
                id: 'hr-1',
                date: '2023-02-01',
                type: 'vaccination',
                description: 'CDT Vaccination',
                veterinarian: 'Dr. Smith',
                cost: 15.00,
                notes: 'Routine vaccination'
              }
            ],
            estimated_value: 275,
            location: 'North Pasture',
            notes: 'Excellent mothering ability',
            photos: []
          },
          {
            id: 'demo-2',
            animal_id: 'DEMO002',
            animal_type: 'sheep',
            breed: 'Katahdin',
            bloodline: 'Performance Line',
            sex: 'male',
            birth_type: 'Tw',
            date_of_birth: '2023-03-20',
            current_weight: 180,
            weight_unit: 'lbs',
            status: 'breeding',
            health_records: [],
            estimated_value: 350,
            location: 'Breeding Barn',
            notes: 'Superior growth rate',
            photos: []
          }
        ];
        setInventory(demoData);
      } else {
        const response = await axios.get(`${API}/inventory`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInventory(response.data);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("admin_token");

      // Demo mode handling
      if (token === "demo-token-2025") {
        // In demo mode, just show success message without saving
        if (editingItem) {
          toast.success("Inventory item updated successfully! (Demo mode - data not persisted)");
        } else {
          toast.success("Inventory item added successfully! (Demo mode - data not persisted)");
        }

        setIsDialogOpen(false);
        resetForm();
        return;
      }

      if (editingItem) {
        await axios.put(`${API}/inventory/${editingItem.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Inventory item updated successfully!");
      } else {
        await axios.post(`${API}/inventory`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Inventory item added successfully!");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.error("Error saving inventory item:", error);
      toast.error("Failed to save inventory item");
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      animal_id: item.animal_id,
      animal_type: item.animal_type,
      breed: item.breed || "",
      bloodline: item.bloodline || "",
      sex: item.sex || "",
      birth_type: item.birth_type || "Sg",
      date_of_birth: item.date_of_birth || "",
      registration_number: item.registration_number || "",
      sire_name: item.sire_name || "",
      sire_tag: item.sire_tag || "",
      dam_name: item.dam_name || "",
      dam_tag: item.dam_tag || "",
      current_weight: item.current_weight || "",
      weight_unit: item.weight_unit || "lbs",
      status: item.status,
      health_records: item.health_records || [],
      sale_price: item.sale_price || "",
      estimated_value: item.estimated_value || "",
      blockchain_id: item.blockchain_id || "",
      location: item.location || "",
      notes: item.notes || "",
      photos: item.photos || []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this inventory item?")) return;

    try {
      const token = localStorage.getItem("admin_token");

      // Demo mode handling
      if (token === "demo-token-2025") {
        const currentInventory = JSON.parse(localStorage.getItem('admin_inventory_data') || '[]');
        const updatedInventory = currentInventory.filter(item => item.id !== id);
        localStorage.setItem('admin_inventory_data', JSON.stringify(updatedInventory));
        setInventory(updatedInventory);
        toast.success("Inventory item deleted successfully! (Demo mode)");
        return;
      }

      await axios.delete(`${API}/inventory/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Inventory item deleted successfully!");
      fetchInventory();
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      toast.error("Failed to delete inventory item");
    }
  };

  const handleAddHealthRecord = async () => {
    if (!selectedAnimal) return;

    try {
      const token = localStorage.getItem("admin_token");

      // Demo mode handling
      if (token === "demo-token-2025") {
        const currentInventory = JSON.parse(localStorage.getItem('admin_inventory_data') || '[]');
        const updatedInventory = currentInventory.map(item => {
          if (item.id === selectedAnimal.id) {
            const newRecord = {
              ...healthRecord,
              id: `hr-${Date.now()}`,
              cost: parseFloat(healthRecord.cost) || 0
            };
            return {
              ...item,
              health_records: [...(item.health_records || []), newRecord]
            };
          }
          return item;
        });
        localStorage.setItem('admin_inventory_data', JSON.stringify(updatedInventory));
        setInventory(updatedInventory);
        toast.success("Health record added successfully! (Demo mode)");
      } else {
        await axios.post(`${API}/inventory/${selectedAnimal.id}/health`, healthRecord, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Health record added successfully!");
        fetchInventory();
      }

      setHealthDialog(false);
      setHealthRecord({
        date: "",
        type: "",
        description: "",
        veterinarian: "",
        cost: "",
        notes: ""
      });
    } catch (error) {
      console.error("Error adding health record:", error);
      toast.error("Failed to add health record");
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      animal_id: "",
      animal_type: "sheep",
      breed: "",
      bloodline: "",
      sex: "",
      birth_type: "Sg",
      date_of_birth: "",
      registration_number: "",
      sire_name: "",
      sire_tag: "",
      dam_name: "",
      dam_tag: "",
      current_weight: "",
      weight_unit: "lbs",
      status: "available",
      health_records: [],
      sale_price: "",
      estimated_value: "",
      blockchain_id: "",
      location: "",
      notes: "",
      photos: []
    });
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.animal_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.bloodline.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || item.animal_type === filterType;
    const matchesStatus = !filterStatus || item.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const variants = {
      available: "default",
      weaned: "secondary",
      breeding: "outline",
      market: "destructive",
      sold: "secondary",
      archived: "outline"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const params = new URLSearchParams();
      if (filterType) params.append('animal_type', filterType);
      if (filterStatus) params.append('status', filterStatus);

      const response = await axios.get(`${API}/inventory/export/csv?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventory_export.csv');
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
      if (filterType) params.append('animal_type', filterType);
      if (filterStatus) params.append('status', filterStatus);

      const response = await axios.get(`${API}/inventory/export/pdf?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventory_report.pdf');
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
        <h1 className="text-3xl font-bold">Livestock Inventory</h1>
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Animal
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit" : "Add"} Inventory Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Animal ID *</Label>
                  <Input
                    value={formData.animal_id}
                    onChange={(e) => setFormData({...formData, animal_id: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Animal Type *</Label>
                  <Select value={formData.animal_type} onValueChange={(value) => setFormData({...formData, animal_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sheep">Sheep</SelectItem>
                      <SelectItem value="hog">Hog</SelectItem>
                      <SelectItem value="cattle">Cattle</SelectItem>
                      <SelectItem value="chicken">Chicken</SelectItem>
                      <SelectItem value="dog">Dog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Breed</Label>
                  <Input
                    value={formData.breed}
                    onChange={(e) => setFormData({...formData, breed: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Bloodline</Label>
                  <Input
                    value={formData.bloodline}
                    onChange={(e) => setFormData({...formData, bloodline: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Sex</Label>
                  <Select value={formData.sex} onValueChange={(value) => setFormData({...formData, sex: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="ewe">Ewe</SelectItem>
                      <SelectItem value="ram">Ram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Birth Type</Label>
                  <Select value={formData.birth_type} onValueChange={(value) => setFormData({...formData, birth_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sg">Single (Sg)</SelectItem>
                      <SelectItem value="Tw">Twin (Tw)</SelectItem>
                      <SelectItem value="Tr">Triplet (Tr)</SelectItem>
                      <SelectItem value="Nat">Natural (Nat)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Registration Number</Label>
                  <Input
                    value={formData.registration_number}
                    onChange={(e) => setFormData({...formData, registration_number: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Current Weight</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.current_weight}
                      onChange={(e) => setFormData({...formData, current_weight: e.target.value})}
                    />
                    <Select value={formData.weight_unit} onValueChange={(value) => setFormData({...formData, weight_unit: value})}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lbs">lbs</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="weaned">Weaned</SelectItem>
                      <SelectItem value="breeding">Breeding</SelectItem>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estimated Value ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({...formData, estimated_value: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Blockchain ID</Label>
                  <Input
                    value={formData.blockchain_id}
                    onChange={(e) => setFormData({...formData, blockchain_id: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sire Name</Label>
                  <Input
                    value={formData.sire_name}
                    onChange={(e) => setFormData({...formData, sire_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Sire Tag</Label>
                  <Input
                    value={formData.sire_tag}
                    onChange={(e) => setFormData({...formData, sire_tag: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Dam Name</Label>
                  <Input
                    value={formData.dam_name}
                    onChange={(e) => setFormData({...formData, dam_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Dam Tag</Label>
                  <Input
                    value={formData.dam_tag}
                    onChange={(e) => setFormData({...formData, dam_tag: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? "Update" : "Add"} Item
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
                  placeholder="Search by ID, breed, or bloodline..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="sheep">Sheep</SelectItem>
                <SelectItem value="hog">Hog</SelectItem>
                <SelectItem value="cattle">Cattle</SelectItem>
                <SelectItem value="chicken">Chicken</SelectItem>
                <SelectItem value="dog">Dog</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="weaned">Weaned</SelectItem>
                <SelectItem value="breeding">Breeding</SelectItem>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items ({filteredInventory.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Animal ID</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Breed</th>
                  <th className="text-left p-2">Sex</th>
                  <th className="text-left p-2">Weight</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Value</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{item.animal_id}</td>
                    <td className="p-2 capitalize">{item.animal_type}</td>
                    <td className="p-2">{item.breed || '-'}</td>
                    <td className="p-2 capitalize">{item.sex || '-'}</td>
                    <td className="p-2">
                      {item.current_weight ? `${item.current_weight} ${item.weight_unit}` : '-'}
                    </td>
                    <td className="p-2">{getStatusBadge(item.status)}</td>
                    <td className="p-2">
                      {item.estimated_value ? `$${item.estimated_value}` : '-'}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAnimal(item);
                            setHealthDialog(true);
                          }}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Health Record Dialog */}
      <Dialog open={healthDialog} onOpenChange={setHealthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Health Record - {selectedAnimal?.animal_id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={healthRecord.date}
                onChange={(e) => setHealthRecord({...healthRecord, date: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={healthRecord.type} onValueChange={(value) => setHealthRecord({...healthRecord, type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vaccination">Vaccination</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                  <SelectItem value="checkup">Checkup</SelectItem>
                  <SelectItem value="injury">Injury</SelectItem>
                  <SelectItem value="surgery">Surgery</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description *</Label>
              <Input
                value={healthRecord.description}
                onChange={(e) => setHealthRecord({...healthRecord, description: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Veterinarian</Label>
              <Input
                value={healthRecord.veterinarian}
                onChange={(e) => setHealthRecord({...healthRecord, veterinarian: e.target.value})}
              />
            </div>
            <div>
              <Label>Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={healthRecord.cost}
                onChange={(e) => setHealthRecord({...healthRecord, cost: e.target.value})}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={healthRecord.notes}
                onChange={(e) => setHealthRecord({...healthRecord, notes: e.target.value})}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setHealthDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddHealthRecord}>
                Add Record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;