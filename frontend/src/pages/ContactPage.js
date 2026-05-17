import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/buttons";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";
import { getApiBaseUrl } from "../lib/backend";
import { resolveMediaUrl } from "../lib/media";

const API = getApiBaseUrl();

const ContactPage = () => {
  const [searchParams] = useSearchParams();
  const animalId = searchParams.get("animal");
  const inquiryType = searchParams.get("type") || "general";
  const normalizedInquiryType =
    inquiryType === "offer" ? "offer" : inquiryType === "buy" ? "buy" : animalId ? "animal_inquiry" : "general";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    inquiry_type: normalizedInquiryType,
    animal_id: animalId || "",
    offer_amount: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [animal, setAnimal] = useState(null);

  useEffect(() => {
    if (animalId) {
      fetchAnimal();
    }
  }, [animalId]);

  const fetchAnimal = async () => {
    try {
      const response = await axios.get(`${API}/livestock/${animalId}`);
      setAnimal(response.data);
    } catch (error) {
      console.error("Error fetching animal:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const submitData = {
        ...formData,
        offer_amount: formData.offer_amount ? parseFloat(formData.offer_amount) : null
      };
      const response = await axios.post(`${API}/contact`, submitData);
      if (response.data?.notification_sent) {
        toast.success("Message sent! We'll get back to you soon.");
      } else {
        toast.success("Message saved — we'll be in touch soon.");
      }
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
        inquiry_type: normalizedInquiryType,
        animal_id: "",
        offer_amount: ""
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3e7]">
      <Navigation />
      <PriceTicker />

      <section className="py-20 px-6 max-w-4xl mx-auto" data-testid="contact-page">
        <div className="text-center mb-6">
          <img
            src="/ShilohRidgeFarmicon256.png"
            alt="Shiloh Ridge Farm"
            className="w-36 mx-auto object-contain opacity-90"
          />
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 text-[#0f5132]" data-testid="contact-title">
          {normalizedInquiryType === "offer" ? "Submit An Offer" : normalizedInquiryType === "buy" ? "Buy This Animal" : "Contact Us"}
        </h1>
        <p className="text-center text-gray-600 mb-12 text-lg">
          {animal
            ? normalizedInquiryType === "offer"
              ? `Send Dominic your offer for ${animal.name || animal.tag_number}`
              : normalizedInquiryType === "buy"
                ? `Reserve ${animal.name || animal.tag_number} and Dominic will confirm the next steps`
                : `Inquire about ${animal.name || animal.tag_number}`
            : "Get in touch with us"}
        </p>

        {animal && (
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-8 flex items-center gap-4" data-testid="contact-animal-info">
            <div className="w-20 h-20 bg-[#e7eddc] rounded-lg flex items-center justify-center">
              {resolveMediaUrl(animal.photos?.[0]) ? (
                <img src={resolveMediaUrl(animal.photos?.[0])} alt={animal.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-sm font-semibold text-[#0f5132] uppercase tracking-wide">
                  {animal.animal_type || 'Animal'}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#0f5132]">{animal.name || animal.tag_number}</h3>
              <p className="text-gray-600 capitalize">{animal.animal_type}</p>
              {animal.price && <p className="text-lg font-semibold text-[#0f5132]">${animal.price.toLocaleString()}</p>}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <form onSubmit={handleSubmit} data-testid="contact-form">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="name" className="text-gray-700 font-medium mb-2 block">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border-gray-300"
                  data-testid="contact-name-input"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-gray-700 font-medium mb-2 block">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border-gray-300"
                  data-testid="contact-email-input"
                />
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="phone" className="text-gray-700 font-medium mb-2 block">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300"
                data-testid="contact-phone-input"
              />
            </div>

            {formData.inquiry_type === "offer" && (
              <div className="mb-6">
                <Label htmlFor="offer_amount" className="text-gray-700 font-medium mb-2 block">Offer Amount ($)</Label>
                <Input
                  id="offer_amount"
                  name="offer_amount"
                  type="number"
                  step="0.01"
                  value={formData.offer_amount}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300"
                  data-testid="contact-offer-input"
                />
              </div>
            )}

            {formData.inquiry_type === "buy" && (
              <div className="mb-6 rounded-xl bg-[#e7eddc] p-4 text-sm text-[#0f5132]">
                This sends Dominic a purchase request for this animal. He can confirm availability, pickup timing, and any final paperwork with you directly.
              </div>
            )}

            <div className="mb-6">
              <Label htmlFor="message" className="text-gray-700 font-medium mb-2 block">Message *</Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full rounded-lg border-gray-300"
                data-testid="contact-message-input"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full btn-hover bg-[#0f5132] hover:bg-[#0a3c24] text-white font-semibold py-6 rounded-full text-lg"
              data-testid="contact-submit-btn"
            >
              {submitting
                ? "Sending..."
                : formData.inquiry_type === "offer"
                  ? "Submit Offer"
                  : formData.inquiry_type === "buy"
                    ? "Send Purchase Request"
                    : "Send Message"}
            </Button>
          </form>
        </div>

        <div className="mt-12 bg-[#e7eddc] rounded-2xl p-8 text-center" data-testid="contact-info">
          <h3 className="text-2xl font-bold text-[#0f5132] mb-4">Contact Information</h3>
          <div className="text-gray-700 text-lg space-y-2">
            <div>
              <p className="font-semibold text-xl text-[#0f5132] mb-2">Shiloh Ridge Farm</p>
              <p className="font-medium">Dominic Hanway</p>
              <p>20705 Quebec Road</p>
              <p>Maitland, Missouri 64466</p>
            </div>
            <div className="pt-4">
              <p>
                Farm Email: <a href="mailto:shilohridgefarm@gmail.com" className="text-[#0f5132] font-medium hover:underline">shilohridgefarm@gmail.com</a>
              </p>
              <p>
                Direct: <a href="mailto:dominichanway@gmail.com" className="text-[#0f5132] font-medium hover:underline">dominichanway@gmail.com</a>
              </p>
              <p>
                Phone: <a href="tel:+1-660-254-6226" className="text-[#0f5132] font-medium hover:underline">(660) 254-6226</a>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                For inquiries about livestock, pricing, or farm visits, please contact us directly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
