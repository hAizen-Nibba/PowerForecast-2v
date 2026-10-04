import React, { useState, useMemo, useEffect } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Slider from "@mui/material/Slider";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Collapse from "@mui/material/Collapse";
import {
  Bolt as BoltIcon,
  RestartAlt as RotateCcwIcon,
  Print as PrinterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AutoAwesome as SparklesIcon,
  Whatshot as FlameIcon,
  Home as HomeIcon,
  Store as StoreIcon,
} from "@mui/icons-material";
import { calculateMeralcoBill, DEFAULT_MERALCO_RATES } from "../../lib/meralcoCalculator";
import { devLog } from "../../lib/devLogger";
import { PageHeader } from "../common/PageHeader";
import { SectionCard } from "../common/SectionCard";
import { tokens } from "../../theme/tokens";

export const MeralcoCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [tariffType, setTariffType] = useState<"residential" | "commercial">("residential");
  const [kwh, setKwh] = useState<number>(320);
  const [genRate, setGenRate] = useState<number>(DEFAULT_MERALCO_RATES.defaultGenerationRate);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [isSenior, setIsSenior] = useState<boolean>(false);
  const [showItemized, setShowItemized] = useState<boolean>(true);

  // What-If Simulation State
  const [simWatts, setSimWatts] = useState<number>(950);
  const [simHoursReduced, setSimHoursReduced] = useState<number>(2);

  const bill = useMemo(() => {
    return calculateMeralcoBill(kwh, genRate, otherCharges, isSenior, tariffType);
  }, [kwh, genRate, otherCharges, isSenior, tariffType]);

  useEffect(() => {
    devLog.telemetry(
      "Calculator",
      `Unbundled ${tariffType} bill calculated for ${kwh} kWh: ₱${bill.totalBill.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Effective: ₱${bill.effectiveRatePerKwh.toFixed(4)}/kWh)`,
      {
        tariffType,
        volumeKwh: kwh,
        effectiveRate: bill.effectiveRatePerKwh,
        totalBillPHP: bill.totalBill,
        isLifelineEligible: bill.isLifelineEligible,
        isSeniorCitizen: isSenior,
        generationTotal: bill.generationTotal,
        distributionTotal: bill.distributionTotal,
        taxesTotal: bill.totalTaxesAndSubsidies,
      }
    );
  }, [kwh, genRate, otherCharges, isSenior, tariffType, bill]);

  const simMonthlyKwhSaved = (simWatts * simHoursReduced * 30) / 1000;
  const simMonthlyPesosSaved = simMonthlyKwhSaved * (bill.effectiveRatePerKwh || 14.82);

  const genPct = bill.totalBill > 0 ? (bill.generationTotal / bill.totalBill) * 100 : 0;
  const transPct = bill.totalBill > 0 ? (bill.transmissionTotal / bill.totalBill) * 100 : 0;
  const sysLossPct = bill.totalBill > 0 ? (bill.systemLossTotal / bill.totalBill) * 100 : 0;
  const distPct = bill.totalBill > 0 ? (bill.distributionTotal / bill.totalBill) * 100 : 0;
  const taxPct = bill.totalBill > 0 ? (bill.totalTaxesAndSubsidies / bill.totalBill) * 100 : 0;

  const handleReset = () => {
    setKwh(320);
    setGenRate(DEFAULT_MERALCO_RATES.defaultGenerationRate);
    setOtherCharges(0);
    setIsSenior(false);
  };

  return (
    <Box sx={{ position: "relative", display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3 } }}>
      {/* Top Header */}
      <PageHeader
        title="Interactive Bill Calculator"
        subtitle="Configure monthly electricity consumption to inspect real-time unbundled itemized breakdowns."
        actions={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleReset}
              startIcon={<RotateCcwIcon sx={{ fontSize: 16 }} />}
              sx={{
                fontWeight: 600,
                fontSize: "0.8125rem",
                borderRadius: 0.75,
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.border : tokens.light.border,
                color: "text.primary",
                textTransform: "none",
              }}
            >
              Reset
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => window.print()}
              startIcon={<PrinterIcon sx={{ fontSize: 16 }} />}
              sx={{
                fontWeight: 600,
                fontSize: "0.8125rem",
                borderRadius: 0.75,
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.border : tokens.light.border,
                color: "text.primary",
                textTransform: "none",
              }}
            >
              Print Breakdown
            </Button>
          </Box>
        }
      />

      {/* Zinc Segmented Tab Switcher */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box
          sx={{
            display: "inline-flex",
            p: "3px",
            borderRadius: 1,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle),
            border: "1px solid",
            borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
            gap: 0.5,
          }}
        >
          {[
            { id: 0, label: "Bill Parameters", icon: <BoltIcon sx={{ fontSize: 15 }} /> },
            { id: 1, label: "What-If Energy Savings", icon: <SparklesIcon sx={{ fontSize: 15 }} /> },
          ].map((tab) => (
            <Button
              key={tab.id}
              size="small"
              onClick={() => setActiveTab(tab.id)}
              startIcon={tab.icon}
              sx={{
                px: 1.5,
                py: 0.5,
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 0.75,
                minHeight: 28,
                color: activeTab === tab.id ? "text.primary" : "text.secondary",
                bgcolor: activeTab === tab.id
                  ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : "#ffffff")
                  : "transparent",
                boxShadow: activeTab === tab.id
                  ? "0 1px 2px rgba(0,0,0,0.08)"
                  : "none",
                "&:hover": {
                  bgcolor: activeTab === tab.id
                    ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : "#ffffff")
                    : (theme) => (theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover),
                },
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Box>
      </Box>

      <Grid container spacing={{ xs: 2.5, sm: 3 }}>
        {/* Left Column: Config Inputs */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {activeTab === 0 ? (
              <SectionCard
                title="1. Tariff Classification"
                subtitle="Meralco tariff schedule determines distribution rates and lifeline subsidies"
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  {/* Space Tariff Buttons */}
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: "block", color: "text.secondary" }}>
                      SELECT SPACE TARIFF
                    </Typography>
                    <Grid container spacing={1.5} data-tour="calculator-space-comparison">
                      <Grid size={6}>
                        <Paper
                          variant="outlined"
                          onClick={() => setTariffType("residential")}
                          sx={{
                            p: 1.5,
                            borderRadius: 1,
                            cursor: "pointer",
                            textAlign: "center",
                            border: "1px solid",
                            borderColor: (theme) =>
                              tariffType === "residential"
                                ? theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong
                                : theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                            bgcolor: (theme) =>
                              tariffType === "residential"
                                ? theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle
                                : "transparent",
                            transition: "all 0.15s ease",
                            "&:hover": {
                              borderColor: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
                            },
                          }}
                        >
                          <HomeIcon sx={{ color: tariffType === "residential" ? "text.primary" : "text.secondary", mb: 0.5, fontSize: 20 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
                            Residential
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                            230V Stepped Tiers
                          </Typography>
                        </Paper>
                      </Grid>

                      <Grid size={6}>
                        <Paper
                          variant="outlined"
                          onClick={() => setTariffType("commercial")}
                          sx={{
                            p: 1.5,
                            borderRadius: 1,
                            cursor: "pointer",
                            textAlign: "center",
                            border: "1px solid",
                            borderColor: (theme) =>
                              tariffType === "commercial"
                                ? theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong
                                : theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                            bgcolor: (theme) =>
                              tariffType === "commercial"
                                ? theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle
                                : "transparent",
                            transition: "all 0.15s ease",
                            "&:hover": {
                              borderColor: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
                            },
                          }}
                        >
                          <StoreIcon sx={{ color: tariffType === "commercial" ? "text.primary" : "text.secondary", mb: 0.5, fontSize: 20 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
                            Commercial
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                            General Power Flat
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Base Generation Charge */}
                  <Box data-tour="calculator-subsidies">
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 1 }}>
                      BASE GENERATION CHARGE (₱ / kWh)
                    </Typography>
                    <TextField
                      type="number"
                      fullWidth
                      size="small"
                      value={genRate}
                      onChange={(e) => setGenRate(Number(e.target.value) || 0)}
                      slotProps={{
                        input: {
                          startAdornment: <Typography sx={{ mr: 1, fontWeight: 600, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>₱</Typography>,
                        },
                      }}
                    />
                    <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                      {[
                        { label: "Current (₱9.25)", val: 9.2504 },
                        { label: "Low (₱8.91)", val: 8.91 },
                        { label: "High (₱9.85)", val: 9.85 },
                      ].map((btn) => (
                        <Chip
                          key={btn.label}
                          label={btn.label}
                          size="small"
                          clickable
                          onClick={() => setGenRate(btn.val)}
                          variant={genRate === btn.val ? "filled" : "outlined"}
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.6875rem",
                            borderRadius: 0.75,
                            bgcolor: genRate === btn.val
                              ? (theme) => theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle
                              : "transparent",
                            borderColor: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                            color: "text.primary",
                          }}
                        />
                      ))}
                    </Box>
                  </Box>

                  {/* Other Charges */}
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 1 }}>
                      OTHER CHARGES / BILL DEPOSIT (PHP)
                    </Typography>
                    <TextField
                      type="number"
                      fullWidth
                      size="small"
                      value={otherCharges}
                      onChange={(e) => setOtherCharges(Number(e.target.value) || 0)}
                      slotProps={{
                        input: {
                          startAdornment: <Typography sx={{ mr: 1, fontWeight: 600, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>₱</Typography>,
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                      Enter any extra monthly meter or deposit adjustments (default: ₱0.00).
                    </Typography>
                  </Box>

                  {/* Monthly kWh Slider */}
                  <Box data-tour="calculator-kwh-slider">
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                        MONTHLY CONSUMPTION
                      </Typography>
                      <Chip
                        label={`${kwh} kWh`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          borderRadius: 0.75,
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                          border: "1px solid",
                          borderColor: (theme) =>
                            theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                        }}
                      />
                    </Box>
                    <Slider
                      value={kwh}
                      min={0}
                      max={1000}
                      step={5}
                      onChange={(_, val) => setKwh(val as number)}
                      valueLabelDisplay="auto"
                      sx={{
                        color: "text.primary",
                        "& .MuiSlider-thumb": {
                          bgcolor: "text.primary",
                          "&:hover, &.Mui-focusVisible": {
                            boxShadow: "none",
                          },
                        },
                        "& .MuiSlider-track": {
                          bgcolor: "text.primary",
                        },
                        "& .MuiSlider-rail": {
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                        },
                      }}
                    />
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>0 kWh (Lifeline)</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>200 kWh</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>500 kWh</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>1000+ kWh</Typography>
                    </Box>
                  </Box>

                  {/* Quick Presets */}
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 1 }}>
                      QUICK VOLUME PRESETS
                    </Typography>
                    <Grid container spacing={1}>
                      {[100, 200, 300, 500].map((preset) => (
                        <Grid size={3} key={preset}>
                          <Button
                            variant={kwh === preset ? "contained" : "outlined"}
                            fullWidth
                            size="small"
                            onClick={() => setKwh(preset)}
                            sx={{
                              fontWeight: 600,
                              fontVariantNumeric: "tabular-nums",
                              borderRadius: 0.75,
                              borderColor: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.border : tokens.light.border,
                              bgcolor: kwh === preset
                                ? (theme) => theme.palette.mode === "dark" ? tokens.dark.fg : tokens.light.fg
                                : "transparent",
                              color: kwh === preset
                                ? (theme) => theme.palette.mode === "dark" ? tokens.dark.bg : tokens.light.bg
                                : "text.primary",
                              "&:hover": {
                                bgcolor: kwh === preset
                                  ? (theme) => theme.palette.mode === "dark" ? tokens.dark.fg : tokens.light.fg
                                  : (theme) => theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover,
                              },
                            }}
                          >
                            {preset}
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>

                  {/* Senior Citizen Discount (Residential Only) */}
                  {tariffType === "residential" && (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                        borderColor: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                      }}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: "block", color: "text.primary" }}>
                          Senior Citizen 5% Discount
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                          Applies to residential consumption ≤ 100 kWh
                        </Typography>
                      </Box>
                      <Checkbox
                        checked={isSenior}
                        onChange={(e) => setIsSenior(e.target.checked)}
                        size="small"
                        sx={{
                          color: "text.secondary",
                          "&.Mui-checked": {
                            color: "text.primary",
                          },
                        }}
                      />
                    </Paper>
                  )}
                </Box>
              </SectionCard>
            ) : (
              <SectionCard
                dataTour="calculator-whatif"
                title={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <FlameIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                    <span>Savings Simulator</span>
                  </Box>
                }
                subtitle="Calculate savings by trimming appliance usage hours"
                headerActions={
                  <Chip
                    label="WHAT-IF"
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.6875rem",
                      borderRadius: 0.75,
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.border : tokens.light.border,
                    }}
                  />
                }
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <TextField
                        label="Appliance Watts"
                        type="number"
                        fullWidth
                        size="small"
                        value={simWatts}
                        onChange={(e) => setSimWatts(Number(e.target.value) || 0)}
                      />
                    </Grid>
                    <Grid size={6}>
                      <TextField
                        label="Hours Cut / Day"
                        type="number"
                        fullWidth
                        size="small"
                        value={simHoursReduced}
                        onChange={(e) => setSimHoursReduced(Number(e.target.value) || 0)}
                      />
                    </Grid>
                  </Grid>

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", textTransform: "uppercase" }}>
                        Estimated Monthly Savings
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: (theme) =>
                            theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        ₱{simMonthlyPesosSaved.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        Volume Saved
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {simMonthlyKwhSaved.toFixed(1)} kWh/mo
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              </SectionCard>
            )}
          </Box>
        </Grid>

        {/* Right Column: Output Receipt & Breakdown */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3 } }}>
            {/* Total Amount Due Display */}
            <SectionCard
              dataTour="calculator-summary"
              title="Projected Amount Due"
              subtitle="Total calculated charges for active billing cycle"
            >
              <Box
                sx={{
                  py: 3,
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: "text.secondary",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                  }}
                >
                  Total Projected Amount Due
                </Typography>

                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.03em",
                    my: 1,
                    color: "text.primary",
                    fontSize: { xs: "2.25rem", sm: "3rem", md: "3.5rem" },
                  }}
                >
                  ₱
                  {bill.totalBill.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    color: "text.secondary",
                    fontSize: "0.8125rem",
                    fontVariantNumeric: "tabular-nums",
                    mt: 0.5,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  <span>Power Supply: ₱{bill.generationTotal.toFixed(2)}</span>
                  <span>•</span>
                  <span>Other Grid Fees: ₱{(bill.totalBill - bill.generationTotal).toFixed(2)}</span>
                </Box>

                <Chip
                  label={`Calculated for ${kwh} kWh (Effective: ₱${bill.effectiveRatePerKwh.toFixed(4)}/kWh)`}
                  size="small"
                  sx={{
                    mt: 2.5,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                    height: 28,
                    borderRadius: 0.75,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                    color: "text.primary",
                    border: "1px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                  }}
                />
              </Box>
            </SectionCard>

            {/* Cost Share Distribution Bar */}
            <SectionCard
              dataTour="calculator-unbundled"
              title="Cost Share Distribution"
              subtitle="Unbundled bill components proportion"
            >
              <Box
                sx={{
                  height: 8,
                  width: "100%",
                  borderRadius: 0.5,
                  display: "flex",
                  overflow: "hidden",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    width: `${genPct}%`,
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[0] : tokens.light.chart[0]),
                  }}
                  title={`Generation: ${genPct.toFixed(1)}%`}
                />
                <Box
                  sx={{
                    width: `${transPct}%`,
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[3] : tokens.light.chart[3]),
                  }}
                  title={`Transmission: ${transPct.toFixed(1)}%`}
                />
                <Box
                  sx={{
                    width: `${distPct}%`,
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[1] : tokens.light.chart[1]),
                  }}
                  title={`Distribution: ${distPct.toFixed(1)}%`}
                />
                <Box
                  sx={{
                    width: `${taxPct}%`,
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[2] : tokens.light.chart[2]),
                  }}
                  title={`Taxes: ${taxPct.toFixed(1)}%`}
                />
              </Box>

              <Grid container spacing={1}>
                {[
                  { label: "Generation", pct: genPct, chartIdx: 0 },
                  { label: "Transmission", pct: transPct, chartIdx: 3 },
                  { label: "Distribution", pct: distPct, chartIdx: 1 },
                  { label: "Taxes & VAT", pct: taxPct, chartIdx: 2 },
                ].map((leg) => (
                  <Grid size={{ xs: 6, sm: 3 }} key={leg.label}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark" ? tokens.dark.chart[leg.chartIdx] : tokens.light.chart[leg.chartIdx],
                        }}
                      />
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontVariantNumeric: "tabular-nums", fontSize: "0.75rem" }}>
                        {leg.label} ({leg.pct.toFixed(0)}%)
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 2.5 }} />

              {/* Itemized Tariff Table */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.75rem", color: "text.secondary" }}>
                  Official Itemized Tariff Receipt
                </Typography>
                <Button
                  size="small"
                  onClick={() => setShowItemized(!showItemized)}
                  endIcon={showItemized ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                  sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}
                >
                  {showItemized ? "Hide" : "Show"}
                </Button>
              </Box>

              <Collapse in={showItemized}>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  {[
                    { label: "1. Generation Charge (Power Supply)", val: bill.generationTotal },
                    { label: "2. Transmission Charge (Grid Delivery)", val: bill.transmissionTotal },
                    { label: "3. System Loss Charge (Distribution Loss)", val: bill.systemLossTotal },
                    { label: "4. Distribution Charge (Supply, Metering, Lines)", val: bill.distributionTotal },
                    { label: "5. Universal Charges & FIT-All Subsidy", val: (bill.universalCharges?.total || 0) + (bill.fitAll || 0) },
                    { label: "6. Government Taxes (12% VAT + Franchise)", val: bill.totalTaxesAndSubsidies },
                  ].map((row, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                        py: 1,
                        borderBottom: "1px solid",
                        borderColor: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 0, fontSize: "0.75rem" }}>
                        {row.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                          flexShrink: 0,
                          fontSize: "0.75rem",
                          color: "text.primary",
                        }}
                      >
                        ₱{row.val.toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </SectionCard>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MeralcoCalculator;
