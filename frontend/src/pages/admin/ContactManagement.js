import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../../components/ui/buttons";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ContactManagement = () => {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await axios.get(`${API}/contact`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(response.data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const handleStatusChange = async (contactId, newStatus) => {
    try {
      const token = localStorage.getItem("admin_token");
      await axios.patch(`${API}/contact/${contactId}/status?status=${newStatus}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchContacts();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const viewContact = (contact) => {
    setSelectedContact(contact);
    setIsDialogOpen(true);
    if (contact.status === "new") {
      handleStatusChange(contact.id, "read");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8" data-testid="contact-management">
      <h2 className="text-3xl font-bold text-[#3d5a3d] mb-6" data-testid="contact-management-title">Contact Submissions</h2>

      <div className="overflow-x-auto">
        <table className="w-full" data-testid="contact-table">
          <thead className="bg-[#e8f4e8]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-[#3d5a3d]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id} className="border-b border-gray-200 hover:bg-gray-50" data-testid={`contact-row-${contact.id}`}>
                <td className="px-4 py-3">{new Date(contact.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">{contact.name}</td>
                <td className="px-4 py-3">{contact.email}</td>
                <td className="px-4 py-3 capitalize">{contact.inquiry_type.replace("_", " ")}</td>
                <td className="px-4 py-3">
                  <Badge variant={contact.status === "new" ? "default" : "secondary"} data-testid={`contact-status-${contact.id}`}>
                    {contact.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" onClick={() => viewContact(contact)} data-testid={`view-contact-${contact.id}`}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="contact-dialog">
          <DialogHeader>
            <DialogTitle data-testid="contact-dialog-title">Contact Details</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700">Name:</h4>
                <p data-testid="contact-detail-name">{selectedContact.name}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700">Email:</h4>
                <p data-testid="contact-detail-email">{selectedContact.email}</p>
              </div>
              {selectedContact.phone && (
                <div>
                  <h4 className="font-semibold text-gray-700">Phone:</h4>
                  <p data-testid="contact-detail-phone">{selectedContact.phone}</p>
                </div>
              )}
              <div>
                <h4 className="font-semibold text-gray-700">Inquiry Type:</h4>
                <p className="capitalize" data-testid="contact-detail-type">{selectedContact.inquiry_type.replace("_", " ")}</p>
              </div>
              {selectedContact.offer_amount && (
                <div>
                  <h4 className="font-semibold text-gray-700">Offer Amount:</h4>
                  <p data-testid="contact-detail-offer">${selectedContact.offer_amount.toLocaleString()}</p>
                </div>
              )}
              <div>
                <h4 className="font-semibold text-gray-700">Message:</h4>
                <p className="whitespace-pre-wrap" data-testid="contact-detail-message">{selectedContact.message}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700">Date:</h4>
                <p data-testid="contact-detail-date">{new Date(selectedContact.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleStatusChange(selectedContact.id, "read")} 
                  variant="outline"
                  data-testid="contact-mark-read-btn"
                >
                  Mark as Read
                </Button>
                <Button 
                  onClick={() => handleStatusChange(selectedContact.id, "responded")} 
                  className="bg-[#3d5a3d] hover:bg-[#2d4a2d]"
                  data-testid="contact-mark-responded-btn"
                >
                  Mark as Responded
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactManagement;