import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";
import { Button } from "../components/ui/buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useCustomerAuth } from "../CustomerAuthContext";

function CustomerRegisterPage() {
  const navigate = useNavigate();
  const { register } = useCustomerAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await register(form);
      toast.success("Customer account created");
      navigate("/account/dashboard");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navigation />
      <PriceTicker />
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7b4b2a]">Customer Account</p>
            <h1 className="text-5xl font-bold text-[#3d5a3d]">Create an account with Shiloh Ridge Farm</h1>
            <p className="max-w-xl text-lg text-stone-600">
              Save your order history, keep your contact information handy, upload a profile photo so Dominic can remember you more easily, and download invoices whenever you need them.
            </p>
            <img
              src="/flockofdominicskatahdins.jpeg"
              alt="Shiloh Ridge flock"
              className="w-full rounded-3xl object-cover shadow-xl"
            />
          </div>

          <Card className="border-stone-200 shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl text-[#3d5a3d]">Create your account</CardTitle>
              <CardDescription>Simple, clean, and made for returning farm customers.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  placeholder="Full name"
                  value={form.full_name}
                  onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                  required
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
                <Input
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
                <Textarea
                  rows={3}
                  placeholder="Address"
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                />
                <Button type="submit" disabled={submitting} className="w-full bg-[#3d5a3d] hover:bg-[#2d4a2d]">
                  {submitting ? "Creating account..." : "Create Account"}
                </Button>
              </form>
              <p className="mt-4 text-sm text-stone-600">
                Already have an account?{" "}
                <Link to="/account/login" className="font-medium text-[#3d5a3d] hover:underline">
                  Sign in here
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
      <Footer />
    </div>
  );
}

export default CustomerRegisterPage;
