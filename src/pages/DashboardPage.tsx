import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import {
  Bolt as BoltIcon,
  Calculate as CalculatorIcon,
  CalendarMonth as CalendarIcon,
  AutoAwesome as SparklesIcon,
  Storage as DatabaseIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Whatshot as FlameIcon,
  AccessTime as ClockIcon,
  Add as PlusIcon,
  ArrowForward as ArrowForwardIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  AccountBalanceWallet as WalletIcon,
} from "@mui/icons-material";
import { MetricCard } from "../components/common/MetricCard";
import { LivePowerBoard } from "../components/dashboard/LivePowerBoard";
import { ConsumptionDonut } from "../components/dashboard/ConsumptionDonut";
import { ApplianceModal } from "../components/appliances/ApplianceModal";
import { PelpCatalogModal } from "../components/appliances/PelpCatalogModal";
import { AiVisionScannerModal } from "../components/vision/AiVisionScannerModal";
import { useList } from "@refinedev/core";
import { UserAppliance, ApplianceList } from "../types";
import { calculateMeralcoBill } from "../lib/meralcoCalculator";

export const DashboardPage: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPelpModalOpen, setIsPelpModalOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);

  const listResponse = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const spacesResponse = useList<ApplianceList>({
    resource: "appliance_lists",
  }) as any;

  const appliances: UserAppliance[] = listResponse?.data?.data || listResponse?.result?.data || [];
  const spaces: ApplianceList[] = spacesResponse?.data?.data || spacesResponse?.result?.data || [];

  const runningAppliances = appliances.filter((a: UserAppliance) => a.is_currently_on);
  const activeWattage = runningAppliances.reduce(
    (acc: number, curr: UserAppliance) => acc + curr.watts * (curr.quantity || 1),
    0
  );

  const totalMonthlyKwh = appliances.reduce(
    (acc: number, curr: UserAppliance) => acc + (Number(curr.monthly_kwh) || ((curr.watts * curr.hours_per_day * (curr.quantity || 1) * 30) / 1000)),
    0
  );

  // Calculate space-by-space bills and cost split
  const spaceAnalytics = useMemo(() => {
    let resTotalKwh = 0;
    let resTotalBill = 0;
    let comTotalKwh = 0;
    let comTotalBill = 0;

    const breakdownBySpace = spaces.map((space) => {
      const spaceApps = appliances.filter((a) => a.list_id === space.id || (!a.list_id && space.is_default));
      const kwh = spaceApps.reduce((acc, curr) => {
        return acc + (Number(curr.monthly_kwh) || ((curr.watts * curr.hours_per_day * (curr.quantity || 1) * 30) / 1000));
      }, 0);

      const bill = calculateMeralcoBill(kwh, undefined, 0, false, space.tariff_type);

      if (space.tariff_type === "commercial") {
        comTotalKwh += kwh;
        comTotalBill += bill.totalBill;
      } else {
        resTotalKwh += kwh;
        resTotalBill += bill.totalBill;
      }

      return {
        space,
        kwh: Math.round(kwh * 10) / 10,
        bill: bill.totalBill,
        devicesCount: spaceApps.length,
      };
    });

    const consolidatedTotalBill = breakdownBySpace.reduce((acc, curr) => acc + curr.bill, 0);

    return {
      breakdownBySpace,
      consolidatedTotalBill,
      resTotalBill,
      comTotalBill,
      resTotalKwh,
      comTotalKwh,
      resPercent: consolidatedTotalBill > 0 ? (resTotalBill / consolidatedTotalBill) * 100 : 100,
      comPercent: consolidatedTotalBill > 0 ? (comTotalBill / consolidatedTotalBill) * 100 : 0,
    };
  }, [appliances, spaces]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* 1. Hero Welcome Header Card */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 3,
          borderRadius: 3.5,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ maxWidth: 640 }}>
          <Chip
            icon={<BoltIcon sx={{ color: "#ffd54f !important", fontSize: "14px !important" }} />}
            label="Active Grid Telemetry"
            size="small"
            sx={{
              mb: 1.5,
              fontWeight: 700,
              fontSize: "0.75rem",
              bgcolor: "rgba(99, 102, 241, 0.15)",
              color: "primary.light",
              border: "1px solid rgba(99, 102, 241, 0.3)",
            }}
          />

          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 0.75 }}>
            Energy & Tariff Dashboard
          </Typography>

          <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 2.5 }}>
            Real-time household & business telemetry, Meralco unbundled tariff projections, DOE PELP certified inventory, and sub-metering cost split.
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            {spaces.length === 0 ? (
              <Button
                component={Link}
                to="/appliances"
                variant="contained"
                size="small"
                startIcon={<PlusIcon />}
                sx={{ fontWeight: 800 }}
              >
                Create Your First Space
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setIsAddModalOpen(true)}
                  startIcon={<PlusIcon />}
                >
                  Add Appliance
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setIsPelpModalOpen(true)}
                  startIcon={<DatabaseIcon sx={{ color: "primary.light" }} />}
                >
                  PELP Catalog
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setIsAiScannerOpen(true)}
                  startIcon={<SparklesIcon sx={{ color: "#ffd54f" }} />}
                >
                  AI Scanner
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Live Draw summary pill */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(9, 9, 56, 0.75)" : "rgba(240, 243, 255, 0.8)",
            border: "1px solid",
            borderColor: "divider",
            minWidth: { xs: "100%", md: 240 },
            textAlign: { xs: "left", md: "right" },
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.light", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Current Draw Load
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, fontFamily: "monospace", my: 0.5 }}>
            {activeWattage} <Typography component="span" variant="body2" sx={{ color: "text.secondary" }}>Watts</Typography>
          </Typography>
          <Typography variant="caption" sx={{ color: "#f59e0b", fontWeight: 700, fontFamily: "monospace" }}>
            ₱{((activeWattage / 1000) * 14.8261).toFixed(2)}/hr running rate
          </Typography>
        </Paper>
      </Card>

      {/* 2. Main KPI Stat Cards */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Consolidated Monthly Bill"
            value={`₱${spaceAnalytics.consolidatedTotalBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle={spaces.length > 1 ? `Combined across ${spaces.length} spaces` : "Household projected bill"}
            icon={<BoltIcon sx={{ color: "#ffd54f" }} />}
            trend={{ value: `${spaces.length} Spaces`, direction: "neutral" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Monthly Energy Volume"
            value={`${totalMonthlyKwh.toFixed(1)} kWh`}
            subtitle="Total registered load"
            icon={<TrendingUpIcon sx={{ color: "primary.light" }} />}
            trend={{ value: totalMonthlyKwh <= 100 ? "Lifeline" : "Standard", direction: "neutral" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Active Appliances"
            value={`${runningAppliances.length} / ${appliances.length}`}
            subtitle="Circuits online"
            icon={<SpeedIcon sx={{ color: "success.main" }} />}
            trend={{ value: `${runningAppliances.length} ON`, direction: "up" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Daily Avg Energy"
            value={`${(totalMonthlyKwh / 30).toFixed(1)} kWh`}
            subtitle="Projected daily run"
            icon={<ClockIcon sx={{ color: "success.main" }} />}
            trend={{ value: "30-day baseline", direction: "neutral" }}
          />
        </Grid>
      </Grid>

      {/* 3. Sub-Metering & Space Cost Allocation (When Multiple Spaces Exist) */}
      {spaces.length > 1 && (
        <Card sx={{ p: 3, borderRadius: 3.5, border: "1px solid", borderColor: "rgba(108, 122, 224, 0.25)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: "primary.main", color: "#ffffff", display: "flex" }}>
                <WalletIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Space Sub-Billing & Expense Split
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Cost allocation between residential living and commercial / business operations
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Chip
                icon={<HomeIcon sx={{ fontSize: "14px !important" }} />}
                label={`Residential: ₱${spaceAnalytics.resTotalBill.toFixed(2)} (${spaceAnalytics.resPercent.toFixed(0)}%)`}
                color="primary"
                size="small"
                sx={{ fontWeight: 700 }}
              />
              {spaceAnalytics.comTotalBill > 0 && (
                <Chip
                  icon={<StoreIcon sx={{ fontSize: "14px !important" }} />}
                  label={`Commercial: ₱${spaceAnalytics.comTotalBill.toFixed(2)} (${spaceAnalytics.comPercent.toFixed(0)}%)`}
                  color="secondary"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Box>
          </Box>

          <LinearProgress
            variant="determinate"
            value={spaceAnalytics.resPercent}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: "secondary.main",
              "& .MuiLinearProgress-bar": {
                bgcolor: "primary.main",
              },
              mb: 2.5,
            }}
          />

          <Grid container spacing={2}>
            {spaceAnalytics.breakdownBySpace.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.space.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {item.space.tariff_type === "commercial" ? (
                        <StoreIcon fontSize="small" sx={{ color: "secondary.main" }} />
                      ) : (
                        <HomeIcon fontSize="small" sx={{ color: "primary.main" }} />
                      )}
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {item.space.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {item.devicesCount} devices • {item.kwh} kWh
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: item.space.tariff_type === "commercial" ? "secondary.main" : "primary.main" }}>
                      ₱{item.bill.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                      {item.space.tariff_type === "commercial" ? "General Power" : "230V Stepped"}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Card>
      )}

      {/* 4. Main Grid: Live Power Board & Energy Distribution Donut */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <LivePowerBoard onOpenAddModal={() => setIsAddModalOpen(true)} />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ConsumptionDonut appliances={appliances} />
        </Grid>
      </Grid>

      {/* 5. Quick Module Launchpad */}
      <Grid container spacing={2.5}>
        {[
          {
            title: "Bill Calculator",
            desc: "Unbundled residential & commercial rate formulas",
            icon: <CalculatorIcon sx={{ color: "#ffd54f" }} />,
            link: "/calculator",
          },
          {
            title: "Appliance Hub",
            desc: "Multi-space inventory & DOE PELP matching",
            icon: <BoltIcon sx={{ color: "primary.light" }} />,
            link: "/appliances",
          },
          {
            title: "Smart Scheduler",
            desc: "Runtime planner & circuit queue",
            icon: <CalendarIcon sx={{ color: "success.light" }} />,
            link: "/calendar",
          },
        ].map((item, idx) => (
          <Grid size={{ xs: 12, sm: 4 }} key={idx}>
            <Card
              component={Link}
              to={item.link}
              sx={{
                p: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textDecoration: "none",
                color: "inherit",
                borderRadius: 3,
                "&:hover": {
                  borderColor: "primary.main",
                  transform: "translateY(-2px)",
                },
                transition: "all 0.2s ease-in-out",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: "action.hover",
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {item.desc}
                  </Typography>
                </Box>
              </Box>
              <ArrowForwardIcon fontSize="small" sx={{ color: "primary.main" }} />
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Global Modals */}
      <ApplianceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultListId={spaces[0]?.id || null}
      />
      <PelpCatalogModal
        isOpen={isPelpModalOpen}
        onClose={() => setIsPelpModalOpen(false)}
        defaultListId={spaces[0]?.id || null}
      />
      <AiVisionScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
      />
    </Box>
  );
};

export default DashboardPage;

