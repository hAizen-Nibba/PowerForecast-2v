import React, { useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import {
  BarChart as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  Bolt as BoltIcon,
  EnergySavingsLeaf as LeafIcon,
  Lightbulb as LightbulbIcon,
  Download as DownloadIcon,
  PieChart as PieChartIcon,
  ReceiptLong as ReceiptIcon,
} from "@mui/icons-material";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { UserAppliance, UserCalendarEvent } from "../../types";
import { useList } from "@refinedev/core";
import { computeHourlyLoadCurve } from "../../lib/loadCurveService";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";
import { MetricCard } from "../common/MetricCard";
import ButtonGroup from "@mui/material/ButtonGroup";

export const AnalyticsView: React.FC = () => {
  const [zoomPreset, setZoomPreset] = useState<"24h" | "morning" | "day" | "evening">("24h");
  const [resolutionMinutes] = useState<1 | 5 | 15 | 30>(5);

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const eventsRes = useList<UserCalendarEvent>({
    resource: "user_calendar_events",
  }) as any;

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const events: UserCalendarEvent[] = eventsRes?.data?.data || eventsRes?.result?.data || [];

  const totalMonthlyKwh = appliances.reduce(
    (acc: number, curr: UserAppliance) => acc + (Number(curr.monthly_kwh) || 0),
    0
  ) || 250;

  const bill = calculateMeralcoBill(totalMonthlyKwh, 7.12);
  const totalCost = bill.totalBill;

  // 1. Group appliances by Category
  const catMap: Record<string, number> = {};
  appliances.forEach((a) => {
    const cat = a.category || "General";
    const kwh = Number(a.monthly_kwh) || ((a.watts * a.hours_per_day * 30 * (a.quantity || 1)) / 1000);
    catMap[cat] = (catMap[cat] || 0) + kwh;
  });

  const categoryEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const totalCatKwh = categoryEntries.reduce((acc, curr) => acc + curr[1], 0) || 1;

  // 2. Unbundled Rate Components breakdown
  const rateComponents = [
    { name: "Generation Charge", amount: bill.generationTotal, color: "#6366f1" },
    { name: "Transmission Charge", amount: bill.transmissionTotal, color: "#a855f7" },
    { name: "System Loss Charge", amount: bill.systemLossTotal, color: "#38bdf8" },
    { name: "Distribution Network", amount: bill.distributionTotal, color: "#34d399" },
    { name: "Government Taxes & VAT", amount: bill.totalVat + bill.localFranchiseTax, color: "#fbbf24" },
    { name: "Universal & FIT-All Charges", amount: bill.universalCharges.total + bill.fitAll, color: "#94a3b8" },
  ];

  let startHour = 0;
  let endHour = 24;
  if (zoomPreset === "morning") {
    startHour = 0;
    endHour = 8;
  } else if (zoomPreset === "day") {
    startHour = 8;
    endHour = 16;
  } else if (zoomPreset === "evening") {
    startHour = 16;
    endHour = 24;
  }

  const HOURLY_LOAD_DATA = computeHourlyLoadCurve({
    appliances,
    events,
    resolutionMinutes,
    startHour,
    endHour,
  });

  const MONTHLY_TREND_DATA = [
    { month: "May", kwh: 0, cost: 0, status: "Prior Period" },
    { month: "Jun", kwh: 0, cost: 0, status: "Prior Period" },
    { month: "Jul", kwh: 0, cost: 0, status: "Prior Period" },
    { month: "Aug (Active)", kwh: Math.round(totalMonthlyKwh), cost: Math.round(totalCost), status: "Active Tracking" },
    { month: "Sep", kwh: Math.round(totalMonthlyKwh * 0.98), cost: Math.round(totalCost * 0.98), status: "Projected" },
    { month: "Oct", kwh: Math.round(totalMonthlyKwh * 0.95), cost: Math.round(totalCost * 0.95), status: "Projected" },
    { month: "Nov", kwh: Math.round(totalMonthlyKwh * 0.92), cost: Math.round(totalCost * 0.92), status: "Projected" },
    { month: "Dec", kwh: Math.round(totalMonthlyKwh * 1.05), cost: Math.round(totalCost * 1.05), status: "Projected (Holiday)" },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3, md: 3.5 } }}>
      {/* Header Banner */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: "primary.main",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AnalyticsIcon sx={{ color: "#ffd54f" }} />
            </Box>
            Energy Analytics & Cost Distribution
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Deep-dive cost distribution, appliance category weights, and minute-level grid demand profiles.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={() => window.print()}
          startIcon={<DownloadIcon />}
          sx={{ fontWeight: 700 }}
        >
          Export Report
        </Button>
      </Box>

      {/* KPI Cards Row */}
      <Grid container spacing={{ xs: 2, sm: 2.5 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Monthly Energy Volume"
            value={`${totalMonthlyKwh.toFixed(1)} kWh`}
            subtitle="Household baseline load"
            icon={<BoltIcon sx={{ color: "#ffd54f" }} />}
            trend={{ value: "Tier 3", direction: "neutral" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Forecasted Bill"
            value={`₱${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle={`Effective: ₱${bill.effectiveRatePerKwh.toFixed(2)}/kWh`}
            icon={<TrendingUpIcon sx={{ color: "primary.light" }} />}
            trend={{ value: "-4.2%", direction: "down", label: "vs projected" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Energy Efficiency"
            value="89.4%"
            subtitle="PELP star compliance"
            icon={<LeafIcon sx={{ color: "success.main" }} />}
            trend={{ value: "A+", direction: "up" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Optimization Potential"
            value="₱380.00"
            subtitle="Via runtime scheduling"
            icon={<LightbulbIcon sx={{ color: "warning.main" }} />}
          />
        </Grid>
      </Grid>

      {/* Grouped Category Breakdown & Unbundled Cost Distribution Row */}
      <Grid container spacing={{ xs: 2.5, sm: 3 }}>
        {/* Left: Appliance Category Breakdown Bars */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3.5, height: "100%", display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <PieChartIcon sx={{ color: "primary.main" }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                  Energy Usage by Appliance Category
                </Typography>
              </Box>
              <Chip label={`${categoryEntries.length} Categories`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25, flex: 1, justifyContent: "center" }}>
              {categoryEntries.length === 0 ? (
                <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
                  No appliances registered yet. Add appliances to inspect category proportions.
                </Typography>
              ) : (
                categoryEntries.map(([cat, kwh]) => {
                  const pct = Math.round((kwh / totalCatKwh) * 100);
                  const cost = kwh * bill.effectiveRatePerKwh;
                  return (
                    <Box key={cat} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                          {cat}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>
                          {kwh.toFixed(1)} kWh ({pct}%) • <span style={{ color: "#ffd54f" }}>₱{cost.toFixed(2)}</span>
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: "rgba(108, 122, 224, 0.15)",
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 4,
                            background: "linear-gradient(90deg, #6366f1, #fbbf24)",
                          },
                        }}
                      />
                    </Box>
                  );
                })
              )}
            </Box>
          </Card>
        </Grid>

        {/* Right: Unbundled Rate Component Proportions */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3.5, height: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <ReceiptIcon sx={{ color: "primary.main" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                Unbundled Rate Component Distribution
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, flex: 1, justifyContent: "center" }}>
              {rateComponents.map((item) => {
                const pct = totalCost > 0 ? Math.round((item.amount / totalCost) * 100) : 0;
                return (
                  <Box
                    key={item.name}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "rgba(15, 14, 58, 0.4)",
                      border: "1px solid rgba(108, 122, 224, 0.15)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 1.5,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderColor: "primary.main",
                        transform: "translateX(2px)",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.8rem" }}>
                        {item.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary", fontSize: "0.85rem", fontFamily: "monospace", flexShrink: 0 }}>
                      ₱{item.amount.toFixed(2)} <span style={{ color: item.color, fontSize: "0.75rem" }}>({pct}%)</span>
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* 24-Hour Continuous Load Curve Card */}
      <Card sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 2.5 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              24-Hour Continuous Load Profile
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Dynamic minute-level power demand curve
            </Typography>
          </Box>

          <ButtonGroup size="small" variant="outlined">
            {[
              { label: "24 Hours", val: "24h" },
              { label: "Morning", val: "morning" },
              { label: "Day", val: "day" },
              { label: "Evening", val: "evening" },
            ].map((b) => (
              <Button
                key={b.val}
                variant={zoomPreset === b.val ? "contained" : "outlined"}
                onClick={() => setZoomPreset(b.val as any)}
                sx={{ fontWeight: 700 }}
              >
                {b.label}
              </Button>
            ))}
          </ButtonGroup>
        </Box>

        <Box sx={{ height: 260, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={HOURLY_LOAD_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#0f0e3a", border: "1px solid rgba(99, 102, 241, 0.4)", color: "#ffffff" }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {d.time}
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block", color: "#ffd54f", fontWeight: 800, fontFamily: "monospace" }}>
                          {d.watts} Watts
                        </Typography>
                      </Box>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="watts" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorLoad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Card>

      {/* Multi-Month Trend & Forecast Bar Chart */}
      <Card sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3.5 }}>
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Multi-Month Energy Trend & Seasonal Forecast
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Monthly consumption (kWh) with projection for upcoming billing cycles
          </Typography>
        </Box>

        <Box sx={{ height: 260, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY_TREND_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#0f0e3a", border: "1px solid rgba(99, 102, 241, 0.4)", color: "#ffffff" }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {d.month} • {d.status}
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block", color: "#ffd54f", fontWeight: 800, fontFamily: "monospace" }}>
                          {d.kwh} kWh (~₱{d.cost})
                        </Typography>
                      </Box>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="kwh" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Card>
    </Box>
  );
};

export default AnalyticsView;
