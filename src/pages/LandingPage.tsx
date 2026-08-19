import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin, useGetIdentity } from "@refinedev/core";
import {
  Zap,
  ArrowRight,
  Sun,
  Moon,
  Camera,
  Layers,
  Calculator,
  BarChart3,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Cpu,
  TrendingDown,
  Clock,
  PlayCircle,
  Home,
  Building2,
  Leaf,
  Activity,
  Info,
  Sliders,
  Tv,
  Fan,
  Flame,
  Laptop,
  Lightbulb,
  Radio,
  ArrowUpRight,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: login } = useLogin();
  const { data: identity } = useGetIdentity<any>();

  // Theme Toggle State
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("powerforecast_theme");
    return saved ? saved === "dark" : true;
  });

  React.useEffect(() => {
    const theme = isDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    if (isDark) {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    localStorage.setItem("powerforecast_theme", theme);
  }, [isDark]);

  // Quick Estimator Demo State (Original Contents with Clean Icons)
  const applianceOptions = [
    { value: "1200", label: "Inverter Air Conditioner (1.5 HP)", watts: 1200, icon: <Activity className="w-4 h-4 text-cyan-400" /> },
    { value: "150", label: "Two-Door Refrigerator (24/7)", watts: 150, icon: <Radio className="w-4 h-4 text-indigo-400" /> },
    { value: "75", label: "Stand Electric Fan", watts: 75, icon: <Fan className="w-4 h-4 text-emerald-400" /> },
    { value: "120", label: "Smart LED Television 55″", watts: 120, icon: <Tv className="w-4 h-4 text-purple-400" /> },
    { value: "1800", label: "Induction Cooker", watts: 1800, icon: <Flame className="w-4 h-4 text-red-400" /> },
    { value: "65", label: "Laptop Computer", watts: 65, icon: <Laptop className="w-4 h-4 text-blue-400" /> },
    { value: "48", label: "LED Lighting Setup (x4)", watts: 48, icon: <Lightbulb className="w-4 h-4 text-amber-400" /> },
  ];

  const [selectedWatts, setSelectedWatts] = useState<number>(1200);
  const [estimatorHours, setEstimatorHours] = useState<number>(8);
  const [estimatorRate, setEstimatorRate] = useState<number>(12.15);

  const estimatorCalc = useMemo(() => {
    const dailyKwh = (selectedWatts * estimatorHours) / 1000;
    const monthlyKwh = dailyKwh * 30;
    const monthlyCost = monthlyKwh * (estimatorRate || 12.15);
    return {
      dailyKwh: dailyKwh.toFixed(2),
      monthlyKwh: monthlyKwh.toFixed(2),
      monthlyCost: monthlyCost.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  }, [selectedWatts, estimatorHours, estimatorRate]);

  const handleGuestDemo = () => {
    login(
      { isGuest: true },
      {
        onSuccess: () => navigate("/dashboard"),
      }
    );
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 relative overflow-x-hidden selection:bg-[#5c68db] selection:text-white ${
      isDark ? "bg-[#090a1f] text-slate-100" : "bg-[#f8fafc] text-slate-900"
    }`}>
      {/* Subtle Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {isDark ? (
          <>
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#5c68db]/12 rounded-full blur-[140px]" />
            <div className="absolute top-[35%] -right-40 w-[600px] h-[600px] bg-[#3b82f6]/8 rounded-full blur-[160px]" />
            <div className="absolute bottom-10 left-10 w-[600px] h-[600px] bg-[#4f46e5]/10 rounded-full blur-[160px]" />
          </>
        ) : (
          <>
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#5c68db]/8 rounded-full blur-[120px]" />
            <div className="absolute top-[35%] -right-40 w-[500px] h-[500px] bg-amber-400/5 rounded-full blur-[120px]" />
          </>
        )}
      </div>

      {/* 1. Sleek Navigation Bar */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-all ${
        isDark ? "bg-[#090a1f]/80 border-white/[0.08]" : "bg-white/85 border-slate-200/80 shadow-xs"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5c68db] to-[#434eb0] flex items-center justify-center text-white shadow-md shadow-[#5c68db]/20 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 fill-yellow-300 text-yellow-300" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1 leading-none">
                <span className={`text-base font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  power
                </span>
                <span className="text-base font-extrabold tracking-tight text-[#ffd54f]">
                  forecast
                </span>
              </div>
              <span className={`text-[9px] uppercase font-semibold tracking-wider font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Utility Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className={`hidden md:flex items-center gap-8 text-xs font-medium ${
            isDark ? "text-slate-300" : "text-slate-600"
          }`}>
            <a href="#features" className="hover:text-white transition-colors">
              Core Modules
            </a>
            <a href="#demo" className="hover:text-white transition-colors flex items-center gap-1.5">
              <span>Live Estimator</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </a>
            <a href="#impact" className="hover:text-white transition-colors">
              System Impact
            </a>
            <a href="#quality" className="hover:text-white transition-colors">
              Software Metrics
            </a>
            <Link to="/calculator" className="hover:text-white transition-colors flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-[#8183fc]" />
              <span>Bill Calculator</span>
            </Link>
          </nav>

          {/* Actions & Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Minimalist Theme Toggle */}
            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? "bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]"
                  : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {identity?.email ? (
              <Link
                to="/dashboard"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#5c68db] hover:bg-[#6c7ae0] text-white shadow-md shadow-[#5c68db]/20 transition-all flex items-center gap-1.5"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <button
                  onClick={handleGuestDemo}
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    isDark
                      ? "bg-white/[0.03] border-white/10 text-slate-300 hover:text-white hover:border-white/20"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <PlayCircle className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Instant Demo</span>
                </button>
                <Link
                  to="/login"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isDark ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  Log In
                </Link>
                <Link
                  to="/dashboard"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#5c68db] hover:bg-[#6c7ae0] text-white shadow-md shadow-[#5c68db]/25 transition-all flex items-center gap-1.5"
                >
                  <Zap className="w-3 h-3 fill-yellow-300 text-yellow-300" />
                  <span>Launch App</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 flex flex-col lg:flex-row items-center gap-12">
        {/* Left Hero Column */}
        <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6 border ${
            isDark ? "bg-white/[0.03] border-white/10 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px]">PowerForecast v2.5</span>
            <span className="text-slate-500">|</span>
            <span>Meralco ERC Tariff Modeling</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12]">
            Household Energy <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#8183fc] via-[#a2a5ff] to-[#ffd54f] bg-clip-text text-transparent">
              Intelligence & Forecasting
            </span>
          </h1>

          <p className={`mt-6 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed ${
            isDark ? "text-slate-300" : "text-slate-600"
          }`}>
            Identify household appliances, compute kilowatt-hour consumption, track live Meralco electricity rates, predict upcoming utility bills, and unlock actionable energy-saving recommendations.
          </p>

          <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3.5">
            <Link
              to="/calculator"
              className="px-6 py-3 rounded-xl text-sm font-bold bg-[#5c68db] hover:bg-[#6c7ae0] text-white flex items-center gap-2 shadow-lg shadow-[#5c68db]/25 transition-all"
            >
              <Calculator className="w-4 h-4" />
              <span>Open Power Calculator</span>
            </Link>
            <Link
              to="/signup"
              className={`px-6 py-3 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2 ${
                isDark
                  ? "bg-white/[0.03] border-white/10 text-slate-200 hover:text-white hover:border-white/25"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>

          {/* Stats Summary Bar */}
          <div className={`mt-12 grid grid-cols-3 gap-6 pt-8 border-t w-full max-w-lg text-left ${
            isDark ? "border-white/[0.08]" : "border-slate-200"
          }`}>
            <div>
              <div className={`text-2xl sm:text-3xl font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                7
              </div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                Core Modules
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#ffd54f] font-mono">
                ₱12.45
              </div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                Est. Rate / kWh
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                99.4%
              </div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                Precision
              </div>
            </div>
          </div>
        </div>

        {/* Right Hero Card Graphic (Live Consumption Preview) */}
        <div className="flex-1 w-full max-w-lg">
          <div className={`p-6 sm:p-7 rounded-2xl border shadow-xl backdrop-blur-xl space-y-5 ${
            isDark
              ? "bg-[#111338]/80 border-white/10 shadow-black/30"
              : "bg-white border-slate-200 shadow-slate-200/50"
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#5c68db]/15 flex items-center justify-center text-[#8183fc]">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Live Consumption Preview
                  </h3>
                  <p className="text-[11px] text-slate-400">Forecasted Bill vs Active Usage</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Normal Load
              </span>
            </div>

            {/* Meter Box */}
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                isDark ? "bg-[#0a0c24] border-white/[0.06]" : "bg-slate-50 border-slate-200"
              }`}>
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">
                    Estimated Monthly Electric Bill
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#ffd54f] font-mono">
                    ₱3,645.00
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center justify-end gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    -8.5% Efficiency
                  </span>
                  <span className="text-[10px] text-slate-400">vs last month</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-300">
                  <span className="text-slate-400">Monthly Target (300 kWh)</span>
                  <span className="font-mono font-semibold text-white">245 kWh</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden flex border border-white/[0.08]">
                  <div className="h-full bg-indigo-500" style={{ width: "50%" }} />
                  <div className="h-full bg-emerald-400" style={{ width: "25%" }} />
                  <div className="h-full bg-amber-400" style={{ width: "7%" }} />
                </div>
              </div>

              {/* Appliance Quick Snapshot */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className={`p-3 rounded-xl border text-left ${
                  isDark ? "bg-[#0e1030] border-white/[0.06]" : "bg-slate-50 border-slate-200"
                }`}>
                  <span className="text-[10px] text-slate-400 block">Highest Consumer</span>
                  <span className={`text-xs font-bold flex items-center gap-1.5 mt-0.5 ${isDark ? "text-white" : "text-slate-900"}`}>
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Aircon (1.5 HP)
                  </span>
                  <span className="text-[11px] text-[#8183fc] font-semibold block mt-1 font-mono">
                    ~1,200 W • ₱2,160/mo
                  </span>
                </div>
                <div className={`p-3 rounded-xl border text-left ${
                  isDark ? "bg-[#0e1030] border-white/[0.06]" : "bg-slate-50 border-slate-200"
                }`}>
                  <span className="text-[10px] text-slate-400 block">Baseline Load</span>
                  <span className={`text-xs font-bold flex items-center gap-1.5 mt-0.5 ${isDark ? "text-white" : "text-slate-900"}`}>
                    <Radio className="w-3.5 h-3.5 text-indigo-400" />
                    Refrigerator 24/7
                  </span>
                  <span className="text-[11px] text-[#8183fc] font-semibold block mt-1 font-mono">
                    ~150 W • ₱1,312/mo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live Quick Estimator Demo Section (Interactive Clean Card) */}
      <section id="demo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className={`p-6 sm:p-10 rounded-2xl border shadow-xl backdrop-blur-xl relative overflow-hidden ${
          isDark ? "bg-[#101238]/90 border-white/10" : "bg-white border-slate-200"
        }`}>
          <div className="max-w-3xl mx-auto text-center mb-8 space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#5c68db]/15 border border-[#5c68db]/30 text-[#a2a5ff] inline-flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-[#ffd54f]" />
              <span>Interactive Estimator</span>
            </span>
            <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              Quick Household Appliance Cost Estimator
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Pick an appliance and daily usage duration to instantly simulate monthly electricity costs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
            {/* Controls Column */}
            <div className="md:col-span-7 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Appliance
                </label>
                <select
                  value={selectedWatts}
                  onChange={(e) => setSelectedWatts(Number(e.target.value))}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium border focus:outline-none focus:ring-1 focus:ring-[#5c68db] ${
                    isDark ? "bg-[#0b0c26] border-white/10 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                >
                  {applianceOptions.map((opt) => (
                    <option key={opt.label} value={opt.watts}>
                      {opt.label} — {opt.watts} Watts
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Daily Usage Hours
                  </label>
                  <span className="text-xs font-bold text-[#ffd54f] font-mono">
                    {estimatorHours} Hours / Day
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={estimatorHours}
                  onChange={(e) => setEstimatorHours(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-[#5c68db]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span>1 Hour</span>
                  <span>12 Hours</span>
                  <span>24 Hours (Continuous)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Meralco Rate (PHP / kWh)
                  </label>
                  <span className="text-[11px] text-slate-400">Standard Residential Average</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold text-xs">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={estimatorRate}
                    onChange={(e) => setEstimatorRate(Number(e.target.value))}
                    className={`w-full rounded-xl pl-8 pr-4 py-2 text-xs sm:text-sm font-semibold border focus:outline-none focus:ring-1 focus:ring-[#5c68db] ${
                      isDark ? "bg-[#0b0c26] border-white/10 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Output Summary Card */}
            <div className={`md:col-span-5 p-6 rounded-xl border text-center flex flex-col justify-center space-y-4 ${
              isDark ? "bg-[#080920] border-white/10" : "bg-slate-50 border-slate-200"
            }`}>
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#a2a5ff]">
                Calculated Energy Expense
              </span>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#ffd54f] font-mono">
                  ₱{estimatorCalc.monthlyCost}
                </div>
                <span className="text-[11px] text-slate-400">Estimated Monthly Cost (30 Days)</span>
              </div>

              <div className="pt-3 border-t border-white/[0.08] grid grid-cols-2 gap-2 text-xs">
                <div className={`p-2.5 rounded-lg border ${
                  isDark ? "bg-[#0f1133] border-white/[0.06]" : "bg-white border-slate-200"
                }`}>
                  <span className="text-slate-400 block text-[10px]">Daily Energy</span>
                  <span className="font-bold text-sm font-mono text-white">{estimatorCalc.dailyKwh} kWh</span>
                </div>
                <div className={`p-2.5 rounded-lg border ${
                  isDark ? "bg-[#0f1133] border-white/[0.06]" : "bg-white border-slate-200"
                }`}>
                  <span className="text-slate-400 block text-[10px]">Monthly Energy</span>
                  <span className="font-bold text-sm font-mono text-white">{estimatorCalc.monthlyKwh} kWh</span>
                </div>
              </div>

              <Link
                to="/appliances"
                className="w-full py-2.5 rounded-lg bg-[#5c68db] hover:bg-[#6c7ae0] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <span>Configure Full Appliance Suite</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. System Core Modules (7 Modules - Minimalist Bento Grid) */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#5c68db]/15 border border-[#5c68db]/30 text-[#a2a5ff] inline-block">
            System Architecture
          </span>
          <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            7 Integrated Modules for Total Power Mastery
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Engineered specifically to empower Filipino households with automated consumption tracking and bill forecasting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Module 1: Appliance Recognition */}
          <ModuleCard
            number="01"
            title="Appliance Recognition"
            description="Upload photos of household devices. The Gemini multi-modal computer vision module automatically identifies appliance models and extracts wattage ratings from rating plates."
            tag="AI Multi-Modal"
            icon={<Camera className="w-5 h-5 text-amber-400" />}
            isDark={isDark}
          />

          {/* Module 2: Appliance Management */}
          <ModuleCard
            number="02"
            title="Appliance Management"
            description="Maintain a comprehensive inventory of your household devices. Track custom wattage ratings, operational duty cycles, quantity counts, and usage schedules in one central hub."
            tag="Full CRUD Inventory"
            icon={<Layers className="w-5 h-5 text-[#8183fc]" />}
            isDark={isDark}
          />

          {/* Module 3: Consumption Computation */}
          <ModuleCard
            number="03"
            title="Consumption Computation"
            description="Accurately compute total kilowatt-hours (kWh) consumed daily, weekly, and monthly based on device power specs and user-defined operational hours."
            tag="Real-Time Engine"
            icon={<Cpu className="w-5 h-5 text-emerald-400" />}
            isDark={isDark}
          />

          {/* Module 4: Cost Estimation */}
          <ModuleCard
            number="04"
            title="Electricity Cost Estimation"
            description="Evaluate utility expenses using live Meralco billing tiers, generation charges, distribution fees, system loss, subsidies, and value-added taxes (VAT)."
            tag="Unbundled Tariffs"
            icon={<Calculator className="w-5 h-5 text-sky-400" />}
            isDark={isDark}
          />

          {/* Module 5: Analytics & Visualization */}
          <ModuleCard
            number="05"
            title="Analytics & Visualization"
            description="Monitor power consumption patterns through dynamic interactive charts, 24-hour minute load curves, peak red alerts, and statistical load breakdowns."
            tag="Minute Telemetry"
            icon={<BarChart3 className="w-5 h-5 text-purple-400" />}
            isDark={isDark}
          />

          {/* Module 6: Electricity Bill Forecasting */}
          <ModuleCard
            number="06"
            title="Electricity Bill Forecasting"
            description="Predict upcoming monthly electric bills using historical usage trends, seasonal adjustments, and predictive load modeling to eliminate billing surprises."
            tag="Predictive Modeling"
            icon={<Sparkles className="w-5 h-5 text-rose-400" />}
            isDark={isDark}
          />

          {/* Module 7: Energy-Efficiency Recommendations (Wide Card) */}
          <div className={`p-6 sm:p-7 rounded-2xl border transition-all lg:col-span-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 ${
            isDark
              ? "bg-[#101238]/70 border-white/10 hover:border-white/20"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
          }`}>
            <div className="flex items-start gap-4 max-w-3xl">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Lightbulb className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                    Module 07
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-[10px] text-slate-400 font-medium">Actionable Insights</span>
                </div>
                <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Energy-Efficiency Recommendations
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Receive personalized suggestions to trim waste, minimize vampire load, adjust thermostat levels, and adopt cost-conscious electrical habits that directly shrink monthly utility bills.
                </p>
              </div>
            </div>
            <Link
              to="/calculator"
              className="px-5 py-2.5 rounded-xl bg-[#5c68db] hover:bg-[#6c7ae0] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5"
            >
              <span>View Recommendations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Stakeholders & System Impact (Minimalist Clean 4-Grid) */}
      <section id="impact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#5c68db]/15 border border-[#5c68db]/30 text-[#a2a5ff] inline-block">
            Ecosystem Value
          </span>
          <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            Empowering Every Stakeholder
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            PowerForecast addresses real-world energy concerns across households, engineers, utilities, and sustainability advocates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StakeholderCard
            icon={<Home className="w-5 h-5 text-indigo-400" />}
            title="Households & Consumers"
            description="Enables homeowners to make informed budgeting decisions, audit appliance energy consumption, and lower electricity bills effortlessly."
            isDark={isDark}
          />
          <StakeholderCard
            icon={<Cpu className="w-5 h-5 text-cyan-400" />}
            title="Developers & Analysts"
            description="Provides a foundation for smart home integrations, machine learning image classification, and consumer-facing predictive analytics."
            isDark={isDark}
          />
          <StakeholderCard
            icon={<Building2 className="w-5 h-5 text-amber-400" />}
            title="Utility Providers"
            description="Encourages customer energy awareness, peak-shaving practices, and collaborative energy efficiency initiatives across local distribution grids."
            isDark={isDark}
          />
          <StakeholderCard
            icon={<Leaf className="w-5 h-5 text-emerald-400" />}
            title="Environmental Advocates"
            description="Promotes sustainable power usage habits, curbs unnecessary electricity wastage, and supports carbon reduction goals in the Philippines."
            isDark={isDark}
          />
        </div>
      </section>

      {/* 6. Software Quality Verification (ISO Metrics Clean Tiles) */}
      <section id="quality" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className={`p-8 sm:p-10 rounded-2xl border space-y-8 ${
          isDark ? "bg-[#0e1030]/80 border-white/10" : "bg-white border-slate-200 shadow-xs"
        }`}>
          <div className="max-w-3xl space-y-1.5">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#5c68db]/15 border border-[#5c68db]/30 text-[#a2a5ff] inline-block mb-1">
              Quality Verification
            </span>
            <h2 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              Engineered to Standard Software Quality Metrics
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Evaluated according to ISO software quality frameworks to ensure superior performance and user trust.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricTile
              code="01"
              title="Functionality"
              text="Delivers precise end-to-end calculations, appliance tracking, and rate breakdowns tailored to Meralco standards."
              isDark={isDark}
            />
            <MetricTile
              code="02"
              title="Reliability"
              text="Consistently yields accurate power and billing estimations backed by verified utility mathematical formulas."
              isDark={isDark}
            />
            <MetricTile
              code="03"
              title="Usability"
              text="Features an intuitive dual-theme glassmorphic design accessible across desktop, tablet, and mobile browsers."
              isDark={isDark}
            />
            <MetricTile
              code="04"
              title="Efficiency"
              text="Instantaneous client-side state processing, zero calculation delay, and optimized resource delivery."
              isDark={isDark}
            />
          </div>

          {/* System Limitation Notice */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-300 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-amber-400">System Scope & Transparency Notice: </span>
              PowerForecast serves as a decision-support and household budgeting tool. Electricity consumption calculations are derived from estimated appliance wattage ratings, historical data, and user-input usage schedules, complementing official utility meters and Meralco statements.
            </div>
          </div>
        </div>
      </section>

      {/* 7. Minimalist Footer */}
      <footer className={`py-8 border-t text-xs transition-colors ${
        isDark ? "bg-[#07081a] border-white/[0.08] text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-[#5c68db] flex items-center justify-center text-white">
              <Zap className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
            </div>
            <div className="flex items-center gap-1 font-bold">
              <span className="text-white">power</span>
              <span className="text-[#ffd54f]">forecast</span>
            </div>
            <span className="text-slate-500">|</span>
            <span className="text-[11px] text-slate-400">© 2026 PowerForecast Engine</span>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <a href="#features" className="hover:text-white transition-colors">Core Modules</a>
            <a href="#demo" className="hover:text-white transition-colors">Live Estimator</a>
            <a href="#impact" className="hover:text-white transition-colors">System Impact</a>
            <Link to="/calculator" className="hover:text-white transition-colors">Bill Calculator</Link>
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Reusable Sub-components for Minimalist Consistency
const ModuleCard: React.FC<{
  number: string;
  title: string;
  description: string;
  tag: string;
  icon: React.ReactNode;
  isDark: boolean;
}> = ({ number, title, description, tag, icon, isDark }) => (
  <div className={`p-6 rounded-2xl border transition-all flex flex-col justify-between group ${
    isDark
      ? "bg-[#0e1030]/70 border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-[#5c68db]/5"
      : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
  }`}>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06]">
          MODULE {number}
        </span>
      </div>
      <h3 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
        {title}
      </h3>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
    <div className="mt-5 pt-3 border-t border-white/[0.06] text-[11px] font-medium text-slate-400 flex items-center justify-between">
      <span>{tag}</span>
      <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
    </div>
  </div>
);

const StakeholderCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  isDark: boolean;
}> = ({ icon, title, description, isDark }) => (
  <div className={`p-5 rounded-xl border space-y-2.5 ${
    isDark ? "bg-[#0e1030]/60 border-white/10" : "bg-white border-slate-200 shadow-xs"
  }`}>
    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center">
      {icon}
    </div>
    <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
      {title}
    </h3>
    <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
  </div>
);

const MetricTile: React.FC<{
  code: string;
  title: string;
  text: string;
  isDark: boolean;
}> = ({ code, title, text, isDark }) => (
  <div className={`p-4 rounded-xl border ${
    isDark ? "bg-[#07091f] border-white/[0.06]" : "bg-slate-50 border-slate-200"
  }`}>
    <div className="text-xs font-mono font-bold text-[#8183fc] mb-1">
      {code}. {title}
    </div>
    <p className="text-xs text-slate-400 leading-relaxed">{text}</p>
  </div>
);
