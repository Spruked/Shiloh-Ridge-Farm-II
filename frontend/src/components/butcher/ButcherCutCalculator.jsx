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

// Live weight is always the weight of the WHOLE animal; a half order is half of it.
const weightPresets = {
  hog: [250, 275, 300],
  lamb: [100, 120, 140]
};
const typicalWeight = { hog: 275, lamb: 120 };
const MIN_WEIGHT = 20;
const MAX_WEIGHT = 1500;
const range = (pair) => (pair ? `${pair[0]} - ${pair[1]}` : '');
const money = (pair) =>
  pair ? `$${Math.round(pair[0]).toLocaleString()} - $${Math.round(pair[1]).toLocaleString()}` : '';

const toTitle = (value = '') =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const ProcessExplanation = ({ meatType }) => {
  const yields = {
    hog: { dressing: 72, takehome: 78 },
    lamb: { dressing: 52, takehome: 76 }
  }[meatType];
  const overall = Math.round((yields.dressing * yields.takehome) / 100);
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
        <h4 className="mb-3 font-semibold text-amber-900">
          Typical {meatType === 'hog' ? 'Hog' : 'Lamb'} Yield Percentages
        </h4>
        <div className="grid grid-cols-3 gap-4">
          {[
            [yields.dressing, 'Hanging (of live)'],
            [yields.takehome, 'Take-home (of hanging)'],
            [overall, 'Take-home (of live)']
          ].map(([value, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-amber-800">{value}%</div>
              <div className="text-xs uppercase tracking-wide text-amber-800">{label}</div>
            </div>
          ))}
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
                  Est. {range(cut.estimated_lbs)} lbs
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
  const [error, setError] = useState('');
  const [expandedPrimal, setExpandedPrimal] = useState(null);
  const [activeTab, setActiveTab] = useState('calculator');

  const weightValue = liveWeight === '' ? null : Number(liveWeight);
  const weightInvalid =
    weightValue !== null && (!Number.isFinite(weightValue) || weightValue < MIN_WEIGHT || weightValue > MAX_WEIGHT);

  // Any change to the inputs makes the shown estimate stale, so clear it.
  const changeInput = (setter) => (value) => {
    setter(value);
    setEstimate(null);
    setError('');
    setExpandedPrimal(null);
  };

  const calculateEstimate = async () => {
    if (weightInvalid) {
      setError(`Enter a live weight between ${MIN_WEIGHT} and ${MAX_WEIGHT} lbs, or leave it blank for a typical animal.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${apiBaseUrl}/butcher/calculate`, {
        meat_type: meatType,
        order_type: orderType,
        live_weight: weightValue
      });
      setEstimate(response.data.estimate);
      setExpandedPrimal(0);
    } catch (err) {
      console.error('Calculation error:', err);
      setEstimate(null);
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : 'The calculator is unavailable right now. Please try again, or contact the farm.'
      );
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
      <div className="bg-gradient-to-r from-amber-700 to-orange-700 p-6 text-white">
        <h2 className="flex items-center gap-3 text-2xl font-bold">
          <Scale className="h-7 w-7" />
          Meat Calculator
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
                    onClick={() => changeInput(setMeatType)(meat.id)}
                    aria-pressed={meatType === meat.id}
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
                    onClick={() => changeInput(setOrderType)(type)}
                    aria-pressed={orderType === type}
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
              <label htmlFor="calc-live-weight" className="mb-1 block text-sm font-medium text-slate-700">
                Live weight of the whole animal (optional)
              </label>
              <p className="mb-3 text-xs text-slate-600">
                A half order is half of this animal. Leave blank to use a typical {meatType === 'hog' ? 'hog' : 'lamb'}.
              </p>
              <div className="mb-3 flex gap-3">
                <input
                  id="calc-live-weight"
                  type="number"
                  inputMode="decimal"
                  min={MIN_WEIGHT}
                  max={MAX_WEIGHT}
                  value={liveWeight}
                  onChange={(event) => changeInput(setLiveWeight)(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && calculateEstimate()}
                  aria-invalid={weightInvalid}
                  placeholder={`Typical: ${typicalWeight[meatType]} lbs`}
                  className={`flex-1 rounded-lg border bg-slate-50 px-4 py-3 ${
                    weightInvalid ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                <span className="flex items-center px-3 text-sm font-medium text-slate-600">lbs</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="py-1 text-xs text-slate-500">Quick select:</span>
                {weightPresets[meatType].map((weight) => (
                  <button
                    key={weight}
                    onClick={() => changeInput(setLiveWeight)(weight.toString())}
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-700 py-4 font-semibold text-white transition-colors hover:bg-amber-800 disabled:bg-slate-300"
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

            {error && (
              <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {estimate && (
              <div className="animate-in fade-in slide-in-from-bottom-4 mt-8 space-y-6 duration-500">
                <div className="rounded-xl bg-slate-50 p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
                    <Scale className="h-5 w-5 text-amber-600" />
                    Weight Breakdown
                  </h3>
                  <p className="mb-3 text-xs text-slate-600">
                    {estimate.weight_basis === 'entered'
                      ? `Based on your ${estimate.animal_live_weight} lb animal`
                      : `Based on a typical ${estimate.animal_live_weight} lb animal`}
                    {estimate.order_type === 'half' ? ', half order.' : ', whole order.'} Weights in lbs.
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-slate-800">{estimate.live_weight}</div>
                      <div className="text-xs uppercase tracking-wide text-slate-600">
                        Live {estimate.order_type === 'half' ? '(half)' : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-600">
                        {range(estimate.hanging_weight)}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">Hanging</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">
                        {range(estimate.finished_weight)}
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
                    {money(estimate.total_estimated_cost)}
                  </div>
                  <p className="mt-1 text-sm text-emerald-800">
                    Hanging weight x ${estimate.hanging_price_per_lb}/lb + ${estimate.processing_cost} processing.
                    About ${estimate.cost_per_finished_lb[0]}-${estimate.cost_per_finished_lb[1]} per take-home lb.
                    Plan roughly {estimate.freezer_cubic_feet[0]}-{estimate.freezer_cubic_feet[1]} cubic feet of freezer space.
                  </p>
                  {estimate.market?.source && (
                    <p className="mt-2 text-xs text-emerald-900">
                      {estimate.market.live ? 'Live market' : 'Last known market'}: {estimate.market.source} $
                      {estimate.market.market_price}/cwt vs {estimate.market.reference} reference. Farm prices adjusted{' '}
                      {estimate.market.factor >= 1 ? '+' : ''}
                      {Math.round((estimate.market.factor - 1) * 100)}%
                      {estimate.market.capped ? ' (limit reached)' : ''} from base ${estimate.base_hanging_price_per_lb}/lb.
                    </p>
                  )}
                  {estimate.market && !estimate.market.source && (
                    <p className="mt-2 text-xs text-emerald-900">{estimate.market.note}</p>
                  )}
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
                          aria-expanded={expandedPrimal === index}
                          className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-slate-800">{primal.name}</span>
                            <span className="text-sm text-slate-500">
                              {range(primal.estimated_lbs)} lbs
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
                                          {method.split('_').join(' ')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-slate-800">
                                      {range(cut.estimated_lbs)} lbs
                                    </div>
                                    <div className="text-sm text-emerald-800">${cut.price_per_lb}/lb</div>
                                    <div className="text-xs text-slate-500">
                                      {money(cut.estimated_total)} value
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
        {activeTab === 'info' && <ProcessExplanation meatType={meatType} />}
      </div>
    </div>
  );
};

export default ButcherCutCalculator;
