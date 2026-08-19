import React, { useState, useMemo, useEffect } from "react";
import { calculateMeralcoBill, DEFAULT_MERALCO_RATES } from "../../lib/meralcoCalculator";
import { devLog } from "../../lib/devLogger";
import {
  Calculator as CalcIcon,
  Zap,
  RotateCcw,
  Sliders,
  Printer,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Flame,
} from "lucide-react";

export const MeralcoCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"bill" | "appliance">("bill");
  const [kwh, setKwh] = useState<number>(320);
  const [genRate, setGenRate] = useState<number>(DEFAULT_MERALCO_RATES.defaultGenerationRate);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [isSenior, setIsSenior] = useState<boolean>(false);
  const [showItemized, setShowItemized] = useState<boolean>(true);

  // What-If Simulation State
  const [simWatts, setSimWatts] = useState<number>(950);
  const [simHoursReduced, setSimHoursReduced] = useState<number>(2);

  const bill = useMemo(() => {
    return calculateMeralcoBill(kwh, genRate, otherCharges, isSenior);
  }, [kwh, genRate, otherCharges, isSenior]);

  useEffect(() => {
    devLog.telemetry("Calculator", `Unbundled bill calculated for ${kwh} kWh: ₱${bill.totalBill.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Effective: ₱${bill.effectiveRatePerKwh.toFixed(4)}/kWh)`, {
      volumeKwh: kwh,
      effectiveRate: bill.effectiveRatePerKwh,
      totalBillPHP: bill.totalBill,
      isLifelineEligible: bill.isLifelineEligible,
      isSeniorCitizen: isSenior,
      generationTotal: bill.generationTotal,
      distributionTotal: bill.distributionTotal,
      taxesTotal: bill.totalTaxesAndSubsidies,
    });
  }, [kwh, genRate, otherCharges, isSenior, bill]);

  const simMonthlyKwhSaved = (simWatts * simHoursReduced * 30) / 1000;
  const simMonthlyPesosSaved = simMonthlyKwhSaved * (bill.effectiveRatePerKwh || 14.82);

  const genPct = bill.totalBill > 0 ? (bill.generationTotal / bill.totalBill) * 100 : 0;
  const transPct = bill.totalBill > 0 ? (bill.transmissionTotal / bill.totalBill) * 100 : 0;
  const sysLossPct = bill.totalBill > 0 ? (bill.systemLossTotal / bill.totalBill) * 100 : 0;
  const distPct = bill.totalBill > 0 ? (bill.distributionTotal / bill.totalBill) * 100 : 0;
  const taxPct = bill.totalBill > 0 ? (bill.totalTaxesAndSubsidies / bill.totalBill) * 100 : 0;

  const handleReset = () => {
    setKwh(320);
    setGenRate(DEFAULT_MERALCO_RATES.defaultGenerationRate);
    setOtherCharges(0);
    setIsSenior(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black t-primary tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#5c68db] text-white shadow-md shadow-[#5c68db]/20">
              <CalcIcon className="w-5 h-5" />
            </div>
            Interactive Bill Calculator
          </h2>
          <p className="text-xs sm:text-sm t-muted mt-0.5">
            Configure monthly electricity parameters to inspect real-time itemized cost breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold btn-secondary flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Inputs</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold btn-secondary flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Breakdown</span>
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl glass-card max-w-md">
        <button
          onClick={() => setActiveTab("bill")}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "bill"
              ? "bg-[#5c68db] text-white shadow-md shadow-[#5c68db]/30"
              : "t-secondary hover:t-primary"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Bill Parameters</span>
        </button>
        <button
          onClick={() => setActiveTab("appliance")}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "appliance"
              ? "bg-[#5c68db] text-white shadow-md shadow-[#5c68db]/30"
              : "t-secondary hover:t-primary"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Appliance Energy Estimator</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Inputs */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b pf-divider">
              <div>
                <h3 className="text-sm font-bold t-primary">Bill Parameters</h3>
                <p className="text-[11px] t-muted">Configure your consumption metrics below.</p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#5c68db]/15 text-[#8183fc] px-2 py-0.5 rounded border border-[#5c68db]/25">
                ERC TARIFFS
              </span>
            </div>

            {/* Base Generation Charge Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold t-secondary">Base Generation Charge</label>
                <span className="text-[11px] t-muted font-medium">PHP / kWh</span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold t-muted">₱</span>
                <input
                  type="number"
                  step="0.0001"
                  value={genRate}
                  onChange={(e) => setGenRate(Number(e.target.value) || 0)}
                  className="w-full pf-input rounded-xl pl-8 pr-4 py-2 text-xs sm:text-sm font-bold font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => setGenRate(9.2504)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                    genRate === 9.2504
                      ? "bg-[#5c68db] text-white border-transparent"
                      : "btn-secondary text-[10px]"
                  }`}
                >
                  Current (₱9.25)
                </button>
                <button
                  onClick={() => setGenRate(8.91)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                    genRate === 8.91
                      ? "bg-[#5c68db] text-white border-transparent"
                      : "btn-secondary text-[10px]"
                  }`}
                >
                  Low (₱8.91)
                </button>
                <button
                  onClick={() => setGenRate(9.85)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                    genRate === 9.85
                      ? "bg-[#5c68db] text-white border-transparent"
                      : "btn-secondary text-[10px]"
                  }`}
                >
                  Peak (₱9.85)
                </button>
              </div>
            </div>

            {/* Other Charges / Bill Deposit */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold t-secondary">Other Charges / Bill Deposit</label>
                <span className="text-[11px] t-muted font-medium">PHP</span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold t-muted">₱</span>
                <input
                  type="number"
                  step="0.01"
                  value={otherCharges}
                  onChange={(e) => setOtherCharges(Number(e.target.value) || 0)}
                  className="w-full pf-input rounded-xl pl-8 pr-4 py-2 text-xs sm:text-sm font-bold font-mono"
                />
              </div>
              <p className="text-[10px] t-muted">Enter extra charges (e.g. ₱87.02 for deposits, or ₱0.00).</p>
            </div>

            {/* Monthly Consumption Slider & Presets */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold t-secondary">
                  Monthly Consumption
                </label>
                <div className="flex items-center gap-1 pf-input px-2.5 py-1 rounded-lg">
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    value={kwh}
                    onChange={(e) => setKwh(Number(e.target.value) || 0)}
                    className="w-16 bg-transparent text-right font-black t-primary text-sm focus:outline-none font-mono"
                  />
                  <span className="text-xs t-accent font-bold">kWh</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="1000"
                step="5"
                value={kwh}
                onChange={(e) => setKwh(Number(e.target.value))}
                className="w-full h-2 bg-slate-600/40 rounded-lg appearance-none cursor-pointer accent-[#5c68db]"
              />

              <div className="flex justify-between text-[10px] t-muted font-mono">
                <span>0 kWh (Lifeline)</span>
                <span>200 kWh</span>
                <span>500 kWh</span>
                <span>1000+ kWh</span>
              </div>

              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider t-muted block mb-1.5">
                  Quick Presets (kWh)
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[100, 200, 300, 500].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setKwh(preset)}
                      className={`py-1 rounded-lg text-xs font-bold font-mono border transition-all ${
                        kwh === preset
                          ? "bg-[#5c68db] text-white border-transparent"
                          : "btn-secondary"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Senior Citizen Discount Toggle */}
            <div className="p-3.5 rounded-xl pf-input flex items-center justify-between text-xs pt-3">
              <div>
                <span className="font-bold t-primary block">Senior Citizen 5% Discount</span>
                <span className="text-[10px] t-muted block">Applies to residential usage ≤ 100 kWh</span>
              </div>
              <input
                type="checkbox"
                checked={isSenior}
                onChange={(e) => setIsSenior(e.target.checked)}
                className="w-4 h-4 rounded text-[#5c68db] focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          {/* What-If Energy Savings Simulator Card */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b pf-divider">
              <div>
                <h3 className="text-sm font-bold t-primary flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Energy Savings Estimator
                </h3>
                <p className="text-[11px] t-muted">Simulate cost reduction by curbing appliance run hours</p>
              </div>
              <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/25 text-amber-400 px-2 py-0.5 rounded uppercase">
                Simulator
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold t-secondary block mb-1">Appliance Watts</label>
                <input
                  type="number"
                  value={simWatts}
                  onChange={(e) => setSimWatts(Number(e.target.value) || 0)}
                  className="w-full pf-input rounded-xl px-3 py-2 text-xs font-bold font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold t-secondary block mb-1">Hours Cut / Day</label>
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={simHoursReduced}
                  onChange={(e) => setSimHoursReduced(Number(e.target.value) || 0)}
                  className="w-full pf-input rounded-xl px-3 py-2 text-xs font-bold font-mono"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold block">
                  Monthly Savings
                </span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  ₱{simMonthlyPesosSaved.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] t-muted block">Volume Saved</span>
                <span className="text-xs font-bold t-primary font-mono">
                  {simMonthlyKwhSaved.toFixed(1)} kWh/mo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Outputs & Itemized Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          {/* Total Amount Due (Glow Card) */}
          <div className="glow-card rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-2 relative overflow-hidden">
            <span className="text-xs font-bold uppercase tracking-widest t-muted">
              TOTAL AMOUNT DUE
            </span>
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight t-primary font-mono flex items-baseline justify-center">
              <span className="text-2xl sm:text-3xl t-accent mr-1.5 font-bold">₱</span>
              <span>
                {bill.totalBill.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs t-muted font-medium pt-1">
              <span>Energy Cost: ₱{bill.generationTotal.toFixed(2)}</span>
              <span>•</span>
              <span>Other Fees: ₱{(bill.totalBill - bill.generationTotal).toFixed(2)}</span>
            </div>

            <div className="text-xs font-semibold t-muted pt-1">
              Calculated for <span className="t-primary font-bold">{kwh}</span> kWh
              <span className="ml-2 t-accent font-mono">
                (Effective: ₱{bill.effectiveRatePerKwh.toFixed(4)}/kWh)
              </span>
            </div>
          </div>

          {/* Cost Breakdown & Stacked Bar */}
          <div className="glass-card p-6 rounded-2xl space-y-5">
            <div>
              <h3 className="text-base font-bold t-primary">Charge Components Breakdown</h3>
              <p className="text-xs t-muted">
                See how your bill components sum up dynamically based on your rates.
              </p>
            </div>

            {/* Stacked Cost Distribution Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium t-muted">
                <span>Cost Share Distribution</span>
                <span>Total: 100%</span>
              </div>
              <div className="h-3.5 w-full rounded-full flex overflow-hidden pf-input p-0.5">
                <div style={{ width: `${genPct}%` }} className="bg-[#6c7ae0] h-full rounded-l-full transition-all duration-300" title={`Generation: ${genPct.toFixed(1)}%`} />
                <div style={{ width: `${transPct}%` }} className="bg-[#00d2d3] h-full transition-all duration-300" title={`Transmission: ${transPct.toFixed(1)}%`} />
                <div style={{ width: `${distPct}%` }} className="bg-[#10b981] h-full transition-all duration-300" title={`Distribution: ${distPct.toFixed(1)}%`} />
                <div style={{ width: `${taxPct}%` }} className="bg-[#ff4757] h-full rounded-r-full transition-all duration-300" title={`Taxes & VAT: ${taxPct.toFixed(1)}%`} />
              </div>

              {/* Legend Row */}
              <div className="flex flex-wrap items-center gap-4 text-[11px] t-muted pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6c7ae0]" />
                  Generation ({genPct.toFixed(0)}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00d2d3]" />
                  Transmission ({transPct.toFixed(0)}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  Distribution ({distPct.toFixed(0)}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff4757]" />
                  Taxes & VAT ({taxPct.toFixed(0)}%)
                </span>
              </div>
            </div>

            {/* Official Itemized Tariff Receipt */}
            <div className="pt-2 border-t pf-divider space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider t-secondary">
                  Official Itemized Tariff Receipt
                </span>
                <button
                  onClick={() => setShowItemized(!showItemized)}
                  className="t-accent text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>{showItemized ? "Hide" : "Show"}</span>
                  {showItemized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showItemized && (
                <div className="space-y-2 text-xs divide-y pf-divider">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="t-secondary">1. Generation Charge (Power Supply)</span>
                    <span className="font-mono font-bold t-primary">
                      ₱{bill.generationTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="t-secondary">2. Transmission Charge (Grid Delivery)</span>
                    <span className="font-mono font-bold t-primary">
                      ₱{bill.transmissionTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="t-secondary">3. System Loss Charge</span>
                    <span className="font-mono font-bold t-primary">
                      ₱{bill.systemLossTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="t-secondary">4. Distribution Charge (Supply, Metering, Lines)</span>
                    <span className="font-mono font-bold t-primary">
                      ₱{bill.distributionTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="t-secondary">5. Universal Charges & FIT-All</span>
                    <span className="font-mono font-bold t-primary">
                      ₱{((bill.universalCharges?.total || 0) + (bill.fitAll || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="t-secondary">6. Government Taxes (12% VAT + Local Franchise)</span>
                    <span className="font-mono font-bold t-primary">
                      ₱{bill.totalTaxesAndSubsidies.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
