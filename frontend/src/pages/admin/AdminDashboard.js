import React from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Boxes,
  ClipboardList,
  DollarSign,
  FileText,
  LogOut,
  Mail,
  Package,
  ScanSearch,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "../../components/ui/buttons";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";


const LOGO_URL = "/ShilohRidgeFarmicon256.png";

const adminSections = [
  {
    title: "Daily Work",
    description: "The tools Dominic is most likely to need day to day.",
    cards: [
      {
        title: "Orders",
        description: "Review customer orders, update status, and keep fulfillment moving.",
        icon: ClipboardList,
        href: "/admin/orders",
      },
      {
        title: "Analytics",
        description: "See revenue, expenses, inventory, livestock, products, customers, and owner attention signals.",
        icon: BarChart3,
        href: "/admin/analytics",
      },
      {
        title: "Products",
        description: "Add or update farm products, pricing, lead times, and photos.",
        icon: Package,
        href: "/admin/products",
      },
      {
        title: "Livestock",
        description: "Manage animals, registrations, and field-capture records.",
        icon: Users,
        href: "/admin/livestock",
      },
      {
        title: "Review Queue",
        description: "Check flagged mobile captures and finish the ones that need a human eye.",
        icon: ScanSearch,
        href: "/admin/review-queue",
      },
      {
        title: "Accounting",
        description: "Record expenses and revenue without hunting through menus.",
        icon: DollarSign,
        href: "/admin/accounting",
      },
      {
        title: "Farm Pricing",
        description: "Track market price, farm cost, markup, and margin for every animal type and sale method.",
        icon: TrendingUp,
        href: "/admin/farm-pricing",
      },
    ],
  },
  {
    title: "Website Content",
    description: "Edit the public-facing pages without touching code.",
    cards: [
      {
        title: "About Page",
        description: "Update the farm story, mission, and history.",
        icon: FileText,
        href: "/admin/about",
      },
      {
        title: "Blog",
        description: "Publish farm updates and edit blog posts in one place.",
        icon: BookOpen,
        href: "/admin/blog",
      },
      {
        title: "Contacts",
        description: "Review incoming inquiries and keep track of responses.",
        icon: Mail,
        href: "/admin/contacts",
      },
      {
        title: "Customers",
        description: "View and manage registered customer accounts and profiles.",
        icon: Users,
        href: "/admin/customers",
      },
      {
        title: "Settings",
        description: "Adjust site-level settings and connected keys.",
        icon: Settings,
        href: "/admin/settings",
      },
    ],
  },
  {
    title: "Advanced Tools",
    description: "Use these when you need deeper system or inventory control.",
    cards: [
      {
        title: "Sales",
        description: "Track livestock sales and customer sale records.",
        icon: DollarSign,
        href: "/admin/sales",
      },
      {
        title: "Inventory",
        description: "Manage inventory records and related admin workflows.",
        icon: Boxes,
        href: "/admin/inventory",
      },
      {
        title: "Butch Admin",
        description: "Manage Butch memory, promotions, and butcher assistant health.",
        icon: Sparkles,
        href: "/admin/butch",
      },
      {
        title: "NFT Tools",
        description: "Open the blockchain and certificate utilities if needed.",
        icon: ShieldCheck,
        href: "/admin/nft",
      },
    ],
  },
];

const AdminDashboard = ({ onLogout }) => {
  return (
    <div className="min-h-screen bg-[#f3efdf] px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-lg md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={LOGO_URL}
              alt="Shiloh Ridge Farm"
              className="h-16 w-16"
              data-testid="admin-header-logo"
            />
            <div>
              <h1
                className="text-3xl font-bold text-[#0f5132]"
                data-testid="admin-header-title"
              >
                Farm Admin
              </h1>
              <p className="text-sm text-stone-600">
                A simpler control center for day-to-day farm management.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link to="/">
              <Button type="button" variant="outline">
                Back To Site
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <Card className="border-stone-200 shadow-md">
          <CardContent className="grid gap-4 p-6 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b6863a]">
                Owner Friendly
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#0f5132]">
                Keep the main work one click away
              </h2>
            </div>
            <p className="text-sm text-stone-600">
              Orders, products, livestock, accounting, and website content are all restored here so the owner does not have to remember hidden routes.
            </p>
            <p className="text-sm text-stone-600">
              Shep stays the public website assistant. Butch stays the product-page butcher specialist. This area is the secure owner workspace.
            </p>
          </CardContent>
        </Card>

        {adminSections.map((section) => (
          <section key={section.title} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-[#8f6428]">{section.title}</h2>
              <p className="text-sm text-stone-600">{section.description}</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {section.cards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.href} className="border-stone-200 shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[#0f5132]">
                        <Icon className="h-5 w-5 text-[#b6863a]" />
                        {card.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-stone-600">
                      <p>{card.description}</p>
                      <Link to={card.href}>
                        <Button className="w-full bg-[#0f5132] hover:bg-[#0a3c24]">
                          Open
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};


export default AdminDashboard;
