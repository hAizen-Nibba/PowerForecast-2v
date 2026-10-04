import React, { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { UserAppliance, ApplianceList } from "../../types";
import { PieChart as PieIcon } from "@mui/icons-material";
import { useList } from "@refinedev/core";
import { normalizeApplianceCategory } from "../../lib/dailyUsageService";
import { tokens } from "../../theme/tokens";

interface ConsumptionDonutProps {
  appliances: UserAppliance[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "Air Conditioners": "#38bdf8",
  "Refrigerators & Freezers": "#3b82f6",
  "Computers & Laptops": "#6366f1",
  "Electric Fans": "#10b981",
  "Kitchen Appliances": "#f59e0b",
  "Laundry & Cleaning": "#8b5cf6",
  "TV & Entertainment": "#06b6d4",
  "Lighting & Other": "#a1a1aa",
  "Electric Fans & Cooling": "#10b981",
  "Kitchen & Cooking": "#f59e0b",
  "Entertainment & Work": "#06b6d4",
  "Television Sets": "#06b6d4",
  "Washing Machines": "#8b5cf6",
  "Lighting Products": "#a1a1aa",
  "Other": "#71717a",
};

const SPACE_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#f43f5e"];

export const ConsumptionDonut: React.FC<ConsumptionDonutProps> = ({ appliances }) => {
  const [viewBy, setViewBy] = useState<"category" | "space">("category");

  const spacesRes = useList<ApplianceList>({
    resource: "appliance_lists",
    pagination: { mode: "off" },
  }) as any;

  const spaces: ApplianceList[] = spacesRes?.data?.data || spacesRes?.result?.data || [];

  const categoryTotals: Record<string, number> = {};
  const spaceTotals: Record<string, number> = {};

  appliances.forEach((app) => {
    const rawCat = app.category || "Other";
    const cat = normalizeApplianceCategory(rawCat);
    const watts = Number(app.watts) || 0;
    const hours = Number(app.hours_per_day) || 0;
    const days = Number(app.days_per_month) || 30;
    const qty = Number(app.quantity) || 1;
    const kwh = Number(app.monthly_kwh) > 0 ? Number(app.monthly_kwh) : ((watts * hours * days * qty) / 1000);
    categoryTotals[cat] = (categoryTotals[cat] || 0) + kwh;

    const spaceObj = spaces.find((s) => s.id === app.list_id) || spaces[0];
    const spaceName = spaceObj ? `${spaceObj.name} (${spaceObj.tariff_type === "commercial" ? "Commercial" : "Residential"})` : "Main Residence";
    spaceTotals[spaceName] = (spaceTotals[spaceName] || 0) + kwh;
  });

  const categoryData = Object.keys(categoryTotals).map((cat) => ({
    name: cat,
    value: Math.round(categoryTotals[cat] * 10) / 10,
    color: CATEGORY_COLORS[cat] || "#a1a1aa",
  })).sort((a, b) => b.value - a.value);

  const spaceData = Object.keys(spaceTotals).map((sp, idx) => ({
    name: sp,
    value: Math.round(spaceTotals[sp] * 10) / 10,
    color: SPACE_COLORS[idx % SPACE_COLORS.length],
  })).sort((a, b) => b.value - a.value);

  const data = viewBy === "category" ? categoryData : spaceData;
  const totalKwh = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card sx={{ p: { xs: 2.25, sm: 2.5 }, borderRadius: 1.5, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 0.75,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PieIcon sx={{ fontSize: 16 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
              Energy Distribution
            </Typography>
          </Box>
          <ToggleButtonGroup
            value={viewBy}
            exclusive
            onChange={(_, val) => val && setViewBy(val)}
            size="small"
            sx={{
              height: 26,
              "& .MuiToggleButton-root": {
                px: 1,
                py: 0,
                fontSize: "0.6875rem",
                fontWeight: 600,
                textTransform: "none",
              },
            }}
          >
            <ToggleButton value="category">Category</ToggleButton>
            <ToggleButton value="space">Space</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
          {viewBy === "category" ? "Monthly consumption breakdown by appliance category" : "Monthly energy split between spaces"}
        </Typography>

        {data.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No consumption data available yet.
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ height: 210, position: "relative", my: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0];
                        return (
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 1,
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
                              border: "1px solid",
                              borderColor: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                              boxShadow: (theme) =>
                                theme.palette.mode === "dark"
                                  ? "0 4px 12px rgba(0,0,0,0.5)"
                                  : "0 2px 8px rgba(0,0,0,0.06)",
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>
                              {item.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 600,
                                color: (theme) =>
                                  theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                                fontFamily: "monospace",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {item.value} kWh ({((Number(item.value) / (totalKwh || 1)) * 100).toFixed(1)}%)
                            </Typography>
                          </Box>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={data}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 600, fontFamily: "monospace", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                  {Math.round(totalKwh)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 500,
                    fontSize: "0.6875rem",
                    textTransform: "uppercase",
                  }}
                >
                  kWh/mo
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 150, overflowY: "auto", pr: 0.5, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
              {data.map((item) => (
                <Box key={item.name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, maxWidth: "70%" }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: "monospace", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    {item.value} kWh
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Box>
    </Card>
  );
};

export default ConsumptionDonut;
