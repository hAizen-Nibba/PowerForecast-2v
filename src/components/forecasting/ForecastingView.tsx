import React, { useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import {
  EnergySavingsLeaf as LeafIcon,
  Tune as TuneIcon,
  AutoGraph as AutoGraphIcon,
  InfoOutlined as InfoIcon,
  Bolt as BoltIcon,
  WarningAmber as WarningIcon,
  ShieldOutlined as ShieldIcon,
} from "@mui/icons-material";
import { useList } from "@refinedev/core";
import { UserAppliance } from "../../types";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";

export const ForecastingView: React.FC = () => {
  const [tariffDelta, setTariffDelta] = useState<number>(0);

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const totalMonthlyKwh = appliances.reduce(
    (acc: number, curr: UserAppliance) => acc + (Number(curr.monthly_kwh) || 0),
    0
  ) || 250;

  const baseBill = calculateMeralcoBill(totalMonthlyKwh, 7.12);
  const baseTotal = baseBill.totalBill;

  const adjustedTotal = baseTotal * (1 + tariffDelta / 100);
  const ecoOptimizedTotal = adjustedTotal * 0.85;
  const peakSurgeTotal = adjustedTotal * 1.25;

  const deltaCost = adjustedTotal - baseTotal;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
      {/* 1. Header Banner */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, pb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary", display: "flex", alignItems: "center", gap: 1.5 }}>
            <AutoGraphIcon sx={{ color: "primary.main" }} />
            Predictive Energy Forecasting
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Simulate upcoming Meralco tariff adjustments, model load-shifting scenarios, and forecast seasonal bill impacts.
          </Typography>
        </Box>
        <Chip
          icon={<BoltIcon sx={{ fontSize: "16px !important", color: "#ffd54f !important" }} />}
          label={`Baseline: ${totalMonthlyKwh.toFixed(1)} kWh/mo`}
          variant="outlined"
          sx={{ fontWeight: 700, borderColor: "rgba(108, 122, 224, 0.4)", bgcolor: "rgba(15, 14, 58, 0.4)" }}
        />
      </Box>

      {/* 2. Simulation Slider Control Card */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 3.5,
          position: "relative",
          overflow: "hidden",
          border: "1px solid",
          borderColor: "rgba(108, 122, 224, 0.25)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <TuneIcon sx={{ color: "primary.main" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
              Rate Fluctuation Scenario Simulator
            </Typography>
          </Box>
          <Chip
            label={`${tariffDelta >= 0 ? "+" : ""}${tariffDelta.toFixed(1)}% Tariff Shift`}
            color={tariffDelta > 0 ? "warning" : tariffDelta < 0 ? "success" : "primary"}
            sx={{ fontWeight: 800, fontSize: "0.85rem", px: 1 }}
          />
        </Box>

        <Box sx={{ px: { xs: 1, sm: 2 } }}>
          <Slider
            value={tariffDelta}
            min={-20}
            max={20}
            step={1}
            marks={[
              { value: -20, label: "-20% (Subsidized)" },
              { value: -10, label: "-10%" },
              { value: 0, label: "0% (Current Tariff)" },
              { value: 10, label: "+10%" },
              { value: 20, label: "+20% (Summer Surge)" },
            ]}
            onChange={(_, val) => setTariffDelta(val as number)}
            sx={{
              height: 8,
              "& .MuiSlider-thumb": {
                width: 22,
                height: 22,
                boxShadow: "0 0 15px rgba(108, 122, 224, 0.6)",
              },
            }}
          />
        </Box>

        <Box sx={{ mt: 3, p: 2, borderRadius: 2.5, bgcolor: "rgba(108, 122, 224, 0.08)", border: "1px solid rgba(108, 122, 224, 0.15)", display: "flex", alignItems: "center", gap: 2 }}>
          <InfoIcon sx={{ color: "primary.main", fontSize: 20 }} />
          <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
            Adjust the slider to simulate generation charge fluctuations driven by WESM spot market rates, coal/gas fuel pass-through adjustments, or ERC rate reset orders.
          </Typography>
        </Box>
      </Card>

      {/* 3. Three Scenario Comparison Cards */}
      <Grid container spacing={3}>
        {/* Scenario 1: Baseline / Shifted Tariff */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              p: 3,
              borderRadius: 3.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              border: "1px solid",
              borderColor: "primary.main",
              bgcolor: "rgba(15, 14, 58, 0.7)",
              position: "relative",
            }}
          >
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: 1 }}>
                  SIMULATED BASELINE
                </Typography>
                <Chip label="Current Plan" size="small" sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary", mb: 0.5 }}>
                ₱{adjustedTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Projected monthly bill at {tariffDelta >= 0 ? "+" : ""}{tariffDelta}% rate
              </Typography>
            </Box>

            <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Variance vs Baseline:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: deltaCost > 0 ? "error.main" : deltaCost < 0 ? "success.main" : "text.secondary" }}>
                  {deltaCost > 0 ? `+₱${deltaCost.toFixed(2)}` : deltaCost < 0 ? `-₱${Math.abs(deltaCost).toFixed(2)}` : "₱0.00"}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Scenario 2: Eco-Optimized (-15%) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              p: 3,
              borderRadius: 3.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              border: "1px solid",
              borderColor: "success.main",
              bgcolor: "rgba(6, 78, 59, 0.15)",
              position: "relative",
            }}
          >
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: "success.light", letterSpacing: 1 }}>
                  ECO-OPTIMIZED (-15%)
                </Typography>
                <Chip icon={<LeafIcon sx={{ fontSize: "14px !important", color: "white !important" }} />} label="Smart Schedule" color="success" size="small" sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#34d399", mb: 0.5 }}>
                ₱{ecoOptimizedTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                By shifting heavy loads (laundry, water heaters) to off-peak hours
              </Typography>
            </Box>

            <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "rgba(52, 211, 153, 0.2)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Est. Monthly Savings:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#34d399" }}>
                  -₱{(adjustedTotal - ecoOptimizedTotal).toFixed(2)}/mo
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Scenario 3: Peak Surge (+25%) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              p: 3,
              borderRadius: 3.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              border: "1px solid",
              borderColor: "warning.main",
              bgcolor: "rgba(120, 53, 15, 0.15)",
              position: "relative",
            }}
          >
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: "warning.light", letterSpacing: 1 }}>
                  PEAK SURGE (+25%)
                </Typography>
                <Chip icon={<WarningIcon sx={{ fontSize: "14px !important", color: "white !important" }} />} label="High Peak Usage" color="warning" size="small" sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#fbbf24", mb: 0.5 }}>
                ₱{peakSurgeTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Continuous concurrent AC and appliance operations during 11AM-4PM & 6PM-9PM
              </Typography>
            </Box>

            <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "rgba(251, 191, 36, 0.2)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Peak Window Surcharge:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#fbbf24" }}>
                  +₱{(peakSurgeTotal - adjustedTotal).toFixed(2)}/mo
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* 4. Advisory Insights Box */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2.5,
        }}
      >
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(108, 122, 224, 0.15)", color: "primary.main" }}>
          <ShieldIcon sx={{ fontSize: 28 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
            Meralco Time-of-Use & Seasonal Forecast Advisory
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
            During the hot dry season (March to June), spot market prices typically elevate generation components by 8% to 15%. To protect your budget, configure scheduled runtimes in the <strong>Smart Calendar</strong> during off-peak hours (10:00 PM – 8:00 AM).
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
