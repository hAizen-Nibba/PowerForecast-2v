import React, { useState, useEffect } from "react";
import { GlassCard } from "../common/GlassCard";
import { Button } from "../common/Button";
import {
  Power,
  Zap,
  Wind,
  Refrigerator,
  Tv,
  Fan,
  Shirt,
  Lightbulb,
  Plus,
  Clock,
} from "lucide-react";
import { UserAppliance } from "../../types";
import { useUpdate, useList } from "@refinedev/core";
import { devLog } from "../../lib/devLogger";

interface LivePowerBoardProps {
  onOpenAddModal: () => void;
}

export const LivePowerBoard: React.FC<LivePowerBoardProps> = ({ onOpenAddModal }) => {
  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const { mutate: updateAppliance } = useUpdate();
  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

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

  const togglePower = (app: UserAppliance) => {
    const newState = !app.is_currently_on;
    const nowIso = newState ? new Date().toISOString() : null;

    devLog.telemetry("Telemetry", `Circuit switched ${newState ? "⚡ [ACTIVE ON]" : "⚪ [STANDBY OFF]"}: "${app.name}" (${app.watts}W @ 230V)`, {
      applianceId: app.id,
      name: app.name,
      category: app.category,
      watts: app.watts,
      quantity: app.quantity || 1,
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

  const getRunningDuration = (turnedOnAt?: string | null) => {
    if (!turnedOnAt) return "00:00:00";
    const start = new Date(turnedOnAt).getTime();
    const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
    const hrs = String(Math.floor(diffSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(diffSeconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const getAccumulatedPesos = (app: UserAppliance) => {
    if (!app.is_currently_on || !app.last_turned_on_at) return 0;
    const start = new Date(app.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const totalWatts = app.watts * (app.quantity || 1);
    const accumulatedKwh = (totalWatts / 1000) * (diffSeconds / 3600);
    return accumulatedKwh * 14.8261;
  };

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b pf-divider">
        <div>
          <h3 className="text-sm font-bold t-primary flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            Appliance Power Board
          </h3>
          <p className="text-xs t-muted">
            Real-time circuit status, active stopwatches, and live accumulating cost
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenAddModal}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Appliance
        </Button>
      </div>

      {appliances.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-2xl pf-input space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#5c68db]/15 border border-[#5c68db]/30 flex items-center justify-center mx-auto text-[#8183fc]">
            <Zap className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold t-primary">No Appliances Registered Yet</h4>
            <p className="text-xs t-muted max-w-sm mx-auto mt-0.5">
              Add your household appliances or import official energy specs from the PELP catalog to start tracking live wattage and real-time costs.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenAddModal}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Your First Appliance
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pt-1">
          {appliances.map((app: UserAppliance) => {
            const isOn = app.is_currently_on;
            const totalWatts = app.watts * (app.quantity || 1);
            const hourlyCost = (totalWatts / 1000) * 14.8261;
            const liveSpent = getAccumulatedPesos(app);

            return (
              <div
                key={app.id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isOn
                    ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/30 shadow-sm"
                    : "pf-input opacity-85 hover:opacity-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#5c68db]/15 border border-[#5c68db]/25">
                      {getCategoryIcon(app.category)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold t-primary line-clamp-1">{app.name}</h4>
                      <p className="text-[11px] t-accent font-medium">
                        {app.room_location || "General"} • {app.watts}W {app.quantity > 1 ? `(x${app.quantity})` : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => togglePower(app)}
                    className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                      isOn
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-400"
                        : "btn-secondary"
                    }`}
                    title={isOn ? "Turn Off" : "Turn On"}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 pt-2.5 border-t pf-divider flex items-center justify-between text-xs font-mono">
                  {isOn ? (
                    <div className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400 font-bold">
                      <Clock className="w-3 h-3 animate-spin" />
                      <span>{getRunningDuration(app.last_turned_on_at)}</span>
                    </div>
                  ) : (
                    <span className="t-muted text-[11px] font-sans">Standby</span>
                  )}

                  <div className="text-right">
                    {isOn ? (
                      <span className="font-bold text-amber-500 dark:text-amber-400">
                        ₱{liveSpent.toFixed(4)}
                      </span>
                    ) : (
                      <span className="t-muted font-sans text-[11px]">
                        ₱{hourlyCost.toFixed(2)}/hr
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};
