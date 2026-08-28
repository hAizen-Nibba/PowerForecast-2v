import React, { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { UserAppliance, ApplianceList } from "../../types";
import { PieChart as PieIcon } from "@mui/icons-material";
import { useList } from "@refinedev/core";

interface ConsumptionDonutProps {
  appliances: UserAppliance[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "Air Conditioners": "#00e5c9",
  "Refrigerators & Freezers": "#26c6da",
  "Television Sets": "#06b6d4",
  "Electric Fans": "#10b981",
  "Washing Machines": "#fbbf24",
  "Lighting Products": "#38bdf8",
  "Other": "#64748b",
};

const SPACE_COLORS = ["#00e5c9", "#009e88", "#26c6da", "#fbbf24", "#38bdf8", "#f43f5e"];

export const ConsumptionDonut: React.FC<ConsumptionDonutProps> = ({ appliances }) => {
  const [viewBy, setViewBy] = useState<"category" | "space">("category");

  const spacesRes = useList<ApplianceList>({
    resource: "appliance_lists",
  }) as any;

  const spaces: ApplianceList[] = spacesRes?.data?.data || spacesRes?.result?.data || [];

  const categoryTotals: Record<string, number> = {};
  const spaceTotals: Record<string, number> = {};

  appliances.forEach((app) => {
    const cat = app.category || "Other";
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
    color: CATEGORY_COLORS[cat] || "#00e5c9",
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
            <PieIcon sx={{ color: "primary.main", fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
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
                fontWeight: 700,
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
                              borderRadius: 2,
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark" ? "rgba(23, 26, 31, 0.95)" : "#ffffff",
                              border: "1px solid",
                              borderColor: (theme) =>
                                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "#e2e8f0",
                              boxShadow: (theme) =>
                                theme.palette.mode === "dark"
                                  ? "0 8px 24px rgba(0,0,0,0.4)"
                                  : "0 4px 16px rgba(15, 23, 42, 0.08)",
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                              {item.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 800,
                                color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                                fontFamily: "monospace",
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
                <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                  {Math.round(totalKwh)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: (theme) => (theme.palette.mode === "dark" ? "primary.light" : "primary.main"),
                    fontWeight: 700,
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
                  <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>
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
