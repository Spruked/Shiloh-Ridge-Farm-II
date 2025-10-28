import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../components/Navigation';
import PriceTicker from '../components/PriceTicker';
import Footer from '../components/Footer';

const AuctionsPage = () => {
  const [selectedState, setSelectedState] = useState('All');

  const auctions = [
    // Iowa Auctions
    {
      state: 'Iowa',
      name: 'Kalona Sales Barn',
      location: '121 9th Street, Kalona, IA 52247 • 319-656-2222',
      notes: 'Weekly sheep/goat/hog sales every Wednesday (sheep start at 9:00 am)',
      website: 'https://kalonasalesbarn.com',
      verified: '2025-10-27'
    },
    {
      state: 'Iowa',
      name: 'Waverly Sales Company',
      location: '2212 5th Ave NW, Waverly, IA 50677 • 319-352-2804',
      notes: 'Regular sheep/goat & pig sale. Offers dedicated sheep & goat sales (includes upcoming calendar)',
      website: 'https://waverlysales.com',
      verified: '2025-10-27'
    },
    {
      state: 'Iowa',
      name: 'Maquoketa Livestock Market Inc.',
      location: '610 N Matteson St., PO Box 662, Maquoketa, IA 52060 • 563-652-8080',
      notes: 'Sheep & goat sales: 1st Tuesday of each month',
      website: 'https://equitycoop.com',
      verified: '2025-10-27'
    },
    {
      state: 'Iowa',
      name: 'Red Oak Livestock Inc.',
      location: '1511 200th St., Red Oak, IA 51566 • 712-623-5151',
      notes: 'Saturday livestock (sheep/goats included) sale',
      website: 'https://redoaklivestock.com',
      verified: '2025-10-27'
    },
    {
      state: 'Iowa',
      name: 'Algona Livestock LLC',
      location: 'Hwy 169 North, P.O. Box 397, Algona, IA 50511 • 515-295-7273',
      notes: 'Listed as sheep & goat auction in state directory',
      website: 'https://iowaagriculture.gov',
      verified: '2025-10-27'
    },
    {
      state: 'Iowa',
      name: 'Anita Livestock Auction',
      location: '54686 730th, Anita, IA 50020 • 712-762-3330',
      notes: 'Friday 1 pm – cattle, hogs, sheep',
      website: 'https://iowaagriculture.gov',
      verified: '2025-10-27'
    },
    {
      state: 'Iowa',
      name: 'Humeston Livestock Exchange LLC',
      location: '1026 N Front St., Humeston, IA 50123 • 641-877-6092',
      notes: 'Sheep & goat sales on the first Tuesday of each month',
      website: 'https://humestonlivestockexchange.com',
      verified: '2025-10-27'
    },
    {
      state: 'Iowa',
      name: 'Denison Livestock Auction',
      location: '501 North 9th Street, Denison, IA 51442 • 712-263-3149',
      notes: 'Regular Saturday sale including hogs, sheep & cattle starting at 8:30 am',
      website: 'https://denisonlivestock.com',
      verified: '2025-10-27'
    },

    // Kansas Auctions
    {
      state: 'Kansas',
      name: 'Colby Livestock Auction Company LLC',
      location: '125 S. Country Club Dr., Colby, KS 67701 • 785-460-3231',
      notes: 'Weekly Thursday 11 am; handles sheep & goats. Near I-70 & Hwy 83',
      website: 'https://colbylivestockauction.com',
      verified: '2025-10-27'
    },
    {
      state: 'Kansas',
      name: 'JCCC Livestock Sales',
      location: '1774 Meadowlark Rd., Clay Center, KS • 785-632-5566',
      notes: 'Monthly sheep & goat sale (1st Saturday) plus general livestock. Clay Center & Junction City locations',
      website: 'https://jccclivestocksales.com',
      verified: '2025-10-27'
    },
    {
      state: 'Kansas',
      name: 'Holton Livestock Exchange',
      location: '13788 Hwy K16, Holton, KS',
      notes: 'Regular livestock (sheep/goats included) every Tuesday. Supports multiple species including sheep & goats',
      website: 'https://holtonlivestock.com',
      verified: '2025-10-27'
    },
    {
      state: 'Kansas',
      name: 'Paola Livestock Auction',
      location: 'Paola, KS',
      notes: 'Friday 1 pm sales; includes livestock – verify sheep/goats included',
      website: 'https://paolalivestockauction.com',
      verified: '2025-10-27'
    },

    // Missouri Auctions
    {
      state: 'Missouri',
      name: 'SEMO Livestock Sales',
      location: 'Jackson, MO',
      notes: 'Sheep & goat sale monthly (3rd Friday at 9:00 am)',
      website: 'https://semolivestocksales.com',
      verified: '2025-10-27'
    },
    {
      state: 'Missouri',
      name: 'Maryville Livestock Auction',
      location: 'Maryville, MO',
      notes: 'Sheep & goat sales: second Friday of every month at 11:00 am',
      website: 'https://maryvillelivestockauction.com',
      verified: '2025-10-27'
    },
    {
      state: 'Missouri',
      name: 'Buffalo Livestock Market',
      location: 'Buffalo, MO',
      notes: 'Sheep/goat auction listed in USDA directory',
      website: 'https://ams.usda.gov',
      verified: '2025-10-27'
    },

    // Nebraska Auctions
    {
      state: 'Nebraska',
      name: 'Colfax Livestock Sales Co.',
      location: '335 N Walnut St., Colfax, NE 50054 • 515-674-3561',
      notes: 'Sheep, goats, hogs, cattle every Saturday at 9:30-10:30 am',
      website: 'https://colfaxlivestocksales.com',
      verified: '2025-10-27'
    },
    {
      state: 'Nebraska',
      name: 'Loup City Commission Company',
      location: 'Loup City, NE • 308-745-1766',
      notes: 'Sheep & goat sale: first Saturday of each month',
      website: 'https://nebraskasheepandgoat.org',
      verified: '2025-10-27'
    },
    {
      state: 'Nebraska',
      name: 'Verdigre Livestock Market',
      location: 'Verdigre, NE • 402-668-2246',
      notes: 'Sheep & goat sale: third Saturday of each month',
      website: 'https://nebraskasheepandgoat.org',
      verified: '2025-10-27'
    },
    {
      state: 'Nebraska',
      name: 'Alma Livestock Auction',
      location: 'Alma, NE',
      notes: 'Monthly sheep & goat auction included in schedule',
      website: 'https://almalivestockauction.com',
      verified: '2025-10-27'
    }
  ];

  const states = ['All', ...new Set(auctions.map(auction => auction.state))];
  const filteredAuctions = selectedState === 'All' ? auctions : auctions.filter(auction => auction.state === selectedState);

  return (
    <div>
      <Navigation />
      <PriceTicker />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Local Livestock Auctions</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find sheep, goat, and hog auctions in Iowa, Kansas, Missouri, and Nebraska.
            All listings include Katahdin sheep and other heritage breeds.
          </p>
        </div>

        {/* State Filter */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            {states.map(state => (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedState === state
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {state}
              </button>
            ))}
          </div>
        </div>

        {/* Auctions Table */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Auction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location & Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sale Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Website
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Verified
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAuctions.map((auction, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {auction.state}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {auction.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {auction.location}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      {auction.notes}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {auction.website ? (
                        <a
                          href={auction.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          Visit Site
                        </a>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {auction.verified}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Use This Auction List</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">For Buyers & Sellers</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• Check sale schedules and contact information</li>
                    <li>• Verify Katahdin sheep acceptance with auction staff</li>
                    <li>• Plan transportation and lodging in advance</li>
                    <li>• Bring required paperwork for livestock sales</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Tips & Best Practices</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• Call ahead to confirm sale times and requirements</li>
                    <li>• Katahdin sheep are commonly accepted at these auctions</li>
                    <li>• Bring health certificates and registration papers</li>
                    <li>• Consider market conditions before selling</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="text-center">
              <img 
                src="http://localhost:8000/images/pens-with-goats-hogs-and-sheep.webp" 
                alt="Livestock at auction pens" 
                className="rounded-lg shadow-lg max-w-full h-auto"
              />
              <p className="text-sm text-gray-500 mt-2">Livestock ready for auction at regional sale barns</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Questions about auctions or livestock sales?{' '}
            <Link to="/contact" className="text-blue-600 hover:underline">
              Contact Shiloh Ridge Farm
            </Link>
          </p>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AuctionsPage;