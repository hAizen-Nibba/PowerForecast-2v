import React, { useState, useEffect } from "react";
import { GlassCard } from "../common/GlassCard";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import {
  Zap,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Power,
  Sparkles,
  Database,
  Wind,
  Refrigerator,
  Tv,
  Fan,
  Shirt,
  Lightbulb,
  Clock,
  Coins,
} from "lucide-react";
import { UserAppliance } from "../../types";
import { useList, useDelete, useUpdate } from "@refinedev/core";
import { ApplianceModal } from "./ApplianceModal";
import { PelpCatalogModal } from "./PelpCatalogModal";
import { devLog } from "../../lib/devLogger";

interface ApplianceListProps {
  onOpenAiScanner?: () => void;
}

export const ApplianceList: React.FC<ApplianceListProps> = ({ onOpenAiScanner }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPelpModalOpen, setIsPelpModalOpen] = useState(false);
  const [applianceToEdit, setApplianceToEdit] = useState<UserAppliance | null>(null);

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const { mutate: deleteAppliance } = useDelete();
  const { mutate: updateAppliance } = useUpdate();

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const isLoading = appliancesRes?.isLoading;

  // Global live 1-second ticker for synchronized real-time counters
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredAppliances = appliances.filter((app: UserAppliance) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.brand && app.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.model && app.model.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "all" || app.category.toLowerCase().includes(selectedCategory.toLowerCase());

    const matchesRoom =
      selectedRoom === "all" || (app.room_location && app.room_location.toLowerCase() === selectedRoom.toLowerCase());

    return matchesSearch && matchesCategory && matchesRoom;
  });

  const togglePower = (app: UserAppliance) => {
    const newState = !app.is_currently_on;
    const nowIso = newState ? new Date().toISOString() : null;

    devLog.telemetry("Telemetry", `Circuit switched ${newState ? "⚡ [ACTIVE ON]" : "⚪ [STANDBY OFF]"}: "${app.name}" (${app.watts}W @ 230V)`, {
      applianceId: app.id,
      name: app.name,
      category: app.category,
      watts: app.watts,
      is_currently_on: newState,
      last_turned_on_at: nowIso,
      ratePerHourPHP: ((app.watts * (app.quantity || 1) / 1000) * 14.8261).toFixed(2),
    });

    updateAppliance({
      resource: "user_appliances",
      id: app.id,
      values: {
        is_currently_on: newState,
        last_turned_on_at: nowIso,
      },
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Remove "${name}" from your appliance list?`)) {
      devLog.warn("Storage", `Appliance deleted from inventory: "${name}"`, { id });
      deleteAppliance({
        resource: "user_appliances",
        id,
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "air conditioners":
        return <Wind className="w-4 h-4 text-[#8183fc]" />;
      case "refrigerators & freezers":
        return <Refrigerator className="w-4 h-4 text-[#8183fc]" />;
      case "television sets":
        return <Tv className="w-4 h-4 text-[#8183fc]" />;
      case "electric fans":
        return <Fan className="w-4 h-4 text-[#8183fc]" />;
      case "washing machines":
        return <Shirt className="w-4 h-4 text-[#8183fc]" />;
      default:
        return <Lightbulb className="w-4 h-4 text-[#8183fc]" />;
    }
  };

  // Precise real-time runtime duration
  const getRunningDuration = (turnedOnAt?: string | null) => {
    if (!turnedOnAt) return "00:00:00";
    const start = new Date(turnedOnAt).getTime();
    const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
    const hrs = String(Math.floor(diffSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(diffSeconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  // Precise real-time accumulated Pesos spent since turned on
  const getAccumulatedPesos = (app: UserAppliance) => {
    if (!app.is_currently_on || !app.last_turned_on_at) return 0;
    const start = new Date(app.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const totalWatts = app.watts * (app.quantity || 1);
    const accumulatedKwh = (totalWatts / 1000) * (diffSeconds / 3600);
    return accumulatedKwh * 14.8261;
  };

  // Combined totals for active running devices
  const runningAppliances = appliances.filter((a) => a.is_currently_on);
  const totalActiveWatts = runningAppliances.reduce((acc, curr) => acc + curr.watts * (curr.quantity || 1), 0);
  const totalActiveHourlyRate = (totalActiveWatts / 1000) * 14.8261;
  const totalActiveAccumulatedCost = runningAppliances.reduce((acc, curr) => acc + getAccumulatedPesos(curr), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black t-primary tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#5c68db] text-white shadow-md shadow-[#5c68db]/20">
              <Zap className="w-5 h-5" />
            </div>
            Appliance Inventory & Live Telemetry
          </h2>
          <p className="text-xs sm:text-sm t-muted mt-0.5">
            Real-time wattage telemetry, live operating stopwatch, and live accumulated Peso counters
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPelpModalOpen(true)}
            icon={<Database className="w-3.5 h-3.5 text-[#8183fc]" />}
          >
            PELP Database
          </Button>

          {onOpenAiScanner && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenAiScanner}
              icon={<Sparkles className="w-3.5 h-3.5 text-yellow-400" />}
            >
              AI Scanner
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setApplianceToEdit(null);
              setIsAddModalOpen(true);
            }}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Appliance
          </Button>
        </div>
      </div>

      {/* Real-time Telemetry Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl pf-input flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold t-accent uppercase tracking-wider block">
              Active Circuits
            </span>
            <div className="text-2xl font-black t-primary mt-0.5 flex items-center gap-2 font-mono">
              <span className={`w-2.5 h-2.5 rounded-full ${runningAppliances.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
              {runningAppliances.length} <span className="text-xs font-normal t-muted font-sans">of {appliances.length} ON</span>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-500 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-mono">
            {totalActiveWatts} W Live
          </span>
        </div>

        <div className="p-4 rounded-2xl pf-input flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold t-accent uppercase tracking-wider block">
              Live Hourly Rate
            </span>
            <div className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-0.5 font-mono">
              ₱{totalActiveHourlyRate.toFixed(2)}<span className="text-xs font-normal t-muted font-sans">/hr</span>
            </div>
          </div>
          <span className="text-xs font-bold t-accent bg-[#5c68db]/15 px-2.5 py-1 rounded-lg border border-[#5c68db]/25 font-mono">
            ₱14.82/kWh
          </span>
        </div>

        <div className="p-4 rounded-2xl pf-input flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold t-accent uppercase tracking-wider block">
              Live Session Spent (Accumulated)
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
              ₱{totalActiveAccumulatedCost.toFixed(4)}
            </div>
          </div>
          <Coins className="w-6 h-6 text-yellow-400" />
        </div>
      </div>

      {/* Filter Toolbar */}
      <GlassCard className="space-y-3 p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 t-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by appliance name, brand, or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pf-input rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#8183fc]" />
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="pf-input rounded-xl px-3 py-2 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">All Rooms</option>
              <option value="Living Room">Living Room</option>
              <option value="Master Bedroom">Master Bedroom</option>
              <option value="Kitchen">Kitchen</option>
              <option value="Laundry Area">Laundry Area</option>
              <option value="Home Office">Home Office</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1 border-t pf-divider">
          {["all", "Air Conditioners", "Refrigerators & Freezers", "Television Sets", "Electric Fans", "Washing Machines", "Lighting Products"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#5c68db] text-white shadow-xs"
                  : "btn-secondary"
              }`}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Appliance Table with Live Timer & Live Peso Counter Columns */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs t-secondary">
            <thead className="bg-[#5c68db]/10 text-[11px] uppercase tracking-wider t-accent border-b pf-divider">
              <tr>
                <th className="py-3.5 px-4 font-bold">Appliance</th>
                <th className="py-3.5 px-4 font-bold">Room</th>
                <th className="py-3.5 px-4 font-bold">Power</th>
                <th className="py-3.5 px-4 font-bold">Live Time ON</th>
                <th className="py-3.5 px-4 font-bold">Live Accumulated Cost</th>
                <th className="py-3.5 px-4 font-bold">Hourly Rate</th>
                <th className="py-3.5 px-4 font-bold">Est. Month</th>
                <th className="py-3.5 px-4 font-bold text-center">Circuit</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y pf-divider">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center t-muted">
                    Loading appliance registry...
                  </td>
                </tr>
              ) : filteredAppliances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center t-muted">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Zap className="w-6 h-6 text-yellow-400 mx-auto" />
                      <p className="text-xs font-bold t-primary">No Appliances Found</p>
                      <p className="text-xs t-muted">Add an appliance manually or import verified specs from the PELP catalog.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAppliances.map((app: UserAppliance) => {
                  const isOn = app.is_currently_on;
                  const totalWatts = app.watts * (app.quantity || 1);
                  const hourlyRate = (totalWatts / 1000) * 14.8261;
                  const liveSpent = getAccumulatedPesos(app);
                  const monthlyKwh = Number(app.monthly_kwh) || ((totalWatts * app.hours_per_day * app.days_per_month) / 1000);
                  const monthlyCost = monthlyKwh * 14.8261;

                  return (
                    <tr
                      key={app.id}
                      className={`transition-colors ${isOn ? "bg-emerald-500/10" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
                    >
                      {/* Appliance Name & Brand */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl border ${isOn ? "bg-emerald-500/20 border-emerald-500/40" : "bg-[#5c68db]/15 border-[#5c68db]/25"}`}>
                            {getCategoryIcon(app.category)}
                          </div>
                          <div>
                            <div className="font-bold t-primary flex items-center gap-1.5">
                              <span>{app.name}</span>
                              {app.source === "ai_vision" && (
                                <Badge variant="primary" size="sm">
                                  <Sparkles className="w-2.5 h-2.5" /> AI
                                </Badge>
                              )}
                              {app.source === "pelp_db" && (
                                <Badge variant="emerald" size="sm">
                                  PELP
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] t-muted">
                              {app.brand ? `${app.brand} • ` : ""}
                              {app.model || app.category}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Room */}
                      <td className="py-3.5 px-4 text-xs t-secondary font-medium">
                        {app.room_location || "General"}
                      </td>

                      {/* Power Rating & Quantity */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold t-primary">
                          {totalWatts} W
                        </div>
                        {app.quantity > 1 && (
                          <span className="text-[10px] t-muted">
                            ({app.watts}W x {app.quantity})
                          </span>
                        )}
                      </td>

                      {/* Live Running Stopwatch Column */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {isOn ? (
                          <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 animate-spin" />
                            {getRunningDuration(app.last_turned_on_at)}
                          </span>
                        ) : (
                          <span className="t-muted font-sans text-xs">--:--:--</span>
                        )}
                      </td>

                      {/* Live Accumulated Peso Spent Column */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {isOn ? (
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            ₱{liveSpent.toFixed(4)}
                          </span>
                        ) : (
                          <span className="t-muted text-xs font-sans">₱0.00</span>
                        )}
                      </td>

                      {/* Hourly Rate */}
                      <td className="py-3.5 px-4 font-mono text-amber-500 dark:text-amber-400 font-bold">
                        ₱{hourlyRate.toFixed(2)}/hr
                      </td>

                      {/* Monthly Estimate */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold t-primary">
                          ₱{monthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] t-muted font-medium">
                          {monthlyKwh.toFixed(1)} kWh/mo
                        </span>
                      </td>

                      {/* Circuit Switch Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => togglePower(app)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            isOn
                              ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40"
                              : "btn-secondary"
                          }`}
                          title={isOn ? "Active circuit (Click to turn off)" : "Standby circuit (Click to turn on)"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* Edit / Delete Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setApplianceToEdit(app);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg btn-secondary text-slate-400 hover:text-white"
                            title="Edit specs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(app.id, app.name)}
                            className="p-1.5 rounded-lg btn-secondary text-slate-400 hover:text-red-400"
                            title="Remove appliance"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <ApplianceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        applianceToEdit={applianceToEdit}
      />

      <PelpCatalogModal
        isOpen={isPelpModalOpen}
        onClose={() => setIsPelpModalOpen(false)}
      />
    </div>
  );
};
