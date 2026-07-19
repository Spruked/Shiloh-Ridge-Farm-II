import {
  BadgeDollarSign,
  Beef,
  Bell,
  CalendarCheck,
  FileText,
  Handshake,
  Mail,
  ShieldCheck,
  Wheat,
} from "lucide-react";

export const livestockFeatures = [
  {
    icon: Wheat,
    title: "Katahdin Sheep",
    description:
      "Premium quality Katahdin sheep with complete registration and bloodline documentation. Perfect for meat production and show.",
    testId: "feature-card-sheep",
  },
  {
    icon: ShieldCheck,
    title: "Live Hogs",
    description:
      "Healthy, well-maintained hogs raised with care. Full health records and breeding information available.",
    testId: "feature-card-hogs",
  },
  {
    icon: Beef,
    title: "Select Cattle",
    description:
      "Small selection of quality cattle, carefully chosen and maintained to meet the highest standards.",
    testId: "feature-card-cattle",
  },
];

export const accountBenefits = [
  {
    icon: BadgeDollarSign,
    title: "Member Discounts",
    description:
      "Registered customers receive exclusive pricing on livestock, custom cuts, and seasonal products not available to the general public.",
  },
  {
    icon: Bell,
    title: "First Access to New Animals",
    description:
      "Be the first to know when new livestock becomes available. Members get notified before listings go public so the best animals don't pass you by.",
  },
  {
    icon: Mail,
    title: "Farm Newsletter",
    description:
      "Get seasonal farm updates, breeding news, pasture rotations, and upcoming auction dates delivered straight to your inbox.",
  },
  {
    icon: FileText,
    title: "Order History & Invoices",
    description:
      "Track all your purchases in one place. Download invoices, review past orders, and manage your account without picking up the phone.",
  },
  {
    icon: CalendarCheck,
    title: "Reserve Freezer Space",
    description:
      "Members can reserve custom butcher orders and freezer-ready packages before processing dates fill up. Never miss a season again.",
  },
  {
    icon: Handshake,
    title: "Direct Farm Relationship",
    description:
      "Know exactly where your food comes from. Registered customers can request bloodline documentation, health records, and farm visit scheduling.",
  },
];
