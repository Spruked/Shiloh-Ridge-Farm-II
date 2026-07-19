import { Link } from "react-router-dom";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#f7f3e7]">
      <Navigation />
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#b6863a]">Page not found</p>
        <h1 className="mb-5 text-4xl font-bold text-[#0f5132]">That farm page has moved</h1>
        <p className="mb-8 text-lg text-stone-700">Browse current livestock, learn about Katahdin sheep, shop farm products, or contact Shiloh Ridge Farm directly.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/livestock" className="rounded-md bg-[#0f5132] px-6 py-3 font-semibold text-white">View Livestock</Link>
          <Link to="/products" className="rounded-md border border-[#0f5132] px-6 py-3 font-semibold text-[#0f5132]">Farm Products</Link>
          <Link to="/contact" className="rounded-md border border-[#0f5132] px-6 py-3 font-semibold text-[#0f5132]">Contact the Farm</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
