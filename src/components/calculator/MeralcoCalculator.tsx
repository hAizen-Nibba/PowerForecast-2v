import React, { useState, useMemo, useEffect } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Slider from "@mui/material/Slider";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Collapse from "@mui/material/Collapse";
import {
  Calculate as CalcIcon,
  Bolt as BoltIcon,
  RestartAlt as RotateCcwIcon,
  Print as PrinterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AutoAwesome as SparklesIcon,
  Whatshot as FlameIcon,
} from "@mui/icons-material";
import { calculateMeralcoBill, DEFAULT_MERALCO_RATES } from "../../lib/meralcoCalculator";
import { devLog } from "../../lib/devLogger";

export const MeralcoCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [kwh, setKwh] = useState<number>(320);
  const [genRate, setGenRate] = useState<number>(DEFAULT_MERALCO_RATES.defaultGenerationRate);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [isSenior, setIsSenior] = useState<boolean>(false);
  const [showItemized, setShowItemized] = useState<boolean>(true);

  // What-If Simulation State
  const [simWatts, setSimWatts] = useState<number>(950);
  const [simHoursReduced, setSimHoursReduced] = useState<number>(2);

  const bill = useMemo(() => {
    return calculateMeralcoBill(kwh, genRate, otherCharges, isSenior);
  }, [kwh, genRate, otherCharges, isSenior]);

  useEffect(() => {
    devLog.telemetry(
      "Calculator",
      `Unbundled bill calculated for ${kwh} kWh: ₱${bill.totalBill.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Effective: ₱${bill.effectiveRatePerKwh.toFixed(4)}/kWh)`,
      {
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
  }, [kwh, genRate, otherCharges, isSenior, bill]);

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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Top Banner Header */}
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
              }}
            >
              <CalcIcon sx={{ color: "#ffd54f" }} />
            </Box>
            Interactive Bill Calculator
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Configure monthly electricity consumption to inspect real-time unbundled itemized breakdowns.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleReset}
            startIcon={<RotateCcwIcon />}
          >
            Reset
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => window.print()}
            startIcon={<PrinterIcon />}
          >
            Print Breakdown
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab icon={<BoltIcon fontSize="small" />} iconPosition="start" label="Bill Parameters" />
          <Tab icon={<SparklesIcon fontSize="small" />} iconPosition="start" label="What-If Energy Savings" />
        </Tabs>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column: Config Inputs */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {activeTab === 0 ? (
              <Card sx={{ p: 3, borderRadius: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Tariff & Volume Settings
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Adjust your monthly kWh and base utility tariffs
                    </Typography>
                  </Box>
                  <Chip label="ERC TARIFFS" size="small" color="primary" sx={{ fontWeight: 700 }} />
                </Box>

                <Divider />

                {/* Base Generation Charge */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}>
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
                        startAdornment: <Typography sx={{ mr: 1, fontWeight: 700, color: "text.secondary" }}>₱</Typography>,
                      },
                    }}
                  />
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    {[
                      { label: "Current (₱9.25)", val: 9.2504 },
                      { label: "Low (₱8.91)", val: 8.91 },
                      { label: "Peak (₱9.85)", val: 9.85 },
                    ].map((btn) => (
                      <Chip
                        key={btn.label}
                        label={btn.label}
                        size="small"
                        clickable
                        onClick={() => setGenRate(btn.val)}
                        color={genRate === btn.val ? "primary" : "default"}
                        variant={genRate === btn.val ? "filled" : "outlined"}
                        sx={{ fontWeight: 600, fontSize: "0.6875rem" }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Other Charges */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}>
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
                        startAdornment: <Typography sx={{ mr: 1, fontWeight: 700, color: "text.secondary" }}>₱</Typography>,
                      },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                    Enter any extra monthly meter or deposit adjustments (default: ₱0.00).
                  </Typography>
                </Box>

                {/* Monthly kWh Slider */}
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                      MONTHLY CONSUMPTION
                    </Typography>
                    <Chip
                      label={`${kwh} kWh`}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 800, fontFamily: "monospace" }}
                    />
                  </Box>
                  <Slider
                    value={kwh}
                    min={0}
                    max={1000}
                    step={5}
                    onChange={(_, val) => setKwh(val as number)}
                    valueLabelDisplay="auto"
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
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}>
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
                          sx={{ fontFamily: "monospace", fontWeight: 700 }}
                        >
                          {preset}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                {/* Senior Citizen Discount */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                      Senior Citizen 5% Discount
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                      Applies to residential consumption ≤ 100 kWh
                    </Typography>
                  </Box>
                  <Checkbox
                    checked={isSenior}
                    onChange={(e) => setIsSenior(e.target.checked)}
                    color="primary"
                  />
                </Paper>
              </Card>
            ) : (
              /* What-If Energy Savings Simulator Card */
              <Card sx={{ p: 3, borderRadius: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                      <FlameIcon sx={{ color: "warning.main" }} />
                      Savings Simulator
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Calculate savings by trimming appliance usage hours
                    </Typography>
                  </Box>
                  <Chip label="WHAT-IF" size="small" color="secondary" sx={{ fontWeight: 700 }} />
                </Box>

                <Divider />

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
                  sx={{
                    p: 2.5,
                    borderRadius: 2.5,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.08)",
                    border: "1px solid",
                    borderColor: "success.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "success.main", textTransform: "uppercase" }}>
                      Estimated Monthly Savings
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: "monospace", color: "success.main" }}>
                      ₱{simMonthlyPesosSaved.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      Volume Saved
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                      {simMonthlyKwhSaved.toFixed(1)} kWh/mo
                    </Typography>
                  </Box>
                </Paper>
              </Card>
            )}
          </Box>
        </Grid>

        {/* Right Column: Output Receipt & Breakdown */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Total Amount Due Display */}
            <Card
              sx={{
                p: { xs: 3, sm: 4 },
                textAlign: "center",
                borderRadius: 3.5,
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? "0 0 32px rgba(99, 102, 241, 0.25)"
                    : "0 8px 30px rgba(99, 102, 241, 0.15)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.light", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Total Projected Amount Due
              </Typography>

              <Typography
                variant="h2"
                sx={{
                  fontWeight: 900,
                  fontFamily: "monospace",
                  letterSpacing: "-0.03em",
                  my: 1,
                  color: "#ffd54f",
                }}
              >
                ₱
                {bill.totalBill.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2, color: "text.secondary", fontSize: "0.8125rem", mt: 0.5 }}>
                <span>Power Supply: ₱{bill.generationTotal.toFixed(2)}</span>
                <span>•</span>
                <span>Other Grid Fees: ₱{(bill.totalBill - bill.generationTotal).toFixed(2)}</span>
              </Box>

              <Chip
                label={`Calculated for ${kwh} kWh (Effective: ₱${bill.effectiveRatePerKwh.toFixed(4)}/kWh)`}
                size="small"
                sx={{ mt: 2, fontWeight: 700, fontFamily: "monospace" }}
              />
            </Card>

            {/* Cost Share Distribution Bar */}
            <Card sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                Cost Share Distribution
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Unbundled bill components proportion
              </Typography>

              <Box
                sx={{
                  height: 14,
                  width: "100%",
                  borderRadius: 9999,
                  display: "flex",
                  overflow: "hidden",
                  bgcolor: "action.hover",
                  p: "2px",
                  mb: 2,
                }}
              >
                <Box sx={{ width: `${genPct}%`, bgcolor: "primary.main", borderRadius: "9999px 0 0 9999px" }} title={`Generation: ${genPct.toFixed(1)}%`} />
                <Box sx={{ width: `${transPct}%`, bgcolor: "info.main" }} title={`Transmission: ${transPct.toFixed(1)}%`} />
                <Box sx={{ width: `${distPct}%`, bgcolor: "success.main" }} title={`Distribution: ${distPct.toFixed(1)}%`} />
                <Box sx={{ width: `${taxPct}%`, bgcolor: "error.main", borderRadius: "0 9999px 9999px 0" }} title={`Taxes: ${taxPct.toFixed(1)}%`} />
              </Box>

              <Grid container spacing={1}>
                {[
                  { label: "Generation", pct: genPct, color: "primary.main" },
                  { label: "Transmission", pct: transPct, color: "info.main" },
                  { label: "Distribution", pct: distPct, color: "success.main" },
                  { label: "Taxes & VAT", pct: taxPct, color: "error.main" },
                ].map((leg) => (
                  <Grid size={{ xs: 6, sm: 3 }} key={leg.label}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: leg.color }} />
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                        {leg.label} ({leg.pct.toFixed(0)}%)
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 2.5 }} />

              {/* Itemized Tariff Table */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Official Itemized Tariff Receipt
                </Typography>
                <Button
                  size="small"
                  onClick={() => setShowItemized(!showItemized)}
                  endIcon={showItemized ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ textTransform: "none" }}
                >
                  {showItemized ? "Hide" : "Show"}
                </Button>
              </Box>

              <Collapse in={showItemized}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
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
                        py: 0.5,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {row.label}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                        ₱{row.val.toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MeralcoCalculator;
