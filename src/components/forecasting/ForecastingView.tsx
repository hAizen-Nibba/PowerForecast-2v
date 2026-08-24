import React, { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import {
  AutoGraph as AutoGraphIcon,
  Tune as TuneIcon,
  Bolt as BoltIcon,
  EnergySavingsLeaf as LeafIcon,
  WbSunny as SunIcon,
  InfoOutlined as InfoIcon,
  Security as ShieldIcon,
  Home as HomeIcon,
  Store as StoreIcon,
} from "@mui/icons-material";
import { UserAppliance, ApplianceList } from "../../types";
import { useList } from "@refinedev/core";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";

export const ForecastingView: React.FC = () => {
  const [genRateDelta, setGenRateDelta] = useState<number>(0);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("all");

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const spacesRes = useList<ApplianceList>({
    resource: "appliance_lists",
  }) as any;

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const spaces: ApplianceList[] = spacesRes?.data?.data || spacesRes?.result?.data || [];

  // Filter target appliances based on space selection
  const targetAppliances = useMemo(() => {
    if (selectedSpaceId === "all") return appliances;
    return appliances.filter((a) => a.list_id === selectedSpaceId);
  }, [appliances, selectedSpaceId]);

  const baseGenRate = 7.1246;
  const simulatedGenRate = Math.max(4.0, baseGenRate + genRateDelta);

  // Derive simulation scenarios
  const simulation = useMemo(() => {
    let baselineKwh = 0;
    let ecoKwh = 0;
    let summerKwh = 0;

    targetAppliances.forEach((app) => {
      const hours = app.hours_per_day || 0;
      const qty = app.quantity || 1;
      const baseMonthly = (app.watts * hours * qty * 30) / 1000;

      baselineKwh += baseMonthly;

      // Eco scenario: 15% reduction in cooling/heavy devices
      const isCooling = app.category.toLowerCase().includes("air") || app.category.toLowerCase().includes("fan") || app.category.toLowerCase().includes("ref");
      const ecoHours = isCooling ? Math.max(0, hours * 0.85) : hours;
      ecoKwh += (app.watts * ecoHours * qty * 30) / 1000;

      // Summer scenario: 25% increase in cooling devices due to ambient heat
      const summerHours = isCooling ? hours * 1.25 : hours;
      summerKwh += (app.watts * summerHours * qty * 30) / 1000;
    });

    if (baselineKwh === 0) {
      baselineKwh = 240;
      ecoKwh = 204;
      summerKwh = 300;
    }

    // Determine tariff type for the space (or default residential)
    const activeSpace = spaces.find((s) => s.id === selectedSpaceId);
    const tariffType = activeSpace?.tariff_type || "residential";

    const baselineBill = calculateMeralcoBill(baselineKwh, simulatedGenRate, 0, false, tariffType).totalBill;
    const ecoBill = calculateMeralcoBill(ecoKwh, simulatedGenRate, 0, false, tariffType).totalBill;
    const summerBill = calculateMeralcoBill(summerKwh, simulatedGenRate, 0, false, tariffType).totalBill;

    return {
      baselineKwh,
      ecoKwh,
      summerKwh,
      baselineBill,
      ecoBill,
      summerBill,
      ecoSavings: baselineBill - ecoBill,
      summerExtra: summerBill - baselineBill,
    };
  }, [appliances, spaces, selectedSpaceId, targetAppliances, simulatedGenRate]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3, md: 3.5 } }}>
      {/* 1. Header Banner */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, pb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary", display: "flex", alignItems: "center", gap: 1.5 }}>
            <AutoGraphIcon sx={{ color: "primary.main" }} />
            Predictive Energy Forecasting
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Simulate Meralco generation rate movements, model energy conservation targets, and project seasonal summer impacts.
          </Typography>
        </Box>
        <Chip
          icon={<BoltIcon sx={{ fontSize: "16px !important", color: "#ffd54f !important" }} />}
          label={`Simulated Load: ${simulation.baselineKwh.toFixed(1)} kWh/mo`}
          variant="outlined"
          sx={{ fontWeight: 700, borderColor: "rgba(108, 122, 224, 0.4)", bgcolor: "rgba(15, 14, 58, 0.4)" }}
        />
      </Box>

      {/* 2. Space Selector Tabs (When spaces exist) */}
      {spaces.length > 0 && (
        <Box data-tour="forecast-space-tabs">
          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", display: "block", mb: 1, letterSpacing: "0.05em" }}>
            FORECAST SCOPE / TARGET SPACE
          </Typography>
          <Tabs
            value={selectedSpaceId}
            onChange={(_, val) => setSelectedSpaceId(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              "& .MuiTab-root": {
                minHeight: 40,
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 700,
                px: 2,
                mr: 1,
              },
            }}
          >
            <Tab value="all" label={`All Spaces Combined (${spaces.length})`} />
            {spaces.map((s) => (
              <Tab
                key={s.id}
                value={s.id}
                icon={s.tariff_type === "commercial" ? <StoreIcon fontSize="small" /> : <HomeIcon fontSize="small" />}
                iconPosition="start"
                label={`${s.name} (${s.tariff_type === "commercial" ? "Commercial" : "Residential"})`}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* 3. Meralco Rate Fluctuation Slider */}
      <Card
        data-tour="forecast-rate-slider"
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 3.5,
          position: "relative",
          overflow: "hidden",
          border: "1px solid",
          borderColor: "rgba(108, 122, 224, 0.25)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <TuneIcon sx={{ color: "primary.main" }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                Generation Rate Movement Simulator
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Simulated Generation Charge: ₱{simulatedGenRate.toFixed(4)}/kWh (Base: ₱7.1246)
              </Typography>
            </Box>
          </Box>
          <Chip
            label={`${genRateDelta >= 0 ? "+" : ""}₱${genRateDelta.toFixed(2)}/kWh Shift`}
            color={genRateDelta > 0 ? "warning" : genRateDelta < 0 ? "success" : "primary"}
            sx={{ fontWeight: 800, fontSize: "0.85rem", px: 1 }}
          />
        </Box>

        <Box sx={{ px: { xs: 1, sm: 2 } }}>
          <Slider
            value={genRateDelta}
            min={-2.0}
            max={3.0}
            step={0.25}
            marks={[
              { value: -2.0, label: "-₱2.00 (ERC Refund)" },
              { value: -1.0, label: "-₱1.00" },
              { value: 0, label: "₱0.00 (Published)" },
              { value: 1.5, label: "+₱1.50" },
              { value: 3.0, label: "+₱3.00 (WESM Spike)" },
            ]}
            onChange={(_, val) => setGenRateDelta(val as number)}
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
          <InfoIcon sx={{ color: "primary.main", fontSize: 20, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
            Adjust the slider to simulate Meralco generation cost fluctuations driven by WESM spot market prices, fuel pass-through, and ERC rate adjustments.
          </Typography>
        </Box>
      </Card>

      {/* 4. Three Realistic Scenario Comparison Cards */}
      <Grid container spacing={{ xs: 2.5, sm: 3 }} data-tour="forecast-scenarios">
        {/* Scenario 1: Simulated Baseline */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              border: "1px solid",
              borderColor: "primary.main",
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(15, 14, 58, 0.7)" : "background.paper"),
              position: "relative",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                transform: "translateY(-3px)",
                boxShadow: "0 8px 24px rgba(99, 102, 241, 0.2)",
              },
            }}
          >
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: 1 }}>
                  SIMULATED BASELINE
                </Typography>
                <Chip label="Current Runtimes" size="small" sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary", mb: 0.5, fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                ₱{simulation.baselineBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Projected monthly bill at ₱{simulatedGenRate.toFixed(2)}/kWh generation rate
              </Typography>
            </Box>

            <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Total Energy Volume:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                  {simulation.baselineKwh.toFixed(1)} kWh / mo
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Scenario 2: Energy Conservation (-15% Runtime) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              border: "1px solid",
              borderColor: "success.main",
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(6, 78, 59, 0.2)" : "rgba(16, 185, 129, 0.05)"),
              position: "relative",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                transform: "translateY(-3px)",
                boxShadow: "0 8px 24px rgba(52, 211, 153, 0.2)",
              },
            }}
          >
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: "success.light", letterSpacing: 1 }}>
                  CONSERVATION TARGET (-15%)
                </Typography>
                <Chip icon={<LeafIcon sx={{ fontSize: "14px !important", color: "white !important" }} />} label="Eco Target" color="success" size="small" sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#34d399", mb: 0.5, fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                ₱{simulation.ecoBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                By reducing AC & cooling runtimes by 1–2 hours daily
              </Typography>
            </Box>

            <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "rgba(52, 211, 153, 0.2)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Monthly Net Savings:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#34d399", fontFamily: "monospace" }}>
                  -₱{simulation.ecoSavings.toFixed(2)} / mo
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Scenario 3: Summer Extended Runtime (+25% Runtime) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              border: "1px solid",
              borderColor: "warning.main",
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(120, 53, 15, 0.2)" : "rgba(245, 158, 11, 0.05)"),
              position: "relative",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                transform: "translateY(-3px)",
                boxShadow: "0 8px 24px rgba(251, 191, 36, 0.2)",
              },
            }}
          >
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: "warning.light", letterSpacing: 1 }}>
                  SUMMER HEAVY USAGE (+25%)
                </Typography>
                <Chip icon={<SunIcon sx={{ fontSize: "14px !important", color: "white !important" }} />} label="Summer Surge" color="warning" size="small" sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#fbbf24", mb: 0.5, fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                ₱{simulation.summerBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Hot dry season increased compressor runtime on ACs and chillers
              </Typography>
            </Box>

            <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "rgba(251, 191, 36, 0.2)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Projected Increase:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#fbbf24", fontFamily: "monospace" }}>
                  +₱{simulation.summerExtra.toFixed(2)} / mo
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* 5. Advisory Insights Box */}
      <Paper
        data-tour="forecast-advisory"
        sx={{
          p: 3,
          borderRadius: 3.5,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2.5,
        }}
      >
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(108, 122, 224, 0.15)", color: "primary.main", flexShrink: 0 }}>
          <ShieldIcon sx={{ fontSize: 28 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
            ERC & Meralco Monthly Tariff Pass-Through Advisory
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block", lineHeight: 1.6 }}>
            In the Philippines, the generation charge is an automatic pass-through cost adjusted every billing cycle based on fuel costs (coal, gas) and WESM spot market rates. Meralco distributes power but does not earn from the generation charge. During hot dry months, higher grid demand often pushes generation rates upward.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default ForecastingView;
