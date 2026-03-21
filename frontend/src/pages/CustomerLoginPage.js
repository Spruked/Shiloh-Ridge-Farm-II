import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";
import { Button } from "../components/ui/buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useCustomerAuth } from "../CustomerAuthContext";

function CustomerLoginPage() {
  const navigate = useNavigate();
  const { login } = useCustomerAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(form);
      toast.success("Welcome back");
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
      <section className="mx-auto max-w-4xl px-6 py-16">
        <Card className="mx-auto max-w-md border-stone-200 shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl text-[#3d5a3d]">Customer sign in</CardTitle>
            <CardDescription>See your orders, invoices, and saved farm profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
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
              <Button type="submit" disabled={submitting} className="w-full bg-[#3d5a3d] hover:bg-[#2d4a2d]">
                {submitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <p className="mt-4 text-sm text-stone-600">
              Need an account?{" "}
              <Link to="/account/register" className="font-medium text-[#3d5a3d] hover:underline">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
      <Footer />
    </div>
  );
}

export default CustomerLoginPage;
