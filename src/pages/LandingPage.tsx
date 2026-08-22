import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Divider from "@mui/material/Divider";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Paper from "@mui/material/Paper";
import {
  Bolt as BoltIcon,
  ArrowForward as ArrowForwardIcon,
  LightMode as SunIcon,
  DarkMode as MoonIcon,
  CameraAlt as CameraIcon,
  Layers as LayersIcon,
  Calculate as CalculateIcon,
  BarChart as BarChartIcon,
  AutoAwesome as SparklesIcon,
  ExpandMore as ExpandMoreIcon,
  VerifiedUser as ShieldIcon,
  Memory as CpuIcon,
  AccessTime as ClockIcon,
  AcUnit as AcIcon,
  Tv as TvIcon,
  Kitchen as FridgeIcon,
  Speed as SpeedIcon,
} from "@mui/icons-material";
import { APP_VERSION } from "../lib/supabaseClient";
import { useColorMode } from "../theme/AppTheme";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useColorMode();
  const isDark = mode === "dark";

  // Quick Estimator Demo State
  const applianceOptions = [
    { value: 1200, label: "Inverter Air Conditioner (1.5 HP)", icon: <AcIcon sx={{ color: "info.main" }} /> },
    { value: 150, label: "Two-Door Refrigerator (24/7)", icon: <FridgeIcon sx={{ color: "primary.light" }} /> },
    { value: 75, label: "Stand Electric Fan", icon: <SpeedIcon sx={{ color: "success.main" }} /> },
    { value: 120, label: "Smart LED Television 55″", icon: <TvIcon sx={{ color: "warning.main" }} /> },
    { value: 1800, label: "Induction Cooker", icon: <BoltIcon sx={{ color: "error.main" }} /> },
  ];

  const [selectedWatts, setSelectedWatts] = useState<number>(1200);
  const [estimatorHours, setEstimatorHours] = useState<number>(8);
  const [estimatorRate, setEstimatorRate] = useState<number>(14.82);

  const estimatorCalc = useMemo(() => {
    const dailyKwh = (selectedWatts * estimatorHours) / 1000;
    const monthlyKwh = dailyKwh * 30;
    const monthlyCost = monthlyKwh * (estimatorRate || 14.82);
    return {
      dailyKwh: dailyKwh.toFixed(2),
      monthlyKwh: monthlyKwh.toFixed(2),
      monthlyCost: monthlyCost.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  }, [selectedWatts, estimatorHours, estimatorRate]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      {/* 1. MUI AppAppBar */}
      <AppBar
        position="sticky"
        sx={{
          zIndex: 1100,
          backdropFilter: "blur(20px)",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(9, 9, 56, 0.85)" : "rgba(255, 255, 255, 0.85)",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: "space-between", px: { xs: 0 } }}>
            {/* Logo */}
            <Box component={Link} to="/" sx={{ display: "flex", alignItems: "center", gap: 1.5, textDecoration: "none", color: "inherit" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  bgcolor: "primary.main",
                  color: "#ffffff",
                  boxShadow: "0 2px 10px rgba(99, 102, 241, 0.5)",
                }}
              >
                <BoltIcon sx={{ color: "#ffd54f", fontSize: 24 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
                power<Typography component="span" variant="h6" sx={{ fontWeight: 900, color: "#ffd54f" }}>forecast</Typography>
              </Typography>
            </Box>

            {/* Nav links */}
            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 3 }}>
              <Typography component="a" href="#features" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", fontWeight: 600, "&:hover": { color: "primary.main" } }}>
                Features
              </Typography>
              <Typography component="a" href="#estimator" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", fontWeight: 600, "&:hover": { color: "primary.main" } }}>
                Live Estimator
              </Typography>
              <Typography component="a" href="#tariffs" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", fontWeight: 600, "&:hover": { color: "primary.main" } }}>
                Tariff Tiers
              </Typography>
              <Typography component="a" href="#faq" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", fontWeight: 600, "&:hover": { color: "primary.main" } }}>
                FAQ
              </Typography>
            </Box>

            {/* Right Actions */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Tooltip title={`Switch to ${isDark ? "Light" : "Dark"} mode`}>
                <IconButton onClick={toggleColorMode} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
                  {isDark ? <SunIcon sx={{ color: "#ffd54f", fontSize: 18 }} /> : <MoonIcon sx={{ color: "#4f46e5", fontSize: 18 }} />}
                </IconButton>
              </Tooltip>

              <Button
                component={Link}
                to="/login"
                variant="outlined"
                size="small"
                sx={{ display: { xs: "none", sm: "inline-flex" } }}
              >
                Sign In
              </Button>

              <Button
                component={Link}
                to="/signup"
                variant="contained"
                size="small"
                endIcon={<ArrowForwardIcon />}
              >
                Get Started
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* 2. Hero Section */}
      <Box
        sx={{
          pt: { xs: 8, md: 12 },
          pb: { xs: 8, md: 12 },
          position: "relative",
          overflow: "hidden",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.25), transparent)"
              : "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.12), transparent)",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", maxWidth: 860, mx: "auto", mb: { xs: 6, md: 8 } }}>
            <Chip
              icon={<SparklesIcon sx={{ color: "#ffd54f !important", fontSize: "16px !important" }} />}
              label="Next-Gen Meralco Energy Intelligence Platform"
              sx={{
                mb: 2.5,
                fontWeight: 700,
                fontSize: "0.8125rem",
                bgcolor: "rgba(99, 102, 241, 0.15)",
                color: "primary.light",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                px: 1,
              }}
            />

            <Typography
              variant="h1"
              sx={{
                fontWeight: 900,
                fontSize: { xs: "2.25rem", sm: "3.25rem", md: "4rem" },
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                mb: 2.5,
              }}
            >
              Take Total Control of Your{" "}
              <Box
                component="span"
                sx={{
                  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #eab308 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Electricity & Meralco Bills
              </Box>
            </Typography>

            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: "1rem", sm: "1.15rem" },
                color: "text.secondary",
                lineHeight: 1.6,
                mb: 4,
              }}
            >
              Real-time household appliance circuit tracking, unbundled tariff calculation formulas, DOE PELP energy efficiency rating lookup, and AI OCR camera bill auditing.
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 2 }}>
              <Button
                component={Link}
                to="/signup"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{ px: 3.5, py: 1.25, fontSize: "1rem", borderRadius: 2.5 }}
              >
                Get Started Free
              </Button>
              <Button
                component={Link}
                to="/login"
                variant="outlined"
                size="large"
                sx={{ px: 3.5, py: 1.25, fontSize: "1rem", borderRadius: 2.5 }}
              >
                Sign In
              </Button>
            </Box>
          </Box>

          {/* Interactive Live Estimator Card */}
          <Card
            id="estimator"
            sx={{
              p: { xs: 2.5, sm: 4 },
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.25)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  ⚡ Quick Appliance Bill Estimator
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Adjust wattage and daily run-time to see live Meralco billing breakdown.
                </Typography>
              </Box>
              <Chip
                label="Live Dynamic Calculation"
                color="secondary"
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Box>

            <Grid container spacing={3}>
              {/* Controls */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <TextField
                    select
                    fullWidth
                    label="Select Appliance Preset"
                    value={selectedWatts}
                    onChange={(e) => setSelectedWatts(Number(e.target.value))}
                    size="small"
                  >
                    {applianceOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          {opt.icon}
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {opt.label} ({opt.value} Watts)
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>

                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                        DAILY DUTY CYCLE (HOURS / DAY)
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main" }}>
                        {estimatorHours} hours/day
                      </Typography>
                    </Box>
                    <Slider
                      value={estimatorHours}
                      min={1}
                      max={24}
                      step={0.5}
                      onChange={(_, val) => setEstimatorHours(val as number)}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                        EFFECTIVE TARIFF RATE (₱ / kWh)
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "#eab308" }}>
                        ₱{estimatorRate.toFixed(2)}/kWh
                      </Typography>
                    </Box>
                    <Slider
                      value={estimatorRate}
                      min={8.0}
                      max={20.0}
                      step={0.1}
                      onChange={(_, val) => setEstimatorRate(val as number)}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                </Box>
              </Grid>

              {/* Real-time Calculation Result Card */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Paper
                  sx={{
                    p: 3,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderRadius: 3,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.06)",
                    border: "1px solid",
                    borderColor: "primary.main",
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.light", textTransform: "uppercase" }}>
                      Projected Appliance Cost
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 900,
                        fontFamily: "monospace",
                        color: "#ffd54f",
                        my: 1,
                      }}
                    >
                      ₱{estimatorCalc.monthlyCost}
                      <Typography component="span" variant="body2" sx={{ color: "text.secondary", ml: 1 }}>
                        / month
                      </Typography>
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>Daily Load:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                        {estimatorCalc.dailyKwh} kWh/day
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>Monthly Consumption:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                        {estimatorCalc.monthlyKwh} kWh/mo
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>Continuous Running Rate:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "success.light", fontFamily: "monospace" }}>
                        ₱{((selectedWatts / 1000) * estimatorRate).toFixed(2)}/hr
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    variant="contained"
                    fullWidth
                    size="small"
                    onClick={() => navigate("/calculator")}
                    sx={{ mt: 2 }}
                  >
                    Open Full Unbundled Calculator
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </Card>
        </Container>
      </Box>

      {/* 3. Logo Collection / Trusted Partners */}
      <Box sx={{ py: 6, borderY: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
        <Container maxWidth="lg">
          <Typography variant="caption" sx={{ display: "block", textAlign: "center", fontWeight: 700, color: "text.secondary", letterSpacing: "0.08em", mb: 3 }}>
            COMPATIBLE WITH PHILIPPINE ENERGY STANDARDS & UTILITY GRIDS
          </Typography>
          <Grid container spacing={3} sx={{ justifyContent: "center", alignItems: "center" }}>
            {["DOE PELP Certified", "Meralco Unbundled Rates", "ERC Compliant", "Solar Net-Metering Ready"].map((label) => (
              <Grid size={{ xs: 6, sm: 3 }} key={label} sx={{ textAlign: "center" }}>
                <Chip
                  icon={<ShieldIcon sx={{ color: "primary.main" }} />}
                  label={label}
                  variant="outlined"
                  sx={{ fontWeight: 700, fontSize: "0.8125rem", py: 1.5, width: "100%", maxWidth: 220 }}
                />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 4. Core Features Grid */}
      <Box id="features" sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", maxWidth: 700, mx: "auto", mb: 8 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1.5 }}>
              Engineered for Precision & Energy Savings
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              Explore the advanced suite of tools designed to forecast, monitor, and optimize your monthly power bill.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {[
              {
                icon: <CalculateIcon sx={{ fontSize: 28, color: "#ffd54f" }} />,
                title: "Unbundled Tariff Calculator",
                desc: "Accurately compute Generation, Transmission, Distribution, System Loss, Lifeline Subsidy, and VAT charges down to the exact centavo.",
              },
              {
                icon: <LayersIcon sx={{ fontSize: 28, color: "primary.light" }} />,
                title: "DOE PELP Energy Star Database",
                desc: "Compare verified Energy Efficiency Ratios (EER) for over 100+ inverter air conditioners, refrigerators, and appliances.",
              },
              {
                icon: <CameraIcon sx={{ fontSize: 28, color: "secondary.main" }} />,
                title: "AI Vision OCR Scanner",
                desc: "Upload physical appliance rating plates or Meralco electricity bills for instant OCR parsing and telemetry autofill.",
              },
              {
                icon: <ClockIcon sx={{ fontSize: 28, color: "success.main" }} />,
                title: "Smart Calendar Scheduler",
                desc: "Plan energy-heavy tasks like laundry and ironing during off-peak tariff hours to reduce peak demand charges.",
              },
              {
                icon: <BarChartIcon sx={{ fontSize: 28, color: "info.main" }} />,
                title: "Forecast & Anomaly Detection",
                desc: "Predict end-of-month electric bills and receive smart warnings before stepping into higher Meralco consumption tiers.",
              },
              {
                icon: <CpuIcon sx={{ fontSize: 28, color: "warning.main" }} />,
                title: "Live Circuit Power Board",
                desc: "Toggle active appliances and watch real-time wattage loads update dynamically with 1-second live telemetry.",
              },
            ].map((f, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                <Card sx={{ height: "100%", p: 3, display: "flex", flexDirection: "column" }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "action.hover",
                      border: "1px solid",
                      borderColor: "divider",
                      mb: 2,
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {f.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                    {f.desc}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 5. Tariff Tiers Comparison */}
      <Box id="tariffs" sx={{ py: { xs: 8, md: 10 }, bgcolor: "action.hover" }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", maxWidth: 700, mx: "auto", mb: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1.5 }}>
              Meralco Residential Tariff Tiers
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Transparent baseline tariff brackets supported in PowerForecast.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {[
              {
                title: "Lifeline Subsidy Tier",
                kwh: "0 - 100 kWh",
                price: "₱8.50 - ₱10.20",
                desc: "For low-income households with 20% - 100% discount on generation and distribution charges.",
                popular: false,
              },
              {
                title: "Regular Residential",
                kwh: "101 - 300 kWh",
                price: "₱12.45 - ₱14.82",
                desc: "Standard household rate with standard unbundled generation, transmission, and universal charges.",
                popular: true,
              },
              {
                title: "High Usage / TOU",
                kwh: "301+ kWh / TOU",
                price: "₱15.50 - ₱17.90",
                desc: "Larger households and solar net-metering setups with time-of-use peak and off-peak rate tracking.",
                popular: false,
              },
            ].map((tier, idx) => (
              <Grid size={{ xs: 12, md: 4 }} key={idx}>
                <Card
                  sx={{
                    p: 3.5,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderRadius: 3,
                    position: "relative",
                    ...(tier.popular && {
                      borderColor: "primary.main",
                      boxShadow: "0 8px 30px rgba(99, 102, 241, 0.2)",
                    }),
                  }}
                >
                  {tier.popular && (
                    <Chip
                      label="Most Common"
                      color="primary"
                      size="small"
                      sx={{ position: "absolute", top: 16, right: 16, fontWeight: 700 }}
                    />
                  )}

                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {tier.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      Bracket: {tier.kwh}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: "monospace", my: 2 }}>
                      {tier.price} <Typography component="span" variant="caption">/kWh</Typography>
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                      {tier.desc}
                    </Typography>
                  </Box>

                  <Button
                    component={Link}
                    to="/signup"
                    variant={tier.popular ? "contained" : "outlined"}
                    fullWidth
                  >
                    Start with this Tier
                  </Button>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 6. FAQ Section */}
      <Box id="faq" sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ fontWeight: 800, textAlign: "center", mb: 6 }}>
            Frequently Asked Questions
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {[
              {
                q: "How accurate is the unbundled Meralco calculation formula?",
                a: "PowerForecast implements the official Energy Regulatory Commission (ERC) unbundled billing framework, factoring in Generation Charges, Transmission, System Loss, Distribution, Subsidies, and Government Taxes (12% VAT, Universal Charges, FIT-All).",
              },
              {
                q: "What is the DOE PELP Database integration?",
                a: "PELP stands for Philippine Energy Labeling Program. PowerForecast contains verified ratings (CSPF, EER, star ratings) from the Department of Energy to help you calculate real-world consumption for inverter and non-inverter models.",
              },
              {
                q: "Does PowerForecast save my data securely?",
                a: "Yes. All appliance inventories and schedule events are synced securely with Supabase Cloud DB with automatic fallback to browser storage.",
              },
              {
                q: "How do I get started with PowerForecast?",
                a: "Simply click 'Get Started Free' or 'Create Free Account' to register your household with Supabase authentication and begin tracking immediately.",
              },
            ].map((faq, idx) => (
              <Accordion key={idx}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {faq.q}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                    {faq.a}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Container>
      </Box>

      {/* 7. Footer */}
      <Box sx={{ py: 6, borderTop: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <BoltIcon sx={{ color: "#ffd54f" }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                PowerForecast Refine & MUI
              </Typography>
              <Chip label={APP_VERSION} size="small" sx={{ fontFamily: "monospace", fontWeight: 700 }} />
            </Box>

            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              © {new Date().getFullYear()} PowerForecast. Designed with Material UI Templates.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
