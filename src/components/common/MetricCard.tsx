import React from "react";
import { GlassCard } from "./GlassCard";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  glow?: string;
  highlightColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
}) => {
  return (
    <GlassCard className="flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider t-muted">{title}</p>
          <h3 className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight t-primary font-mono">
            {value}
          </h3>
        </div>
        {icon && (
          <div className="p-2.5 rounded-xl bg-[#5c68db]/15 text-[#8183fc] border border-[#5c68db]/25 shadow-xs">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between pt-2.5 border-t pf-divider text-xs">
        {trend && (
          <div
            className={clsx(
              "flex items-center gap-1 font-semibold",
              trend.direction === "up" && "text-amber-500 dark:text-amber-400",
              trend.direction === "down" && "text-emerald-600 dark:text-emerald-400",
              trend.direction === "neutral" && "t-muted"
            )}
          >
            {trend.direction === "up" && <TrendingUp className="w-3.5 h-3.5" />}
            {trend.direction === "down" && <TrendingDown className="w-3.5 h-3.5" />}
            {trend.direction === "neutral" && <Minus className="w-3.5 h-3.5" />}
            <span>{trend.value}</span>
            {trend.label && <span className="t-muted ml-0.5 font-normal">{trend.label}</span>}
          </div>
        )}
        {subtitle && <span className="t-muted ml-auto font-medium text-[11px]">{subtitle}</span>}
      </div>
    </GlassCard>
  );
};
