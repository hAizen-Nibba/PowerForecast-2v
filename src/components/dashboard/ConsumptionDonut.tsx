import React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { UserAppliance } from "../../types";
import { PieChart as PieIcon, Bolt as BoltIcon } from "@mui/icons-material";

interface ConsumptionDonutProps {
  appliances: UserAppliance[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "Air Conditioners": "#6366f1",
  "Refrigerators & Freezers": "#818cf8",
  "Television Sets": "#06b6d4",
  "Electric Fans": "#10b981",
  "Washing Machines": "#f59e0b",
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
    color: CATEGORY_COLORS[cat] || "#6366f1",
  })).sort((a, b) => b.value - a.value);

  const totalKwh = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card sx={{ p: 3, borderRadius: 3, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
              <PieIcon sx={{ color: "primary.light" }} />
              Energy Distribution
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Monthly household load by category
            </Typography>
          </Box>
          <Chip
            label={`${totalKwh.toFixed(1)} kWh Total`}
            size="small"
            color="primary"
            sx={{ fontWeight: 700, fontFamily: "monospace" }}
          />
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {appliances.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                bgcolor: "action.hover",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1.5,
              }}
            >
              <PieIcon sx={{ color: "primary.light" }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              No Consumption Data
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", maxWidth: 200, mx: "auto", mt: 0.5 }}>
              Add custom appliances to visualize your power breakdown.
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
                                theme.palette.mode === "dark" ? "rgba(15, 16, 56, 0.95)" : "#ffffff",
                              border: "1px solid",
                              borderColor: "divider",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                              {item.name}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: "#f59e0b", fontFamily: "monospace" }}>
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
                <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace" }}>
                  {Math.round(totalKwh)}
                </Typography>
                <Typography variant="caption" sx={{ color: "primary.light", fontWeight: 700, fontSize: "0.6875rem", textTransform: "uppercase" }}>
                  kWh/mo
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 150, overflowY: "auto", pr: 0.5, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
              {data.map((item) => (
                <Box key={item.name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, maxWidth: "70%" }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
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
