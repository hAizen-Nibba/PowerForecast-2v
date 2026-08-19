import React from "react";
import { GlassCard } from "../common/GlassCard";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { UserAppliance } from "../../types";
import { PieChart as PieIcon, Zap } from "lucide-react";

interface ConsumptionDonutProps {
  appliances: UserAppliance[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "Air Conditioners": "#6c7ae0",
  "Refrigerators & Freezers": "#8183fc",
  "Television Sets": "#38bdf8",
  "Electric Fans": "#34d399",
  "Washing Machines": "#ffd54f",
  "Lighting Products": "#c084fc",
  "Other": "#94a3b8",
};

export const ConsumptionDonut: React.FC<ConsumptionDonutProps> = ({ appliances }) => {
  const categoryTotals: Record<string, number> = {};
  appliances.forEach((app) => {
    const cat = app.category || "Other";
    const kwh = Number(app.monthly_kwh) || ((app.watts * app.hours_per_day * app.days_per_month * (app.quantity || 1)) / 1000);
    categoryTotals[cat] = (categoryTotals[cat] || 0) + kwh;
  });

  const data = Object.keys(categoryTotals).map((cat) => ({
    name: cat,
    value: Math.round(categoryTotals[cat] * 10) / 10,
    color: CATEGORY_COLORS[cat] || "#6c7ae0",
  })).sort((a, b) => b.value - a.value);

  const totalKwh = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <GlassCard className="flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between pb-3 border-b pf-divider">
        <div>
          <h3 className="text-sm font-bold t-primary flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-[#8183fc]" />
            Energy Distribution
          </h3>
          <p className="text-xs t-muted">Monthly load by category</p>
        </div>
        <span className="text-xs font-bold font-mono t-accent bg-[#5c68db]/15 px-2.5 py-0.5 rounded-lg border border-[#5c68db]/30">
          {totalKwh.toFixed(1)} kWh Total
        </span>
      </div>

      {appliances.length === 0 ? (
        <div className="py-12 px-3 text-center flex flex-col items-center justify-center space-y-2">
          <div className="p-3 rounded-full bg-[#5c68db]/15 text-[#8183fc] border border-[#5c68db]/25">
            <PieIcon className="w-6 h-6 text-[#8183fc]" />
          </div>
          <p className="text-xs font-bold t-primary">No Consumption Data</p>
          <p className="text-[11px] t-muted max-w-[200px]">
            Add custom appliances to visualize your category power breakdown.
          </p>
        </div>
      ) : (
        <>
          <div className="h-52 my-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0];
                      return (
                        <div className="glass-card p-2.5 rounded-xl border text-xs shadow-xl">
                          <p className="font-bold t-primary">{item.name}</p>
                          <p className="text-amber-500 dark:text-amber-400 font-bold mt-0.5 font-mono">
                            {item.value} kWh ({((Number(item.value) / (totalKwh || 1)) * 100).toFixed(1)}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={data}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--card-bg)" strokeWidth={2} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black t-primary font-mono">{Math.round(totalKwh)}</span>
              <span className="text-[10px] t-accent uppercase font-bold">kWh/mo</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t pf-divider max-h-36 overflow-y-auto pr-1">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="t-secondary truncate">{item.name}</span>
                </div>
                <span className="font-mono font-bold t-primary ml-2">
                  {item.value} kWh
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
};
