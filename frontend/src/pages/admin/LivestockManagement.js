import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../../components/ui/buttons";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { toast } from "sonner";
import { Printer, FileText } from "lucide-react";
import SkeletonLoader from "../../components/ui/SkeletonLoader";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LivestockManagement = () => {
  const [livestock, setLivestock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState(null);
  const [billOfSaleDialog, setBillOfSaleDialog] = useState(false);
  const [selectedAnimalForSale, setSelectedAnimalForSale] = useState(null);
  const [buyerInfo, setBuyerInfo] = useState({ name: "", address: "", phone: "", email: "" });
  const [formData, setFormData] = useState({
    animal_type: "sheep",
    tag_number: "",
    name: "",
    date_of_birth: "",
    weight: "",
    color: "",
    registration_number: "",
    bloodline: "",
    sire: "",
    dam: "",
    gender: "",
    price: "",
    status: "available",
    description: "",
    health_records: "",
    photos: []
  });
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    fetchLivestock();
  }, []);

  const fetchLivestock = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");

      // Skip API call in demo mode
      if (token === "demo-token-2025") {
        const savedLivestock = localStorage.getItem('admin_livestock_data');
        if (savedLivestock) {
          const parsedLivestock = JSON.parse(savedLivestock);
          setLivestock(parsedLivestock);
        } else {
          // Demo data
          setLivestock([
            {
              id: 'demo-1',
              animal_type: 'sheep',
              tag_number: 'DEMO001',
              name: 'Demo Sheep',
              date_of_birth: '2023-01-01',
              weight: 150,
              color: 'White',
              registration_number: 'DEMO123',
              bloodline: 'Demo Line',
              sire: 'Demo Sire',
              dam: 'Demo Dam',
              gender: 'female',
              price: 250,
              status: 'available',
              description: 'Demo sheep for testing',
              health_records: 'Healthy',
              photos: []
            }
          ]);
          localStorage.setItem('admin_livestock_data', JSON.stringify([
            {
              id: 'demo-1',
              animal_type: 'sheep',
              tag_number: 'DEMO001',
              name: 'Demo Sheep',
              date_of_birth: '2023-01-01',
              weight: 150,
              color: 'White',
              registration_number: 'DEMO123',
              bloodline: 'Demo Line',
              sire: 'Demo Sire',
              dam: 'Demo Dam',
              gender: 'female',
              price: 250,
              status: 'available',
              description: 'Demo sheep for testing',
              health_records: 'Healthy',
              photos: []
            }
          ]));
        }
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API}/livestock`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLivestock(response.data);
      // Save to localStorage for persistence
      localStorage.setItem('admin_livestock_data', JSON.stringify(response.data));
    } catch (error) {
      console.error("Error fetching livestock:", error);
      // Try to load from localStorage as fallback
      const savedLivestock = localStorage.getItem('admin_livestock_data');
      if (savedLivestock) {
        try {
          const parsedLivestock = JSON.parse(savedLivestock);
          setLivestock(parsedLivestock);
        } catch (parseError) {
          console.error("Error parsing saved livestock data:", parseError);
        }
      }
    }
    setLoading(false);
  };

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    const token = localStorage.getItem("admin_token");
    const uploadedUrls = [];

    try {
      for (const file of files) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const response = await axios.post(`${API}/upload`, formDataUpload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        uploadedUrls.push(response.data.url);
      }

      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls]
      }));

      toast.success(`${files.length} image(s) uploaded successfully!`);
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("admin_token");
      const submitData = {
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        price: formData.price ? parseFloat(formData.price) : null
      };

      // Demo mode handling
      if (token === "demo-token-2025") {
        const currentLivestock = JSON.parse(localStorage.getItem('admin_livestock_data') || '[]');

        if (editingAnimal) {
          // Update existing animal
          const updatedLivestock = currentLivestock.map(animal =>
            animal.id === editingAnimal.id
              ? { ...animal, ...submitData, id: editingAnimal.id }
              : animal
          );
          localStorage.setItem('admin_livestock_data', JSON.stringify(updatedLivestock));
          setLivestock(updatedLivestock);
          toast.success("Livestock updated successfully! (Demo mode)");
        } else {
          // Add new animal
          const newAnimal = {
            ...submitData,
            id: `demo-animal-${Date.now()}`,
            photos: []
          };
          const updatedLivestock = [...currentLivestock, newAnimal];
          localStorage.setItem('admin_livestock_data', JSON.stringify(updatedLivestock));
          setLivestock(updatedLivestock);
          toast.success("Livestock added successfully! (Demo mode)");
        }

        setIsDialogOpen(false);
        resetForm();
        return;
      }

      if (editingAnimal) {
        await axios.put(`${API}/livestock/${editingAnimal.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Livestock updated successfully!");
      } else {
        await axios.post(`${API}/livestock`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Livestock added successfully!");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchLivestock();
    } catch (error) {
      console.error("Error saving livestock:", error);
      toast.error("Failed to save livestock");
    }
  };

  const handleEdit = (animal) => {
    setEditingAnimal(animal);
    setFormData({
      animal_type: animal.animal_type,
      tag_number: animal.tag_number,
      name: animal.name || "",
      date_of_birth: animal.date_of_birth || "",
      weight: animal.weight || "",
      color: animal.color || "",
      registration_number: animal.registration_number || "",
      bloodline: animal.bloodline || "",
      sire: animal.sire || "",
      dam: animal.dam || "",
      gender: animal.gender || "",
      price: animal.price || "",
      status: animal.status,
      description: animal.description || "",
      health_records: animal.health_records || "",
      photos: animal.photos || []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this animal?")) return;

    try {
      const token = localStorage.getItem("admin_token");

      // Demo mode handling
      if (token === "demo-token-2025") {
        const currentLivestock = JSON.parse(localStorage.getItem('admin_livestock_data') || '[]');
        const updatedLivestock = currentLivestock.filter(animal => animal.id !== id);
        localStorage.setItem('admin_livestock_data', JSON.stringify(updatedLivestock));
        setLivestock(updatedLivestock);
        toast.success("Livestock deleted successfully! (Demo mode)");
        return;
      }

      await axios.delete(`${API}/livestock/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Livestock deleted successfully!");
      fetchLivestock();
    } catch (error) {
      console.error("Error deleting livestock:", error);
      toast.error("Failed to delete livestock");
    }
  };

  const resetForm = () => {
    setEditingAnimal(null);
    setFormData({
      animal_type: "sheep",
      tag_number: "",
      name: "",
      date_of_birth: "",
      weight: "",
      color: "",
      registration_number: "",
      bloodline: "",
      sire: "",
      dam: "",
      gender: "",
      price: "",
      status: "available",
      description: "",
      health_records: "",
      photos: []
    });
  };

  const printInventoryList = () => {
    const printWindow = window.open('', '_blank');
    const inventoryHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shiloh Ridge Farm - Livestock Inventory</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3d5a3d; padding-bottom: 20px; }
          .header h1 { color: #3d5a3d; margin: 0; }
          .header p { margin: 5px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #3d5a3d; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Shiloh Ridge Farm</h1>
          <p>Complete Livestock Inventory</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
          <p style="font-style: italic;">Integrity is the Backbone, Honesty the Muscle</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tag #</th>
              <th>Name</th>
              <th>Type</th>
              <th>Gender</th>
              <th>DOB</th>
              <th>Registration #</th>
              <th>Bloodline</th>
              <th>Sire</th>
              <th>Dam</th>
              <th>Weight</th>
              <th>Status</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            ${livestock.map(animal => `
              <tr>
                <td>${animal.tag_number}</td>
                <td>${animal.name || '-'}</td>
                <td style="text-transform: capitalize;">${animal.animal_type}</td>
                <td style="text-transform: capitalize;">${animal.gender || '-'}</td>
                <td>${animal.date_of_birth || '-'}</td>
                <td>${animal.registration_number || '-'}</td>
                <td>${animal.bloodline || '-'}</td>
                <td>${animal.sire || '-'}</td>
                <td>${animal.dam || '-'}</td>
                <td>${animal.weight ? animal.weight + ' lbs' : '-'}</td>
                <td style="text-transform: capitalize;">${animal.status}</td>
                <td>${animal.price ? '$' + animal.price.toLocaleString() : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Total Animals: ${livestock.length}</p>
          <p>Shiloh Ridge Farm | Quality Katahdin Sheep, Live Hogs & Select Cattle</p>
          <p>Contact: dominichanway@gmail.com</p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="background: #3d5a3d; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">Print</button>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(inventoryHTML);
    printWindow.document.close();
  };

  const openBillOfSale = (animal) => {
    setSelectedAnimalForSale(animal);
    setBuyerInfo({ name: "", address: "", phone: "", email: "" });
    setBillOfSaleDialog(true);
  };

  const printBillOfSale = () => {
    if (!buyerInfo.name || !buyerInfo.address) {
      toast.error("Please fill in buyer name and address");
      return;
    }

    const printWindow = window.open('', '_blank');
    const billHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill of Sale - ${selectedAnimalForSale.tag_number}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #3d5a3d; padding-bottom: 20px; }
          .header h1 { color: #3d5a3d; margin: 0; font-size: 32px; }
          .header p { margin: 5px 0; color: #666; }
          .section { margin: 30px 0; }
          .section-title { font-weight: bold; color: #3d5a3d; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e8f4e8; padding-bottom: 5px; }
          .info-row { display: flex; margin: 10px 0; }
          .info-label { font-weight: bold; width: 200px; }
          .info-value { flex: 1; }
          .signature-section { margin-top: 60px; display: flex; justify-content: space-between; }
          .signature-box { width: 45%; }
          .signature-line { border-top: 2px solid #000; margin-top: 60px; padding-top: 5px; }
          .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Bill of Sale</h1>
          <p><strong>Shiloh Ridge Farm</strong></p>
          <p style="font-style: italic;">Integrity is the Backbone, Honesty the Muscle</p>
          <p>Contact: dominichanway@gmail.com</p>
        </div>

        <div class="section">
          <p style="text-align: center; font-size: 14px;">Date: ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="section">
          <div class="section-title">Seller Information</div>
          <div class="info-row">
            <div class="info-label">Farm Name:</div>
            <div class="info-value">Shiloh Ridge Farm</div>
          </div>
          <div class="info-row">
            <div class="info-label">Contact:</div>
            <div class="info-value">dominichanway@gmail.com</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Buyer Information</div>
          <div class="info-row">
            <div class="info-label">Name:</div>
            <div class="info-value">${buyerInfo.name}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Address:</div>
            <div class="info-value">${buyerInfo.address}</div>
          </div>
          ${buyerInfo.phone ? `
          <div class="info-row">
            <div class="info-label">Phone:</div>
            <div class="info-value">${buyerInfo.phone}</div>
          </div>` : ''}
          ${buyerInfo.email ? `
          <div class="info-row">
            <div class="info-label">Email:</div>
            <div class="info-value">${buyerInfo.email}</div>
          </div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Animal Information</div>
          <div class="info-row">
            <div class="info-label">Tag Number:</div>
            <div class="info-value">${selectedAnimalForSale.tag_number}</div>
          </div>
          ${selectedAnimalForSale.name ? `
          <div class="info-row">
            <div class="info-label">Name:</div>
            <div class="info-value">${selectedAnimalForSale.name}</div>
          </div>` : ''}
          <div class="info-row">
            <div class="info-label">Type:</div>
            <div class="info-value" style="text-transform: capitalize;">${selectedAnimalForSale.animal_type}</div>
          </div>
          ${selectedAnimalForSale.gender ? `
          <div class="info-row">
            <div class="info-label">Gender:</div>
            <div class="info-value" style="text-transform: capitalize;">${selectedAnimalForSale.gender}</div>
          </div>` : ''}
          ${selectedAnimalForSale.date_of_birth ? `
          <div class="info-row">
            <div class="info-label">Date of Birth:</div>
            <div class="info-value">${selectedAnimalForSale.date_of_birth}</div>
          </div>` : ''}
          ${selectedAnimalForSale.registration_number ? `
          <div class="info-row">
            <div class="info-label">Registration Number:</div>
            <div class="info-value">${selectedAnimalForSale.registration_number}</div>
          </div>` : ''}
          ${selectedAnimalForSale.bloodline ? `
          <div class="info-row">
            <div class="info-label">Bloodline:</div>
            <div class="info-value">${selectedAnimalForSale.bloodline}</div>
          </div>` : ''}
          ${selectedAnimalForSale.sire ? `
          <div class="info-row">
            <div class="info-label">Sire:</div>
            <div class="info-value">${selectedAnimalForSale.sire}</div>
          </div>` : ''}
          ${selectedAnimalForSale.dam ? `
          <div class="info-row">
            <div class="info-label">Dam:</div>
            <div class="info-value">${selectedAnimalForSale.dam}</div>
          </div>` : ''}
          ${selectedAnimalForSale.weight ? `
          <div class="info-row">
            <div class="info-label">Weight:</div>
            <div class="info-value">${selectedAnimalForSale.weight} lbs</div>
          </div>` : ''}
          ${selectedAnimalForSale.color ? `
          <div class="info-row">
            <div class="info-label">Color:</div>
            <div class="info-value">${selectedAnimalForSale.color}</div>
          </div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Purchase Details</div>
          <div class="info-row">
            <div class="info-label">Sale Price:</div>
            <div class="info-value" style="font-size: 18px; font-weight: bold;">$${selectedAnimalForSale.price ? selectedAnimalForSale.price.toLocaleString() : '_______'}</div>
          </div>
        </div>

        ${selectedAnimalForSale.health_records ? `
        <div class="section">
          <div class="section-title">Health Records</div>
          <p>${selectedAnimalForSale.health_records}</p>
        </div>` : ''}

        <div class="section" style="margin-top: 40px; padding: 15px; background: #f9f9f9; border-left: 4px solid #3d5a3d;">
          <p style="margin: 0; font-size: 13px; line-height: 1.6;">
            <strong>Terms:</strong> The seller certifies that they are the legal owner of the above-described animal and has the right to sell it. 
            The animal is sold "as is" with all faults. The seller makes no warranties, express or implied, regarding the animal's condition, 
            fitness for a particular purpose, or future performance. The buyer acknowledges receipt of the animal in satisfactory condition.
          </p>
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">
              <div>Seller Signature</div>
              <div style="margin-top: 10px; font-size: 12px;">Shiloh Ridge Farm</div>
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-line">
              <div>Buyer Signature</div>
              <div style="margin-top: 10px; font-size: 12px;">${buyerInfo.name}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>This bill of sale constitutes the entire agreement between buyer and seller.</p>
          <p>© ${new Date().getFullYear()} Shiloh Ridge Farm. All rights reserved.</p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="background: #3d5a3d; color: white; padding: 12px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Print Bill of Sale</button>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(billHTML);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8" data-testid="livestock-management">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-[#3d5a3d]" data-testid="livestock-management-title">Livestock Management</h2>
        <div className="flex gap-3">
          <Button 
            onClick={printInventoryList}
            variant="outline" 
            className="border-[#3d5a3d] text-[#3d5a3d] hover:bg-[#3d5a3d] hover:text-white rounded-full"
            data-testid="print-inventory-btn"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Inventory
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#3d5a3d] hover:bg-[#2d4a2d] rounded-full" data-testid="add-livestock-btn">
                Add New Livestock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="livestock-dialog">
              <DialogHeader>
                <DialogTitle data-testid="livestock-dialog-title">{editingAnimal ? "Edit Livestock" : "Add New Livestock"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Animal Type *</Label>
                    <Select value={formData.animal_type} onValueChange={(value) => handleChange("animal_type", value)}>
                      <SelectTrigger data-testid="livestock-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sheep">Sheep</SelectItem>
                        <SelectItem value="hog">Hog</SelectItem>
                        <SelectItem value="cattle">Cattle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tag Number *</Label>
                    <Input value={formData.tag_number} onChange={(e) => handleChange("tag_number", e.target.value)} required data-testid="livestock-tag-input" />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input value={formData.name} onChange={(e) => handleChange("name", e.target.value)} data-testid="livestock-name-input" />
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Input type="date" value={formData.date_of_birth} onChange={(e) => handleChange("date_of_birth", e.target.value)} data-testid="livestock-dob-input" />
                  </div>
                  <div>
                    <Label>Weight (lbs)</Label>
                    <Input type="number" step="0.01" value={formData.weight} onChange={(e) => handleChange("weight", e.target.value)} data-testid="livestock-weight-input" />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input value={formData.color} onChange={(e) => handleChange("color", e.target.value)} data-testid="livestock-color-input" />
                  </div>
                  <div>
                    <Label>Registration Number</Label>
                    <Input value={formData.registration_number} onChange={(e) => handleChange("registration_number", e.target.value)} data-testid="livestock-registration-input" />
                  </div>
                  <div>
                    <Label>Bloodline</Label>
                    <Input value={formData.bloodline} onChange={(e) => handleChange("bloodline", e.target.value)} data-testid="livestock-bloodline-input" />
                  </div>
                  <div>
                    <Label>Sire</Label>
                    <Input value={formData.sire} onChange={(e) => handleChange("sire", e.target.value)} data-testid="livestock-sire-input" />
                  </div>
                  <div>
                    <Label>Dam</Label>
                    <Input value={formData.dam} onChange={(e) => handleChange("dam", e.target.value)} data-testid="livestock-dam-input" />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={formData.gender} onValueChange={(value) => handleChange("gender", value)}>
                      <SelectTrigger data-testid="livestock-gender-select">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Price ($)</Label>
                    <Input type="number" step="0.01" value={formData.price} onChange={(e) => handleChange("price", e.target.value)} data-testid="livestock-price-input" />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                      <SelectTrigger data-testid="livestock-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="breeding_stock">Breeding Stock</SelectItem>
                        <SelectItem value="not_for_sale">Not for Sale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => handleChange("description", e.target.value)} rows={3} data-testid="livestock-description-input" />
                </div>
                <div>
                  <Label>Health Records</Label>
                  <Textarea value={formData.health_records} onChange={(e) => handleChange("health_records", e.target.value)} rows={3} data-testid="livestock-health-input" />
                </div>
                <div>
                  <Label>Photos</Label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      disabled={uploadingImages}
                      data-testid="livestock-photos-input"
                    />
                    {uploadingImages && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#3d5a3d]"></div>
                        Uploading images...
                      </div>
                    )}
                    {formData.photos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {formData.photos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                              src={photo}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-20 object-cover rounded-md border"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button type="submit" className="w-full bg-[#3d5a3d] hover:bg-[#2d4a2d] rounded-full" data-testid="livestock-submit-btn">
                  {editingAnimal ? "Update" : "Add"} Livestock
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <SkeletonLoader count={4} />
        ) : (
          <table className="w-full" data-testid="livestock-table">
            <thead className="bg-[#e8f4e8]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Tag</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Price</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Images</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {livestock.map((animal) => (
                <tr key={animal.id} className="border-b border-gray-200 hover:bg-gray-50" data-testid={`livestock-row-${animal.id}`}>
                  <td className="px-4 py-3">{animal.tag_number}</td>
                  <td className="px-4 py-3">{animal.name || "-"}</td>
                  <td className="px-4 py-3 capitalize">{animal.animal_type}</td>
                  <td className="px-4 py-3 capitalize">{animal.status}</td>
                  <td className="px-4 py-3">{animal.price ? `$${animal.price.toLocaleString()}` : "-"}</td>
                  <td className="px-4 py-3">
                    {animal.photos && animal.photos.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto max-w-[180px]">
                        {animal.photos.map((photo, idx) => (
                          <img key={idx} src={photo} alt={animal.name || animal.tag_number} className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:scale-105 transition-transform" />
                        ))}
                      </div>
                    ) : (
                      <span className="text-2xl">No Images</span>
                    )}
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(animal)} data-testid={`edit-livestock-${animal.id}`}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openBillOfSale(animal)} data-testid={`bill-of-sale-${animal.id}`}>
                      <FileText className="w-4 h-4 mr-1" />
                      Bill of Sale
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(animal.id)} data-testid={`delete-livestock-${animal.id}`}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bill of Sale Dialog */}
      <Dialog open={billOfSaleDialog} onOpenChange={setBillOfSaleDialog}>
        <DialogContent className="max-w-md" data-testid="bill-of-sale-dialog">
          <DialogHeader>
            <DialogTitle>Generate Bill of Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Enter buyer information to generate a bill of sale for {selectedAnimalForSale?.tag_number}</p>
            <div>
              <Label>Buyer Name *</Label>
              <Input 
                value={buyerInfo.name} 
                onChange={(e) => setBuyerInfo({...buyerInfo, name: e.target.value})} 
                required
                data-testid="buyer-name-input"
              />
            </div>
            <div>
              <Label>Buyer Address *</Label>
              <Textarea 
                value={buyerInfo.address} 
                onChange={(e) => setBuyerInfo({...buyerInfo, address: e.target.value})} 
                required
                rows={2}
                data-testid="buyer-address-input"
              />
            </div>
            <div>
              <Label>Buyer Phone</Label>
              <Input 
                value={buyerInfo.phone} 
                onChange={(e) => setBuyerInfo({...buyerInfo, phone: e.target.value})}
                data-testid="buyer-phone-input"
              />
            </div>
            <div>
              <Label>Buyer Email</Label>
              <Input 
                type="email"
                value={buyerInfo.email} 
                onChange={(e) => setBuyerInfo({...buyerInfo, email: e.target.value})}
                data-testid="buyer-email-input"
              />
            </div>
            <Button 
              onClick={printBillOfSale}
              className="w-full bg-[#3d5a3d] hover:bg-[#2d4a2d] rounded-full"
              data-testid="generate-bill-btn"
            >
              <Printer className="w-4 h-4 mr-2" />
              Generate & Print Bill of Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LivestockManagement;