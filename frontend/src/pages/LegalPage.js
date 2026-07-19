import { Link, useLocation } from "react-router-dom";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";

const CONTENT = {
  privacy: {
    title: "Privacy Policy",
    intro: "Shiloh Ridge Farm respects the privacy of visitors, customers, and livestock buyers who use this website or contact the farm directly.",
    sections: [
      ["Information we collect", "We may receive the name, email address, phone number, delivery or pickup details, account information, order details, and livestock questions that you choose to provide. The website may also retain routine technical records needed for security, troubleshooting, and reliable service."],
      ["How information is used", "Information is used to answer farm inquiries, manage customer accounts, prepare orders and invoices, coordinate livestock or product pickup, maintain accurate farm records, prevent misuse, and improve the website. We do not sell personal information."],
      ["Records and security", "Administrative access is restricted. Farm, order, accounting, and customer records are stored in persistent systems with audit and backup controls. No online system can promise absolute security, so please avoid sending unnecessary sensitive information through general contact forms."],
      ["Your choices", "You may contact the farm to ask about information associated with your customer account or request a reasonable correction. Certain transaction, tax, animal-transfer, or compliance records may need to be retained when required for legitimate farm operations."],
    ],
  },
  terms: {
    title: "Website and Sale Terms",
    intro: "These terms explain the general conditions for using the Shiloh Ridge Farm website and requesting livestock or farm products.",
    sections: [
      ["Availability and descriptions", "Livestock and farm product availability can change quickly. A website listing, price, weight, photo, bloodline note, or estimated lead time is informational until the farm confirms the specific animal or order directly."],
      ["Orders, deposits, and payment", "An order is not final until Shiloh Ridge Farm accepts it and confirms any required deposit, payment schedule, pickup date, processing arrangement, or delivery terms. Applicable taxes, processing costs, and third-party fees may be stated separately."],
      ["Livestock responsibility", "Buyers should review the available animal record and ask questions before purchase. Health, registration, transfer, transportation, and destination requirements vary, and the buyer remains responsible for requirements that apply after possession transfers."],
      ["Website use", "Do not misuse the website, attempt unauthorized administrative access, interfere with service, or submit unlawful material. Educational breed and farm information is not veterinary, legal, tax, or financial advice."],
    ],
  },
};

export default function LegalPage() {
  const { pathname } = useLocation();
  const page = pathname === "/privacy" ? CONTENT.privacy : CONTENT.terms;
  return (
    <div className="min-h-screen bg-[#f7f3e7]">
      <Navigation />
      <main className="mx-auto max-w-4xl px-6 py-14">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#b6863a]">Shiloh Ridge Farm</p>
        <h1 className="mb-5 text-4xl font-bold text-[#0f5132]">{page.title}</h1>
        <p className="mb-10 text-lg leading-relaxed text-stone-700">{page.intro}</p>
        <div className="space-y-8">
          {page.sections.map(([heading, text]) => (
            <section key={heading}>
              <h2 className="mb-3 text-2xl font-bold text-[#0f5132]">{heading}</h2>
              <p className="leading-7 text-stone-700">{text}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 rounded-lg bg-white p-6 text-stone-700 shadow-sm">
          Questions about these terms can be sent through the <Link to="/contact" className="font-semibold text-[#0f5132] underline">farm contact page</Link>.
        </p>
      </main>
      <Footer />
    </div>
  );
}
