import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Scale,
  Calculator,
  ChevronDown,
  ChevronUp,
  Info,
  Package,
  DollarSign,
  ChefHat,
  ArrowRight,
  LogIn,
  UserPlus,
  ShoppingCart
} from 'lucide-react';
import { getApiBaseUrl } from '../../lib/backend';

const weightPresets = {
  hog: { whole: [250, 275, 300], half: [125, 140, 150] },
  lamb: { whole: [100, 120, 140], half: [50, 60, 70] }
};

const toTitle = (value = '') =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const ProcessExplanation = () => {
  const steps = [
    {
      title: 'Live Weight',
      description: 'This is the starting animal weight used to estimate the rest of the butcher yield.',
      icon: Scale
    },
    {
      title: 'Hanging Weight',
      description: 'After initial processing, the hanging carcass weight gives the first serious yield checkpoint.',
      icon: Package
    },
    {
      title: 'Cut & Packaging',
      description: 'The processor trims, portions, and packages the cuts based on your order style.',
      icon: ChefHat
    },
    {
      title: 'Take-Home Weight',
      description: 'This is your approximate packaged weight after trim, bone, and moisture loss.',
      icon: DollarSign
    }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">From Farm To Freezer</h3>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
                <step.icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">{step.title}</h4>
                <p className="text-sm text-slate-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h4 className="mb-3 font-semibold text-amber-900">Typical Yield Percentages</h4>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-700">72%</div>
            <div className="text-xs uppercase tracking-wide text-amber-600">Hog Hanging</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-700">57%</div>
            <div className="text-xs uppercase tracking-wide text-amber-600">Hog Finished</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-700">52%</div>
            <div className="text-xs uppercase tracking-wide text-amber-600">Lamb Hanging</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-700">42%</div>
            <div className="text-xs uppercase tracking-wide text-amber-600">Lamb Finished</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CutGuide = ({ meatType, apiBaseUrl }) => {
  const [cuts, setCuts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchCuts = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${apiBaseUrl}/butcher/cuts/${meatType}`);
        if (active) {
          setCuts(response.data.cuts || []);
        }
      } catch (error) {
        console.error('Failed to fetch cuts:', error);
        if (active) {
          setCuts([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchCuts();

    return () => {
      active = false;
    };
  }, [apiBaseUrl, meatType]);

  if (loading) {
    return <div className="py-8 text-center text-sm text-slate-500">Loading cuts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-semibold text-slate-800">
          {meatType === 'hog' ? 'Hog' : 'Lamb'} Primal & Retail Cuts
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          These are planning estimates to help visitors understand how their order may break down.
        </p>
      </div>

      <div className="grid gap-3">
        {cuts.map((cut) => (
          <div
            key={`${cut.primal}-${cut.name}`}
            className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-amber-300"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 text-xs uppercase tracking-wide text-amber-600">
                  {toTitle(cut.primal)}
                </div>
                <div className="font-semibold text-slate-800">{toTitle(cut.name)}</div>
                <div className="mt-1 text-sm text-slate-600">{cut.description}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-emerald-700">${cut.price_per_lb}/lb</div>
                <div className="text-xs text-slate-500">
                  Est. {cut.estimated_lbs?.[0]}-{cut.estimated_lbs?.[1]} lbs
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ButcherCutCalculator = ({
  onContactOrder,
  onOrderSignIn,
  onOrderCreateAccount,
  onAddRecommendedToCart,
}) => {
  const apiBaseUrl = getApiBaseUrl();
  const [meatType, setMeatType] = useState('hog');
  const [orderType, setOrderType] = useState('whole');
  const [liveWeight, setLiveWeight] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedPrimal, setExpandedPrimal] = useState(null);
  const [activeTab, setActiveTab] = useState('calculator');

  const calculateEstimate = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${apiBaseUrl}/butcher/calculate`, {
        meat_type: meatType,
        order_type: orderType,
        live_weight: liveWeight ? parseFloat(liveWeight) : null
      });
      setEstimate(response.data.estimate);
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'calculator', label: 'Calculator', icon: Calculator },
    { id: 'cuts', label: 'Cut Guide', icon: ChefHat },
    { id: 'info', label: 'How It Works', icon: Info }
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 text-white">
        <h2 className="flex items-center gap-3 text-2xl font-bold">
          <Scale className="h-7 w-7" />
          Butch's Meat Calculator
        </h2>
        <p className="mt-2 text-sm text-amber-100">
          Estimate butcher yield, freezer planning, and rough cut value before you order.
        </p>
      </div>

      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-amber-600 bg-amber-50 text-amber-700'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">Select Meat Type</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'hog', label: 'Hog / Pork' },
                  { id: 'lamb', label: 'Lamb / Sheep' }
                ].map((meat) => (
                  <button
                    key={meat.id}
                    onClick={() => setMeatType(meat.id)}
                    className={`rounded-xl border-2 p-4 text-center transition-all ${
                      meatType === meat.id
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-slate-200 text-slate-700 hover:border-amber-300'
                    }`}
                  >
                    <span className="block font-semibold">{meat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">Order Size</label>
              <div className="flex gap-3">
                {['whole', 'half'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex-1 rounded-lg border-2 px-4 py-3 font-medium capitalize transition-all ${
                      orderType === type
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-slate-200 text-slate-700 hover:border-amber-300'
                    }`}
                  >
                    {type} {meatType}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">
                Live Weight (optional)
              </label>
              <div className="mb-3 flex gap-3">
                <input
                  type="number"
                  value={liveWeight}
                  onChange={(event) => setLiveWeight(event.target.value)}
                  placeholder={`Average: ${meatType === 'hog' ? '275' : '120'} lbs`}
                  className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3"
                />
                <span className="flex items-center px-3 text-sm font-medium text-slate-600">lbs</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="py-1 text-xs text-slate-500">Quick select:</span>
                {weightPresets[meatType][orderType].map((weight) => (
                  <button
                    key={weight}
                    onClick={() => setLiveWeight(weight.toString())}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 transition-colors hover:bg-amber-100"
                  >
                    {weight} lbs
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={calculateEstimate}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-4 font-semibold text-white transition-colors hover:bg-amber-700 disabled:bg-slate-300"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="h-5 w-5" />
                  Calculate My Cuts
                </>
              )}
            </button>

            {estimate && (
              <div className="animate-in fade-in slide-in-from-bottom-4 mt-8 space-y-6 duration-500">
                <div className="rounded-xl bg-slate-50 p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
                    <Scale className="h-5 w-5 text-amber-600" />
                    Weight Breakdown
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-slate-800">{estimate.live_weight}</div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">Live Weight</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-600">
                        {estimate.hanging_weight[0]}-{estimate.hanging_weight[1]}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">Hanging</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">
                        {estimate.finished_weight[0]}-{estimate.finished_weight[1]}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">Finished</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                  <h3 className="mb-2 flex items-center gap-2 font-semibold text-emerald-900">
                    <DollarSign className="h-5 w-5" />
                    Estimated Total Cost
                  </h3>
                  <div className="text-3xl font-bold text-emerald-700">
                    ${estimate.total_estimated_cost[0]} - ${estimate.total_estimated_cost[1]}
                  </div>
                  <p className="mt-1 text-sm text-emerald-700">
                    This is a planning range based on typical cut value and processor yield.
                  </p>
                </div>

                <div>
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
                    <Package className="h-5 w-5 text-amber-600" />
                    Cut Breakdown
                  </h3>
                  <div className="space-y-3">
                    {estimate.primal_cuts.map((primal, index) => (
                      <div
                        key={`${primal.name}-${index}`}
                        className="overflow-hidden rounded-xl border border-slate-200"
                      >
                        <button
                          onClick={() => setExpandedPrimal(expandedPrimal === index ? null : index)}
                          className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-slate-800">{primal.name}</span>
                            <span className="text-sm text-slate-500">
                              {primal.estimated_lbs[0]}-{primal.estimated_lbs[1]} lbs
                            </span>
                          </div>
                          {expandedPrimal === index ? (
                            <ChevronUp className="h-5 w-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-400" />
                          )}
                        </button>

                        {expandedPrimal === index && (
                          <div className="bg-white p-4">
                            <div className="grid gap-3">
                              {primal.retail_cuts.map((cut, cutIndex) => (
                                <div
                                  key={`${cut.name}-${cutIndex}`}
                                  className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 p-3"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium text-slate-800">{cut.name}</div>
                                    <div className="text-sm text-slate-600">{cut.description}</div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {(cut.cooking_methods || []).slice(0, 3).map((method) => (
                                        <span
                                          key={method}
                                          className="rounded-full bg-white px-2 py-1 text-xs text-slate-600"
                                        >
                                          {method.replace('_', ' ')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-slate-800">
                                      {cut.estimated_lbs[0]}-{cut.estimated_lbs[1]} lbs
                                    </div>
                                    <div className="text-sm text-emerald-700">${cut.price_per_lb}/lb</div>
                                    <div className="text-xs text-slate-500">
                                      ${cut.estimated_total[0]}-${cut.estimated_total[1]}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h4 className="mb-2 font-medium text-amber-900">Processing Notes</h4>
                  <ul className="space-y-1">
                    {(estimate.processing_notes || []).map((note) => (
                      <li key={note} className="flex items-start gap-2 text-sm text-amber-800">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-medium text-emerald-900">
                    Ready to place this order? Sign in or create an account, then add this recommendation to your cart.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => onOrderSignIn?.({ estimate, meatType, orderType })}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 font-semibold text-white transition-colors hover:bg-emerald-800"
                    >
                      Sign In To Order
                      <LogIn className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => onOrderCreateAccount?.({ estimate, meatType, orderType })}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-300 transition-colors hover:bg-emerald-100"
                    >
                      Create Account
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => onAddRecommendedToCart?.({ estimate, meatType, orderType })}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 font-semibold text-white transition-colors hover:bg-amber-700"
                  >
                    Add Recommended To Cart
                    <ShoppingCart className="h-4 w-4" />
                  </button>

                  {!onOrderSignIn && (
                    <button
                      onClick={() => onContactOrder?.(estimate)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-700 py-3 font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      Contact Us To Order
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cuts' && <CutGuide meatType={meatType} apiBaseUrl={apiBaseUrl} />}
        {activeTab === 'info' && <ProcessExplanation />}
      </div>
    </div>
  );
};

export default ButcherCutCalculator;
