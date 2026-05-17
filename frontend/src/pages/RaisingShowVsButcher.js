import React from "react";
import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";

const RaisingShowVsButcher = () => {
  return (
    <div className="min-h-screen bg-[#f7f3e7]">
      <Navigation />
      <PriceTicker />

      <section className="py-20 px-6 max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 text-[#0f5132]">
          Raising for Show vs. Butchering
        </h1>

        <p className="text-center text-gray-600 mb-8 text-lg">
          Raising hogs and sheep for show versus butchering involves distinct priorities. While both require
          solid health and nutritional foundations, show animals demand intensive aesthetic and behavioral
          management that goes beyond the basic weight-gain goals of butcher-only livestock.
        </p>

        <div className="space-y-8">
          <article>
            <h2 className="text-2xl font-semibold text-[#0f5132] mb-3">Primary Concerns for Hogs</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Show Management:</strong> Success requires training the animal to "drive" (walk) with
                a show stick or whip while keeping its head elevated to impress judges. Daily exercise builds
                muscle and prevents excess fat.
              </li>
              <li>
                <strong>Butchering Focus:</strong> Main goals are growth rate and carcass quality (leanness and
                muscling). Pigs are monogastric and require concentrated feed (cereal grains); they cannot
                thrive on forage alone.
              </li>
              <li>
                <strong>Nutrition:</strong> Show diets are often manipulated — using high-protein starters
                (around 20%) and transitioning to lower protein (about 15%) — to dial in specific muscle and
                fat coverage for the show date.
              </li>
              <li>
                <strong>General Health:</strong> Key risks include African Swine Fever (biosecurity is critical)
                and respiratory issues. Pigs do not sweat and must have access to shade, fans, or mud to
                prevent heat stress.
              </li>
            </ul>
          </article>

          <article>
            <h2 className="text-2xl font-semibold text-[#0f5132] mb-3">Primary Concerns for Sheep</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Show Management:</strong> Exhibitors must "fit" the sheep by bathing, brushing, and
                trimming hooves to enhance appearance. Practice "bracing" so the sheep stands firmly to
                highlight muscle definition.
              </li>
              <li>
                <strong>Butchering Focus:</strong> Producers look for efficient feed conversion and high-yielding
                carcasses. Sheep are highly susceptible to internal parasites, requiring strict rotational
                grazing and deworming schedules.
              </li>
              <li>
                <strong>Nutrition:</strong> Show lambs often receive balanced rations of 15–18% protein and
                3.5–4.5% fat to optimize performance. Fresh feed maintains appetite and performance.
              </li>
              <li>
                <strong>Environment:</strong> Predators (wolves, coyotes, dogs) pose constant threats; maintain
                strong fencing and provide dry, draft-free shelter to prevent pneumonia and hypothermia.
              </li>
            </ul>
          </article>

          <article>
            <h2 className="text-2xl font-semibold text-[#0f5132] mb-3">Overlapping Considerations</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Biosecurity:</strong> Show animals face higher disease risk due to commingling at fairs.
                Isolation for 14–30 days after returning home is common practice.
              </li>
              <li>
                <strong>Veterinary Relationship:</strong> A strong veterinary-client-patient relationship is vital
                for vaccinations and ensuring drug withdrawal times are met before slaughter.
              </li>
              <li>
                <strong>Waste Management:</strong> High animal density increases manure production; manage via
                pits or composting to prevent odor and groundwater pollution.
              </li>
            </ul>
          </article>

          <div className="text-sm text-gray-500">
            <p>Sources: Penn State Extension; product and nutrition references (e.g., DuraFerm).</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default RaisingShowVsButcher;
